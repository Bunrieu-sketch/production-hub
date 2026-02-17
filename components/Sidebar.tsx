'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, Kanban, FolderOpen, FileText, BarChart3, Video, ChevronDown, ChevronRight, Search } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [projectsOpen, setProjectsOpen] = useState(true);

  const isDashboard = pathname === '/youtube-dashboard';
  const currentPort = searchParams.get('port');
  const isSponsors = isDashboard && (currentPort === '5050' || !currentPort);
  const isVideos = isDashboard && currentPort === '5054';

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
          <Link href="/youtube-dashboard?port=5050&path=/sponsors-v2" className={`nav-item nested ${isSponsors ? 'active' : ''}`}>
            <BarChart3 size={16} />
            <span>Sponsors</span>
          </Link>
          <Link href="/youtube-dashboard?port=5054&path=/" className={`nav-item nested ${isVideos ? 'active' : ''}`}>
            <Video size={16} />
            <span>Videos</span>
          </Link>
          <Link href="/competitor-intel" className={`nav-item nested ${pathname === '/competitor-intel' ? 'active' : ''}`}>
            <Search size={16} />
            <span>Competitor Intel</span>
          </Link>
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
