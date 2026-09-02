import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages. For a user site (repo named <user>.github.io) keep base: '/'.
  // For a project site (e.g. github.com/<user>/homepage) set base: '/homepage'.
  site: 'https://suryathecreator.github.io',
  base: '/',
  integrations: [sitemap()],
  output: 'static',
  vite: {
    plugins: [tailwindcss()],
  },
});
