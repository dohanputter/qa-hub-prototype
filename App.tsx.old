import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { IssuesList } from './pages/IssuesList';
import { KanbanBoard } from './pages/KanbanBoard';
import { TicketDetail } from './pages/TicketDetail';
import { Notifications } from './pages/Notifications';
import { CreateIssue } from './pages/CreateIssue';
import { Login } from './pages/Login';
import { GroupSelection } from './pages/GroupSelection';
import { Tools } from './pages/Tools';
import { Snippets } from './pages/Snippets';
import { TestDataGenerator } from './pages/TestDataGenerator';
import { ToastProvider } from './components/Toast';
import { getIssues, getIssueById, updateIssueStatus, updateIssue, reorderIssue, createIssue, GROUPS } from './services/mockData';
import { ViewState, QAStatus, Issue, Group } from './types';

type MainViewType = Exclude<ViewState['type'], 'TICKET_DETAIL' | 'CREATE_ISSUE'>;

const AppContent: React.FC = () => {
  // Global State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [view, setView] = useState<ViewState>({ type: 'DASHBOARD' });
  // Track previous view to restore context on close and show correct background
  const [lastViewType, setLastViewType] = useState<MainViewType>('DASHBOARD');
  const [issues, setIssues] = useState<Issue[]>(getIssues());

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setSelectedGroup(null);
    // Reset view state for next login
    setView({ type: 'DASHBOARD' });
    setLastViewType('DASHBOARD');
  };

  const handleIssueClick = (id: number) => {
    if (view.type !== 'TICKET_DETAIL' && view.type !== 'CREATE_ISSUE') {
        setLastViewType(view.type as MainViewType);
    }
    setView({ type: 'TICKET_DETAIL', issueId: id });
  };

  const handleCreateClick = () => {
    if (view.type !== 'TICKET_DETAIL' && view.type !== 'CREATE_ISSUE') {
        setLastViewType(view.type as MainViewType);
    }
    setView({ type: 'CREATE_ISSUE' });
  };

  const handleCloseModal = () => {
    setView({ type: lastViewType });
  };

  const handleChangeView = (newView: MainViewType) => {
    setView({ type: newView });
    setLastViewType(newView);
  };

  const handleBackToTools = () => {
    handleChangeView('TOOLS');
  };

  const handleUpdateStatus = (id: number, status: QAStatus) => {
    updateIssueStatus(id, status);
    setIssues([...getIssues()]); // Force refresh
  };

  const handleReorder = (movedId: number, targetId: number, position: 'before' | 'after') => {
    reorderIssue(movedId, targetId, position);
    setIssues([...getIssues()]);
  };

  const handleUpdateIssue = (updated: Issue) => {
      updateIssue(updated);
      setIssues([...getIssues()]);
  };

  const handleCreateIssue = (data: Partial<Issue>) => {
      createIssue(data);
      setIssues([...getIssues()]);
  };

  const currentIssue = view.type === 'TICKET_DETAIL' ? getIssueById(view.issueId) : null;

  // Determine which view component to render in the background
  const activeViewType = (view.type === 'TICKET_DETAIL' || view.type === 'CREATE_ISSUE') ? lastViewType : view.type;
  const isBoardView = activeViewType === 'ISSUES_BOARD';

  const renderContent = () => {
    switch (activeViewType) {
      case 'DASHBOARD': return <Dashboard issues={issues} />;
      case 'ISSUES_LIST': return <IssuesList issues={issues} onIssueClick={handleIssueClick} onCreateClick={handleCreateClick} />;
      case 'ISSUES_BOARD': return <KanbanBoard issues={issues} onUpdateStatus={handleUpdateStatus} onReorder={handleReorder} onIssueClick={handleIssueClick} />;
      case 'NOTIFICATIONS': return <Notifications />;
      case 'TOOLS': return <Tools onNavigate={handleChangeView} />;
      case 'SNIPPETS': return <Snippets onBack={handleBackToTools} />;
      case 'TEST_DATA_GEN': return <TestDataGenerator onBack={handleBackToTools} />;
      default: return null;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (!selectedGroup) {
    return <GroupSelection groups={GROUPS} onSelectGroup={handleSelectGroup} onSignOut={handleSignOut} />;
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900 font-sans">
      <Sidebar 
        currentView={activeViewType} 
        onChangeView={handleChangeView} 
        onSignOut={handleSignOut}
      />
      
      {/* 
          Layout Logic:
          - If Active View is Kanban Board: No margin (full width), allowing board to scroll under sidebar.
          - Other Views: ml-64 to sit to the right of sidebar.
      */}
      <main className={`min-h-screen transition-all duration-300 ${isBoardView ? '' : 'ml-64'}`}>
        {renderContent()}
      </main>

      {/* Ticket Detail Modal */}
      {view.type === 'TICKET_DETAIL' && currentIssue && (
        <TicketDetail 
          issue={currentIssue} 
          onClose={handleCloseModal} 
          onUpdate={handleUpdateIssue} 
        />
      )}

      {/* Create Issue Modal */}
      {view.type === 'CREATE_ISSUE' && (
        <CreateIssue 
            onClose={handleCloseModal}
            onCreate={handleCreateIssue}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;