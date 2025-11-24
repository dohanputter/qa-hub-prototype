import { auth } from '@/auth';
import { getUserProjects } from '@/app/actions/project';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function BoardRedirectPage() {
    const session = await auth();
    if (!session?.accessToken) return <div>Unauthorized</div>;

    const projects = await getUserProjects();

    if (projects.length > 0) {
        redirect(`/${projects[0].id}`);
    }

    return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
            <h2 className="text-xl font-semibold">No projects found</h2>
            <p className="text-muted-foreground">You need to add a project to view the board.</p>
            <Button asChild>
                <Link href="/issues">Go to Issues</Link>
            </Button>
        </div>
    );
}
