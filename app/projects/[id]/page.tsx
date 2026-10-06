import ProjectDetailClient from './ProjectDetailClient';
import { MOCK_PROJECTS } from '@/lib/mock-data';

export function generateStaticParams() {
  return [
    ...MOCK_PROJECTS.map((p) => ({ id: p.id })),
    { id: 'view' },
  ];
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  return <ProjectDetailClient initialId={params.id} />;
}
