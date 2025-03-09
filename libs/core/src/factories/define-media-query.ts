import { media, MediaQueryFactory } from '../css/media';

type MediaDefinitionCallback = (media: MediaQueryFactory) => ReturnType<MediaQueryFactory['next']>;

export const defineMediaQuery = (mediaFactory: MediaDefinitionCallback) => {
  return mediaFactory(media);
};
