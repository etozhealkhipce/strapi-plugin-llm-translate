import type { TranslatableSlot } from './extract';

/**
 * Strapi's "blocks" (rich text) field is a tree of nodes. Block-level nodes
 * (paragraph, heading, list, list-item, quote, link, ...) carry their
 * content in a `children` array; leaf nodes carry the actual text in a
 * `type: "text"` node's `text` property (with sibling `bold`/`italic`/...
 * mark flags we must leave untouched).
 *
 * We deep-clone the incoming blocks once and hand back closures ("slots")
 * that read/write the text of each leaf directly on the clone. This avoids
 * having to re-parse string paths back into the tree: the clone IS the
 * data we eventually send to Strapi, and the slots mutate it in place.
 */
export function collectBlocksSlots(
  blocks: unknown,
  keyPrefix: string,
): { clonedBlocks: unknown[]; slots: TranslatableSlot[] } {
  const clonedBlocks: any[] = Array.isArray(blocks) ? JSON.parse(JSON.stringify(blocks)) : [];
  const slots: TranslatableSlot[] = [];

  const walk = (nodes: any[], prefix: string) => {
    nodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') return;
      const path = `${prefix}.${index}`;

      if (node.type === 'text' && typeof node.text === 'string' && node.text.trim() !== '') {
        slots.push({
          key: path,
          get: () => node.text,
          set: (value: string) => {
            node.text = value;
          },
        });
      }

      if (Array.isArray(node.children)) {
        walk(node.children, `${path}.c`);
      }
    });
  };

  walk(clonedBlocks, keyPrefix);

  return { clonedBlocks, slots };
}
