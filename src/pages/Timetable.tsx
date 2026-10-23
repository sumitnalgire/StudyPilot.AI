import { useMemo, useState } from 'react';
import type { StudyPlan, StudyTask, RescheduleProposal, View } from '@/types';
import { reschedule, prettyDate, prettyTime, todayISO } from '@/lib/scheduler';
import { TaskStatusBadge, EmptyState } from '@/components/ui';
import {
  CheckCircle2, CircleX, Pencil, CalendarDays, AlertTriangle,
  ArrowRightLeft, Sparkles, X, Check, Clock,
} from 'lucide-react';

const SUBJECT_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export function Timetable({
  plan,
  onTaskUpdate,
  onRescheduleApprove,
  onNavigate,
}: {
  plan: StudyPlan | null;
  onTaskUpdate: (taskId: string, updates: Partial<StudyTask>) => void;
  onRescheduleApprove: (proposal: RescheduleProposal) => void;
  onNavigate: (v: View) => void;
}) {
  const [proposal, setProposal] = useState<RescheduleProposal | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [rescheduling, setRescheduling] = useState(false);

  const today = todayISO();

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    if (!plan) return {};
    const grouped: Record<string, StudyTask[]> = {};
    plan.tasks
      .filter((t) => !t.isBreak)
      .forEach((t) => {
        if (!grouped[t.date]) grouped[t.date] = [];
        grouped[t.date].push(t);
      });
    Object.keys(grouped).forEach((d) => grouped[d].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return grouped;
  }, [plan]);

  if (!plan) {
    return (
      <EmptyState
        icon={<CalendarDays className="w-8 h-8" />}
        title="No timetable to show"
        description="Create a study plan first to generate your personalized timetable."
        action={<button onClick={() => onNavigate('create-plan')} className="btn-primary">Create Study Plan</button>}
      />
    );
  }

  const sortedDates = Object.keys(tasksByDate).sort();

  const handleComplete = (taskId: string) => {
    onTaskUpdate(taskId, { status: 'completed' });
  };

  const handleMiss = (taskId: string) => {
    onTaskUpdate(taskId, { status: 'missed' });
  };

  const startEdit = (task: StudyTask) => {
    setEditing(task.id);
    setEditTopic(task.topic);
    setEditDate(task.date);
    setEditStart(task.startTime);
    setEditEnd(task.endTime);
  };

  const saveEdit = () => {
    if (editing) {
      onTaskUpdate(editing, { topic: editTopic, date: editDate, startTime: editStart, endTime: editEnd });
      setEditing(null);
    }
  };

  const missedTasks = plan.tasks.filter((t) => t.status === 'missed' && !t.isBreak);

  const handleReschedule = () => {
    setRescheduling(true);
    setTimeout(() => {
      const result = reschedule({
        tasks: plan.tasks,
        missedTaskIds: missedTasks.map((t) => t.id),
        availableHoursPerDay: plan.input.availableHoursPerDay,
        preferredSessionDuration: plan.input.preferredSessionDuration,
        subjects: plan.input.subjects,
      });

      const p: RescheduleProposal = {
        missedTaskIds: missedTasks.map((t) => t.id),
        explanation: result.explanation,
        oldTasks: plan.tasks,
        proposedTasks: result.proposed,
        hasConflict: result.hasConflict,
        conflictDetails: result.conflictDetails,
      };
      setProposal(p);
      setRescheduling(false);
    }, 600);
  };

  const approveProposal = () => {
    if (proposal) {
      onRescheduleApprove(proposal);
      setProposal(null);
    }
  };

  const rejectProposal = () => {
    setProposal(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink-900">Study Timetable</h2>
          <p className="text-ink-500 text-sm mt-0.5">Mark tasks as complete, missed, or edit them. Missed tasks can be rescheduled automatically.</p>
        </div>
        {missedTasks.length > 0 && !proposal && (
          <button onClick={handleReschedule} disabled={rescheduling} className="btn-primary">
            {rescheduling ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Analyzing...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4" /> Reschedule {missedTasks.length} Missed Task{missedTasks.length > 1 ? 's' : ''}
              </>
            )}
          </button>
        )}
      </div>

      {/* Missed tasks banner */}
      {missedTasks.length > 0 && !proposal && (
        <div className="card p-4 bg-amber-50 border-amber-200 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900 text-sm">
              {missedTasks.length} task{missedTasks.length > 1 ? 's were' : ' was'} marked as missed.
            </p>
            <p className="text-amber-700 text-xs mt-0.5">
              Click "Reschedule" to generate a revised timetable that recovers the missed sessions.
            </p>
          </div>
        </div>
      )}

      {/* Reschedule proposal modal */}
      {proposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-ink-900/50" onClick={rejectProposal} />
          <div className="relative card p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto scrollbar-thin animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-navy-600" />
                <h3 className="font-display font-bold text-lg text-ink-900">Reschedule Proposal</h3>
              </div>
              <button onClick={rejectProposal} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {proposal.hasConflict ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h4 className="font-semibold text-red-900">Scheduling Conflict</h4>
                </div>
                <p className="text-sm text-red-700">{proposal.conflictDetails}</p>
              </div>
            ) : (
              <div className="rounded-xl bg-navy-50 border border-navy-200 p-4 mb-4">
                <h4 className="font-semibold text-navy-900 text-sm mb-1">Proposed Changes</h4>
                <p className="text-sm text-navy-700">{proposal.explanation}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Old schedule */}
              <div>
                <h4 className="text-xs font-bold text-ink-400 uppercase tracking-wide mb-2">Current Schedule</h4>
                <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
                  {proposal.oldTasks
                    .filter((t) => !t.isBreak && missedTasks.some((m) => m.id === t.id))
                    .map((t) => (
                      <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-red-50/50 border border-red-100">
                        <CircleX className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-ink-600 w-20">{prettyDate(t.date)}</span>
                        <span className="text-xs text-ink-700 flex-1 truncate">{t.subjectName}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Proposed schedule */}
              {!proposal.hasConflict && (
                <div>
                  <h4 className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Proposed Schedule</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
                    {proposal.proposedTasks
                      .filter((t) => !t.isBreak && (missedTasks.some((m) => m.subjectId === t.subjectId) || t.status === 'pending'))
                      .slice(0, 15)
                      .map((t) => (
                        <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                          <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-xs text-ink-600 w-20">{prettyDate(t.date)}</span>
                          <span className="text-xs text-ink-600 w-16">{prettyTime(t.startTime)}</span>
                          <span className="text-xs text-ink-700 flex-1 truncate">{t.subjectName}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              {!proposal.hasConflict && (
                <button onClick={approveProposal} className="btn-primary flex-1">
                  <CheckCircle2 className="w-4 h-4" /> Approve & Apply New Schedule
                </button>
              )}
              <button onClick={rejectProposal} className="btn-secondary flex-1">
                <X className="w-4 h-4" /> {proposal.hasConflict ? 'Close' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-ink-900/50" onClick={() => setEditing(null)} />
          <div className="relative card p-6 max-w-md w-full animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ink-900">Edit Task</h3>
              <button onClick={() => setEditing(null)} className="btn-ghost p-1.5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Topic</label>
                <input type="text" className="input" value={editTopic} onChange={(e) => setEditTopic(e.target.value)} />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" className="input" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" className="input" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={saveEdit} className="btn-primary flex-1">Save Changes</button>
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable */}
      <div className="space-y-6">
        {sortedDates.map((date) => {
          const dayTasks = tasksByDate[date];
          const isToday = date === today;
          return (
            <div key={date} className={`card p-5 ${isToday ? 'ring-2 ring-navy-200' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isToday && <span className="badge text-navy-700 bg-navy-50 border border-navy-200">Today</span>}
                  <h3 className="font-display font-bold text-ink-900">
                    {prettyDate(date)}
                  </h3>
                </div>
                <span className="text-xs text-ink-400">{dayTasks.length} sessions</span>
              </div>

              <div className="space-y-2">
                {dayTasks.map((task) => {
                  const subjIndex = plan.input.subjects.findIndex((s) => s.id === task.subjectId);
                  const color = SUBJECT_COLORS[subjIndex % SUBJECT_COLORS.length];
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all group ${
                        task.status === 'completed'
                          ? 'bg-emerald-50/40 border-emerald-200/50'
                          : task.status === 'missed'
                          ? 'bg-red-50/40 border-red-200/50'
                          : 'bg-white border-ink-100 hover:border-ink-200 hover:shadow-soft'
                      }`}
                    >
                      <div className="w-1 h-12 rounded-full" style={{ background: color }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-ink-400' : 'text-ink-900'}`}>
                            {task.subjectName}
                          </p>
                          <TaskStatusBadge status={task.status} />
                        </div>
                        <p className="text-xs text-ink-400 truncate mt-0.5">{task.topic}</p>
                      </div>

                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1 text-xs font-medium text-ink-600">
                          <Clock className="w-3 h-3" />
                          {prettyTime(task.startTime)} – {prettyTime(task.endTime)}
                        </div>
                        <p className="text-[11px] text-ink-400">{task.durationMinutes} min</p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => handleComplete(task.id)}
                            className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Mark as complete"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {task.status === 'pending' && (
                          <button
                            onClick={() => handleMiss(task.id)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            title="Mark as missed"
                          >
                            <CircleX className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(task)}
                          className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 transition-colors"
                          title="Edit task"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {sortedDates.length === 0 && (
        <EmptyState
          icon={<CalendarDays className="w-8 h-8" />}
          title="No sessions scheduled"
          description="Your timetable is empty. Try creating a new plan."
          action={<button onClick={() => onNavigate('create-plan')} className="btn-primary">Create Study Plan</button>}
        />
      )}
    </div>
  );
}
