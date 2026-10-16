const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm', 'video/webm': 'webm',
  'audio/mp4': 'm4a', 'video/mp4': 'm4a', 'audio/x-m4a': 'm4a',
  'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
  'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/aac': 'aac',
};

export function recordedAudioFile(blob: Blob, fallbackMime = 'audio/mp4'): File {
  const type = blob.type || fallbackMime;
  const extension = EXTENSIONS[type.split(';')[0].trim().toLowerCase()];
  if (!extension) throw new Error('فرمت ضبط صدا پشتیبانی نمی‌شود؛ لطفاً از مرورگر دیگری استفاده کن');
  return new File([blob], `voice-intro.${extension}`, { type });
}

export function voiceUploadError(data: { message?: string; errors?: Record<string, string[]> }, status: number): string {
  return data.errors?.voice?.[0] ?? data.errors?.duration_seconds?.[0] ?? data.message ?? `HTTP ${status}`;
}
