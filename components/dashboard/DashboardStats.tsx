import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";

interface DashboardStatsProps {
    counts: {
        pending: number;
        passed: number;
        failed: number;
        total: number;
    };
}

export function DashboardStats({ counts }: DashboardStatsProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-yellow-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending QA</CardTitle>
                    <div className="p-2 bg-yellow-500/10 rounded-full">
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">{counts.pending}</div>
                    <p className="text-xs text-muted-foreground mt-1">Waiting for testing</p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Passed</CardTitle>
                    <div className="p-2 bg-green-500/10 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">{counts.passed}</div>
                    <p className="text-xs text-muted-foreground mt-1">Ready for release</p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
                    <div className="p-2 bg-red-500/10 rounded-full">
                        <XCircle className="h-4 w-4 text-red-600" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">{counts.failed}</div>
                    <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
                </CardContent>
            </Card>
            <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed</CardTitle>
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Activity className="h-4 w-4 text-primary" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-foreground">{counts.total}</div>
                    <p className="text-xs text-muted-foreground mt-1">All time records</p>
                </CardContent>
            </Card>
        </div>
    );
}
