import type {
  StudyTask,
  Subject,
  StudyPlanInput,
  TaskStatus,
} from '@/types';
import { DIFFICULTY_WEIGHTS } from '@/types';
import { uid } from './storage';

// ---------- Date helpers ----------

export function todayISO(): string {
  const d = new Date();
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function daysBetween(a: string, b: string): number {
  const da = parseISODate(a);
  const db = parseISODate(b);
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatTime(h: number, m: number): string {
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return formatTime(nh, nm);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function prettyDate(iso: string): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function prettyTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

// ---------- Scoring / prioritization ----------

function urgencyScore(subject: Subject, today: string): number {
  const daysLeft = daysBetween(today, subject.examDate);
  if (daysLeft <= 0) return 1000;
  return 100 / Math.max(daysLeft, 1);
}

function subjectPriority(subject: Subject, today: string): number {
  const urgency = urgencyScore(subject, today);
  const difficulty = DIFFICULTY_WEIGHTS[subject.difficulty];
  return urgency * difficulty;
}

// ---------- Core scheduling ----------

export function generateSchedule(input: StudyPlanInput): StudyTask[] {
  const today = todayISO();
  const tasks: StudyTask[] = [];
  const sessionMin = input.preferredSessionDuration || 50;
  const breakMin = 10;
  const dailyStudyMinutes = Math.round(input.availableHoursPerDay * 60);

  // Track remaining workload (minutes) per subject
  const remaining: Record<string, number> = {};
  input.subjects.forEach((s) => {
    remaining[s.id] = Math.round(s.hoursAllocated * 60);
  });

  const sortedSubjects = [...input.subjects].sort(
    (a, b) => subjectPriority(b, today) - subjectPriority(a, today),
  );

  const totalDays = input.studyDaysAhead || 7;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const dateISO = toISODate(addDays(parseISODate(today), dayOffset));
    let scheduledMinutes = 0;
    let slotStart = 9 * 60; // start at 9:00 AM = 540

    // Rotate through subjects by priority, scheduling one session each pass
    let madeProgress = true;
    while (madeProgress && scheduledMinutes < dailyStudyMinutes) {
      madeProgress = false;
      for (const subject of sortedSubjects) {
        if (remaining[subject.id] <= 0) continue;
        if (scheduledMinutes + sessionMin > dailyStudyMinutes) break;

        // Skip exam day itself (no study on exam day)
        if (dateISO === subject.examDate) {
          remaining[subject.id] = 0;
          continue;
        }

        // Determine topic
        const topicIdx = Math.floor((scheduledMinutes / sessionMin) % Math.max(subject.difficultTopics.length, 1));
        const topic = subject.difficultTopics[topicIdx] || `General ${subject.name} study`;

        const start = formatTime(Math.floor(slotStart / 60), slotStart % 60);
        const end = addMinutesToTime(start, sessionMin);
        tasks.push({
          id: uid(),
          subjectId: subject.id,
          subjectName: subject.name,
          topic,
          date: dateISO,
          startTime: start,
          endTime: end,
          durationMinutes: sessionMin,
          type: 'study',
          status: 'pending',
        });
        slotStart += sessionMin;
        scheduledMinutes += sessionMin;
        remaining[subject.id] -= sessionMin;
        madeProgress = true;

        // Add a break if more sessions will follow today
        if (scheduledMinutes + breakMin < dailyStudyMinutes) {
          const bStart = formatTime(Math.floor(slotStart / 60), slotStart % 60);
          const bEnd = addMinutesToTime(bStart, breakMin);
          tasks.push({
            id: uid(),
            subjectId: '',
            subjectName: 'Break',
            topic: 'Short break',
            date: dateISO,
            startTime: bStart,
            endTime: bEnd,
            durationMinutes: breakMin,
            type: 'break',
            status: 'pending',
            isBreak: true,
          });
          slotStart += breakMin;
          scheduledMinutes += breakMin;
        }
      }
    }
  }

  return tasks;
}

// ---------- Adaptive rescheduling ----------

export interface RescheduleOptions {
  tasks: StudyTask[];
  missedTaskIds: string[];
  availableHoursPerDay: number;
  preferredSessionDuration: number;
  subjects: Subject[];
  maxDaysAhead?: number;
}

export function reschedule(opts: RescheduleOptions): {
  proposed: StudyTask[];
  explanation: string;
  hasConflict: boolean;
  conflictDetails: string;
} {
  const { tasks, missedTaskIds, availableHoursPerDay, preferredSessionDuration, subjects } = opts;
  const today = todayISO();

  // Identify the missed tasks
  const missedTasks = tasks.filter((t) => missedTaskIds.includes(t.id) && !t.isBreak);
  if (missedTasks.length === 0) {
    return {
      proposed: tasks,
      explanation: 'No missed tasks were found. The schedule remains unchanged.',
      hasConflict: false,
      conflictDetails: '',
    };
  }

  // Mark missed tasks as missed in the copy
  const working = tasks.map((t) => ({
    ...t,
    status: (missedTaskIds.includes(t.id) ? 'missed' : t.status) as TaskStatus,
  }));

  // Gather future pending tasks (not yet started) we can potentially rearrange
  const futurePending = working.filter(
    (t) => !t.isBreak && t.status === 'pending' && t.date >= today,
  );

  // Group futurePending by subject to know what's still scheduled ahead
  const upcomingBySubject: Record<string, StudyTask[]> = {};
  futurePending.forEach((t) => {
    if (!upcomingBySubject[t.subjectId]) upcomingBySubject[t.subjectId] = [];
    upcomingBySubject[t.subjectId].push(t);
  });

  // Calculate remaining minutes needed per subject
  // For each missed task, check if it can be re-scheduled before its exam date
  const rescheduleSlots: { task: StudyTask; needsMinutes: number; subjectId: string }[] = [];
  let totalRescheduleMinutes = 0;

  for (const missed of missedTasks) {
    const subject = subjects.find((s) => s.id === missed.subjectId);
    if (!subject) continue;
    const daysLeft = daysBetween(today, subject.examDate);
    if (daysLeft <= 0) {
      // Exam already passed — cannot reschedule
      continue;
    }
    rescheduleSlots.push({
      task: missed,
      needsMinutes: missed.durationMinutes,
      subjectId: missed.subjectId,
    });
    totalRescheduleMinutes += missed.durationMinutes;
  }

  // Compute available free minutes across remaining days
  const remainingDays = new Set<string>();
  // include dates from today forward that already have tasks
  working.forEach((t) => {
    if (t.date >= today) remainingDays.add(t.date);
  });
  // also consider the next 14 days even if empty
  for (let i = 0; i < 14; i++) {
    remainingDays.add(toISODate(addDays(parseISODate(today), i)));
  }

  const dailyStudyMinutes = Math.round(availableHoursPerDay * 60);
  // Compute already-scheduled minutes per day
  const scheduledPerDay: Record<string, number> = {};
  working.forEach((t) => {
    if (t.date >= today && !t.isBreak && t.status === 'pending') {
      scheduledPerDay[t.date] = (scheduledPerDay[t.date] || 0) + t.durationMinutes;
    }
  });

  let totalFreeMinutes = 0;
  const dayFree: { date: string; free: number }[] = [];
  remainingDays.forEach((date) => {
    const used = scheduledPerDay[date] || 0;
    const free = Math.max(dailyStudyMinutes - used, 0);
    totalFreeMinutes += free;
    dayFree.push({ date, free });
  });
  dayFree.sort((a, b) => a.date.localeCompare(b.date));

  if (totalFreeMinutes < totalRescheduleMinutes) {
    const deficit = totalRescheduleMinutes - totalFreeMinutes;
    return {
      proposed: working,
      hasConflict: true,
      conflictDetails: `There is not enough free time to fully reschedule ${Math.round(totalRescheduleMinutes / 60 * 10) / 10} hours of missed work. You are short by approximately ${Math.round(deficit / 60 * 10) / 10} hours. Consider increasing available study hours per day or accepting a lighter load on some subjects.`,
      explanation:
        'The missed sessions cannot be fully absorbed within the remaining study time before the exams. ' +
        'The system detected a scheduling conflict and is presenting the existing schedule unchanged.',
    };
  }

  // Build proposed schedule: keep completed + future pending, insert missed tasks into free slots
  // Remove breaks that were adjacent to now-missed tasks to keep things clean (they'll be regenerated)
  const proposed: StudyTask[] = working.filter((t) => t.status !== 'missed');

  // For each missed task, find the earliest day with free time before its exam
  for (const slot of rescheduleSlots) {
    const subject = subjects.find((s) => s.id === slot.subjectId);
    if (!subject) continue;
    const examISO = subject.examDate;

    let placed = false;
    for (const df of dayFree) {
      if (df.date >= examISO) break; // can't study after exam
      if (df.free >= slot.needsMinutes) {
        // find the latest slot time that day after existing tasks
        const dayTasks = proposed
          .filter((t) => t.date === df.date && !t.isBreak)
          .sort((a, b) => timeToMinutes(b.endTime) - timeToMinutes(a.endTime));
        let startMin = 9 * 60; // 9 AM
        if (dayTasks.length > 0) {
          startMin = timeToMinutes(dayTasks[0].endTime) + 10;
        }
        const start = formatTime(Math.floor(startMin / 60), startMin % 60);
        const end = addMinutesToTime(start, slot.needsMinutes);
        proposed.push({
          ...slot.task,
          id: uid(),
          date: df.date,
          startTime: start,
          endTime: end,
          status: 'pending',
          type: 'study',
        });
        df.free -= slot.needsMinutes;
        scheduledPerDay[df.date] = (scheduledPerDay[df.date] || 0) + slot.needsMinutes;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Fallback: append to the day with the most free time
      dayFree.sort((a, b) => b.free - a.free);
      const best = dayFree[0];
      if (best && best.free > 0) {
        const startMin = 9 * 60;
        const start = formatTime(Math.floor(startMin / 60), startMin % 60);
        const end = addMinutesToTime(start, Math.min(slot.needsMinutes, best.free));
        proposed.push({
          ...slot.task,
          id: uid(),
          date: best.date,
          startTime: start,
          endTime: end,
          status: 'pending',
          type: 'study',
        });
        best.free -= slot.needsMinutes;
      }
    }
  }

  // Sort proposed by date + time
  proposed.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const subjectNames = missedTasks.map((t) => t.subjectName);
  const uniqueSubjects = [...new Set(subjectNames)];
  const explanationParts = [
    `${missedTasks.length} task${missedTasks.length > 1 ? 's were' : ' was'} marked as missed.`,
    ...uniqueSubjects.map((name) => {
      const s = subjects.find((su) => su.name === name);
      const dl = s ? daysBetween(today, s.examDate) : null;
      if (dl !== null && dl <= 0) {
        return `"${name}" — the exam date has passed; that session cannot be rescheduled.`;
      }
      return `"${name}" — ${missedTasks.filter((t) => t.subjectName === name).length} session(s) will be moved to the earliest available free slot before the exam.`;
    }),
    'All completed tasks remain unchanged. Future pending sessions are kept, and the missed work is inserted into days with spare capacity.',
  ];

  return {
    proposed,
    explanation: explanationParts.join(' '),
    hasConflict: false,
    conflictDetails: '',
  };
}

// ---------- Stats helpers ----------

export function computeStats(tasks: StudyTask[]) {
  const studyTasks = tasks.filter((t) => !t.isBreak);
  const completed = studyTasks.filter((t) => t.status === 'completed');
  const pending = studyTasks.filter((t) => t.status === 'pending');
  const missed = studyTasks.filter((t) => t.status === 'missed');

  const completedMinutes = completed.reduce((s, t) => s + t.durationMinutes, 0);
  const completedHours = completedMinutes / 60;

  const pendingMinutes = pending.reduce((s, t) => s + t.durationMinutes, 0);

  // Today
  const today = todayISO();
  const todayTasks = studyTasks.filter((t) => t.date === today);
  const todayCompletedMinutes = todayTasks
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + t.durationMinutes, 0);

  // By subject
  const bySubject: Record<string, { total: number; completed: number; pending: number; missed: number }> = {};
  studyTasks.forEach((t) => {
    if (!bySubject[t.subjectName]) {
      bySubject[t.subjectName] = { total: 0, completed: 0, pending: 0, missed: 0 };
    }
    bySubject[t.subjectName].total++;
    if (t.status === 'completed') bySubject[t.subjectName].completed++;
    else if (t.status === 'pending') bySubject[t.subjectName].pending++;
    else if (t.status === 'missed') bySubject[t.subjectName].missed++;
  });

  // Weekly chart data (last 7 days)
  const weekData: { date: string; label: string; hours: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(parseISODate(today), -i);
    const iso = toISODate(d);
    const minutes = studyTasks
      .filter((t) => t.date === iso && t.status === 'completed')
      .reduce((s, t) => s + t.durationMinutes, 0);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    weekData.push({ date: iso, label, hours: minutes / 60 });
  }

  return {
    completed,
    pending,
    missed,
    completedHours,
    pendingMinutes,
    todayCompletedMinutes,
    bySubject,
    weekData,
    total: studyTasks.length,
  };
}
