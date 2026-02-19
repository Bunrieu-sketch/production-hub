'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Folder, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface DocFile {
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

const categoryOrder = ['briefs', 'chats', 'research', 'intel', 'health', 'memory', 'root', 'projects', 'skills'];
const dateGroupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
const filterOptions = [
  { id: 'all', label: 'All' },
  { id: 'briefs', label: 'Briefs' },
  { id: 'research', label: 'Research' },
  { id: 'intel', label: 'Intel' },
  { id: 'health', label: 'Health' },
  { id: 'chats', label: 'Chats' }
];

export default function DocsPage() {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [focusedDoc, setFocusedDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [docName, setDocName] = useState('');
  const [docSize, setDocSize] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const visibleDocs = useMemo(() => {
    if (activeFilter === 'all') return docs;
    return docs.filter(doc => doc.category === activeFilter);
  }, [docs, activeFilter]);

  useEffect(() => {
    loadDocs('');
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      loadDocs(search);
    }, 200);
    return () => clearTimeout(handle);
  }, [search]);

  const grouped = useMemo(() => {
    return visibleDocs.reduce((acc, doc) => {
      if (!acc[doc.category]) {
        acc[doc.category] = { label: doc.categoryLabel, groups: {} as Record<string, DocFile[]> };
      }
      const groupLabel = getDateGroup(getDocDate(doc));
      if (!acc[doc.category].groups[groupLabel]) {
        acc[doc.category].groups[groupLabel] = [];
      }
      acc[doc.category].groups[groupLabel].push(doc);
      return acc;
    }, {} as Record<string, { label: string; groups: Record<string, DocFile[]> }>);
  }, [visibleDocs]);

  const orderedDocs = useMemo(() => {
    const flattened: DocFile[] = [];
    for (const cat of categoryOrder) {
      const group = grouped[cat];
      if (!group) continue;
      for (const dateGroup of dateGroupOrder) {
        const docsInGroup = group.groups[dateGroup];
        if (!docsInGroup?.length) continue;
        const sortedDocs = [...docsInGroup].sort((a, b) => {
          const aTime = getDocDate(a).getTime();
          const bTime = getDocDate(b).getTime();
          if (aTime !== bTime) return bTime - aTime;
          return a.name.localeCompare(b.name);
        });
        flattened.push(...sortedDocs);
      }
    }
    return flattened;
  }, [grouped]);

  useEffect(() => {
    if (visibleDocs.length && !focusedDoc) {
      setFocusedDoc(visibleDocs[0].id);
    } else if (focusedDoc && !visibleDocs.find(doc => doc.id === focusedDoc)) {
      setFocusedDoc(visibleDocs[0]?.id ?? null);
    }
  }, [visibleDocs, focusedDoc]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isFormField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isFormField && event.key !== 'Escape') {
        return;
      }

      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (search) {
          setSearch('');
          searchRef.current?.focus();
          return;
        }
        if (selectedDoc) {
          setSelectedDoc(null);
          setDocContent('');
          setDocName('');
          setDocSize(0);
          return;
        }
      }

      if (!visibleDocs.length) return;

      if (event.key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault();
        moveFocus(1);
      }
      if (event.key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault();
        moveFocus(-1);
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (focusedDoc) {
          loadDocument(focusedDoc);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedDoc, visibleDocs, search, selectedDoc]);

  async function loadDocs(query: string) {
    const url = query.trim()
      ? `/api/docs?search=${encodeURIComponent(query)}`
      : '/api/docs';
    const res = await fetch(url);
    const data = await res.json();
    setDocs(data);
  }

  async function loadDocument(docId: string) {
    setSelectedDoc(docId);
    setFocusedDoc(docId);
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

  function getDocDate(doc: DocFile) {
    return new Date(doc.date ?? doc.modified);
  }

  function getDateGroup(date: Date) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffMs = startOfToday.getTime() - startOfDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This Week';
    if (diffDays < 30) return 'This Month';
    return 'Older';
  }

  function formatBytes(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (Math.round(bytes / (1024 * 1024) * 10) / 10) + ' MB';
  }

  function highlightSnippet(snippet: string, query: string) {
    if (!query.trim()) return snippet;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'ig');
    const matchRegex = new RegExp(`^${escaped}$`, 'i');
    const parts = snippet.split(regex);
    return parts.map((part, index) =>
      matchRegex.test(part) ? (
        <mark key={`${part}-${index}`} className="doc-highlight">
          {part}
        </mark>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
  }

  function moveFocus(delta: number) {
    const index = orderedDocs.findIndex(doc => doc.id === focusedDoc);
    const nextIndex = index === -1 ? 0 : Math.min(Math.max(index + delta, 0), orderedDocs.length - 1);
    const nextDoc = orderedDocs[nextIndex];
    if (nextDoc) {
      setFocusedDoc(nextDoc.id);
    }
  }

  return (
    <div className="docs-layout">
      <div className="docs-sidebar">
        <div className="docs-header">
          <h2>Documents</h2>
          <div className="docs-search">
            <Search size={16} className="search-icon" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="docs-filters">
            {filterOptions.map(filter => (
              <button
                key={filter.id}
                type="button"
                className={`filter-button ${activeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
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
                  <span className="category-count">
                    {Object.values(group.groups).reduce((sum, docsInGroup) => sum + docsInGroup.length, 0)}
                  </span>
                </div>
                <div className="category-docs">
                  {dateGroupOrder.map(dateGroup => {
                    const docsInGroup = group.groups[dateGroup];
                    if (!docsInGroup?.length) return null;
                    const sortedDocs = [...docsInGroup].sort((a, b) => {
                      const aTime = getDocDate(a).getTime();
                      const bTime = getDocDate(b).getTime();
                      if (aTime !== bTime) return bTime - aTime;
                      return a.name.localeCompare(b.name);
                    });
                    return (
                      <div key={dateGroup} className="doc-date-group">
                        <div className="doc-date-header">{dateGroup}</div>
                        {sortedDocs.map(doc => (
                          <div
                            key={doc.id}
                            className={`doc-item ${selectedDoc === doc.id ? 'active' : ''} ${
                              focusedDoc === doc.id ? 'focused' : ''
                            }`}
                            onClick={() => loadDocument(doc.id)}
                          >
                            <FileText size={14} className="doc-icon" />
                            <div className="doc-meta">
                              <span className="doc-name">{doc.name}</span>
                              {doc.snippet && (
                                <span className="doc-snippet">
                                  {highlightSnippet(doc.snippet, search)}
                                </span>
                              )}
                            </div>
                            <span className="doc-date">{formatDate(doc.date ?? doc.modified)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
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
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {docContent}
            </ReactMarkdown>
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
