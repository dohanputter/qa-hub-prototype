
import { getProjectSessions } from '@/app/actions/exploratorySessions';
import { SessionsList } from '@/components/sessions/SessionsList';

interface SessionsPageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default async function SessionsPage({ params }: SessionsPageProps) {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const sessions = await getProjectSessions(projectId);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Exploratory Sessions</h1>
                    <p className="text-muted-foreground">History of exploratory testing sessions.</p>
                </div>
            </div>

            <SessionsList sessions={sessions} projectId={projectId} />
        </div>
    );
}
