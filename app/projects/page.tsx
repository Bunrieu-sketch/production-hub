import { FolderKanban, BarChart3, Plane, FileText } from 'lucide-react';

interface Project {
  name: string;
  description: string;
  port: number;
  icon: React.ElementType;
  links?: { label: string; path: string }[];
}

const projects: Project[] = [
  {
    name: 'YouTube Dashboard',
    description: 'Video pipeline, sponsor CRM, and deal tracking',
    port: 5050,
    icon: BarChart3,
    links: [
      { label: 'Dashboard', path: '/' },
      { label: 'Videos', path: '/videos' },
      { label: 'Sponsors', path: '/sponsors' },
      { label: 'Guide', path: '/crm-guide' },
    ]
  },
  {
    name: 'Competitor Intel',
    description: 'YouTube competitor analysis and outliers',
    port: 5052,
    icon: FolderKanban,
  },
  {
    name: 'Mission Control',
    description: 'Task management and project hub',
    port: 5053,
    icon: FileText,
  },
  {
    name: 'Travel Research',
    description: 'Flight/hotel/permits research (WIP)',
    port: 5051,
    icon: Plane,
  },
];

export default function ProjectsPage() {
  return (
    <div className="projects-page">
      <h1>Projects</h1>
      <div className="project-grid">
        {projects.map(project => (
          <div key={project.port} className="project-card-wrapper">
            <a
              href={`http://localhost:${project.port}`}
              target="_blank"
              rel="noopener noreferrer"
              className="project-card"
            >
              <div className="project-icon">
                <project.icon size={24} />
              </div>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <span className="project-port">Port {project.port}</span>
            </a>
            {project.links && (
              <div className="project-links">
                {project.links.map(link => (
                  <a
                    key={link.path}
                    href={`http://localhost:${project.port}${link.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="project-link"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
