// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://sdl-map.discoverylabs.nl',
  base: '/',
  build: {
    format: 'directory'
  }
});
