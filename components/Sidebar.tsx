'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Kanban, FileText, Search, Palette,
  GanttChart, Calendar, Clapperboard, Video, Route,
  HandCoins, Users, ChevronDown, ChevronRight,
  ExternalLink, ShieldCheck, Gavel, FolderOpen, BarChart3,
} from 'lucide-react';

interface NavSection {
  label: string;
  key: string;
  items: { href: string; icon: React.ReactNode; label: string; external?: boolean }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [productionOpen, setProductionOpen] = useState(true);
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const sections: NavSection[] = [
    {
      label: 'PRODUCTION HUB',
      key: 'production',
      items: [
        { href: '/production', icon: <LayoutGrid size={16} />, label: 'Dashboard' },
        { href: '/production/series', icon: <Clapperboard size={16} />, label: 'Productions' },
        { href: '/production/calendar', icon: <Calendar size={16} />, label: 'Calendar' },
        { href: '/production/timeline', icon: <GanttChart size={16} />, label: 'Timeline' },
        { href: '/production/roadmap', icon: <Route size={16} />, label: 'Roadmap' },
        { href: '/production/episodes', icon: <Video size={16} />, label: 'Episodes' },
      ],
    },
    {
      label: 'PIPELINE',
      key: 'pipeline',
      items: [
        { href: '/pipeline/sponsors', icon: <HandCoins size={16} />, label: 'Sponsors' },
        { href: '/pipeline/people', icon: <Users size={16} />, label: 'People' },
      ],
    },
    {
      label: 'PROJECTS',
      key: 'projects',
      items: [
        { href: 'http://localhost:3001', icon: <Gavel size={16} />, label: 'Auction Viewer', external: true },
      ],
    },
  ];

  const sectionOpen: Record<string, boolean> = {
    production: productionOpen,
    pipeline: pipelineOpen,
    projects: projectsOpen,
  };
  const setOpen: Record<string, (v: boolean) => void> = {
    production: setProductionOpen,
    pipeline: setPipelineOpen,
    projects: setProjectsOpen,
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        <LayoutGrid size={22} />
        <span className="logo-text">Mission Control</span>
      </div>

      {/* Tasks — home */}
      <Link href="/" className={`nav-item ${pathname === '/' ? 'active' : ''}`}>
        <Kanban size={18} />
        <span>Tasks</span>
      </Link>

      {/* Collapsible sections */}
      {sections.map((section) => (
        <div key={section.key}>
          <button
            className="nav-section-toggle"
            onClick={() => setOpen[section.key](!sectionOpen[section.key])}
          >
            <span className="nav-section-label">{section.label}</span>
            {sectionOpen[section.key]
              ? <ChevronDown size={12} />
              : <ChevronRight size={12} />}
          </button>
          {sectionOpen[section.key] && (
            <div className="nav-nested">
              {section.items.map((item) =>
                item.external ? (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-item nested"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item nested ${isActive(item.href) ? 'active' : ''}`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      ))}

      {/* Bottom links */}
      <div className="nav-divider" />

      <Link href="/analytics" className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}>
        <BarChart3 size={18} />
        <span>Analytics</span>
      </Link>

      <Link href="/media-kit/preview" className={`nav-item nested ${isActive('/media-kit') ? 'active' : ''}`}>
        <FileText size={16} />
        <span>Media Kit</span>
      </Link>

      <a
        href="http://localhost:5052"
        target="_blank"
        rel="noopener noreferrer"
        className="nav-item"
      >
        <Search size={18} />
        <span>Competitor Intel</span>
        <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: 0.4 }} />
      </a>

      <Link href="/health-council" className={`nav-item ${isActive('/health-council') ? 'active' : ''}`}>
        <ShieldCheck size={18} />
        <span>Health Council</span>
      </Link>

      <Link href="/docs" className={`nav-item ${isActive('/docs') ? 'active' : ''}`}>
        <FileText size={18} />
        <span>Docs</span>
      </Link>

      <Link href="/design-system" className={`nav-item ${isActive('/design-system') ? 'active' : ''}`}>
        <Palette size={18} />
        <span>Design System</span>
      </Link>
    </nav>
  );
}
