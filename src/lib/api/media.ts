const MEDIA_BASE = process.env.EXPO_PUBLIC_MEDIA_URL ?? process.env.EXPO_PUBLIC_API_URL ?? '';

export function resolveMediaUrl(value: string | null | undefined, base = MEDIA_BASE): string | null {
  const path = value?.trim();
  if (!path) return null;
  // Browser object URLs and native previews are already complete URIs.
  if (/^(https?:|blob:|data:image\/|file:|content:)/i.test(path)) return path;
  if (path.startsWith('//')) return `https:${path}`;
  // Never turn an unknown scheme (including javascript:) into a server path.
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return null;
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
