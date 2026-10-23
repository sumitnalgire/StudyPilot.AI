import { useState } from 'react';
import type { Subject, Difficulty, StudyPlan, StudyPlanInput, StudyTask, View } from '@/types';
import { DIFFICULTY_LABELS } from '@/types';
import { generateSchedule } from '@/lib/scheduler';
import { uid } from '@/lib/storage';
import { Plus, Trash2, CalendarPlus, AlertCircle, CheckCircle2, BookOpen } from 'lucide-react';

function defaultDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface DraftSubject {
  id: string;
  name: string;
  difficultTopics: string;
  examDate: string;
  difficulty: Difficulty;
  hoursAllocated: number;
}

function emptySubject(): DraftSubject {
  return {
    id: uid(),
    name: '',
    difficultTopics: '',
    examDate: defaultDate(14),
    difficulty: 'medium',
    hoursAllocated: 8,
  };
}

const SAMPLE_SUBJECTS: DraftSubject[] = [
  {
    id: uid(),
    name: 'Data Structures & Algorithms',
    difficultTopics: 'Dynamic Programming, Graph Traversal, Red-Black Trees',
    examDate: defaultDate(12),
    difficulty: 'hard',
    hoursAllocated: 15,
  },
  {
    id: uid(),
    name: 'Linear Algebra',
    difficultTopics: 'Eigenvalues, Matrix Decomposition',
    examDate: defaultDate(8),
    difficulty: 'medium',
    hoursAllocated: 10,
  },
  {
    id: uid(),
    name: 'Operating Systems',
    difficultTopics: 'Process Scheduling, Deadlocks, Memory Management',
    examDate: defaultDate(15),
    difficulty: 'hard',
    hoursAllocated: 12,
  },
];

export function CreatePlan({
  onPlanCreated,
  onNavigate,
  onStudentName,
}: {
  onPlanCreated: (plan: StudyPlan) => void;
  onNavigate: (v: View) => void;
  onStudentName: (name: string) => void;
}) {
  const [subjects, setSubjects] = useState<DraftSubject[]>(SAMPLE_SUBJECTS);
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState(5);
  const [preferredSessionDuration, setPreferredSessionDuration] = useState(50);
  const [studyDaysAhead, setStudyDaysAhead] = useState(7);
  const [studentName, setStudentName] = useState('Student');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generated, setGenerated] = useState<StudyTask[] | null>(null);

  const addSubject = () => setSubjects((s) => [...s, emptySubject()]);
  const removeSubject = (id: string) => setSubjects((s) => s.filter((x) => x.id !== id));

  const updateSubject = (id: string, field: keyof DraftSubject, value: string | number | Difficulty) => {
    setSubjects((s) => s.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (subjects.length === 0) e.subjects = 'Add at least one subject.';
    subjects.forEach((s, i) => {
      if (!s.name.trim()) e[`subject-${i}-name`] = 'Subject name required';
      if (!s.examDate) e[`subject-${i}-exam`] = 'Exam date required';
      if (s.hoursAllocated <= 0) e[`subject-${i}-hours`] = 'Must be greater than 0';
      // Check exam date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(s.examDate) < today) e[`subject-${i}-exam`] = 'Exam date cannot be in the past';
    });
    if (availableHoursPerDay <= 0 || availableHoursPerDay > 16) e.hours = 'Enter 1–16 hours per day';
    if (preferredSessionDuration < 20 || preferredSessionDuration > 180) e.session = 'Enter 20–180 minutes';
    if (studyDaysAhead < 1 || studyDaysAhead > 30) e.days = 'Enter 1–30 days';
    return e;
  };

  const handleGenerate = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    const mappedSubjects: Subject[] = subjects.map((s) => ({
      id: s.id,
      name: s.name.trim(),
      difficultTopics: s.difficultTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      examDate: s.examDate,
      difficulty: s.difficulty,
      hoursAllocated: s.hoursAllocated,
    }));

    const input: StudyPlanInput = {
      subjects: mappedSubjects,
      availableHoursPerDay,
      preferredSessionDuration,
      studyDaysAhead,
    };

    const tasks = generateSchedule(input);
    setGenerated(tasks);
  };

  const handleConfirm = () => {
    if (!generated) return;
    const mappedSubjects: Subject[] = subjects.map((s) => ({
      id: s.id,
      name: s.name.trim(),
      difficultTopics: s.difficultTopics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      examDate: s.examDate,
      difficulty: s.difficulty,
      hoursAllocated: s.hoursAllocated,
    }));

    const input: StudyPlanInput = {
      subjects: mappedSubjects,
      availableHoursPerDay,
      preferredSessionDuration,
      studyDaysAhead,
    };

    const plan: StudyPlan = {
      id: uid(),
      createdAt: new Date().toISOString(),
      input,
      tasks: generated,
    };
    onStudentName(studentName.trim() || 'Student');
    onPlanCreated(plan);
    onNavigate('timetable');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h2 className="font-display font-bold text-2xl text-ink-900">Create Your Study Plan</h2>
        <p className="text-ink-500 text-sm mt-1">Enter your subjects, exam dates, and available time. StudyPilot AI will generate an intelligent timetable.</p>
      </div>

      {/* Student name */}
      <div className="card p-6">
        <label className="label">Your Name</label>
        <input
          type="text"
          className="input max-w-xs"
          placeholder="e.g. Alex"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
        />
      </div>

      {/* Subjects */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg text-ink-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-navy-600" /> Subjects
          </h3>
          <button onClick={addSubject} className="btn-primary text-sm">
            <Plus className="w-4 h-4" /> Add Subject
          </button>
        </div>

        {errors.subjects && <p className="text-sm text-red-600 mb-3">{errors.subjects}</p>}

        <div className="space-y-4">
          {subjects.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-ink-200 p-4 bg-ink-50/30 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-ink-400 uppercase tracking-wide">Subject {i + 1}</span>
                {subjects.length > 1 && (
                  <button onClick={() => removeSubject(s.id)} className="text-ink-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Subject Name</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Calculus"
                    value={s.name}
                    onChange={(e) => updateSubject(s.id, 'name', e.target.value)}
                  />
                  {errors[`subject-${i}-name`] && <p className="text-xs text-red-600 mt-1">{errors[`subject-${i}-name`]}</p>}
                </div>

                <div>
                  <label className="label">Exam Date</label>
                  <input
                    type="date"
                    className="input"
                    value={s.examDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateSubject(s.id, 'examDate', e.target.value)}
                  />
                  {errors[`subject-${i}-exam`] && <p className="text-xs text-red-600 mt-1">{errors[`subject-${i}-exam`]}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="label">Difficult Topics (comma-separated)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Integration, Series, Limits"
                    value={s.difficultTopics}
                    onChange={(e) => updateSubject(s.id, 'difficultTopics', e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Difficulty</label>
                  <div className="flex gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                      <button
                        key={d}
                        onClick={() => updateSubject(s.id, 'difficulty', d)}
                        className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          s.difficulty === d
                            ? 'border-navy-400 bg-navy-50 text-navy-700 shadow-soft'
                            : 'border-ink-200 text-ink-500 hover:border-ink-300'
                        }`}
                      >
                        {DIFFICULTY_LABELS[d]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Total Hours to Allocate</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={100}
                    value={s.hoursAllocated}
                    onChange={(e) => updateSubject(s.id, 'hoursAllocated', Number(e.target.value))}
                  />
                  {errors[`subject-${i}-hours`] && <p className="text-xs text-red-600 mt-1">{errors[`subject-${i}-hours`]}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study preferences */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Study Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Available Hours / Day</label>
            <input
              type="number"
              className="input"
              min={1}
              max={16}
              value={availableHoursPerDay}
              onChange={(e) => setAvailableHoursPerDay(Number(e.target.value))}
            />
            {errors.hours && <p className="text-xs text-red-600 mt-1">{errors.hours}</p>}
          </div>
          <div>
            <label className="label">Session Duration (min)</label>
            <input
              type="number"
              className="input"
              min={20}
              max={180}
              step={5}
              value={preferredSessionDuration}
              onChange={(e) => setPreferredSessionDuration(Number(e.target.value))}
            />
            {errors.session && <p className="text-xs text-red-600 mt-1">{errors.session}</p>}
          </div>
          <div>
            <label className="label">Days to Schedule Ahead</label>
            <input
              type="number"
              className="input"
              min={1}
              max={30}
              value={studyDaysAhead}
              onChange={(e) => setStudyDaysAhead(Number(e.target.value))}
            />
            {errors.days && <p className="text-xs text-red-600 mt-1">{errors.days}</p>}
          </div>
        </div>
      </div>

      {/* Generate / Confirm */}
      {!generated ? (
        <button onClick={handleGenerate} className="btn-primary w-full sm:w-auto">
          <CalendarPlus className="w-5 h-5" /> Generate Timetable
        </button>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="card p-6 bg-emerald-50/40 border-emerald-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-display font-bold text-ink-900">Timetable Generated!</h3>
            </div>
            <p className="text-sm text-ink-600">
              {generated.filter((t) => !t.isBreak).length} study sessions and {generated.filter((t) => t.isBreak).length} breaks across {studyDaysAhead} days.
              Review the summary below and confirm to save your plan.
            </p>
          </div>

          <div className="card p-6">
            <h4 className="font-display font-bold text-ink-900 mb-4">Schedule Preview (first 10 sessions)</h4>
            <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
              {generated.filter((t) => !t.isBreak).slice(0, 10).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-ink-50/50">
                  <span className="text-xs font-mono text-ink-400 w-24">{task.date}</span>
                  <span className="text-xs text-ink-600 w-24">{task.startTime}–{task.endTime}</span>
                  <span className="text-sm font-medium text-ink-900 flex-1 truncate">{task.subjectName}</span>
                  <span className="text-xs text-ink-400 truncate">{task.topic}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={handleConfirm} className="btn-primary">
              <CheckCircle2 className="w-5 h-5" /> Confirm & Save Plan
            </button>
            <button onClick={() => setGenerated(null)} className="btn-secondary">
              Edit Inputs
            </button>
          </div>
        </div>
      )}

      {/* Subject summary chips */}
      {Object.keys(errors).length > 0 && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> Please fix the highlighted errors above.
        </div>
      )}
    </div>
  );
}
