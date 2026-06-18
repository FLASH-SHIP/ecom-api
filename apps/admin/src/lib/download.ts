/**
 * File download utilities for the Ecom admin CMS.
 *
 * ## Browser compatibility matrix
 *
 * | Approach              | Works after async? | Chrome 65+ block? | Safari? | FF? |
 * |-----------------------|--------------------|-------------------|---------|-----|
 * | blob: URL + a.click() | ❌ (UUID filename) | No                | ✅       | ✅   |
 * | data: URL + a.click() | ❌ (blocked)       | ✅ Blocked        | ✅       | ✅   |
 * | showSaveFilePicker    | ✅                  | No                | ❌ 17+  | ❌   |
 * | StreamSaver / iframe  | ✅                  | No                | ✅       | ✅   |
 *
 * ## Strategy
 * 1. `showSaveFilePicker` (Chrome 86+, Edge 86+) — native Save-As dialog, always correct filename
 * 2. Fallback: create a temporary `<iframe>` with `srcdoc` → `<a download>` inside it.
 *    Clicks originating from iframe elements are treated as user-initiated by Chrome,
 *    bypassing the "data: URL blocked by script" restriction.
 */

// File System Access API type augmentation (not in default lib.dom.d.ts)
declare global {
  interface Window {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: { description?: string; accept?: Record<string, string[]> }[];
      excludeAcceptAllOption?: boolean;
    }) => Promise<FileSystemFileHandle>;
  }
}

// ── Core strategy: showSaveFilePicker → blob URL via user-gesture trick ───────

/**
 * Primary download engine.
 * Strategy 1: showSaveFilePicker (Chrome/Edge 86+, works after async)
 * Strategy 2: Blob URL with deferred revoke (universal fallback)
 */
async function saveBlobAs(blob: Blob, filename: string): Promise<void> {
  // Strategy 1: File System Access API — works after await, shows native Save-As
  if (typeof window !== "undefined" && typeof window.showSaveFilePicker === "function") {
    try {
      const ext = filename.split(".").pop();
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        ...(ext && blob.type
          ? {
              types: [
                {
                  description: `${ext.toUpperCase()} file`,
                  accept: { [blob.type]: [`.${ext}`] },
                },
              ],
            }
          : {}),
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      // AbortError = user cancelled the dialog — do not fall back
      if ((err as DOMException).name === "AbortError") return;
      // Any other error (e.g. older API version) → fall through to blob URL
    }
  }

  // Strategy 2: blob: URL fallback (Firefox, Safari, older browsers)
  // Must defer the revoke — calling it synchronously races with the download start.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Download an object / array as a pretty-printed JSON file.
 *
 * @example
 * await downloadJson(exportData, "field-groups-2026-06-05.json");
 */
export async function downloadJson(data: unknown, filename: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  await saveBlobAs(blob, filename);
}

/**
 * Download arbitrary text content as a file.
 *
 * @example
 * await downloadText("<svg>...</svg>", "icon.svg", "image/svg+xml");
 */
export async function downloadText(
  content: string,
  filename: string,
  mimeType = "text/plain",
): Promise<void> {
  const blob = new Blob([content], { type: mimeType });
  await saveBlobAs(blob, filename);
}

/**
 * Build a RFC 4180-compliant CSV string and trigger download.
 *
 * Values containing commas, double-quotes, or newlines are automatically
 * wrapped in double-quotes with internal quotes escaped (`"` → `""`).
 *
 * @param headers  Column header labels
 * @param rows     2-D array of row values (`null` / `undefined` → empty cell)
 * @param filename Desired filename (e.g. `"users-2026-06-05.csv"`)
 *
 * @example
 * await downloadCsv(
 *   ["ID", "Tên", "Trạng thái"],
 *   rows.map((r) => [r.id, r.name, r.status]),
 *   "custom-fields.csv",
 * );
 */
export async function downloadCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
  filename: string,
): Promise<void> {
  const escapeCsv = (val: string | number | boolean | null | undefined): string => {
    const str = val == null ? "" : String(val);
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
  await downloadText(csv, filename, "text/csv");
}

/**
 * Download a `Blob` directly (PDF, XLSX, images, etc.).
 *
 * @example
 * const pdfBlob = await generatePdf(data);
 * await downloadBlob(pdfBlob, "report-2026-06-05.pdf");
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  await saveBlobAs(blob, filename);
}

/**
 * Trigger download of a file from an absolute or relative server URL.
 * Works best when the server responds with `Content-Disposition: attachment`.
 *
 * @example
 * downloadFromUrl("/api/export/report.pdf", "monthly-report.pdf");
 */
export function downloadFromUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
