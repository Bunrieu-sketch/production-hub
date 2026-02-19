import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const WORKSPACE_ROOT = '/Users/montymac/.openclaw/workspace';
const COMPETITOR_ROOT = path.resolve(WORKSPACE_ROOT, '..', 'competitor-tracker');
const COMPETITOR_REPORTS = path.join(COMPETITOR_ROOT, 'reports');
const HEALTH_REPORTS = path.join(WORKSPACE_ROOT, 'health-council', 'reports');

export interface DocFile {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  size: number;
  modified: string;
  date?: string;
  type?: string;
  tags?: string[];
  snippet?: string;
}

export function listDocuments(): DocFile[] {
  const docs: DocFile[] = [];

  docs.push(
    ...collectDocsInDir(path.join(WORKSPACE_ROOT, 'memory', 'briefs'), 'briefs', '📋 Daily Briefs', 'briefs', true)
  );
  docs.push(
    ...collectDocsInDir(path.join(WORKSPACE_ROOT, 'memory', 'chats'), 'chats', '💬 Chat History', 'chats')
  );
  docs.push(
    ...collectDocsInDir(path.join(WORKSPACE_ROOT, 'memory', 'research'), 'research', '🔬 Research', 'research')
  );
  docs.push(
    ...collectDocsInDir(COMPETITOR_REPORTS, 'intel', '📊 Competitor Intel', 'intel')
  );
  docs.push(
    ...collectDocsInDir(HEALTH_REPORTS, 'health', '🏛️ Health Reports', 'health', true)
  );

  // Memory files (root of memory)
  docs.push(
    ...collectDocsInDir(path.join(WORKSPACE_ROOT, 'memory'), 'memory', '🧠 Memory', 'memory', false, true)
  );

  // Root level markdown files
  for (const f of safeReadDir(WORKSPACE_ROOT)) {
    const filepath = path.join(WORKSPACE_ROOT, f);
    if (f.endsWith('.md') && fs.statSync(filepath).isFile()) {
      docs.push(
        buildDocFile({
          id: `root/${f}`,
          name: f,
          category: 'root',
          categoryLabel: '📁 Workspace Root',
          filepath
        })
      );
    }
  }

  // Skill files
  const skillsDir = path.join(WORKSPACE_ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of safeReadDir(skillsDir)) {
      const skillPath = path.join(skillsDir, skill);
      if (fs.statSync(skillPath).isDirectory()) {
        for (const root of walkDir(skillPath)) {
          if (root.endsWith('.md')) {
            const relPath = path.relative(WORKSPACE_ROOT, root);
            docs.push(
              buildDocFile({
                id: `skills/${relPath}`,
                name: `${skill}/${path.basename(root)}`,
                category: 'skills',
                categoryLabel: '🧩 Skills',
                filepath: root
              })
            );
          }
        }
      }
    }
  }

  // Project READMEs
  for (const item of safeReadDir(WORKSPACE_ROOT)) {
    const itemPath = path.join(WORKSPACE_ROOT, item);
    if (fs.existsSync(itemPath) && fs.statSync(itemPath).isDirectory() && !['skills', 'memory', '.git', 'venv', '__pycache__', 'node_modules', '.next'].includes(item)) {
      const readmePath = path.join(itemPath, 'README.md');
      if (fs.existsSync(readmePath)) {
        docs.push(
          buildDocFile({
            id: `project/${item}/README.md`,
            name: `${item}/README.md`,
            category: 'projects',
            categoryLabel: '🗂️ Projects',
            filepath: readmePath
          })
        );
      }
    }
  }

  return sortDocs(docs);
}

export function getDocument(docId: string): { id: string; content: string; size: number } | null {
  const category = docId.split('/', 1)[0];
  const filename = docId.slice(category.length + 1);

  let filepath: string;
  if (category === 'memory') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', filename);
  } else if (category === 'briefs') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', 'briefs', filename);
  } else if (category === 'chats') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', 'chats', filename);
  } else if (category === 'research') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', 'research', filename);
  } else if (category === 'intel') {
    filepath = path.join(COMPETITOR_REPORTS, filename);
  } else if (category === 'health') {
    filepath = path.join(HEALTH_REPORTS, filename);
  } else if (category === 'root') {
    filepath = path.join(WORKSPACE_ROOT, filename);
  } else if (category === 'skills' || category === 'project') {
    filepath = path.join(WORKSPACE_ROOT, filename);
  } else {
    return null;
  }

  if (!fs.existsSync(filepath)) {
    return null;
  }

  // Security check
  const realFilepath = fs.realpathSync(filepath);
  if (!isAllowedPath(realFilepath)) {
    return null;
  }

  const raw = fs.readFileSync(filepath, 'utf-8');
  const parsed = matter(raw);
  return { id: docId, content: parsed.content, size: parsed.content.length };
}

export function searchDocuments(query: string): DocFile[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return listDocuments();

  const docs = listDocuments();
  const filtered: DocFile[] = [];
  for (const doc of docs) {
    const content = getDocumentContent(doc);
    const haystack = `${doc.name}\n${content}`.toLowerCase();
    if (haystack.includes(trimmed)) {
      filtered.push(doc);
    }
  }
  return sortDocs(filtered);
}

function getDocumentContent(doc: DocFile): string {
  const category = doc.id.split('/', 1)[0];
  const filename = doc.id.slice(category.length + 1);
  let filepath: string;
  if (category === 'memory') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', filename);
  } else if (category === 'briefs') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', 'briefs', filename);
  } else if (category === 'chats') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', 'chats', filename);
  } else if (category === 'research') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', 'research', filename);
  } else if (category === 'intel') {
    filepath = path.join(COMPETITOR_REPORTS, filename);
  } else if (category === 'health') {
    filepath = path.join(HEALTH_REPORTS, filename);
  } else if (category === 'root') {
    filepath = path.join(WORKSPACE_ROOT, filename);
  } else {
    filepath = path.join(WORKSPACE_ROOT, filename);
  }
  if (!fs.existsSync(filepath)) {
    return '';
  }
  const raw = fs.readFileSync(filepath, 'utf-8');
  return matter(raw).content;
}

function collectDocsInDir(
  dir: string,
  category: string,
  categoryLabel: string,
  idPrefix: string,
  preferFilenameDate = false,
  rootOnly = false
): DocFile[] {
  if (!fs.existsSync(dir)) return [];
  const docs: DocFile[] = [];
  for (const f of safeReadDir(dir).sort().reverse()) {
    const filepath = path.join(dir, f);
    if (rootOnly && fs.statSync(filepath).isDirectory()) {
      continue;
    }
    if (f.endsWith('.md') && fs.statSync(filepath).isFile()) {
      docs.push(
        buildDocFile({
          id: `${idPrefix}/${f}`,
          name: f,
          category,
          categoryLabel,
          filepath,
          preferFilenameDate
        })
      );
    }
  }
  return docs;
}

function buildDocFile(options: {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  filepath: string;
  preferFilenameDate?: boolean;
}): DocFile {
  const stat = fs.statSync(options.filepath);
  const raw = fs.readFileSync(options.filepath, 'utf-8');
  const parsed = matter(raw);
  const filenameDate = parseDateFromFilename(options.name);
  const frontmatterDate = parseFrontmatterDate(parsed.data?.date);
  const date = options.preferFilenameDate
    ? filenameDate ?? frontmatterDate ?? stat.mtime
    : frontmatterDate ?? filenameDate ?? stat.mtime;
  const tags = normalizeTags(parsed.data?.tags);
  const snippet = buildSnippet(parsed.content);

  return {
    id: options.id,
    name: options.name,
    category: options.category,
    categoryLabel: options.categoryLabel,
    size: stat.size,
    modified: stat.mtime.toISOString(),
    date: date ? date.toISOString() : undefined,
    type: typeof parsed.data?.type === 'string' ? parsed.data.type : undefined,
    tags,
    snippet
  };
}

function buildSnippet(content: string): string {
  let text = content;
  text = text.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]*`/g, ' ');
  text = text.replace(/!\[[^\]]*]\([^)]+\)/g, ' ');
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  text = text.replace(/^>\s?/gm, '');
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/^[-*+]\s+/gm, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text.slice(0, 100);
}

function parseDateFromFilename(filename: string): Date | null {
  const match = filename.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return isNaN(date.getTime()) ? null : date;
}

function parseFrontmatterDate(value: unknown): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    const tags = value.map(tag => String(tag)).filter(Boolean);
    return tags.length ? tags : undefined;
  }
  if (typeof value === 'string') {
    return [value];
  }
  return undefined;
}

function sortDocs(docs: DocFile[]): DocFile[] {
  return docs.sort((a, b) => {
    const aDate = new Date(a.date ?? a.modified).getTime();
    const bDate = new Date(b.date ?? b.modified).getTime();
    if (aDate !== bDate) return bDate - aDate;
    return a.name.localeCompare(b.name);
  });
}

function safeReadDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir);
}

function isAllowedPath(realFilepath: string): boolean {
  const realWorkspace = fs.realpathSync(WORKSPACE_ROOT);
  const realCompetitor = fs.existsSync(COMPETITOR_ROOT) ? fs.realpathSync(COMPETITOR_ROOT) : null;
  const realHealth = fs.existsSync(HEALTH_REPORTS) ? fs.realpathSync(HEALTH_REPORTS) : null;
  if (realFilepath.startsWith(realWorkspace)) {
    return true;
  }
  if (realCompetitor && realFilepath.startsWith(realCompetitor)) {
    return true;
  }
  if (realHealth && realFilepath.startsWith(realHealth)) {
    return true;
  }
  return false;
}

function* walkDir(dir: string): Generator<string> {
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      yield* walkDir(fullPath);
    } else {
      yield fullPath;
    }
  }
}
