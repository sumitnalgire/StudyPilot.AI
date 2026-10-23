import { useState, useEffect } from 'react';
import type { View, AppData, StudyPlan, StudyTask, ChatMessage, RescheduleProposal } from '@/types';
import { loadData, saveData, resetData } from '@/lib/storage';
import { Sidebar } from '@/components/Sidebar';
import { Dashboard } from '@/pages/Dashboard';
import { CreatePlan } from '@/pages/CreatePlan';
import { Timetable } from '@/pages/Timetable';
import { Progress } from '@/pages/Progress';
import { Assistant } from '@/pages/Assistant';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [data, setData] = useState<AppData>(() => loadData());

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  const handlePlanCreated = (plan: StudyPlan) => {
    setData((d) => ({ ...d, plan, proposals: [] }));
  };

  const handleStudentName = (name: string) => {
    setData((d) => ({ ...d, studentName: name }));
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<StudyTask>) => {
    setData((d) => {
      if (!d.plan) return d;
      return {
        ...d,
        plan: {
          ...d.plan,
          tasks: d.plan.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
        },
      };
    });
  };

  const handleRescheduleApprove = (proposal: RescheduleProposal) => {
    setData((d) => {
      if (!d.plan) return d;
      return {
        ...d,
        plan: { ...d.plan, tasks: proposal.proposedTasks },
        proposals: [...d.proposals, proposal],
      };
    });
  };

  const handleChatUpdate = (messages: ChatMessage[]) => {
    setData((d) => ({ ...d, chatHistory: messages }));
  };

  const handleReset = () => {
    resetData();
    setData({ plan: null, proposals: [], chatHistory: [], studentName: 'Student' });
    setView('dashboard');
  };

  const hasPlan = data.plan !== null;

  const handleNavigate = (v: View) => setView(v);

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar current={view} onNavigate={handleNavigate} onReset={handleReset} hasPlan={hasPlan} />

      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {view === 'dashboard' && <Dashboard plan={data.plan} studentName={data.studentName} onNavigate={handleNavigate} />}
          {view === 'create-plan' && <CreatePlan onPlanCreated={handlePlanCreated} onStudentName={handleStudentName} onNavigate={handleNavigate} />}
          {view === 'timetable' && (
            <Timetable
              plan={data.plan}
              onTaskUpdate={handleTaskUpdate}
              onRescheduleApprove={handleRescheduleApprove}
              onNavigate={handleNavigate}
            />
          )}
          {view === 'progress' && <Progress plan={data.plan} onNavigate={handleNavigate} />}
          {view === 'assistant' && (
            <Assistant
              plan={data.plan}
              chatHistory={data.chatHistory}
              onChatUpdate={handleChatUpdate}
              onNavigate={(v) => setView(v)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
