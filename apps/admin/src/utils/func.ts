export const capitalizeFirst = (text: string): string => {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export enum MediaFileType {
  IMAGE = ".jpg,.jpeg,.png,.gif,.bmp,.webp,.jfif,.avif",
  VIDEO = ".mp4,.m4v,.webm,.mov",
  AUDIO = ".mp3,.mpga,.wav",
  DOCUMENT = ".txt,.doc,.docx,.pdf",
  SPREADSHEET = ".csv,.xls,.xlsx",
  PRESENTATION = ".ppt,.pptx",
  ARCHIVE = ".zip,.rar",
}

const RE_HAS_EXTENSION = /\.[a-zA-Z0-9]+$/;
const RE_URL_EXTENSION = /\.([a-zA-Z0-9]+)(\?|$)/;

export const getAcceptExtensions = (types?: MediaFileType[]): string => {
  if (!types || types.length === 0) {
    return Object.values(MediaFileType).join(",");
  }
  return types.join(",");
};

const getExtensionFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname;
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot !== -1) return pathname.slice(lastDot);
  } catch {
    const match = url.match(RE_URL_EXTENSION);
    if (match) return `.${match[1]}`;
  }
  return "";
};

const ensureExtension = (fileName: string, url: string): string => {
  if (RE_HAS_EXTENSION.test(fileName)) return fileName;
  const ext = getExtensionFromUrl(url);
  return ext ? `${fileName}${ext}` : fileName;
};

export const downloadFile = async (url: string, fileName?: string): Promise<void> => {
  const finalName = ensureExtension(fileName || url.split("/").pop() || "download", url);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fetch failed");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = finalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  } catch {
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadFolderAsZip = async (
  files: { name: string; full_url: string }[],
  folderName: string,
): Promise<void> => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const fetchPromises = files.map(async (file) => {
    try {
      const response = await fetch(file.full_url);
      if (!response.ok) return;
      const blob = await response.blob();
      zip.file(file.name, blob);
    } catch {}
  });

  await Promise.all(fetchPromises);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${folderName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadMultipleItemsAsZip = async (
  items: {
    id: string;
    name: string;
    type: string;
    full_url?: string;
  }[],
  fetchFolderFiles: (folderId: string) => Promise<{ name: string; full_url: string }[]>,
  zipName = "download",
): Promise<void> => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const promises = items.map(async (item) => {
    if (item.type === "folder") {
      const folderZip = zip.folder(item.name);
      if (!folderZip) return;
      try {
        const files = await fetchFolderFiles(item.id);
        const filePromises = files.map(async (file) => {
          try {
            const response = await fetch(file.full_url);
            if (!response.ok) return;
            const blob = await response.blob();
            folderZip.file(file.name, blob);
          } catch {}
        });
        await Promise.all(filePromises);
      } catch {}
    } else {
      if (!item.full_url) return;
      try {
        const response = await fetch(item.full_url);
        if (!response.ok) return;
        const blob = await response.blob();
        zip.file(item.name, blob);
      } catch {}
    }
  });

  await Promise.all(promises);

  const zipBlob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${zipName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const formatDate = (iso?: string): string => {
  if (!iso) return "-";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

export const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
