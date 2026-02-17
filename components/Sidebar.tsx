'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Kanban, FolderOpen, FileText } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

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
      
      <Link href="/projects" className={`nav-item ${pathname === '/projects' ? 'active' : ''}`}>
        <FolderOpen size={18} />
        <span>Projects</span>
      </Link>
      
      <Link href="/docs" className={`nav-item ${pathname === '/docs' ? 'active' : ''}`}>
        <FileText size={18} />
        <span>Docs</span>
      </Link>
    </nav>
  );
}
