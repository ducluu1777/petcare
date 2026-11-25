import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { parseKnowledgeMarkdown } from './ai-knowledge.documents.js';

// Public customer documents only. Nest copies these assets alongside compiled JS.
const directory = fileURLToPath(new URL('./knowledge/', import.meta.url));
export const PETCARE_KNOWLEDGE_BASE = readdirSync(directory)
  .filter(name => name.endsWith('.md'))
  .sort()
  .flatMap(name => parseKnowledgeMarkdown(name, readFileSync(join(directory, name), 'utf8')));
