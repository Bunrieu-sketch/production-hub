'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Kanban, FolderOpen, FileText, BarChart3, ChevronDown, ChevronRight, Search } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [projectsOpen, setProjectsOpen] = useState(true);

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <LayoutGrid size={22} />
        <span className="logo-text">Mission Control</span>
      </div>
      
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <Kanban size={18} />
        <span>Tasks</span>
      </Link>
      
      <button
        className={`nav-item nav-toggle ${pathname === '/projects' ? 'active' : ''}`}
        onClick={() => setProjectsOpen(!projectsOpen)}
      >
        <FolderOpen size={18} />
        <span>Projects</span>
        {projectsOpen ? <ChevronDown size={14} className="toggle-icon" /> : <ChevronRight size={14} className="toggle-icon" />}
      </button>

      {projectsOpen && (
        <div className="nav-nested">
          <Link href="/youtube-dashboard?path=/sponsors-v2" className={`nav-item nested ${pathname === '/youtube-dashboard' ? 'active' : ''}`}>
            <BarChart3 size={16} />
            <span>Sponsors</span>
          </Link>
          <Link href="/youtube-dashboard?path=/videos" className={`nav-item nested ${pathname === '/youtube-dashboard' && false ? 'active' : ''}`}>
            <BarChart3 size={16} />
            <span>Videos</span>
          </Link>
          <a href="http://localhost:5052" target="_blank" rel="noopener noreferrer" className="nav-item nested">
            <Search size={16} />
            <span>Competitor Intel</span>
          </a>
          <Link href="/projects" className={`nav-item nested ${pathname === '/projects' ? 'active' : ''}`}>
            <FolderOpen size={16} />
            <span>All Projects</span>
          </Link>
        </div>
      )}
      
      <Link href="/docs" className={`nav-item ${pathname === '/docs' ? 'active' : ''}`}>
        <FileText size={18} />
        <span>Docs</span>
      </Link>
    </nav>
  );
}
