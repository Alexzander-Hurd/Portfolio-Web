// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import wikiLinks from './plugins/remark-wiki-link.js';
import embedLinks from './plugins/remark-embed-link.js';
import type { RemarkPlugin } from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://www.alexhurd.com',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [
      [embedLinks as RemarkPlugin, { basePath: '/images', exts: ['avif', 'webp', 'jpg'] }],
      [wikiLinks as RemarkPlugin, { basePath: '/blog/' }],
    ],
  }
});

