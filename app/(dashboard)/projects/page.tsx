import { getUserGroups } from '@/lib/gitlab';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Folder, ChevronRight } from 'lucide-react';

export default async function GroupsPage() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    // Get user's accessible groups
    const groups = await getUserGroups(session.accessToken) || [];

    // If only one group, redirect to it
    if (groups.length === 1) {
        redirect(`/${groups[0].id}`);
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">Select a Group</h1>
            <p className="text-muted-foreground mb-8">Choose a group to view its projects and issues.</p>

            <div className="grid gap-4">
                {groups.length === 0 ? (
                    <div className="text-center py-12 border rounded-lg bg-muted/10">
                        <p className="text-muted-foreground">You don&apos;t have access to any groups.</p>
                    </div>
                ) : (
                    groups.map((group: any) => (
                        <Link
                            key={group.id}
                            href={`/${group.id}`}
                            className="flex items-center justify-between p-6 border rounded-xl hover:border-primary/50 hover:bg-muted/50 hover:shadow-sm transition-all group bg-card"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <Folder size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{group.name}</h3>
                                    <p className="text-sm text-muted-foreground">{group.description || group.full_path}</p>
                                </div>
                            </div>
                            <ChevronRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
