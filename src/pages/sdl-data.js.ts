// Single source of truth for the SDL dataset.
// Emits /sdl-data.js as a static file that defines window.SDL_DATA, loaded
// synchronously by public/map-legacy.html *before* map-i18n.js (which mutates
// SDL_DATA in place). The Astro pages (list/timeline/entry) import the same
// src/data/sdl_data.json directly, so the map and the pages can never drift.
import data from '../data/sdl_data.json';

export const GET = () =>
  new Response(`window.SDL_DATA = ${JSON.stringify(data)};`, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });
