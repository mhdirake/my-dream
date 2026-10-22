import { afterEach, describe, expect, it, vi } from 'vitest';
import { profileApi } from './profile';

const mocks = vi.hoisted(() => ({ platform: { OS: 'web' }, upload: vi.fn(), patch: vi.fn() }));
vi.mock('react-native', () => ({ Platform: mocks.platform }));
vi.mock('expo-file-system', () => ({
  File: class { upload = mocks.upload; }, UploadType: { MULTIPART: 'multipart' },
}));
vi.mock('./client', () => ({ api: { patch: mocks.patch } }));
vi.mock('./url', () => ({ apiUrl: (path: string) => `https://api.test${path}` }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.platform.OS = 'web'; });

describe('recorded voice introduction upload', () => {
  it.each([
    ['audio/webm;codecs=opus', 'webm'], ['audio/mp4', 'm4a'], ['audio/ogg;codecs=opus', 'ogg'],
  ])('preserves the actual browser format %s', async (mime, extension) => {
    const blob = new Blob(['recorded bytes'], { type: mime });
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(blob))
      .mockResolvedValueOnce(new Response('{"data":{"id":1}}', { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    await expect(profileApi.uploadVoiceIntro('session', 'blob:recording', 5)).resolves.toEqual({ data: { id: 1 } });
    const [url, options] = fetcher.mock.calls[1];
    const file = options.body.get('voice') as File;
    expect(url).toBe('https://api.test/api/client/profile/voice-intro');
    expect(file.name).toBe(`voice-intro.${extension}`);
    expect(file.type).toBe(mime);
    expect(await file.text()).toBe('recorded bytes');
    expect(options.body.get('duration_seconds')).toBe('5');
    expect(options.headers.Authorization).toBe('Bearer session');
  });

  it('keeps the native high quality M4A upload as multipart audio/mp4', async () => {
    mocks.platform.OS = 'android';
    mocks.upload.mockResolvedValue({ status: 201, body: '{"data":{"id":2}}' });
    await expect(profileApi.uploadVoiceIntro('session', 'file:///intro.m4a', 6)).resolves.toEqual({ data: { id: 2 } });
    expect(mocks.upload).toHaveBeenCalledWith('https://api.test/api/client/profile/voice-intro', {
      uploadType: 'multipart', fieldName: 'voice', mimeType: 'audio/mp4',
      headers: { Authorization: 'Bearer session' }, parameters: { duration_seconds: '6' },
    });
  });

  it('uses the recorder default only when the browser provides no MIME type', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(new Blob(['bytes'])))
      .mockResolvedValueOnce(new Response('{}', { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    await profileApi.uploadVoiceIntro('session', 'blob:recording', 5);
    const file = fetcher.mock.calls[1][1].body.get('voice') as File;
    expect(file.name).toBe('voice-intro.m4a');
    expect(file.type).toBe('audio/mp4');
  });

  it('does not disguise an unsupported browser recording as M4A', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(new Blob(['bytes'], { type: 'text/plain' })));
    vi.stubGlobal('fetch', fetcher);
    await expect(profileApi.uploadVoiceIntro('session', 'blob:recording', 5)).rejects.toThrow('فرمت ضبط صدا پشتیبانی نمی‌شود');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it.each(['web', 'android'])('shows the relevant backend field validation error on %s', async platform => {
    mocks.platform.OS = platform;
    const body = { message: 'Validation failed', errors: { voice: ['فرمت ضبط پشتیبانی نمی‌شود'] } };
    mocks.upload.mockResolvedValue({ status: 422, body: JSON.stringify(body) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(new Blob(['bytes'], { type: 'audio/webm' })))
      .mockResolvedValueOnce(new Response(JSON.stringify(body), { status: 422 })));
    await expect(profileApi.uploadVoiceIntro('session', platform === 'web' ? 'blob:recording' : 'file:///intro.m4a', 5))
      .rejects.toThrow('فرمت ضبط پشتیبانی نمی‌شود');
  });
});


describe('profile bio updates', () => {
  it('sends an explicit null to clear a saved bio', async () => {
    mocks.patch.mockResolvedValue({ data: { id: 1, bio: null } });
    const profile = await profileApi.updateProfile('session', { bio: null });
    expect(mocks.patch).toHaveBeenCalledWith('/api/client/profile', { bio: null }, 'session');
    expect(JSON.stringify(mocks.patch.mock.calls[0][1])).toBe('{"bio":null}');
    expect(profile.bio).toBeNull();
  });
});


describe('selected voice introduction upload', () => {
  it.each(['web', 'android'])('uploads a chosen file without trusting a client duration on %s', async platform => {
    mocks.platform.OS = platform;
    mocks.upload.mockResolvedValue({ status: 201, body: '{"data":{"id":2}}' });
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(new Blob(['audio'], { type: 'audio/mpeg' })))
      .mockResolvedValueOnce(new Response('{"data":{"id":2}}', { status: 201 }));
    vi.stubGlobal('fetch', fetcher);
    await profileApi.uploadVoiceIntro('session', platform === 'web' ? 'blob:selected' : 'file:///intro.mp3', undefined, 'audio/mpeg', 'hidden');
    if (platform === 'web') {
      const form = fetcher.mock.calls[1][1].body as FormData;
      expect(form.has('duration_seconds')).toBe(false);
      expect(form.get('visibility')).toBe('hidden');
      expect((form.get('voice') as File).type).toBe('audio/mpeg');
    } else {
      expect(mocks.upload.mock.calls[0][1]).toMatchObject({ mimeType: 'audio/mpeg', parameters: { visibility: 'hidden' } });
      expect(mocks.upload.mock.calls[0][1].parameters).not.toHaveProperty('duration_seconds');
    }
  });
});
