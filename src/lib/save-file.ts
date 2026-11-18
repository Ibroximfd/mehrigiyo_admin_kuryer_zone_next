/**
 * Serverdan kelgan faylni (`api.download`) brauzerda saqlash: vaqtinchalik
 * havola orqali. URL 10 soniyadan keyin bo'shatiladi — yuklab olish shu
 * vaqtda boshlangan bo'ladi.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
