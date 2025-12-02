
import { getSession } from '@/app/actions/exploratory-sessions';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Clock, ArrowLeft, ShieldAlert, Bug, FileText } from 'lucide-react';
import Link from 'next/link';

interface SessionSummaryPageProps {
    params: Promise<{
        sessionId: string;
    }>;
}

export default async function SessionSummaryPage({ params }: SessionSummaryPageProps) {
    const { sessionId: sessionIdStr } = await params;
    const sessionId = parseInt(sessionIdStr);
    if (isNaN(sessionId)) notFound();

    let session;
    try {
        session = await getSession(sessionId);
    } catch (error) {
        notFound();
    }

    if (session.status !== 'completed') {
        // If not completed, maybe redirect back to workspace?
        // For now, let's just show it anyway or we could redirect
        // redirect(`/sessions/${sessionId}/workspace`);
    }

    const duration = session.totalDuration ? Math.round(session.totalDuration / 60) : 0;
    const notesCount = session.notes.length;
    const bugsCount = session.notes.filter((n: any) => n.type === 'bug').length;
    const blockersCount = session.blockers.length;

    return (
        <div className="container max-w-4xl py-10 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${session.project.groupId}/issues`}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Issues
                    </Link>
                </Button>
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Session Summary</h1>
                <p className="text-muted-foreground">
                    Exploratory session for <span className="font-medium text-foreground">{session.charter}</span>
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Duration</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{duration}m</div>
                        <p className="text-xs text-muted-foreground">Total session time</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Notes</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{notesCount}</div>
                        <p className="text-xs text-muted-foreground">Total captured</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bugs Found</CardTitle>
                        <Bug className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{bugsCount}</div>
                        <p className="text-xs text-muted-foreground">Issues identified</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Blockers</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{blockersCount}</div>
                        <p className="text-xs text-muted-foreground">Blockers logged</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Session Notes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {session.notes.map((note: any) => (
                            <div key={note.id} className="flex gap-4 p-4 border rounded-lg items-start">
                                <div className="mt-1">
                                    {note.type === 'bug' && <Bug className="w-4 h-4 text-red-500" />}
                                    {note.type === 'blocker' && <ShieldAlert className="w-4 h-4 text-orange-500" />}
                                    {note.type === 'observation' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
                                    {/* Add other icons as needed */}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {new Date(note.timestamp).toLocaleTimeString()}
                                        </span>
                                        <span className="text-xs font-medium uppercase text-muted-foreground border px-1.5 rounded">
                                            {note.type}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        {note.content?.content?.[0]?.content?.[0]?.text || 'No content'}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {session.notes.length === 0 && (
                            <div className="text-center py-6 text-muted-foreground">
                                No notes recorded in this session.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                {session.issueId && (
                    <Button asChild>
                        <Link href={`/${session.project.groupId}/qa/${session.issueId}`}>
                            Return to Issue
                        </Link>
                    </Button>
                )}
            </div>
        </div>
    );
}
