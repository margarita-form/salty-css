export const pseudoTypoRegex =
  /^&(hover|focus(-(visible|within))?|active|visited|checked|disabled|enabled|empty|target|first-child|last-child|first-of-type|last-of-type|placeholder|placeholder-shown|root)\b/;
export const templateLiteralLeftoverRegex = /\$\{[^}]+\}/;
export const bareAtRuleRegex = /^@(media|supports|container|layer)\s*$/;
