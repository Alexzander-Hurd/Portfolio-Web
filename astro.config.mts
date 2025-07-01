// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import wikiLinks from './plugins/remark-wiki-link.js';
import embedLinks from './plugins/remark-embed-link.js';
import type { RemarkPlugin } from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://alexhurd.com',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [
      [embedLinks as RemarkPlugin, { basePath: '/images', exts: ['jpg', 'jpeg', 'avif', 'webp'] }],
      [wikiLinks as RemarkPlugin, { basePath: '/blog/' }],
    ],
  },
});

