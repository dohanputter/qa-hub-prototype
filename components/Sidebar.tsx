import React from 'react';
import { LayoutDashboard, ListTodo, KanbanSquare, Bell, Wrench, LogOut } from 'lucide-react';
import { ViewState } from '../types';

type MainViewType = Exclude<ViewState['type'], 'TICKET_DETAIL' | 'CREATE_ISSUE'>;

interface SidebarProps {
  currentView: ViewState['type'];
  onChangeView: (view: MainViewType) => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, onSignOut }) => {
  const navItems: { id: MainViewType; icon: any; label: string }[] = [
    { id: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'ISSUES_LIST', icon: ListTodo, label: 'Issues' },
    { id: 'ISSUES_BOARD', icon: KanbanSquare, label: 'Issues Board' },
    { id: 'NOTIFICATIONS', icon: Bell, label: 'Notifications' },
  ];

  return (
    <div className="w-64 h-screen bg-[#1e1e2f] text-gray-300 flex flex-col fixed left-0 top-0 z-50 border-r border-gray-700 shadow-xl">
      <div className="p-6 border-b border-gray-700 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center text-white font-bold">
          QA
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">QA Hub</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === item.id || (item.id === 'ISSUES_LIST' && currentView === 'TICKET_DETAIL')
                ? 'bg-indigo-600 text-white shadow-md'
                : 'hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <button 
            onClick={() => onChangeView('TOOLS')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === 'TOOLS' || currentView === 'SNIPPETS'
                ? 'bg-gray-800 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
        >
          <Wrench size={20} />
          <span>Tools</span>
        </button>
        <button 
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
};
