import { ToolsView } from '@/components/tools/ToolsView';

export default async function ProjectToolsPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await params;
    return <ToolsView projectId={Number(projectId)} />;
}
