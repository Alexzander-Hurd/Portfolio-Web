// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkWikiLink from 'remark-wiki-link';
import remarkObsidian from 'remark-obsidian';
import slugify from 'slugify';

// https://astro.build/config
export default defineConfig({
	site: 'https://alexhurd.com',
	integrations: [sitemap()],
	markdown: {
		remarkPlugins: [
			[remarkWikiLink, { 
				hrefTemplate: permalink => `/blog/${permalink}`,
				pageResolver: name => slugify(name, { lower: true, strict: true }),
			}],
			[remarkObsidian, {
				aliasDelimiter: '|',
			}]
		],

	},
});
