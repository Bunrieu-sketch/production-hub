'use client';

import { useState, useEffect } from 'react';
import { Search, Folder, FileText } from 'lucide-react';

interface DocFile {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  size: number;
  modified: string;
}

const categoryOrder = ['memory', 'root', 'projects', 'skills'];

export default function DocsPage() {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<DocFile[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docName, setDocName] = useState('');
  const [docSize, setDocSize] = useState(0);

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    const filtered = docs.filter(
      doc =>
        doc.name.toLowerCase().includes(search.toLowerCase()) ||
        doc.categoryLabel.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredDocs(filtered);
  }, [search, docs]);

  async function loadDocs() {
    const res = await fetch('/api/docs');
    const data = await res.json();
    setDocs(data);
    setFilteredDocs(data);
  }

  async function loadDocument(docId: string) {
    setSelectedDoc(docId);
    const res = await fetch(`/api/docs?id=${encodeURIComponent(docId)}`);
    const data = await res.json();
    if (!data.error) {
      setDocContent(data.content);
      setDocSize(data.size);
      setDocName(docId.split('/').pop() || docId);
    }
  }

  function formatDate(isoDate: string) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (Math.round(bytes / (1024 * 1024) * 10) / 10) + ' MB';
  }

  function renderMarkdown(content: string) {
    let html = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/(\u003cli>.*\u003c\/li>\n?)+/g, '<ul>$\u0026</ul>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');

    return { __html: html };
  }

  const grouped = filteredDocs.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = { label: doc.categoryLabel, docs: [] };
    }
    acc[doc.category].docs.push(doc);
    return acc;
  }, {} as Record<string, { label: string; docs: DocFile[] }>);

  return (
    <div className="docs-layout">
      <div className="docs-sidebar">
        <div className="docs-header">
          <h2>Documents</h2>
          <div className="docs-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="docs-tree">
          {categoryOrder.map(cat => {
            const group = grouped[cat];
            if (!group) return null;
            return (
              <div key={cat} className="doc-category">
                <div className="category-header">
                  <Folder size={16} />
                  <span>{group.label}</span>
                  <span className="category-count">{group.docs.length}</span>
                </div>
                <div className="category-docs">
                  {group.docs.map(doc => (
                    <div
                      key={doc.id}
                      className={`doc-item ${selectedDoc === doc.id ? 'active' : ''}`}
                      onClick={() => loadDocument(doc.id)}
                    >
                      <FileText size={14} className="doc-icon" />
                      <span className="doc-name">{doc.name}</span>
                      <span className="doc-date">{formatDate(doc.modified)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="docs-viewer">
        <div className="viewer-header">
          <span className="viewer-filename">{docName || 'Select a document'}</span>
          {docSize > 0 && (
            <div className="viewer-meta">{formatBytes(docSize)}</div>
          )}
        </div>

        <div className="viewer-content">
          {docContent ? (
            <div dangerouslySetInnerHTML={renderMarkdown(docContent)} />
          ) : (
            <div className="viewer-empty">
              <FileText size={48} />
              <p>Select a document from the sidebar to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
