import type { Plugin } from 'unified';
import type { Node } from 'unist';
import type { Root, Text, Paragraph, Link } from 'mdast';
import { visit } from 'unist-util-visit';

interface Options {
  basePath?: string;
}

const wikiLinks: Plugin<[Options?]> = (options = {}) => {
  var basePath = options.basePath ?? '/blog/';

  if (!basePath.endsWith('/')) {
    basePath += '/';
  }

  const wikiLinkRegex = /\[\[([\w\s\-_/]+)(?:\|([^\]]+))?\]\]/g;

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
        parent.type !== 'paragraph' ||
        !('children' in parent)
      ) {
        return;
      }

      // `parent` is narrowed to Paragraph here
      const paragraph = parent as Paragraph;

      const value = node.value;
      let match: RegExpExecArray | null;
      const newNodes: (Text | Link)[] = [];
      let lastIndex = 0;

      while ((match = wikiLinkRegex.exec(value)) !== null) {
        const slug = match[1];
        const alias = match[2];
        const matchStart = match.index;

        if (matchStart > lastIndex) {
          newNodes.push({
            type: 'text',
            value: value.slice(lastIndex, matchStart),
          });
        }

        newNodes.push({
          type: 'link',
          url: `${basePath}${slug.toLowerCase().replace(/ /g, '-')}`,
          children: [{ type: 'text', value: alias ?? slug }],
        });

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < value.length) {
        newNodes.push({ type: 'text', value: value.slice(lastIndex) });
      }

      if (newNodes.length > 0) {
        paragraph.children.splice(index, 1, ...newNodes);
      }
    });
  };
};

export default wikiLinks;
