// Removes the metadata a photo carries (EXIF with its GPS position and camera
// serial, XMP, IPTC, comments) before it is uploaded, where anyone can read it.
// The image data itself is copied byte for byte, never re-encoded. A JPEG keeps
// only its orientation, so phone photos stay upright. GIFs carry no EXIF and
// pass through, as does anything this can't parse.
export async function stripImageMetadata(file: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    let stripped: Uint8Array | null = null;
    if (file.type === "image/jpeg") stripped = stripJpeg(bytes);
    else if (file.type === "image/png") stripped = stripPng(bytes);
    else if (file.type === "image/webp") stripped = stripWebp(bytes);
    return stripped
      ? new Blob([stripped as Uint8Array<ArrayBuffer>], { type: file.type })
      : file;
  } catch (error) {
    console.warn("Could not strip image metadata:", error);
    return file;
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

// JPEG: segments until the image data (SOS), each 0xFF, a marker, and a
// big-endian length that counts itself.
function stripJpeg(bytes: Uint8Array): Uint8Array | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  const parts: Uint8Array[] = [bytes.subarray(0, 2)];
  let orientation = 1;
  let orientationWritten = false;
  const writeOrientation = () => {
    if (!orientationWritten && orientation > 1 && orientation <= 8) {
      parts.push(orientationSegment(orientation));
    }
    orientationWritten = true;
  };

  let i = 2;
  while (i < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (marker === 0xda) {
      // Start of scan: the image data and everything after stays as it is
      writeOrientation();
      parts.push(bytes.subarray(i));
      return concat(parts);
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(i, i + 2));
      i += 2;
      continue;
    }

    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    const segment = bytes.subarray(i, i + 2 + length);
    const isExif = marker === 0xe1 && ascii(bytes, i + 4, 6) === "Exif\0\0";
    if (isExif) orientation = readExifOrientation(bytes, i + 10) ?? orientation;

    // APP1 (EXIF, XMP), APP13 (IPTC) and comments go; JFIF (APP0), the color
    // profile (APP2) and everything the decoder needs stay
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xfe;
    if (!drop) {
      if (marker !== 0xe0) writeOrientation();
      parts.push(segment);
    }
    i += 2 + length;
  }
  return null;
}

// The Orientation tag (0x0112) from the first IFD of an EXIF TIFF block.
function readExifOrientation(bytes: Uint8Array, tiff: number): number | null {
  const little = ascii(bytes, tiff, 2) === "II";
  const u16 = (at: number) =>
    little ? bytes[at] | (bytes[at + 1] << 8) : (bytes[at] << 8) | bytes[at + 1];
  const u32 = (at: number) =>
    little
      ? (bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16) | (bytes[at + 3] << 24)) >>> 0
      : ((bytes[at] << 24) | (bytes[at + 1] << 16) | (bytes[at + 2] << 8) | bytes[at + 3]) >>> 0;

  const ifd = tiff + u32(tiff + 4);
  const entries = u16(ifd);
  for (let n = 0; n < entries; n++) {
    const entry = ifd + 2 + n * 12;
    if (u16(entry) === 0x0112) return u16(entry + 8);
  }
  return null;
}

// An APP1 segment holding nothing but the Orientation tag.
function orientationSegment(orientation: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22, // APP1, length 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF, IFD at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // Orientation, SHORT, 1
    0x00, orientation, 0x00, 0x00, // its value
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
}

// PNG: an 8-byte signature, then chunks of length, type, data and CRC.
const PNG_DROPPED = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);

function stripPng(bytes: Uint8Array): Uint8Array | null {
  if (ascii(bytes, 1, 3) !== "PNG") return null;
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  let i = 8;
  while (i < bytes.length) {
    const length =
      ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
    const type = ascii(bytes, i + 4, 4);
    const end = i + 12 + length;
    if (end > bytes.length) return null;
    if (!PNG_DROPPED.has(type)) parts.push(bytes.subarray(i, end));
    i = end;
  }
  return concat(parts);
}

// WebP: a RIFF container of chunks with a fourcc, a little-endian size and
// data padded to an even length. VP8X flags say whether EXIF and XMP follow.
function stripWebp(bytes: Uint8Array): Uint8Array | null {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i < bytes.length) {
    const fourcc = ascii(bytes, i, 4);
    const size =
      (bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24)) >>> 0;
    const end = i + 8 + size + (size % 2);
    if (end > bytes.length) return null;
    if (fourcc === "VP8X") {
      const chunk = bytes.slice(i, end);
      chunk[8] &= ~(0x08 | 0x04); // no EXIF, no XMP
      parts.push(chunk);
    } else if (fourcc !== "EXIF" && fourcc !== "XMP ") {
      parts.push(bytes.subarray(i, end));
    }
    i = end;
  }

  const body = concat(parts);
  const header = new Uint8Array(12);
  header.set(bytes.subarray(0, 12));
  new DataView(header.buffer).setUint32(4, body.length + 4, true);
  return concat([header, body]);
}
