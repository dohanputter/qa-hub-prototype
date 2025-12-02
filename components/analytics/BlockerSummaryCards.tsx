
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface BlockerSummaryCardsProps {
    metrics: {
        activeCount: number;
        resolvedCount: number;
        avgResolutionTime: number;
        severity: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
    };
}

export function BlockerSummaryCards({ metrics }: BlockerSummaryCardsProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 h-full">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Blockers</CardTitle>
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.activeCount}</div>
                    <p className="text-xs text-muted-foreground">
                        {metrics.severity.critical} Critical, {metrics.severity.high} High
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.avgResolutionTime}h</div>
                    <p className="text-xs text-muted-foreground">
                        Target: &lt; 24h
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Resolved Blockers</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.resolvedCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Total resolved
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Critical Impact</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{metrics.severity.critical}</div>
                    <p className="text-xs text-muted-foreground">
                        Critical blockers currently active
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
