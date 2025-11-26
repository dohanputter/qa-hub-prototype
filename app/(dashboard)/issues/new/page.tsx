import { Suspense } from 'react';
import { NewIssueForm } from '@/components/issues/NewIssueForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewIssuePage() {
    return (
        <Suspense fallback={
            <div className="flex-1 space-y-4 p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/issues">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">New Issue</h2>
                            <p className="text-muted-foreground">Loading...</p>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <NewIssueForm />
        </Suspense>
    );
}
