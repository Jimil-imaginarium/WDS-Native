"use client";

/**
 * PNG snapshot export (Share tab). Works because the canvas is created with
 * preserveDrawingBuffer: true.
 */
export function downloadSnapshot(canvas: HTMLCanvasElement, designName: string) {
  const safe = (designName || "murti")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `divyaforge-${safe || "murti"}.png`;
  a.click();
}
