import { defineMediaQuery } from '@salty-css/react/config';

export const largePortrait = defineMediaQuery((media) => media.portrait.and.minWidth(600));
export const largeMobileDown = defineMediaQuery((media) => media.maxWidth(600));
