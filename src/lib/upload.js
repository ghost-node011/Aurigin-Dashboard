import { api } from "./api";

/**
 * Uploads a file straight to Cloudinary with a signature from our API, so
 * files don't pass through (or count against) the API's request limit.
 * Resolves to the attachment reference the API stores.
 */
export async function uploadFile(file, onProgress) {
  const sig = await api.getUploadSignature();
  if (file.size > sig.maxBytes) {
    throw new Error(`${file.name} is larger than ${Math.round(sig.maxBytes / 1024 / 1024)} MB`);
  }
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  // XHR rather than fetch: fetch can't report upload progress.
  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error?.message || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error(`Couldn't upload ${file.name}`));
    xhr.send(form);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    name: file.name,
    bytes: result.bytes ?? file.size,
    mimeType: file.type,
  };
}

export function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
