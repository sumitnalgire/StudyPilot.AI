import type { View } from '@/types';
import { LayoutDashboard, CalendarPlus, CalendarDays, BarChart3, Sparkles, Rocket, Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'create-plan', label: 'Create Study Plan', icon: <CalendarPlus className="w-5 h-5" /> },
  { id: 'timetable', label: 'Timetable', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'progress', label: 'Study Progress', icon: <BarChart3 className="w-5 h-5" /> },
  { id: 'assistant', label: 'AI Assistant', icon: <Sparkles className="w-5 h-5" /> },
];

export function Sidebar({
  current,
  onNavigate,
  onReset,
  hasPlan,
}: {
  current: View;
  onNavigate: (v: View) => void;
  onReset: () => void;
  hasPlan: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleClick = (v: View) => {
    onNavigate(v);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-ink-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rocket className="w-6 h-6 text-navy-600" />
          <span className="font-display font-bold text-ink-900">StudyPilot AI</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="btn-ghost p-2 rounded-lg">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-ink-900/40 z-40 animate-fade-in" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0
          bg-white border-r border-ink-200 flex flex-col
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="px-6 py-6 flex items-center gap-3 border-b border-ink-100">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-500 to-navy-700 flex items-center justify-center shadow-glow">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-ink-900 leading-tight">StudyPilot AI</h1>
            <p className="text-xs text-ink-400">Study Smarter. Plan Better.</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.map((item) => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${active
                    ? 'bg-navy-50 text-navy-700 shadow-soft'
                    : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'}
                `}
              >
                <span className={active ? 'text-navy-600' : 'text-ink-400'}>{item.icon}</span>
                {item.label}
                {item.id === 'create-plan' && !hasPlan && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-navy-400 animate-pulse-soft" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-ink-100 space-y-3">
          {hasPlan && (
            <button onClick={onReset} className="btn-secondary w-full text-sm">
              Reset Demo Data
            </button>
          )}
          <div className="px-3 text-xs text-ink-400">
            <p className="font-medium text-ink-500 mb-0.5">Demo Mode</p>
            <p>Data stored locally in your browser.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
