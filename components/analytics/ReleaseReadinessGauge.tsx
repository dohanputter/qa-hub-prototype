
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';

interface ReleaseReadinessGaugeProps {
    score: number;
    details: any;
}

export function ReleaseReadinessGauge({ score, details }: ReleaseReadinessGaugeProps) {
    // Data for the gauge
    const data = [
        { name: 'Score', value: score },
        { name: 'Remaining', value: 100 - score },
    ];

    // Colors
    const getColor = (score: number) => {
        if (score >= 80) return '#22c55e'; // Green
        if (score >= 50) return '#eab308'; // Yellow
        return '#ef4444'; // Red
    };

    const color = getColor(score);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Release Readiness</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius="60%"
                            outerRadius="80%"
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="score" fill={color} />
                            <Cell key="remaining" fill="hsl(var(--muted))" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-10">
                    <span className="text-4xl font-bold" style={{ color }}>{Math.round(score)}%</span>
                    <span className="text-sm text-muted-foreground">Confidence</span>
                </div>
            </CardContent>
        </Card>
    );
}
