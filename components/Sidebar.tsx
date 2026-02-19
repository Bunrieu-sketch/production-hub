'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Kanban, FileText, Search, Palette,
  GanttChart, Calendar, Clapperboard, Video,
  HandCoins, Users, ChevronDown, ChevronRight,
  ExternalLink, ShieldCheck,
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

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const sections: NavSection[] = [
    {
      label: 'PRODUCTION HUB',
      key: 'production',
      items: [
        { href: '/production/timeline', icon: <GanttChart size={16} />, label: 'Timeline' },
        { href: '/production/calendar', icon: <Calendar size={16} />, label: 'Calendar' },
        { href: '/production/series', icon: <Clapperboard size={16} />, label: 'Series' },
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
  ];

  const sectionOpen: Record<string, boolean> = {
    production: productionOpen,
    pipeline: pipelineOpen,
  };
  const setOpen: Record<string, (v: boolean) => void> = {
    production: setProductionOpen,
    pipeline: setPipelineOpen,
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
