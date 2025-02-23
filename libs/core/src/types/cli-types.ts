export interface RCFile {
  defaultProject?: string;
  projects?: {
    dir?: string;
    framework?: string;
    components?: string;
    configDir?: string;
  }[];
}
