import { describe, expect, it } from 'vitest';
import { resolveMediaUrl } from './media';

describe('resolveMediaUrl', () => {
  it.each(['https://media.example/photo.jpg', 'blob:https://app.mydreamapp.ir/uuid', 'data:image/png;base64,abc', 'file:///photo.jpg', 'content://media/1'])(
    'preserves complete preview and remote URI %s', (uri) => {
      expect(resolveMediaUrl(uri, 'https://api.example')).toBe(uri);
    },
  );
  it('normalizes relative paths without duplicate slashes', () => {
    expect(resolveMediaUrl('/storage/photo.jpg', 'https://api.example/')).toBe('https://api.example/storage/photo.jpg');
    expect(resolveMediaUrl('//cdn.example/photo.jpg')).toBe('https://cdn.example/photo.jpg');
  });
  it('rejects empty and unsupported URI schemes', () => {
    expect(resolveMediaUrl(null)).toBeNull();
    expect(resolveMediaUrl('  ')).toBeNull();
    expect(resolveMediaUrl('javascript:alert(1)')).toBeNull();
  });
});
