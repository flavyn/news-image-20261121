import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Build the reflected IEEE CRC32 table once for all PNG chunks.
const crcTable = new Uint32Array(256);
for (let i = 0; i < crcTable.length; i++) {
  let value = i;
  for (let bit = 0; bit < 8; bit++) {
    value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  crcTable[i] = value >>> 0;
}

function fail(message: string): never {
  throw new Error(message);
}

function crc32(bytes: Buffer, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let i = start; i < end; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngDimensions(bytes: Buffer): [number, number] {
  let offset = 8;
  let dimensions: [number, number] | undefined;
  while (offset < bytes.length) {
    if (bytes.length - offset < 12) fail('PNG chunk header or CRC is truncated');
    const length = bytes.readUInt32BE(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > bytes.length) fail('PNG chunk data is truncated');
    // Check raw bytes before ASCII decoding, which masks high bits.
    for (let i = offset + 4; i < dataStart; i++) {
      const letter = bytes[i];
      if (!((letter >= 65 && letter <= 90) || (letter >= 97 && letter <= 122))) {
        fail('PNG chunk type must contain four ASCII letters');
      }
    }
    const type = bytes.toString('ascii', offset + 4, dataStart);
    if (type === 'IHDR' && offset !== 8) fail('PNG contains a repeated IHDR');
    if (crc32(bytes, offset + 4, dataEnd) !== bytes.readUInt32BE(dataEnd)) {
      fail('PNG chunk CRC32 mismatch');
    }
    if (offset === 8) {
      if (type !== 'IHDR' || length !== 13) fail('PNG must begin with a 13-byte IHDR');
      dimensions = [bytes.readUInt32BE(dataStart), bytes.readUInt32BE(dataStart + 4)];
    }
    offset = dataEnd + 4;
    if (type === 'IEND') {
      if (length !== 0) fail('PNG IEND must be empty');
      if (offset !== bytes.length) fail('PNG has bytes after IEND');
      if (!dimensions) fail('PNG IHDR is missing');
      return dimensions;
    }
  }
  return fail('PNG IEND is missing');
}

function jpegDimensions(bytes: Buffer): [number, number] {
  let offset = 2;
  let inScan = false;
  let dimensions: [number, number] | undefined;
  while (offset < bytes.length) {
    // Scan entropy bytes until an unstuffed, non-restart marker appears.
    if (inScan && bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    if (bytes[offset++] !== 0xff) fail('JPEG segment marker is missing');
    while (offset < bytes.length && bytes[offset] === 0xff) offset++;
    if (offset >= bytes.length) fail('JPEG marker is truncated');
    const marker = bytes[offset++];
    if (inScan && (marker === 0 || (marker >= 0xd0 && marker <= 0xd7))) continue;
    inScan = false;
    if (marker === 0xd9) {
      if (!dimensions) fail('JPEG supported SOF segment is missing');
      return dimensions;
    }
    if (marker === 0 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
      fail('JPEG contains an unexpected marker');
    }
    if (marker === 0x01) continue; // TEM is a standalone marker.
    if (offset + 2 > bytes.length) fail('JPEG segment length is truncated');
    const length = bytes.readUInt16BE(offset);
    if (length < 2) fail('JPEG segment length is invalid');
    const end = offset + length;
    if (end > bytes.length) fail('JPEG segment data is truncated');
    const payload = offset + 2;
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      if (length < 8) fail('JPEG SOF payload is too short');
      const components = bytes[payload + 5];
      if (components === 0 || length !== 8 + 3 * components) {
        fail('JPEG SOF component data has an invalid length');
      }
      dimensions = [bytes.readUInt16BE(payload + 3), bytes.readUInt16BE(payload + 1)];
    }
    if (marker === 0xda) {
      if (!dimensions) fail('JPEG scan appears before a supported SOF');
      if (length < 6 || bytes[payload] === 0 || length !== 6 + 2 * bytes[payload]) {
        fail('JPEG scan header has an invalid length');
      }
    }
    offset = end;
    inScan = marker === 0xda;
  }
  return fail('JPEG EOI is missing');
}

function validate(bytes: Buffer): void {
  if (bytes.length === 0 || bytes.length > 1048576) {
    fail('Image size must be between 1 and 1048576 bytes');
  }
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let dimensions: [number, number];
  if (bytes.subarray(0, 8).equals(pngSignature)) {
    dimensions = pngDimensions(bytes);
  } else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    dimensions = jpegDimensions(bytes);
  } else {
    return fail('Image signature is neither PNG nor JPEG');
  }
  const [width, height] = dimensions;
  if (width < 1 || height < 1 || width > 1024 || height > 1024) {
    fail('Image width and height must each be between 1 and 1024');
  }
}

try {
  const sourceDirectory = dirname(fileURLToPath(import.meta.url));
  const bytes = readFileSync(join(sourceDirectory, 'entry.png'));
  validate(bytes);
  const destination = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(destination, { recursive: true });
  writeFileSync(join(destination, 'entry.png'), bytes);
  process.stdout.write('entry ok\n');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown failure';
  process.stderr.write(message.replace(/[\r\n]+/g, ' ') + '\n');
  process.exitCode = 1;
}
