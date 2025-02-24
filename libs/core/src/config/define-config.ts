import { SaltyConfig } from '../types/config-types';

export const defineConfig = <T extends SaltyConfig>(config: T) => {
  return config;
};
