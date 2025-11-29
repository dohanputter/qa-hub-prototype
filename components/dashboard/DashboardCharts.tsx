'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

interface DashboardChartsProps {
    projectStats: any[];
    timeStats: any[];
    passRates: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 rounded-lg shadow-lg border border-border/50">
                <p className="text-sm font-medium text-foreground mb-1">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <p key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        {entry.name}: <span className="font-bold text-foreground">{entry.value}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export function DashboardCharts({ projectStats, timeStats, passRates }: DashboardChartsProps) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Issues by Project */}
                <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader>
                        <CardTitle>Issues by Project</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={projectStats}>
                                <defs>
                                    <linearGradient id="colorOpen" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.3} />
                                    </linearGradient>
                                    <linearGradient id="colorClosed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.3} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} stroke="#888888" />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#888888" />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <Legend />
                                <Bar dataKey="open" name="Open" fill="url(#colorOpen)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="closed" name="Closed" fill="url(#colorClosed)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Pass/Fail Rates */}
                <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                    <CardHeader>
                        <CardTitle>First Time Pass Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={passRates}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {passRates.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Time Spent in QA */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader>
                    <CardTitle>Avg. Time Spent in QA (Minutes)</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeStats}>
                            <defs>
                                <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} stroke="#888888" />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#888888" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Area type="monotone" dataKey="minutes" stroke="#8884d8" fillOpacity={1} fill="url(#colorTime)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
