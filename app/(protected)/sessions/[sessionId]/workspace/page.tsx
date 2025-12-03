import { getSession } from '@/app/actions/exploratorySessions';
import { notFound } from 'next/navigation';
import { SessionWorkspace } from '@/components/sessions/SessionWorkspace';

interface SessionWorkspacePageProps {
    params: Promise<{
        sessionId: string;
    }>;
}

export default async function SessionWorkspacePage({ params }: SessionWorkspacePageProps) {
    const { sessionId: sessionIdStr } = await params;
    const sessionId = parseInt(sessionIdStr);
    if (isNaN(sessionId)) notFound();

    let session;
    try {
        session = await getSession(sessionId);
    } catch (error) {
        notFound();
    }

    return <SessionWorkspace session={session} sessionId={sessionId} />;
}
