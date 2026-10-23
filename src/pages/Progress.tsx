import { useMemo } from 'react';
import type { StudyPlan, View } from '@/types';
import { computeStats, prettyDate, todayISO } from '@/lib/scheduler';
import { BarChart, DonutChart, ProgressBar } from '@/components/charts';
import { EmptyState, TaskStatusBadge } from '@/components/ui';
import { BarChart3, Calendar, GraduationCap, Clock, TrendingUp, CheckCircle2, CircleAlert } from 'lucide-react';

const SUBJECT_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export function Progress({
  plan,
  onNavigate,
}: {
  plan: StudyPlan | null;
  onNavigate: (v: View) => void;
}) {
  const stats = useMemo(() => (plan ? computeStats(plan.tasks) : null), [plan]);
  const today = todayISO();

  if (!plan || !stats) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-8 h-8" />}
        title="No progress data yet"
        description="Create a study plan and start completing tasks to see your progress charts here."
        action={<button onClick={() => onNavigate('create-plan')} className="btn-primary">Create Study Plan</button>}
      />
    );
  }

  const totalCompletedHours = stats.completedHours;
  const totalTasks = stats.total;
  const completionRate = totalTasks > 0 ? Math.round((stats.completed.length / totalTasks) * 100) : 0;

  const subjectSegments = Object.entries(stats.bySubject).map(([name, data], i) => ({
    label: name,
    value: data.completed,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));

  const maxDayHours = Math.max(...stats.weekData.map((d) => d.hours), 1);

  const upcomingExams = [...plan.input.subjects]
    .map((s) => ({ ...s, daysLeft: Math.ceil((new Date(s.examDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) }))
    .filter((s) => s.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Study Progress</h2>
        <p className="text-ink-500 text-sm mt-0.5">Track your study hours, completion rate, and subject-wise progress.</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Completed Study Hours"
          value={`${totalCompletedHours.toFixed(1)}h`}
          color="from-navy-500 to-navy-600"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Overall Completion"
          value={`${completionRate}%`}
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed Tasks"
          value={`${stats.completed.length}/${totalTasks}`}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={<CircleAlert className="w-5 h-5" />}
          label="Missed Tasks"
          value={String(stats.missed.length)}
          color="from-red-500 to-red-600"
        />
      </div>

      {/* Weekly chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-lg text-ink-900">Weekly Completed Study Hours</h3>
            <p className="text-sm text-ink-400">Last 7 days — calculated from your completed tasks</p>
          </div>
          <div className="text-right">
            <p className="font-display font-bold text-2xl text-navy-700">
              {stats.weekData.reduce((s, d) => s + d.hours, 0).toFixed(1)}h
            </p>
            <p className="text-xs text-ink-400">total this week</p>
          </div>
        </div>
        <BarChart data={stats.weekData} maxHours={maxDayHours} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject-wise completion donut */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Subject-wise Completion</h3>
          {subjectSegments.length === 0 || subjectSegments.every((s) => s.value === 0) ? (
            <div className="py-10 text-center">
              <p className="text-sm text-ink-400">No tasks completed yet. Complete some study sessions to see your subject breakdown.</p>
            </div>
          ) : (
            <DonutChart
              segments={subjectSegments}
              centerLabel="tasks done"
              centerValue={String(stats.completed.length)}
            />
          )}
        </div>

        {/* Task status breakdown */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Tasks Overview</h3>
          <div className="space-y-4">
            <StatusRow label="Completed" count={stats.completed.length} total={totalTasks} color="#10b981" />
            <StatusRow label="Pending" count={stats.pending.length} total={totalTasks} color="#6366f1" />
            <StatusRow label="Missed" count={stats.missed.length} total={totalTasks} color="#ef4444" />
          </div>

          <div className="mt-6 pt-4 border-t border-ink-100">
            <p className="text-xs text-ink-400 mb-3 font-medium">Recent task activity</p>
            <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-thin">
              {plan.tasks
                .filter((t) => !t.isBreak && t.status !== 'pending')
                .slice(-6)
                .reverse()
                .map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <TaskStatusBadge status={t.status} />
                    <span className="text-ink-600 truncate flex-1">{t.subjectName}</span>
                    <span className="text-ink-400">{prettyDate(t.date)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subject progress bars */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Subject Progress Detail</h3>
        <div className="space-y-4">
          {Object.entries(stats.bySubject).map(([name, data], i) => {
            const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
            return (
              <div key={name}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-semibold text-sm text-ink-800">{name}</span>
                  <span className="text-xs text-ink-400 font-medium">
                    {data.completed}/{data.total} done
                    {data.missed > 0 && <span className="text-red-500 ml-2">· {data.missed} missed</span>}
                  </span>
                </div>
                <ProgressBar value={data.completed} max={data.total} color={color} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming exams */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-lg text-ink-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-navy-600" /> Upcoming Examinations
        </h3>
        {upcomingExams.length === 0 ? (
          <p className="text-sm text-ink-400">No upcoming exams.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingExams.map((exam) => (
              <div key={exam.id} className="flex items-center gap-3 p-4 rounded-xl bg-ink-50 border border-ink-100">
                <div className="w-11 h-11 rounded-xl bg-navy-50 flex items-center justify-center text-navy-600">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-900 text-sm truncate">{exam.name}</p>
                  <p className="text-xs text-ink-400">{prettyDate(exam.examDate)}</p>
                </div>
                <span className={`badge ${exam.daysLeft <= 3 ? 'text-red-700 bg-red-50 border border-red-200' : 'text-navy-700 bg-navy-50 border border-navy-200'}`}>
                  {exam.daysLeft === 0 ? 'Today' : `${exam.daysLeft}d left`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card p-5 animate-slide-up">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-soft`}>
        {icon}
      </div>
      <p className="text-2xl font-display font-bold text-ink-900">{value}</p>
      <p className="text-sm font-medium text-ink-600 mt-0.5">{label}</p>
    </div>
  );
}

function StatusRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="text-ink-400">{count} ({Math.round(pct)}%)</span>
      </div>
      <ProgressBar value={count} max={total} color={color} />
    </div>
  );
}
