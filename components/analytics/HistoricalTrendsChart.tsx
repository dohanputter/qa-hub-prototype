
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface HistoricalTrendsChartProps {
    data: any[];
}

export function HistoricalTrendsChart({ data }: HistoricalTrendsChartProps) {
    // Format data for chart
    const chartData = data.map(d => ({
        date: format(new Date(d.snapshotDate), 'MMM d'),
        activeBlockers: d.activeBlockerCount,
        resolutionTime: d.blockerResolutionTime,
        critical: d.criticalBlockerCount
    })).reverse(); // Show oldest to newest

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>30-Day Blocker Trends</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <YAxis
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `${value}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                            itemStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="activeBlockers"
                            name="Active Blockers"
                            stroke="#ef4444"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="resolutionTime"
                            name="Avg Resolution Time (h)"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
