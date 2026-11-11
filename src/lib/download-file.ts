export function downloadFile(body: string, fileName: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([body], { type: mimeType }));
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // revoking in the same tick can cancel the download in Safari
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
