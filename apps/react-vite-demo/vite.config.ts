import { saltyPlugin } from '@salty-css/vite';
import { defineConfig } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';

// https://vite.dev/config/
export default defineConfig({
  plugins: [saltyPlugin(__dirname), react(), babel({ presets: [reactCompilerPreset()] })],
});
