import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getDocument } from '@/lib/docs';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const DOC_ID = 'skills/skills/sponsor-crm/SKILL.md';

export default function SponsorCrmPage() {
  const doc = getDocument(DOC_ID);
  let content = doc?.content || '';
  if (!content) {
    const fallbackPath = path.join(process.cwd(), 'skills', 'sponsor-crm', 'SKILL.md');
    if (fs.existsSync(fallbackPath)) {
      const raw = fs.readFileSync(fallbackPath, 'utf-8');
      content = matter(raw).content;
    }
  }
  if (!content) {
    content = 'Sponsor CRM rules not found.';
  }

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600 }}>Sponsor CRM Rules</h1>
        <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          Single source of truth for sponsorship pipeline rules and CPM tracking.
        </p>
      </div>

      <div className="docs-viewer">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>

      <div style={{ marginTop: 24, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
        <div className="section-label" style={{ marginBottom: 8 }}>Daily Sync Cron (7:30am)</div>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>
          Configure your server or cron runner to call the YouTube sync endpoint each morning.
        </div>
        <pre style={{ margin: 0 }}>
          <code>30 7 * * * curl -s https://your-domain.com/api/youtube/sync</code>
        </pre>
      </div>
    </div>
  );
}
