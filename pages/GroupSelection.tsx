import React from 'react';
import { Group } from '../types';
import { ChevronRight, Building } from 'lucide-react';

interface GroupSelectionProps {
  groups: Group[];
  onSelectGroup: (group: Group) => void;
  onSignOut: () => void;
}

export const GroupSelection: React.FC<GroupSelectionProps> = ({ groups, onSelectGroup, onSignOut }) => {
  return (
    <div className="min-h-screen bg-[#111827] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        <div className="p-8 border-b border-gray-100 bg-gray-50">
          <h2 className="text-2xl font-bold text-gray-900 text-center">Select Group</h2>
          <p className="text-center text-gray-500 mt-2">Choose the GitLab group you want to work with.</p>
        </div>

        <div className="p-8">
          <div className="space-y-3">
            {groups.map(group => (
              <button
                key={group.id}
                onClick={() => onSelectGroup(group)}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/50 hover:shadow-md transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  {group.avatarUrl ? (
                    <img src={group.avatarUrl} alt="" className="w-12 h-12 rounded-lg bg-gray-200 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                      <Building size={24} />
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-700">{group.name}</h3>
                    <p className="text-sm text-gray-500 font-mono">https://gitlab.com/{group.path}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" size={24} />
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
          <button 
            onClick={onSignOut}
            className="text-sm text-gray-500 hover:text-red-600 hover:underline font-medium transition-colors"
          >
            Log out
          </button>
        </div>

      </div>
    </div>
  );
};