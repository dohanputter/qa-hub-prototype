import React from 'react';
import { ScrollText, Database } from 'lucide-react';
import { ViewState } from '../types';

interface ToolsProps {
  onNavigate: (view: ViewState['type']) => void;
}

export const Tools: React.FC<ToolsProps> = ({ onNavigate }) => {
  const tools = [
    {
      id: 'snippets',
      title: 'Snippets',
      description: 'Manage reusable text snippets for test cases and issue reporting.',
      icon: ScrollText,
      action: () => onNavigate('SNIPPETS'),
      color: 'bg-blue-50 text-blue-600'
    },
    {
      id: 'generator',
      title: 'Test Data Generator',
      description: 'Generate mock identities, financial data, and address sets for testing.',
      icon: Database,
      action: () => onNavigate('TEST_DATA_GEN'),
      color: 'bg-purple-50 text-purple-600'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Tools & Utilities</h2>
        <p className="text-gray-500 mt-2">Helper tools to streamline your QA workflow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={tool.action}
            className="flex flex-col text-left bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-indigo-300 transition-all group"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${tool.color} group-hover:scale-110 transition-transform`}>
              <tool.icon size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{tool.title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{tool.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};