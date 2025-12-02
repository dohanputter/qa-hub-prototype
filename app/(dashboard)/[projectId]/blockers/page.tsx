
import { getProjectBlockers, deleteBlocker, updateBlocker } from '@/app/actions/exploratory-sessions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Trash2, Edit, Check } from 'lucide-react';
import Link from 'next/link';
import { BlockersList } from '@/components/blockers/BlockersList';

interface BlockersPageProps {
    params: Promise<{
        projectId: string;
    }>;
}

export default async function BlockersPage({ params }: BlockersPageProps) {
    const { projectId: projectIdStr } = await params;
    const projectId = parseInt(projectIdStr);
    const blockers = await getProjectBlockers(projectId);

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Blockers</h1>
                    <p className="text-muted-foreground">Manage blockers that are impacting your project.</p>
                </div>
            </div>

            <BlockersList blockers={blockers} projectId={projectId} />
        </div>
    );
}
