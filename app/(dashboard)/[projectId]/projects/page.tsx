import { getAccessibleProjects } from '@/lib/gitlab';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProjectStats } from '@/app/actions/issues';

export default async function ProjectsPage() {
    const session = await auth();
    if (!session?.accessToken) redirect('/auth/signin');

    // Get projects user has access to (GitLab permissions)
    const projects = await getAccessibleProjects(session.accessToken, session.user?.email || undefined);

    // Fetch stats for all projects
    const stats = await getProjectStats(projects.map(p => p.id));

    return (
        <div className="container mx-auto px-4 py-12 max-w-6xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight mb-4">Select Project</h1>
                <p className="text-xl text-muted-foreground mb-8">Choose a project to manage QA records</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map(project => {
                    const projectStats = stats[project.id] || { open: 0, closed: 0, total: 0 };
                    return (
                        <Link key={project.id} href={`/${project.id}/issues`}>
                            <Card className="group hover:shadow-xl transition-all duration-200 hover:-translate-y-1 cursor-pointer h-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                            {project.name.charAt(0)}
                                        </div>
                                        {project.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                                        {project.description || 'No description'}
                                    </p>
                                    <div className="flex items-center justify-between mt-4">
                                        <div className="flex items-center text-sm text-gray-500">
                                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                                                {project.path_with_namespace}
                                            </span>
                                        </div>
                                        <div className="flex gap-3 text-sm">
                                            <span className="text-green-600 font-medium">{projectStats.open} Open</span>
                                            <span className="text-gray-500">{projectStats.closed} Closed</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
