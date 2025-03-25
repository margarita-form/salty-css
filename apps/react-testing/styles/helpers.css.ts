import { defineViewportClamp } from '@salty-css/react/helpers';

export const fhdClamp = defineViewportClamp({ screenSize: 1920 });
export const hdClamp = defineViewportClamp({ screenSize: 1280 });
export const tabletClamp = defineViewportClamp({ screenSize: 1024 });
export const mobileClamp = defineViewportClamp({ screenSize: 600 });
