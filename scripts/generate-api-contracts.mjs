import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
const root = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('../../back/src/main/resources/contracts/', import.meta.url));
const server = await createServer({ root, server: { middlewareMode: true, hmr: false, ws: false } });
try {
  const schemas = await server.ssrLoadModule('/src/domain/schemas.js');
  const { rawAppFixture } = await server.ssrLoadModule('/src/data/fixtures/appFixture.js');
  const names = { work: 'Work', section: 'MenuSection', menu: 'MenuItem', character: 'Character', world: 'World', plot: 'PlotScene', setting: 'Setting', idea: 'Idea', memo: 'Memo', content: 'ContentEntry', relation: 'Relation' };
  const contracts = Object.fromEntries(Object.entries(names).map(([kind, name]) => [kind, z.toJSONSchema(schemas[name + 'Schema'], { unrepresentable: 'any' })]));
  writeFileSync(output + 'schemas.json', JSON.stringify(contracts, null, 2) + '\n');
  writeFileSync(output + 'default-menu.json', JSON.stringify({ sections: rawAppFixture.menuSections, items: rawAppFixture.menuItems }, null, 2) + '\n');
} finally {
  await server.close();
}
