import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { FileCode, Database, PlayCircle } from 'lucide-react';
import Link from 'next/link';

interface ToolsViewProps {
    projectId?: number;
}

export function ToolsView({ projectId }: ToolsViewProps) {
    const getHref = (path: string) => {
        if (projectId) {
            return `/${projectId}${path}`;
        }
        return path;
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tools & Utilities</h2>
                    <p className="text-muted-foreground">Helper tools to streamline your QA workflow.</p>
                </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link href={getHref("/tools/snippets")}>
                    <Card className="group hover:bg-muted/50 cursor-pointer transition-colors h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <FileCode className="h-6 w-6 text-blue-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-lg font-medium mb-2 group-hover:text-primary">Snippets</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                Manage reusable text snippets for test cases and issue reporting.
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={getHref("/tools/generator")}>
                    <Card className="group hover:bg-muted/50 cursor-pointer transition-colors h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Database className="h-6 w-6 text-purple-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-lg font-medium mb-2 group-hover:text-primary">Test Data Generator</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                Generate mock identities, financial data, and address sets for testing.
                            </div>
                        </CardContent>
                    </Card>
                </Link>

                <Link href={getHref("/sessions")}>
                    <Card className="group hover:bg-muted/50 cursor-pointer transition-colors h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <PlayCircle className="h-6 w-6 text-emerald-500" />
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <CardTitle className="text-lg font-medium mb-2 group-hover:text-primary">Exploratory Sessions</CardTitle>
                            <div className="text-sm text-muted-foreground">
                                Manage and review exploratory testing sessions with notes and blockers.
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
