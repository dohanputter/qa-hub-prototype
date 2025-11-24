import React, { useState, DragEvent, useRef, useEffect } from 'react';
import { Issue, QAStatus } from '../types';
import { MessageSquare, Search, X } from 'lucide-react';
import { LABELS } from '../services/mockData';
import { Skeleton } from '../components/Skeleton';

interface KanbanBoardProps {
  issues: Issue[];
  onUpdateStatus: (issueId: number, newStatus: QAStatus) => void;
  onReorder: (movedIssueId: number, targetIssueId: number, position: 'before' | 'after') => void;
  onIssueClick: (id: number) => void;
}

const COLUMNS = [
  QAStatus.TODO,
  QAStatus.IN_DEV,
  QAStatus.READY_FOR_QA,
  QAStatus.IN_QA,
  QAStatus.PASSED,
  QAStatus.FAILED
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ issues, onUpdateStatus, onReorder, onIssueClick }) => {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<number | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');
  const [isLoading, setIsLoading] = useState(true);
  
  // Search & Autocomplete State
  const [searchQuery, setSearchQuery] = useState('');
  const [showLabelSuggestions, setShowLabelSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowLabelSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter logic
  const filteredIssues = issues.filter(issue => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Label Filter (starts with @)
    if (query.startsWith('@')) {
      const labelTarget = query.substring(1);
      if (!labelTarget) return true; // Show all if just typed '@'
      return issue.labels.some(l => l.title.toLowerCase().includes(labelTarget));
    }

    // Standard Search (Title or ID)
    return issue.title.toLowerCase().includes(query) || 
           issue.iid.toString().includes(query);
  });

  // Autocomplete Logic
  const filteredLabels = LABELS.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase().replace('@', ''))
  );

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.startsWith('@')) {
      setShowLabelSuggestions(true);
      setActiveSuggestionIndex(0);
    } else {
      setShowLabelSuggestions(false);
    }
  };

  const selectLabel = (labelTitle: string) => {
    setSearchQuery(`@${labelTitle}`);
    setShowLabelSuggestions(false);
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showLabelSuggestions && filteredLabels.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev + 1) % filteredLabels.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex(prev => (prev - 1 + filteredLabels.length) % filteredLabels.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        selectLabel(filteredLabels[activeSuggestionIndex].title);
      } else if (e.key === 'Escape') {
        setShowLabelSuggestions(false);
      }
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: DragEvent, id: number) => {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCardId(null);
    setDropPosition('after');
  };

  const handleDragOverColumn = (e: DragEvent) => {
    e.preventDefault(); 
  };

  // Card-specific DnD handlers for reordering
  const handleDragOverCard = (e: DragEvent, targetId: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to column
    
    if (draggingId === targetId) return;

    const cardElement = e.currentTarget as HTMLElement;
    const rect = cardElement.getBoundingClientRect();
    // Calculate if we are in the top half or bottom half
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';

    setDragOverCardId(targetId);
    setDropPosition(position);
  };

  const handleDragLeaveCard = (e: DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverCardId(null);
  };

  const handleDropOnCard = (e: DragEvent, targetId: number) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to column
    setDragOverCardId(null);

    if (draggingId !== null && draggingId !== targetId) {
        onReorder(draggingId, targetId, dropPosition);
        setDraggingId(null);
    }
  };

  const handleDropOnColumn = (e: DragEvent, status: QAStatus) => {
    e.preventDefault();
    // Only handle drop on column if we didn't drop on a card (handled by bubbling prevention, 
    // but safe to check). This implies moving to end of list.
    if (draggingId !== null) {
      onUpdateStatus(draggingId, status);
      setDraggingId(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f9fafb]">
      
      {/* Static Header - Fixed position relative to scrolling content */}
      <div className="pt-6 pr-6 pb-6 pl-[17.5rem] flex justify-between items-center shrink-0 bg-[#f9fafb] z-40">
           <div className="flex flex-col">
             <h2 className="text-2xl font-bold text-gray-800">Issues Board</h2>
             <div className="text-sm text-gray-500">Drag tickets to update status</div>
           </div>

           {/* Search Input Container */}
           <div className="relative w-80" ref={searchContainerRef}>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Search or type @label..."
                  value={searchQuery}
                  onChange={handleSearchInput}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm text-gray-900"
                />
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setShowLabelSuggestions(false); }}
                    className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {showLabelSuggestions && filteredLabels.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                    Select Label
                  </div>
                  <ul className="max-h-48 overflow-y-auto">
                    {filteredLabels.map((label, index) => (
                      <li 
                        key={label.id}
                        onClick={() => selectLabel(label.title)}
                        className={`px-3 py-2 flex items-center gap-2 cursor-pointer text-sm ${
                          index === activeSuggestionIndex ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span 
                          className="w-3 h-3 rounded-full border border-black/10" 
                          style={{ backgroundColor: label.color }}
                        ></span>
                        <span className="font-medium">{label.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
           </div>
      </div>
      
      {/* Scrolling Board Columns */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="min-w-max h-full pl-[17.5rem] pr-6 pb-4 flex gap-4">
          {COLUMNS.map(column => {
            const columnIssues = filteredIssues.filter(i => i.qaStatus === column);
            return (
              <div 
                key={column}
                className="flex-1 min-w-[280px] bg-gray-100 rounded-xl flex flex-col border border-gray-200 h-full"
                onDragOver={handleDragOverColumn}
                onDrop={(e) => handleDropOnColumn(e, column)}
              >
                <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl sticky top-0 z-10">
                  <h3 className="font-semibold text-gray-700 text-sm uppercase">{column}</h3>
                  <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {columnIssues.length}
                  </span>
                </div>

                <div className="p-2 space-y-2 overflow-y-auto flex-1 scrollbar-hide">
                  {isLoading ? (
                    // Skeleton loader for cards
                    [1,2,3].map(i => (
                        <div key={i} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                             <div className="flex gap-2 mb-2">
                                <Skeleton width={40} height={16} />
                                <Skeleton width={50} height={16} />
                             </div>
                             <Skeleton width="90%" height={20} className="mb-2" />
                             <div className="flex justify-between items-center mt-3">
                                <Skeleton width={30} height={14} />
                                <Skeleton variant="circular" width={20} height={20} />
                             </div>
                        </div>
                    ))
                  ) : (
                      columnIssues.map((issue) => {
                        // Visual logic for drop indicator
                        const isDragged = draggingId === issue.id;
                        const isDragOver = dragOverCardId === issue.id;
                        
                        const borderClass = isDragOver 
                            ? (dropPosition === 'before' ? 'border-t-4 border-t-indigo-500 mt-3' : 'border-b-4 border-b-indigo-500 mb-3')
                            : '';

                        return (
                          <div
                            key={issue.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, issue.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOverCard(e, issue.id)}
                            onDragLeave={handleDragLeaveCard}
                            onDrop={(e) => handleDropOnCard(e, issue.id)}
                            onClick={() => onIssueClick(issue.id)}
                            className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all active:cursor-grabbing 
                              ${isDragged ? 'opacity-50' : 'opacity-100'}
                              ${borderClass}
                            `}
                          >
                            <div className="flex gap-1.5 mb-2 flex-wrap">
                                {issue.labels.map(l => (
                                    <span key={l.id} className="px-2 py-1 rounded text-xs font-medium border border-transparent" style={{ backgroundColor: `${l.color}15`, color: l.color, borderColor: `${l.color}30` }}>
                                          {l.title}
                                      </span>
                                ))}
                            </div>
                            <h4 className="text-sm font-medium text-gray-800 mb-2 leading-snug">{issue.title}</h4>
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="font-mono">#{issue.iid}</span>
                                {issue.assignee ? (
                                    <img src={issue.assignee.avatarUrl} alt="" className="w-5 h-5 rounded-full border border-white" />
                                ) : (
                                    <span className="italic text-gray-300">Unassigned</span>
                                )}
                            </div>
                          </div>
                        );
                      })
                  )}
                  {columnIssues.length === 0 && !isLoading && searchQuery && (
                    <div className="text-center p-4 text-gray-400 text-xs italic">
                      No tickets match filter
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {/* Spacer to ensure right padding is respected when scrolling */}
          <div className="w-2 shrink-0"></div>
        </div>
      </div>
    </div>
  );
};