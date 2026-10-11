import { mediaUrl } from './api/likes';

type Photo = Parameters<typeof mediaUrl>[0];

export function matchAvatarUrls(own: Photo, peer: Photo) {
  return { own: mediaUrl(own), peer: mediaUrl(peer) };
}
