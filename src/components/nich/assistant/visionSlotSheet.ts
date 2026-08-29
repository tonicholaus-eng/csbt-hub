"use client";

import {
  buildSlotManifest,
  encodeSlotManifest,
  planSlotSheet,
  type VisionSlotManifest,
  type VisionSlotRef,
} from "../../../lib/nich/visionSlots";

export type NichSlotCropSheet = {
  file: File;
  width: number;
  height: number;
  manifestHeader: string;
  manifest: VisionSlotManifest;
  tileCount: number;
};

function canvasBlob(canvas: HTMLCanvasElement, type: "image/webp" | "image/jpeg", quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Cut every detected slot out of the ORIGINAL screenshot bitmap and lay the
 * crops onto one labelled contact sheet.
 *
 * The crop pass is the accuracy-critical pass. We keep less surrounding grid
 * chrome than v33 and prefer high-quality WebP so tiny silhouettes/markings do
 * not get smeared by JPEG blocks. There is still no generative upscaling: only
 * deterministic browser interpolation.
 */
export async function buildSlotCropSheet(
  file: File,
  slots: VisionSlotRef[],
  layout: Omit<VisionSlotManifest, "tiles">,
): Promise<NichSlotCropSheet | null> {
  if (typeof document === "undefined" || !slots.length) return null;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }

  try {
    // 10% padding keeps N/M/F/R badges and cell context while giving the pet
    // itself materially more pixels than the old 18% crop.
    const plan = planSlotSheet(slots, { pad: 0.10 });
    if (!plan) return null;

    const canvas = document.createElement("canvas");
    canvas.width = plan.width;
    canvas.height = plan.height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return null;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#20222a";
    context.fillRect(0, 0, plan.width, plan.height);

    for (const tile of plan.tiles) {
      const sx = Math.max(0, Math.round(tile.source.x * bitmap.width));
      const sy = Math.max(0, Math.round(tile.source.y * bitmap.height));
      const sw = Math.max(1, Math.min(bitmap.width - sx, Math.round(tile.source.width * bitmap.width)));
      const sh = Math.max(1, Math.min(bitmap.height - sy, Math.round(tile.source.height * bitmap.height)));

      const scale = Math.min(tile.destWidth / sw, tile.destHeight / sh);
      const drawWidth = Math.max(1, Math.round(sw * scale));
      const drawHeight = Math.max(1, Math.round(sh * scale));
      const offsetX = tile.destX + Math.round((tile.destWidth - drawWidth) / 2);
      const offsetY = tile.destY + Math.round((tile.destHeight - drawHeight) / 2);

      context.fillStyle = "#11131a";
      context.fillRect(tile.destX, tile.destY, tile.destWidth, tile.destHeight);
      context.drawImage(bitmap, sx, sy, sw, sh, offsetX, offsetY, drawWidth, drawHeight);

      context.fillStyle = "#ffffff";
      context.font = "bold 18px Inter, Arial, sans-serif";
      context.fillText(tile.tile, tile.labelX, tile.labelY);
    }

    let blob: Blob | null = null;
    let mimeType: "image/webp" | "image/jpeg" = "image/webp";

    // WebP preserves tiny icon edges/colours noticeably better than JPEG at the
    // same upload budget. Fall back to JPEG for browsers without WebP canvas.
    for (const quality of [0.97, 0.92, 0.86]) {
      const candidate = await canvasBlob(canvas, "image/webp", quality);
      if (candidate && candidate.size > 0 && candidate.size <= 1_850_000) {
        blob = candidate;
        break;
      }
    }
    if (!blob) {
      mimeType = "image/jpeg";
      for (const quality of [0.94, 0.88, 0.82]) {
        const candidate = await canvasBlob(canvas, "image/jpeg", quality);
        if (candidate && candidate.size > 0 && candidate.size <= 1_850_000) {
          blob = candidate;
          break;
        }
      }
    }
    if (!blob) return null;

    const manifest = buildSlotManifest(plan, slots, layout);
    return {
      file: new File([blob], mimeType === "image/webp" ? "nich-slot-crops.webp" : "nich-slot-crops.jpg", {
        type: mimeType,
        lastModified: Date.now(),
      }),
      width: plan.width,
      height: plan.height,
      manifest,
      manifestHeader: encodeSlotManifest(manifest),
      tileCount: plan.tiles.length,
    };
  } finally {
    bitmap.close();
  }
}
