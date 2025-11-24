import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, User as UserIcon, Search, Filter } from 'lucide-react';
import { Issue, IssueState } from '../types';
import { Skeleton } from '../components/Skeleton';

interface IssuesListProps {
  issues: Issue[];
  onIssueClick: (id: number) => void;
  onCreateClick: () => void;
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues, onIssueClick, onCreateClick }) => {
  const [filterState, setFilterState] = useState<IssueState>(IssueState.OPEN);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredIssues = issues.filter(i => 
    i.state === filterState && 
    (i.title.toLowerCase().includes(search.toLowerCase()) || i.iid.toString().includes(search))
  );

  const openCount = issues.filter(i => i.state === IssueState.OPEN).length;
  const closedCount = issues.filter(i => i.state === IssueState.CLOSED).length;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Issues</h2>
        <button 
            onClick={onCreateClick}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          New Issue
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters Bar */}
        <div className="bg-gray-50 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex gap-6 text-sm font-medium">
                <button 
                    onClick={() => setFilterState(IssueState.OPEN)}
                    className={`${filterState === IssueState.OPEN ? 'text-gray-900 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}>
                    Open {openCount}
                </button>
                <button 
                    onClick={() => setFilterState(IssueState.CLOSED)}
                    className={`${filterState === IssueState.CLOSED ? 'text-gray-900 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}>
                    Closed {closedCount}
                </button>
            </div>
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search issues..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64 bg-gray-100 text-gray-900"
                    />
                </div>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
                    <Filter size={18} />
                </button>
            </div>
        </div>

        {/* List */}
        {isLoading ? (
            <ul className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="p-4 flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                            <Skeleton width="60%" height={24} />
                            <div className="flex items-center gap-3">
                                <Skeleton width={40} height={16} />
                                <Skeleton width={120} height={16} />
                                <Skeleton width={80} height={20} />
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Skeleton variant="circular" width={24} height={24} />
                            <Skeleton width={40} height={16} />
                            <Skeleton width={80} height={16} />
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <ul className="divide-y divide-gray-100">
                {filteredIssues.map(issue => (
                    <li key={issue.id} className="p-4 hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => onIssueClick(issue.id)}>
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 mb-1 text-base">
                                    {issue.title}
                                </h3>
                                <div className="text-sm text-gray-500 flex items-center flex-wrap gap-2">
                                    <span className="font-mono text-xs font-medium text-gray-600">#{issue.iid}</span>
                                    <span>•</span>
                                    <span>opened {new Date(issue.createdAt).toLocaleDateString()} by <span className="text-gray-800 font-medium">{issue.author.username}</span></span>
                                    <span className="ml-2 flex gap-1.5">
                                        {issue.labels.map(l => (
                                            <span key={l.id} className="px-2 py-1 rounded text-xs font-medium border border-transparent" style={{ backgroundColor: `${l.color}15`, color: l.color, borderColor: `${l.color}30` }}>
                                                {l.title}
                                            </span>
                                        ))}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-gray-400">
                                {issue.assignee && (
                                    <div className="flex items-center gap-1" title={`Assigned to ${issue.assignee.name}`}>
                                        <img src={issue.assignee.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                                    </div>
                                )}
                                <div className="flex items-center gap-1 text-xs">
                                    <MessageSquare size={14} /> 2
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                    <Clock size={14} /> {new Date(issue.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
                {filteredIssues.length === 0 && (
                    <li className="p-8 text-center text-gray-500">No issues found matching your criteria.</li>
                )}
            </ul>
        )}
      </div>
    </div>
  );
};