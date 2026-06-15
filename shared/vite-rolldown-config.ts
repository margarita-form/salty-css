export const rolldownExternal = [
  // Node.js builtins — `node:` protocol + bare specifiers (with subpaths)
  /^node:/,
  /^(path|fs|readline|child_process|vm)(\/.*)?$/,
  /^module$/,

  // Salty CSS internal packages
  /^@salty-css\/.+/,

  // Build tooling
  /^esbuild(\/.*)?$/,
  /^winston(\/.*)?$/,
  /^vite(\/.*)?$/,
  'webpack',
  'estree',

  // Frameworks (incl. jsx-runtime / *-dom subpaths)
  /^react(\/.*)?$/,
  /^react-dom(\/.*)?$/,
  /^next(\/.*)?$/,
  /^astro(\/.*)?$/,
  /^astro-dom(\/.*)?$/,

  // CLI / misc deps
  'commander',
  'ejs',
  'ora',
  /^typescript(\/.*)?$/,
  /^vite-node(\/.*)?$/,

  // Helpers
  /^color(\/.*)?$/,
];

export const rolldownOptimization = {
  inlineConst: true,
};

export const rolldown = {
  external: rolldownExternal,
  optimization: rolldownOptimization,
};
