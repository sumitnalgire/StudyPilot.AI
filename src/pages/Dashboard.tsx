import { useMemo } from 'react';
import type { StudyPlan, View } from '@/types';
import { computeStats, prettyDate, prettyTime, todayISO } from '@/lib/scheduler';
import { BarChart, ProgressBar } from '@/components/charts';
import { EmptyState } from '@/components/ui';
import { Clock, CheckCircle2, CircleAlert, Calendar, ArrowRight, GraduationCap, Zap } from 'lucide-react';

const SUBJECT_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export function Dashboard({
  plan,
  studentName,
  onNavigate,
}: {
  plan: StudyPlan | null;
  studentName: string;
  onNavigate: (v: View) => void;
}) {
  const stats = useMemo(() => (plan ? computeStats(plan.tasks) : null), [plan]);
  const today = todayISO();

  if (!plan || !stats) {
    return (
      <EmptyState
        icon={<GraduationCap className="w-8 h-8" />}
        title="No study plan yet"
        description="Create your first study plan to generate a personalized timetable and start tracking your progress."
        action={
          <button onClick={() => onNavigate('create-plan')} className="btn-primary">
            <Calendar className="w-4 h-4" /> Create Study Plan
          </button>
        }
      />
    );
  }

  const todayTasks = plan.tasks
    .filter((t) => !t.isBreak && t.date === today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const nextPending = todayTasks.find((t) => t.status === 'pending') || plan.tasks.find((t) => t.status === 'pending' && t.date >= today);

  const upcomingExams = [...plan.input.subjects]
    .map((s) => ({ ...s, daysLeft: Math.ceil((new Date(s.examDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) }))
    .filter((s) => s.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const subjectSegments = Object.entries(stats.bySubject).map(([name, data], i) => ({
    label: name,
    value: data.completed,
    color: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display font-bold text-2xl text-ink-900">{greeting}, {studentName}!</h2>
          <p className="text-ink-500 text-sm mt-0.5">Here's your study overview for today.</p>
        </div>
        <div className="text-sm text-ink-500 font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Today's Study Hours"
          value={`${(stats.todayCompletedMinutes / 60).toFixed(1)}h`}
          sub="of planned today"
          color="from-navy-500 to-navy-600"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Completed Tasks"
          value={String(stats.completed.length)}
          sub={`of ${stats.total} total`}
          color="from-emerald-500 to-emerald-600"
        />
        <StatCard
          icon={<CircleAlert className="w-5 h-5" />}
          label="Pending Tasks"
          value={String(stats.pending.length)}
          sub="still to do"
          color="from-amber-500 to-amber-600"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Missed Tasks"
          value={String(stats.missed.length)}
          sub="needs rescheduling"
          color="from-red-500 to-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display font-bold text-lg text-ink-900">Weekly Study Progress</h3>
              <p className="text-sm text-ink-400">Hours completed per day (last 7 days)</p>
            </div>
            <button onClick={() => onNavigate('progress')} className="btn-ghost text-sm">
              View details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <BarChart data={stats.weekData} />
        </div>

        {/* Upcoming exams */}
        <div className="card p-6">
          <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Upcoming Exams</h3>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-ink-400">No upcoming exams in your plan.</p>
          ) : (
            <div className="space-y-3">
              {upcomingExams.map((exam) => (
                <div key={exam.id} className="flex items-center gap-3 p-3 rounded-xl bg-ink-50 border border-ink-100">
                  <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center text-navy-600">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 text-sm truncate">{exam.name}</p>
                    <p className="text-xs text-ink-400">{prettyDate(exam.examDate)}</p>
                  </div>
                  <span className={`badge ${exam.daysLeft <= 3 ? 'text-red-700 bg-red-50 border border-red-200' : 'text-navy-700 bg-navy-50 border border-navy-200'}`}>
                    {exam.daysLeft === 0 ? 'Today' : `${exam.daysLeft}d`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's timetable */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-ink-900">Today's Timetable</h3>
            <button onClick={() => onNavigate('timetable')} className="btn-ghost text-sm">
              Full schedule <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {todayTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-ink-400 text-sm">No study sessions scheduled for today. Enjoy your day or adjust your plan!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.map((task) => {
                const subjIndex = plan.input.subjects.findIndex((s) => s.id === task.subjectId);
                const color = SUBJECT_COLORS[subjIndex % SUBJECT_COLORS.length];
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      task.status === 'completed'
                        ? 'bg-emerald-50/50 border-emerald-200/60'
                        : task.status === 'missed'
                        ? 'bg-red-50/50 border-red-200/60'
                        : 'bg-ink-50/50 border-ink-100'
                    }`}
                  >
                    <div className="w-1 h-10 rounded-full" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${task.status === 'completed' ? 'line-through text-ink-400' : 'text-ink-900'}`}>
                        {task.subjectName}
                      </p>
                      <p className="text-xs text-ink-400 truncate">{task.topic}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-ink-600">{prettyTime(task.startTime)}</p>
                      <p className="text-[11px] text-ink-400">{prettyTime(task.endTime)}</p>
                    </div>
                    {task.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Next recommended task + subject completion */}
        <div className="space-y-6">
          <div className="card p-6 bg-gradient-to-br from-navy-50 to-white">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-navy-600" />
              <h3 className="font-display font-bold text-sm text-ink-900">Next Recommended Task</h3>
            </div>
            {nextPending ? (
              <div>
                <p className="font-display font-bold text-lg text-navy-900">{nextPending.subjectName}</p>
                <p className="text-sm text-ink-500 mt-1">{nextPending.topic}</p>
                <div className="mt-3 flex items-center gap-2 text-sm text-ink-600">
                  <Clock className="w-4 h-4" />
                  {prettyDate(nextPending.date)} · {prettyTime(nextPending.startTime)}
                </div>
                <button onClick={() => onNavigate('timetable')} className="btn-primary mt-4 w-full text-sm">
                  Go to Timetable <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-ink-400">All pending tasks are done. Great work!</p>
            )}
          </div>

          <div className="card p-6">
            <h3 className="font-display font-bold text-sm text-ink-900 mb-3">Subject Completion</h3>
            {subjectSegments.length === 0 ? (
              <p className="text-sm text-ink-400">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.bySubject).map(([name, data], i) => {
                  const pct = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                  const color = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                  return (
                    <div key={name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-ink-700 truncate">{name}</span>
                        <span className="text-ink-400">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar value={data.completed} max={data.total} color={color} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="card p-5 animate-slide-up">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3 shadow-soft`}>
        {icon}
      </div>
      <p className="text-2xl font-display font-bold text-ink-900">{value}</p>
      <p className="text-sm font-medium text-ink-600 mt-0.5">{label}</p>
      <p className="text-xs text-ink-400 mt-0.5">{sub}</p>
    </div>
  );
}
