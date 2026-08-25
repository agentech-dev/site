import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://agentech.dev',
  output: 'static',
  trailingSlash: 'never',
  compressHTML: true,
  build: { format: 'file' },
});
