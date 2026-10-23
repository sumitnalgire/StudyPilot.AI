import { useMemo, useRef, useState, useEffect } from 'react';
import type { StudyPlan, ChatMessage } from '@/types';
import { getAssistantResponse, isDemoMode, getDemoPreamble } from '@/lib/aiService';
import { prettyDate, todayISO } from '@/lib/scheduler';
import { EmptyState } from '@/components/ui';
import { Sparkles, Send, Bot, User, AlertCircle, Lightbulb, Clock, BookOpen, ListChecks } from 'lucide-react';
import { uid } from '@/lib/storage';

const SUGGESTIONS = [
  { label: 'Explain a difficult topic', icon: <BookOpen className="w-4 h-4" />, text: 'Explain the most difficult topic in my plan' },
  { label: 'Suggest next study task', icon: <ListChecks className="w-4 h-4" />, text: 'What should I study next?' },
  { label: 'Revision strategy', icon: <Clock className="w-4 h-4" />, text: 'Give me a revision strategy for my hardest subject' },
  { label: 'Break down a topic', icon: <Lightbulb className="w-4 h-4" />, text: 'Help me break a difficult topic into smaller tasks' },
];

export function Assistant({
  plan,
  chatHistory,
  onChatUpdate,
  onNavigate,
}: {
  plan: StudyPlan | null;
  chatHistory: ChatMessage[];
  onChatUpdate: (messages: ChatMessage[]) => void;
  onNavigate: (v: 'dashboard' | 'create-plan') => void;
}) {
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const demo = isDemoMode();

  const context = useMemo(() => {
    if (!plan) return { subjects: [], upcomingExams: [], difficultTopics: [], nextTask: undefined };
    const today = todayISO();
    const nextPending = plan.tasks.find((t) => !t.isBreak && t.status === 'pending' && t.date >= today);
    return {
      subjects: plan.input.subjects.map((s) => s.name),
      upcomingExams: plan.input.subjects
        .map((s) => ({ name: s.name, date: s.examDate }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3),
      nextTask: nextPending ? `${nextPending.subjectName}: ${nextPending.topic} (${prettyDate(nextPending.date)})` : undefined,
      difficultTopics: plan.input.subjects.flatMap((s) => s.difficultTopics),
    };
  }, [plan]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, thinking]);

  const handleSend = (text?: string) => {
    const message = text ?? input;
    if (!message.trim()) return;

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: message,
      timestamp: Date.now(),
    };

    const newHistory = [...chatHistory, userMsg];
    onChatUpdate(newHistory);
    setInput('');
    setThinking(true);

    setTimeout(() => {
      const response = getAssistantResponse(message, context);
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      onChatUpdate([...newHistory, assistantMsg]);
      setThinking(false);
    }, 700);
  };

  if (!plan) {
    return (
      <EmptyState
        icon={<Sparkles className="w-8 h-8" />}
        title="AI Study Assistant"
        description="Create a study plan first so the assistant can give you personalized guidance based on your subjects and exam dates."
        action={<button onClick={() => onNavigate('create-plan')} className="btn-primary">Create Study Plan</button>}
      />
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-navy-500 to-violet-600 flex items-center justify-center shadow-glow">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-ink-900">AI Study Assistant</h2>
          <p className="text-ink-500 text-sm">Explain topics, plan revision, and get study recommendations.</p>
        </div>
      </div>

      {/* Demo mode banner */}
      {demo && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">{getDemoPreamble()}</p>
        </div>
      )}

      {/* Chat container */}
      <div className="card flex flex-col" style={{ height: '60vh' }}>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
          {chatHistory.length === 0 && !thinking && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-navy-50 flex items-center justify-center mb-3 text-navy-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <p className="font-display font-bold text-ink-900 mb-1">Ask me anything about your studies</p>
              <p className="text-sm text-ink-400 mb-4 max-w-sm">I can explain difficult topics, suggest revision strategies, recommend your next task, and break down complex topics.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => handleSend(s.text)}
                    className="flex items-center gap-2 p-3 rounded-xl border border-ink-200 text-sm text-ink-600 hover:border-navy-300 hover:bg-navy-50 hover:text-navy-700 transition-all text-left"
                  >
                    {s.icon}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-up`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-ink-200 text-ink-600' : 'bg-navy-600 text-white'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-navy-600 text-white rounded-tr-sm'
                  : 'bg-ink-50 text-ink-800 rounded-tl-sm'
              }`}>
                <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-navy-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-ink-50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-navy-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-ink-100 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="input flex-1"
              placeholder="Type your question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
              disabled={thinking}
            />
            <button onClick={() => handleSend()} disabled={thinking || !input.trim()} className="btn-primary px-4">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
