// Identify an image by its leading bytes rather than trusting the client-supplied
// Content-Type or filename. SVG is deliberately NOT recognised: it is XML that can carry
// <script>, and nothing in this app needs vector uploads.

export type SniffedImage = { mime: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'; ext: string };

export function sniffImage(buf: Buffer): SniffedImage | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: 'png' };
  }
  // GIF: "GIF87a" / "GIF89a"
  const gif = buf.subarray(0, 6).toString('ascii');
  if (gif === 'GIF87a' || gif === 'GIF89a') {
    return { mime: 'image/gif', ext: 'gif' };
  }
  // WebP: "RIFF" <4-byte size> "WEBP"
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return null;
}
