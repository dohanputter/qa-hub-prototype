import { auth } from '@/auth';
import { updateIssueLabels } from '@/lib/gitlab';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { projectId, issueIid, addLabels, removeLabels } = await req.json();
        await updateIssueLabels(projectId, issueIid, session.accessToken, {
            addLabels,
            removeLabels
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating labels:', error);
        return NextResponse.json({ error: 'Failed to update labels' }, { status: 500 });
    }
}
