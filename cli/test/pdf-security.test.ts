import { join } from 'path';
import { mkdtemp, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as forge from 'node-forge';
import { createServer, type ServerHandle } from '../src/server/preview.js';

const exec = promisify(execFile);

const EXAMPLES_DIR = join(__dirname, '../examples');
const REPO_ROOT = join(__dirname, '../..');
process.env['FACET_PACKAGE_PATH'] = REPO_ROOT;

const SIMPLE_CODE = `
import React from 'react';
export default function Template({ data }: { data: any }) {
  return <html><body><h1>{data.title || 'Test'}</h1></body></html>;
}`;

function generateTestP12(password: string): Buffer {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
  const attrs = [{ name: 'commonName', value: 'Test Signer' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  return Buffer.from(p12Der, 'binary');
}

async function savePdf(pdfBytes: Buffer, dir: string, name: string): Promise<string> {
  const path = join(dir, `${name}.pdf`);
  await writeFile(path, pdfBytes);
  return path;
}

async function fetchPdfFromRender(serverUrl: string, body: Record<string, unknown>, dir: string, name: string): Promise<string> {
  const res = await fetch(`${serverUrl}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(res.status).toBe(200);
  const json = await res.json() as { url: string };
  expect(json.url).toMatch(/^\/results\//);

  const pdfRes = await fetch(`${serverUrl}${json.url}`);
  expect(pdfRes.status).toBe(200);
  expect(pdfRes.headers.get('content-type')).toContain('application/pdf');
  return savePdf(Buffer.from(await pdfRes.arrayBuffer()), dir, name);
}

async function pdfsig(nssDir: string, pdfPath: string, opts?: { opw?: string }): Promise<string> {
  const args = ['-nssdir', nssDir, '-nocert', pdfPath];
  if (opts?.opw) args.splice(3, 0, '-opw', opts.opw);
  const { stdout, stderr } = await exec('pdfsig', args).catch(e => ({
    stdout: e.stdout ?? '',
    stderr: e.stderr ?? '',
  }));
  return stdout + stderr;
}

async function pdfinfo(pdfPath: string, opts?: { opw?: string; upw?: string }): Promise<string> {
  const args = [pdfPath];
  if (opts?.opw) args.unshift('-opw', opts.opw);
  if (opts?.upw) args.unshift('-upw', opts.upw);
  const { stdout } = await exec('pdfinfo', args);
  return stdout;
}

describe('PDF Security', () => {
  let server: ServerHandle;
  let certDir: string;
  let certPath: string;
  let tmpDir: string;
  let nssDir: string;
  const certPassword = 'test-pass';

  beforeAll(async () => {
    certDir = await mkdtemp(join(tmpdir(), 'facet-cert-'));
    tmpDir = await mkdtemp(join(tmpdir(), 'facet-pdf-'));
    nssDir = await mkdtemp(join(tmpdir(), 'facet-nss-'));
    certPath = join(certDir, 'test-cert.p12');
    await writeFile(certPath, generateTestP12(certPassword));

    await exec('certutil', ['-N', '-d', nssDir, '--empty-password']);

    server = await createServer({
      port: 0,
      templatesDir: EXAMPLES_DIR,
      workers: 1,
      renderTimeout: 60000,
      maxUploadSize: 52428800,
      cacheMaxSize: 104857600,
      verbose: false,
    });
  }, 30000);

  afterAll(async () => {
    await server?.stop();
    await rm(certDir, { recursive: true, force: true }).catch(() => {});
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    await rm(nssDir, { recursive: true, force: true }).catch(() => {});
  }, 15000);

  test('encryption with owner password only', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Encrypted' },
      encryption: { ownerPassword: 'admin' },
    }, tmpDir, 'enc-owner');
    const info = await pdfinfo(path, { opw: 'admin' });
    expect(info).toMatch(/Encrypted:\s+yes/);
  }, 60000);

  test('encryption with user + owner password', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Locked' },
      encryption: { userPassword: 'open-me', ownerPassword: 'admin' },
    }, tmpDir, 'enc-user');
    const info = await pdfinfo(path, { opw: 'admin' });
    expect(info).toMatch(/Encrypted:\s+yes/);

    // pdfinfo without password should fail
    await expect(pdfinfo(path)).rejects.toThrow();
  }, 60000);

  test('encryption with restricted permissions', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Restricted' },
      encryption: {
        ownerPassword: 'admin',
        permissions: { print: false, copy: false },
      },
    }, tmpDir, 'enc-restricted');
    const info = await pdfinfo(path, { opw: 'admin' });
    expect(info).toMatch(/Encrypted:\s+yes/);
    expect(info).toMatch(/print:no/i);
    expect(info).toMatch(/copy:no/i);
  }, 60000);

  test('digital signature', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Signed' },
      signature: { certPath, certPassword },
    }, tmpDir, 'signed');
    const sig = await pdfsig(nssDir, path);
    expect(sig).toMatch(/Signature #1/);
    expect(sig).toMatch(/Signer Certificate Common Name: Test Signer/);
    expect(sig).toMatch(/Total document signed/i);
  }, 60000);

  const canNetwork = process.env.CI !== 'true';

  (canNetwork ? test : test.skip)('timestamp-only signature', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Timestamp Only' },
      signature: { timestampUrl: 'http://timestamp.digicert.com' },
    }, tmpDir, 'timestamp-only');
    const sig = await pdfsig(nssDir, path);
    expect(sig).toMatch(/Signature #1/);
    expect(sig).toMatch(/Total document signed/i);
  }, 90000);

  (canNetwork ? test : test.skip)('signature with timestamp', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Timestamped' },
      signature: {
        certPath,
        certPassword,
        timestampUrl: 'http://timestamp.digicert.com',
      },
    }, tmpDir, 'timestamped');
    const sig = await pdfsig(nssDir, path);
    expect(sig).toMatch(/Signature #1/);
    expect(sig).toMatch(/Total document signed/i);
  }, 90000);

  test('self-signed digital signature', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Self-Signed' },
      signature: { selfSigned: true, name: 'Test User' },
    }, tmpDir, 'self-signed');
    const sig = await pdfsig(nssDir, path);
    expect(sig).toMatch(/Signature #1/);
    expect(sig).toMatch(/Signer Certificate Common Name: Test User/);
    expect(sig).toMatch(/Total document signed/i);
  }, 60000);

  test('encryption + signature combined', async () => {
    const path = await fetchPdfFromRender(server.url, {
      code: SIMPLE_CODE,
      format: 'pdf',
      data: { title: 'Encrypted+Signed' },
      encryption: { ownerPassword: 'admin' },
      signature: { certPath, certPassword },
    }, tmpDir, 'enc-signed');
    const info = await pdfinfo(path, { opw: 'admin' });
    expect(info).toMatch(/Encrypted:\s+yes/);

    const sig = await pdfsig(nssDir, path, { opw: 'admin' });
    expect(sig).toMatch(/Signature #1/);
  }, 60000);
});
