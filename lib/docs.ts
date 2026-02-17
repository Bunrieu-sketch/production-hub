import fs from 'fs';
import path from 'path';

const WORKSPACE_ROOT = '/Users/montymac/.openclaw/workspace';

export interface DocFile {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  size: number;
  modified: string;
}

export function listDocuments(): DocFile[] {
  const docs: DocFile[] = [];
  
  // Memory files
  const memoryDir = path.join(WORKSPACE_ROOT, 'memory');
  if (fs.existsSync(memoryDir)) {
    for (const f of fs.readdirSync(memoryDir).sort().reverse()) {
      if (f.endsWith('.md')) {
        const filepath = path.join(memoryDir, f);
        const stat = fs.statSync(filepath);
        docs.push({
          id: `memory/${f}`,
          name: f,
          category: 'memory',
          categoryLabel: 'Memory / Chat History',
          size: stat.size,
          modified: stat.mtime.toISOString()
        });
      }
    }
  }
  
  // Root level markdown files
  for (const f of fs.readdirSync(WORKSPACE_ROOT)) {
    if (f.endsWith('.md') && fs.statSync(path.join(WORKSPACE_ROOT, f)).isFile()) {
      const filepath = path.join(WORKSPACE_ROOT, f);
      const stat = fs.statSync(filepath);
      docs.push({
        id: `root/${f}`,
        name: f,
        category: 'root',
        categoryLabel: 'Workspace Root',
        size: stat.size,
        modified: stat.mtime.toISOString()
      });
    }
  }
  
  // Skill files
  const skillsDir = path.join(WORKSPACE_ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      const skillPath = path.join(skillsDir, skill);
      if (fs.statSync(skillPath).isDirectory()) {
        for (const root of walkDir(skillPath)) {
          if (root.endsWith('.md')) {
            const relPath = path.relative(WORKSPACE_ROOT, root);
            const stat = fs.statSync(root);
            docs.push({
              id: `project/${relPath}`,
              name: `${skill}/${path.basename(root)}`,
              category: 'skills',
              categoryLabel: 'Skills',
              size: stat.size,
              modified: stat.mtime.toISOString()
            });
          }
        }
      }
    }
  }
  
  // Project READMEs
  for (const item of fs.readdirSync(WORKSPACE_ROOT)) {
    const itemPath = path.join(WORKSPACE_ROOT, item);
    if (fs.statSync(itemPath).isDirectory() && !['skills', 'memory', '.git', 'venv', '__pycache__', 'node_modules', '.next'].includes(item)) {
      const readmePath = path.join(itemPath, 'README.md');
      if (fs.existsSync(readmePath)) {
        const stat = fs.statSync(readmePath);
        docs.push({
          id: `project/${item}/README.md`,
          name: `${item}/README.md`,
          category: 'projects',
          categoryLabel: 'Projects',
          size: stat.size,
          modified: stat.mtime.toISOString()
        });
      }
    }
  }
  
  return docs;
}

export function getDocument(docId: string): { id: string; content: string; size: number } | null {
  const parts = docId.split('/', 1);
  if (parts.length !== 1 && parts.length !== 2) return null;
  
  const category = parts[0];
  const filename = docId.slice(category.length + 1);
  
  let filepath: string;
  if (category === 'memory') {
    filepath = path.join(WORKSPACE_ROOT, 'memory', filename);
  } else if (category === 'root') {
    filepath = path.join(WORKSPACE_ROOT, filename);
  } else if (category === 'skills' || category === 'project') {
    filepath = path.join(WORKSPACE_ROOT, filename);
  } else {
    return null;
  }
  
  // Security check
  const realFilepath = fs.realpathSync(filepath);
  const realWorkspace = fs.realpathSync(WORKSPACE_ROOT);
  if (!realFilepath.startsWith(realWorkspace)) {
    return null;
  }
  
  if (!fs.existsSync(filepath)) {
    return null;
  }
  
  const content = fs.readFileSync(filepath, 'utf-8');
  return { id: docId, content, size: content.length };
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
