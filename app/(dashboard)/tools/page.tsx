import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, FileDiff, Regex, Database, Shield } from 'lucide-react';

export default function ToolsPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">QA Tools</h2>
                <p className="text-muted-foreground">Utilities to assist with testing</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:bg-gray-50 cursor-pointer transition-colors border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">JSON Formatter</CardTitle>
                        <Code className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">Format and validate JSON payloads</div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-gray-50 cursor-pointer transition-colors border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Diff Checker</CardTitle>
                        <FileDiff className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">Compare text or code snippets</div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-gray-50 cursor-pointer transition-colors border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Regex Tester</CardTitle>
                        <Regex className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">Test regular expressions</div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-gray-50 cursor-pointer transition-colors border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">SQL Generator</CardTitle>
                        <Database className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">Generate mock SQL data</div>
                    </CardContent>
                </Card>

                <Card className="hover:bg-gray-50 cursor-pointer transition-colors border-dashed">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Security Headers</CardTitle>
                        <Shield className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-xs text-muted-foreground">Check security headers</div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
