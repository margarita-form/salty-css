export interface RCFile {
  defaultProject?: string;
  projects?: {
    dir?: string;
    framework?: string;
    components?: string;
    configDir?: string;
    saltygenDir?: string;
    /**
     * Optional glob patterns (relative to the project root) that limit which files the
     * compiler scans. When set and non-empty, only matching files are compiled. When
     * omitted, the whole project is scanned. Supports `**`, `*`, and `?`.
     */
    include?: string[];
    /**
     * Optional glob patterns (relative to the project root) that are skipped by the
     * compiler, in addition to the always-skipped `node_modules` and `saltygen` folders.
     * Exclusions take precedence over `include`. Supports `**`, `*`, and `?`.
     */
    exclude?: string[];
  }[];
}
