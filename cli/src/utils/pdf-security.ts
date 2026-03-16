import { readFile } from 'fs/promises';
import { PDFDocument } from 'pdf-lib';

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

export async function applyPDFSecurity(
  buffer: Buffer,
  options: PDFSecurityOptions,
): Promise<Buffer> {
  let result = buffer;
  // Sign before encrypting — the signer needs to parse the xref table,
  // which is not possible on an encrypted PDF.
  if (options.signature) {
    result = await signPDF(result, options.signature);
    if (options.signature.timestampUrl) {
      result = await timestampPDF(result, options.signature.timestampUrl);
    }
  }
  if (options.encryption) {
    result = await encryptPDF(result, options.encryption);
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

async function signPDF(buffer: Buffer, options: PDFSignatureOptions): Promise<Buffer> {
  const { plainAddPlaceholder } = await import('@signpdf/placeholder-plain');
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

  // Re-serialize through pdf-lib to produce a clean traditional xref table.
  // PDFs from the multi-pass pipeline use cross-reference streams that
  // @signpdf/placeholder-plain cannot parse.
  const doc = await PDFDocument.load(buffer);
  const flattenedBytes = await doc.save({ useObjectStreams: false });
  const flatBuffer = Buffer.from(flattenedBytes);

  const withPlaceholder = plainAddPlaceholder({
    pdfBuffer: flatBuffer,
    reason: options.reason ?? 'Document signed',
    contactInfo: '',
    name: options.name ?? '',
    location: options.location ?? '',
  });

  return await signpdf.sign(withPlaceholder, signer);
}

async function timestampPDF(buffer: Buffer, tsaUrl: string): Promise<Buffer> {
  const { timestampPdf } = await import('pdf-rfc3161');
  const result = await timestampPdf({
    pdf: new Uint8Array(buffer),
    tsa: { url: tsaUrl },
  });
  return Buffer.from(result.pdf);
}
