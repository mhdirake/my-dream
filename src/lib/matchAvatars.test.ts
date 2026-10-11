import { describe, expect, it } from 'vitest';
import { matchAvatarUrls } from './matchAvatars';

describe('mutual match profile photos', () => {
  it('normalizes both participants independently without swapping them', () => {
    expect(matchAvatarUrls({ urls: { thumbnail: 'https://cdn.example/me.jpg' } }, '//cdn.example/peer.jpg'))
      .toEqual({ own: 'https://cdn.example/me.jpg', peer: 'https://cdn.example/peer.jpg' });
  });

  it('keeps the available participant photo when the other has no uploaded photo', () => {
    expect(matchAvatarUrls(null, 'https://cdn.example/peer.jpg'))
      .toEqual({ own: null, peer: 'https://cdn.example/peer.jpg' });
  });
});
