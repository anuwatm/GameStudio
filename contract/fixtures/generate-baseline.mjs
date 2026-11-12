import { readFileSync } from 'node:fs';

const project = JSON.parse(readFileSync(new URL('./summer-house.json', import.meta.url), 'utf8'));
const graphId = project.entryGraphId;
const id = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const count = 2000;
const first = 10000;

project.name = 'Baseline 2000';
project.variables = [];
project.activities = [];
project.events = [];
project.graphs = [{ id: graphId, kind: 'main', entryNodeId: id(first) }];
project.nodes = Array.from({ length: count }, (_, index) => {
  const node = { id: id(first + index), graphId };
  return index === count - 1
    ? { ...node, kind: 'end', mode: 'ending' }
    : { ...node, kind: 'scene', lines: [{ text: 'Summer House', characterId: null }], assetIds: [], effects: [], choices: [] };
});
project.edges = Array.from({ length: count - 1 }, (_, index) => ({
  id: id(20000 + index),
  from: id(first + index),
  port: 'next',
  to: id(first + index + 1),
}));
process.stdout.write(JSON.stringify(project) + '\n');
