import type { Difficulty } from '@/types';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/types';

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`badge ${DIFFICULTY_COLORS[difficulty]}`}>
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: 'pending' | 'completed' | 'missed' }) {
  if (status === 'completed') {
    return <span className="badge text-emerald-700 bg-emerald-50 border border-emerald-200">Completed</span>;
  }
  if (status === 'missed') {
    return <span className="badge text-red-700 bg-red-50 border border-red-200">Missed</span>;
  }
  return <span className="badge text-navy-700 bg-navy-50 border border-navy-200">Pending</span>;
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mb-4 text-navy-400">
        {icon}
      </div>
      <h3 className="font-display font-bold text-lg text-ink-900 mb-1">{title}</h3>
      <p className="text-ink-500 text-sm max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
