
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, AlertTriangle, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Insight {
    id: number;
    title: string;
    description: string;
    type: 'critical' | 'warning' | 'info';
    action?: string;
}

export function AutomatedInsightsPanel() {
    // In a real app, fetch this data. For MVP, we'll use mock data or fetch from server action if we had one for listing.
    // Since we didn't create a specific list action for insights in Phase 5 (only generation), 
    // I'll mock a few examples to demonstrate the UI as per requirements.

    const insights: Insight[] = [
        {
            id: 1,
            title: 'Critical Blockers Detected',
            description: 'There are 2 critical blockers affecting the project.',
            type: 'critical',
            action: 'Review immediately'
        },
        {
            id: 2,
            title: 'Slow Resolution Time',
            description: 'Average resolution time has increased by 15% this week.',
            type: 'warning',
            action: 'Investigate process'
        }
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    Automated Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[300px] px-6 pb-6">
                    <div className="space-y-4">
                        {insights.map((insight) => (
                            <div key={insight.id} className="p-4 rounded-lg border bg-muted/50 space-y-2">
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    {getIcon(insight.type)}
                                    {insight.title}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {insight.description}
                                </p>
                                {insight.action && (
                                    <div className="text-xs font-medium text-primary cursor-pointer hover:underline">
                                        Action: {insight.action}
                                    </div>
                                )}
                            </div>
                        ))}
                        {insights.length === 0 && (
                            <div className="text-center text-muted-foreground py-10 text-sm">
                                No insights generated yet.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
