import type { Plugin } from 'unified';
import type { Node } from 'unist';
import type { Root, Text, Paragraph, Link, Html } from 'mdast';
import { visit } from 'unist-util-visit';

import fs from 'fs';
import path from 'path';
const imageDir = process.env.IMAGE_DIR ?? path.join(process.cwd(), 'public/');;

interface Options {
    basePath?: string;
    exts?: string[];
}

const embedLinks: Plugin<[Options?]> = (options = {}) => {
    var basePath = options.basePath ?? '/images/';

    const exts = options.exts ?? ['jpg', 'jpeg', 'png', 'gif', 'svg'];

    if (!basePath.endsWith('/')) {
        basePath += '/';
    }

    const embedRegex = /!\[\[([\w\s\-_\/\.]+)(?:\|([^\]]+))?\]\]/g;

    return (tree: Node) => {
        // We expect `tree` to be Root for sure, but type as Node to satisfy Transformer<Node, Node>
        if (tree.type !== 'root' || !('children' in tree)) return;

        // TypeScript won't narrow automatically, so do this cast
        const root = tree as Root;

        visit(root, 'text', (node: Text, index: number | null | undefined, parent: Node | undefined) => {
            // We only handle if parent is a paragraph with children
            if (
                typeof index !== 'number' ||
                !parent || 
                parent.type === 'code' ||
                parent.type === 'inlineCode'||
                !('children' in parent)
            ) {
                return;
            }

            // `parent` is cast as any object with children as a node array
            const paragraph = parent as { children: Node[] };

            const value = node.value;
            let match: RegExpExecArray | null;
            const newNodes: (Text | Link | Html)[] = [];

            let lastIndex = 0;

            while ((match = embedRegex.exec(value)) !== null) {
                const start = match.index;
                const file = match[1];
                const slug = file.split('.').slice(0, -1).join('.').toLowerCase().replace(/ /g, '-');
                const extension = file.split('.').pop();
                const alt = match[2] || slug;
                const src = basePath + slug;

                if (start > lastIndex) {
                    newNodes.push({
                        type: 'text',
                        value: value.slice(lastIndex, start),
                    });
                }

                const sources = exts
                    .filter((ext) => {
                        console.log(path.join(imageDir, `${src}.${ext}`));
                        return fs.existsSync(path.join(imageDir, `${src}.${ext}`));
                    })
                    .map((ext) => {
                        return `<source srcset="${src}.${ext}" type="image/${ext === 'jpg' ? 'jpeg' : ext}">`;
                    })
                    .join('\n');

                const picture = `
                <picture>
                    ${sources}
                    <img src="${src}.${extension}" alt="${alt}">
                </picture>
                `;

                newNodes.push({
                    type: 'html',
                    value: picture,
                });

                lastIndex = embedRegex.lastIndex;
            }

            if (lastIndex < value.length) {
                newNodes.push({
                    type: 'text',
                    value: value.slice(lastIndex),
                });
            }

            if (newNodes.length > 0 && typeof index === 'number') {
                paragraph.children.splice(index, 1, ...newNodes);
            }
        });
    };
};

export default embedLinks;