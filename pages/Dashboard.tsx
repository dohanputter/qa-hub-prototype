import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Issue, QAStatus } from '../types';
import { Skeleton } from '../components/Skeleton';

interface DashboardProps {
  issues: Issue[];
}

export const Dashboard: React.FC<DashboardProps> = ({ issues }) => {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading delay
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Calculate stats
  const pending = issues.filter(i => [QAStatus.TODO, QAStatus.READY_FOR_QA].includes(i.qaStatus)).length;
  const inTesting = issues.filter(i => i.qaStatus === QAStatus.IN_QA).length;
  const passed = issues.filter(i => i.qaStatus === QAStatus.PASSED).length;
  const failed = issues.filter(i => i.qaStatus === QAStatus.FAILED).length;

  // Mock data for the chart (last 30 days)
  const data = [
    { name: 'Day 1', total: 4, completed: 1 },
    { name: 'Day 5', total: 6, completed: 2 },
    { name: 'Day 10', total: 10, completed: 5 },
    { name: 'Day 15', total: 12, completed: 7 },
    { name: 'Day 20', total: 15, completed: 10 },
    { name: 'Day 25', total: 18, completed: 14 },
    { name: 'Today', total: 20, completed: 16 },
  ];

  const StatCard = ({ title, value, color, loading }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider">{title}</h3>
      {loading ? (
        <Skeleton height={36} width={60} className="mt-2" />
      ) : (
        <div className={`mt-2 text-3xl font-bold ${color}`}>{value}</div>
      )}
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">QA Dashboard</h2>
        <div className="bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">
          Last 30 Days
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Pending QA" value={pending} color="text-yellow-600" loading={isLoading} />
        <StatCard title="In Testing" value={inTesting} color="text-blue-600" loading={isLoading} />
        <StatCard title="Overdue / Failed" value={failed} color="text-red-600" loading={isLoading} />
        <StatCard title="Passed & Ready" value={passed} color="text-green-600" loading={isLoading} />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-96 flex flex-col">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Testing Velocity (30 Days)</h3>
        <div className="flex-1 min-h-0 w-full">
          {isLoading ? (
             <Skeleton height="100%" width="100%" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#9ca3af" tick={{fontSize: 12}} tickMargin={10} />
                <YAxis stroke="#9ca3af" tick={{fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                <Area type="monotone" dataKey="total" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="completed" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};