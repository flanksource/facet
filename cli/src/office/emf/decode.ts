export function isEmf(data: Uint8Array): boolean {
  return data.length >= 44 && Buffer.from(data.buffer, data.byteOffset, data.byteLength).readUInt32LE(40) === 0x464d4520;
}

export function readEmfPdf(data: Uint8Array): Uint8Array | undefined {
  const bytes = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  if (!isEmf(bytes) || bytes.length < 88 || bytes.readUInt32LE(0) !== 1 || bytes.readUInt32LE(48) !== bytes.length) throw new Error('Invalid EMF header or file length');
  let pdf: Uint8Array | undefined;
  let ended = false;
  for (let offset = 0; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('Truncated EMF record header');
    const type = bytes.readUInt32LE(offset);
    const size = bytes.readUInt32LE(offset + 4);
    if (size < 8 || size % 4 || offset + size > bytes.length || (offset === 0 && size < 88)) throw new Error(`Invalid EMF record size at ${offset}`);
    if (type === 0x46) {
      if (size < 12) throw new Error('Truncated EMF comment');
      const length = bytes.readUInt32LE(offset + 8);
      if (length > size - 12) throw new Error('EMF comment data extends beyond its record');
      const comment = bytes.subarray(offset + 12, offset + 12 + length);
      if (comment.length >= 8 && comment.readUInt32LE(0) === 0x43494447 && comment.readUInt32LE(4) === 0x40000004) {
        if (comment.length < 28) throw new Error('Truncated EMF multi-format comment');
        const count = comment.readUInt32LE(24);
        const tableEnd = 28 + count * 16;
        if (tableEnd > comment.length) throw new Error('EMF format table extends beyond its comment');
        for (let index = 0; index < count; index++) {
          const entry = 28 + index * 16;
          const length = comment.readUInt32LE(entry + 8);
          const start = comment.readUInt32LE(entry + 12);
          if (start % 4 || start < tableEnd || start + length > comment.length) throw new Error('Invalid EMF format payload bounds');
          if (comment.readUInt32LE(entry) !== 0x50444620) continue;
          if (pdf) throw new Error('Multiple PDF payloads in one EMF');
          pdf = comment.subarray(start, start + length);
          if (Buffer.from(pdf.subarray(0, 5)).toString() !== '%PDF-') throw new Error('Invalid PDF payload in EMF');
        }
      }
    }
    offset += size;
    if (type === 14) {
      if (size < 16 || offset !== bytes.length) throw new Error('Invalid EMF end record');
      ended = true;
    }
  }
  if (!ended) throw new Error('Missing EMF end record');
  return pdf;
}
