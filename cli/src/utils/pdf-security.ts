import { readFile } from 'fs/promises';
import {
  PDFDocument, PDFName, PDFDict, PDFArray,
  PDFString, PDFHexString, PDFObject,
} from 'pdf-lib';
import {
  DEFAULT_SIGNATURE_LENGTH,
  DEFAULT_BYTE_RANGE_PLACEHOLDER,
  SIG_FLAGS,
  ANNOTATION_FLAGS,
} from '@signpdf/utils';
import { Logger } from './logger.js';

export interface PDFEncryptionOptions {
  userPassword?: string;
  ownerPassword: string;
  permissions?: {
    print?: boolean;
    modify?: boolean;
    copy?: boolean;
    annotate?: boolean;
  };
}

export interface PDFSignatureOptions {
  certPath?: string;
  certPassword?: string;
  selfSigned?: boolean;
  reason?: string;
  name?: string;
  location?: string;
  timestampUrl?: string;
}

interface PDFSecurityOptions {
  encryption?: PDFEncryptionOptions;
  signature?: PDFSignatureOptions;
}

class PDFRawLiteral extends PDFObject {
  private text: string;
  constructor(text: string) { super(); this.text = text; }
  toString() { return this.text; }
  sizeInBytes() { return this.text.length; }
  copyBytesInto(buffer: Uint8Array, offset: number) {
    const bytes = Buffer.from(this.text);
    for (let i = 0; i < bytes.length; i++) buffer[offset + i] = bytes[i];
    return this.text.length;
  }
  clone() { return new PDFRawLiteral(this.text); }
}

export async function applyPDFSecurity(
  buffer: Buffer,
  options: PDFSecurityOptions,
  logger: Logger = new Logger(),
): Promise<Buffer> {
  let result = buffer;
  if (options.signature) {
    const hasCert = options.signature.certPath || options.signature.selfSigned;
    if (hasCert) {
      const method = options.signature.selfSigned ? 'self-signed' : 'PKCS#7';
      const t0 = performance.now();
      result = await signPDF(result, options.signature);
      logger.info(`Signed PDF (${method}) in ${(performance.now() - t0).toFixed(0)}ms`);
    }
    if (options.signature.timestampUrl) {
      const t0 = performance.now();
      result = await timestampPDF(result, options.signature.timestampUrl);
      logger.info(`Timestamped PDF via ${options.signature.timestampUrl} in ${(performance.now() - t0).toFixed(0)}ms`);
    }
  }
  if (options.encryption) {
    const t0 = performance.now();
    result = await encryptPDF(result, options.encryption);
    logger.info(`Encrypted PDF (AES-256) in ${(performance.now() - t0).toFixed(0)}ms`);
  }
  return result;
}

async function encryptPDF(buffer: Buffer, options: PDFEncryptionOptions): Promise<Buffer> {
  const { encryptPDF: encrypt } = await import('@pdfsmaller/pdf-encrypt');
  const perms = options.permissions ?? {};
  const encrypted = await encrypt(new Uint8Array(buffer), options.userPassword ?? '', {
    ownerPassword: options.ownerPassword,
    algorithm: 'AES-256',
    allowPrinting: perms.print ?? true,
    allowModifying: perms.modify ?? false,
    allowCopying: perms.copy ?? false,
    allowAnnotating: perms.annotate ?? false,
  });
  return Buffer.from(encrypted);
}

function generateSelfSignedP12(name: string): { buffer: Buffer; password: string } {
  const forge = require('node-forge');
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
  const attrs = [{ name: 'commonName', value: name || 'Facet Self-Signed' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const password = '';
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  return { buffer: Buffer.from(forge.asn1.toDer(p12Asn1).getBytes(), 'binary'), password };
}

function addSignaturePlaceholder(doc: PDFDocument, options: PDFSignatureOptions): void {
  const ctx = doc.context;
  const page = doc.getPage(0);
  const { width } = page.getSize();

  const byteRangePlaceholder = `/${DEFAULT_BYTE_RANGE_PLACEHOLDER}`;
  const byteRange = new PDFRawLiteral(
    `[0 ${byteRangePlaceholder} ${byteRangePlaceholder} ${byteRangePlaceholder}]`,
  );
  const contentsPlaceholder = PDFHexString.of('0'.repeat(DEFAULT_SIGNATURE_LENGTH * 2));

  const sigValueDict = ctx.obj({
    Type: 'Sig',
    Filter: 'Adobe.PPKLite',
    SubFilter: 'adbe.pkcs7.detached',
    Reason: PDFString.of(options.reason ?? 'Document signed'),
    Name: PDFString.of(options.name ?? ''),
    Location: PDFString.of(options.location ?? ''),
    M: PDFString.of(new Date().toISOString()),
  });
  sigValueDict.set(PDFName.of('ByteRange'), byteRange);
  sigValueDict.set(PDFName.of('Contents'), contentsPlaceholder);
  const sigValueRef = ctx.register(sigValueDict);

  // Widget annotation — bottom-left corner, 100x30
  const widgetDict = ctx.obj({
    Type: 'Annot',
    Subtype: 'Widget',
    FT: 'Sig',
    Rect: [0, 0, Math.min(100, width), 30],
    V: sigValueRef,
    T: PDFString.of('Signature1'),
    F: ANNOTATION_FLAGS.PRINT,
    P: page.ref,
  });
  const widgetRef = ctx.register(widgetDict);

  // Rebuild the page dict to add Annots cleanly (avoids pdf-lib raw-bytes bug)
  const oldPageDict = page.node;
  const newPageDict = ctx.obj({}) as PDFDict;
  for (const [key, value] of oldPageDict.entries()) {
    newPageDict.set(key, value);
  }
  const existingAnnots = oldPageDict.lookup(PDFName.of('Annots'));
  if (existingAnnots instanceof PDFArray) {
    existingAnnots.push(widgetRef);
    newPageDict.set(PDFName.of('Annots'), existingAnnots);
  } else {
    newPageDict.set(PDFName.of('Annots'), ctx.obj([widgetRef]));
  }
  ctx.assign(page.ref, newPageDict);

  // Rebuild catalog to avoid pdf-lib's raw-bytes serialization bug where
  // appending a new key to a loaded dict places it after the closing ">>".
  const oldCatalog = ctx.lookup(ctx.trailerInfo.Root) as PDFDict;
  const newCatalog = ctx.obj({}) as PDFDict;
  for (const [key, value] of oldCatalog.entries()) {
    newCatalog.set(key, value);
  }
  newCatalog.set(PDFName.of('AcroForm'), ctx.obj({
    SigFlags: SIG_FLAGS.SIGNATURES_EXIST | SIG_FLAGS.APPEND_ONLY,
    Fields: [widgetRef],
  }));
  ctx.assign(ctx.trailerInfo.Root, newCatalog);
}

async function signPDF(buffer: Buffer, options: PDFSignatureOptions): Promise<Buffer> {
  const { P12Signer } = await import('@signpdf/signer-p12');
  const { SignPdf } = await import('@signpdf/signpdf');
  const signpdf = new SignPdf();

  let p12Buffer: Buffer;
  let passphrase: string;

  if (options.selfSigned) {
    const generated = generateSelfSignedP12(options.name ?? '');
    p12Buffer = generated.buffer;
    passphrase = generated.password;
  } else if (options.certPath) {
    p12Buffer = await readFile(options.certPath);
    passphrase = options.certPassword ?? '';
  } else {
    throw new Error('Either certPath or selfSigned must be provided for signing');
  }

  const signer = new P12Signer(p12Buffer, { passphrase });

  const doc = await PDFDocument.load(buffer);
  addSignaturePlaceholder(doc, options);
  const pdfWithPlaceholder = Buffer.from(await doc.save({ useObjectStreams: false }));

  return await signpdf.sign(pdfWithPlaceholder, signer);
}

async function timestampPDF(buffer: Buffer, tsaUrl: string): Promise<Buffer> {
  const { timestampPdf } = await import('pdf-rfc3161');
  const result = await timestampPdf({
    pdf: new Uint8Array(buffer),
    tsa: { url: tsaUrl },
  });
  return Buffer.from(result.pdf);
}
