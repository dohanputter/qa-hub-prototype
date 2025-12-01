import { redirect } from 'next/navigation';
import { getUserGroups } from '@/lib/gitlab';
import { auth } from '@/auth';
import GroupSelector from '@/components/GroupSelector';

export default async function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ projectId: string }>;
}) {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    const { projectId } = await params;
    const groupId = projectId; // Alias for clarity

    // Fetch user's accessible groups
    const groups = await getUserGroups(session.accessToken);

    // Validate groupId and user access
    const group = groups.find((g: any) => g.id === Number(groupId));
    if (!group) {
        // If no group found, maybe redirect to a group picker or root
        // But for now, let's just redirect to root
        redirect('/');
    }

    return (
        <div className="flex h-screen flex-col">
            {/* Group selection bar */}
            <div className="border-b bg-background px-4 py-3">
                <GroupSelector
                    groups={groups}
                    currentGroupId={groupId}
                />
            </div>
            {/* Page content */}
            <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
    );
}
