
import { getProjectSessions } from '@/app/actions/exploratorySessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { PlayCircle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

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

            <div className="grid gap-4">
                {sessions.length === 0 && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="bg-muted/50 p-4 rounded-full mb-4">
                                <PlayCircle className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold text-lg mb-2">No sessions yet</h3>
                            <p className="text-muted-foreground max-w-sm mb-6">
                                Start an exploratory session from an issue to track your testing journey.
                            </p>
                            <Button asChild>
                                <Link href={`/${projectId}/issues`}>Go to Issues</Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {sessions.map((session) => (
                    <Card key={session.id} className="hover:bg-muted/5 transition-colors">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-lg">{session.charter}</h3>
                                    <Badge variant={
                                        session.status === 'completed' ? 'secondary' :
                                            session.status === 'abandoned' ? 'destructive' :
                                                'default'
                                    }>
                                        {session.status}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDistanceToNow(new Date(session.startedAt || session.createdAt))} ago
                                    </span>
                                    {session.issue && (
                                        <span>Issue #{session.issue.gitlabIssueIid}</span>
                                    )}
                                    <span>•</span>
                                    <span>{session.user?.name || 'Unknown User'}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex gap-4 text-sm">
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{session.issuesFoundCount || 0}</span>
                                        <span className="text-muted-foreground text-xs">Bugs</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{session.blockersLoggedCount || 0}</span>
                                        <span className="text-muted-foreground text-xs">Blockers</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold">{Math.round((session.totalDuration || 0) / 60)}m</span>
                                        <span className="text-muted-foreground text-xs">Duration</span>
                                    </div>
                                </div>
                                {session.status !== 'abandoned' && (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={session.status === 'completed' ? `/sessions/${session.id}/summary` : `/sessions/${session.id}/workspace`}>
                                            {session.status === 'completed' ? 'View Summary' : 'Resume'}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
