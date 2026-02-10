const API_BASE = import.meta.env.VITE_API_URL || "";
const IMAGE_BASE = import.meta.env.VITE_IMAGE_BASE_URL || API_BASE || "";
const PROXY_ENABLED = (import.meta.env.VITE_IMAGE_PROXY ?? "1") !== "0";

function proxyUrl(url) {
  if (!PROXY_ENABLED) return url;
  if (!url) return "";
  if (url.includes("/api/image?url=")) return url;
  const base = API_BASE ? API_BASE.replace(/\/$/, "") : "";
  const prefix = base || "";
  return `${prefix}/api/image?url=${encodeURIComponent(url)}`;
}

export function resolveImageUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  if (/^data:image\//i.test(value)) return value;
  if (value.startsWith("/api/image?url=")) return value;

  let url = value;
  if (value.startsWith("//")) {
    url = `https:${value}`;
  } else if (value.startsWith("/") && IMAGE_BASE) {
    try {
      url = new URL(value, IMAGE_BASE).toString();
    } catch {
      return value;
    }
  }

  if (/^https?:\/\//i.test(url)) return proxyUrl(url);
  if (value.startsWith("/")) return value;

  return "";
}

export function pickCardImage(card) {
  return (
    resolveImageUrl(card?.image_custom_url) ||
    resolveImageUrl(card?.image_url) ||
    resolveImageUrl(card?.image) ||
    ""
  );
}
