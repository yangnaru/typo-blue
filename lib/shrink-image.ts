// Photos straight off a phone are several megabytes and thousands of pixels
// for an image a post shows at a fraction of that. Uploads go from the browser
// straight to R2, so the browser is the only place to shrink them: before the
// upload link is signed, so the size it is signed for is what is stored, and
// by re-encoding, which drops EXIF so a photo's location never reaches its
// public URL. Taken from naru-pub's SDK.
const MAX_EDGE = 2048;
const SMALL_BYTES = 512 * 1024;
const QUALITY = 0.82;

// R2 never gets HEIC, so an iPhone photo in it is converted here or refused.
const HEIC = /^image\/hei[cf]$/;
const HEIC_NAME = /\.hei[cf]$/i;

export function isHeic(file: File): boolean {
  return HEIC.test(file.type) || (!file.type && HEIC_NAME.test(file.name));
}

// Returns the file to upload: this one, or a smaller WebP (JPEG where the
// browser can't encode WebP) at most MAX_EDGE on its longer side. GIFs pass
// through, since a canvas keeps only their first frame. A HEIC this browser
// can't decode comes back as is, for the caller to refuse.
export async function shrinkImage(file: File): Promise<File> {
  const heic = isHeic(file);
  if (
    !(heic || /^image\/(jpeg|png|webp)$/.test(file.type)) ||
    typeof createImageBitmap !== "function"
  )
    return file;
  let bitmap: ImageBitmap;
  try {
    // Canvas discards EXIF, so orientation is baked into the pixels here.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && !heic && file.size <= SMALL_BYTES) return file;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    for (const type of ["image/webp", "image/jpeg"]) {
      const canvas =
        typeof OffscreenCanvas === "function"
          ? new OffscreenCanvas(width, height)
          : Object.assign(document.createElement("canvas"), { width, height });
      const context = canvas.getContext("2d") as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D
        | null;
      if (!context) return file;
      // JPEG has no transparency; paint white rather than let it go black.
      if (type === "image/jpeg") {
        context.fillStyle = "#fff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(bitmap, 0, 0, width, height);
      const blob =
        canvas instanceof HTMLCanvasElement
          ? await new Promise<Blob | null>((resolve) =>
              canvas.toBlob(resolve, type, QUALITY)
            )
          : await canvas.convertToBlob({ type, quality: QUALITY });
      // A browser that cannot encode a type quietly returns PNG instead.
      if (blob?.type !== type) continue;
      // HEIC is never uploaded as is, so its conversion is kept even if larger.
      if (!heic && blob.size >= file.size) return file;
      const base = (file.name || "image").replace(/\.[^.]*$/, "");
      return new File([blob], `${base}.${type.slice(6)}`, { type });
    }
    return file;
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
