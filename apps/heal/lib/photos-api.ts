export async function photosApi(body: Record<string, unknown>) {
  const res = await fetch("/api/photos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function uploadPhoto(accessToken: string, file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${prefix}-${Date.now()}.${ext}`;

  const buffer = await file.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);

  const res = await photosApi({ action: "upload", accessToken, fileName, base64Data, contentType: file.type });
  return res.path || null;
}

export async function getSignedUrls(accessToken: string, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const res = await photosApi({ action: "signedUrls", accessToken, paths });
  return res.urls || {};
}

export async function deletePhoto(accessToken: string, path: string): Promise<void> {
  await photosApi({ action: "delete", accessToken, path });
}

export async function deletePhotos(accessToken: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await photosApi({ action: "deleteMany", accessToken, paths });
}

export async function listPhotos(accessToken: string): Promise<{ name: string }[]> {
  const res = await photosApi({ action: "list", accessToken });
  return res.data || [];
}

export async function uploadPhotoWithName(accessToken: string, file: File, fileName: string): Promise<string | null> {
  const buffer = await file.arrayBuffer();
  const base64Data = arrayBufferToBase64(buffer);
  const res = await photosApi({ action: "upload", accessToken, fileName, base64Data, contentType: file.type });
  return res.path || null;
}
