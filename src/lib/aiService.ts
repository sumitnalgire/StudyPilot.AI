// AI Study Assistant service module
//
// This module is structured so that a real Gemini (or other LLM) API can be
// wired in later. Currently it runs in DEMO mode and returns transparent
// sample responses generated from the user's study plan context.

export interface AssistantContext {
  subjects: string[];
  upcomingExams: { name: string; date: string }[];
  nextTask?: string;
  difficultTopics: string[];
}

export interface AssistantResponse {
  content: string;
  isDemo: boolean;
}

const DEMO_PREAMBLE = '⚠️ Demo Mode: No live AI API is connected. This is a generated sample response based on your study plan. To enable live AI, add a Gemini API key in your environment.';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function explainTopic(topic: string): string {
  const templates = [
    `To understand "${topic}", start with the fundamental concept and build upward. Break it into three parts: (1) definitions and key terms, (2) the core mechanism or process, (3) real-world examples or edge cases. Use active recall after each part before moving on.`,
    `"${topic}" can be intimidating, so let's simplify it. Begin by drawing a concept map connecting what you already know. Then tackle the hardest sub-question first while your focus is highest. Teach the concept back to yourself in plain language — if you can explain it to a friend, you truly understand it.`,
    `For "${topic}", the Feynman technique works well. Write down everything you know, identify the gaps, then go back to your notes and re-explain it simply. Focus on the "why" behind each step, not just the "what".`,
  ];
  return pick(templates);
}

function revisionStrategy(subject: string): string {
  const strategies = [
    `For ${subject}, use spaced repetition: review your notes after 1 day, then 3 days, then 1 week. Mix in practice problems rather than passively re-reading. Allocate 25-minute focused blocks with 5-minute breaks (Pomodoro).`,
    `Your ${subject} revision should prioritize active recall over passive reading. Create flashcards for key terms, then work through past exam questions under timed conditions. Identify your weak spots and schedule a dedicated review session for those.`,
    `A strong ${subject} strategy: first review the summary of each chapter, then attempt to solve problems without looking at solutions. Keep an "error log" of mistakes — revisit those the day before the exam.`,
  ];
  return pick(strategies);
}

function nextTaskSuggestion(task: string): string {
  return `Based on your current schedule, I recommend starting with "${task}". It's the most urgent task and tackles a high-difficulty topic. Begin with a 25-minute focused block, then take a short break. After completing it, mark it done so your progress stats update automatically.`;
}

function breakDownTopic(topic: string): string {
  return [
    `Here's how to break "${topic}" into smaller, manageable sub-tasks:`,
    ``,
    `1. Read or watch an overview of the core concept (20 min)`,
    `2. Write down 3–5 key definitions in your own words (15 min)`,
    `3. Work through one example or practice problem (20 min)`,
    `4. Identify the part that felt hardest — write it down (5 min)`,
    `5. Re-attempt the hardest part with fresh focus (25 min)`,
    ``,
    `Treat each step as its own mini-task. Check them off as you go — this builds momentum and makes the topic feel less overwhelming.`,
  ].join('\n');
}

function generalAdvice(): string {
  const responses = [
    `Great question. As a general study tip: prioritize the subjects with the nearest exam dates first, but dedicate the bulk of each session to the topics you find hardest. Mix difficult and easy topics across the day so you don't burn out on any single subject.`,
    `I'd recommend using the "interleaving" technique: alternate between different subjects in a single study session. This has been shown to improve retention compared to studying one subject for hours. Try 50 minutes of Subject A, a short break, then 50 minutes of Subject B.`,
    `For effective studying, try the Pomodoro technique: 25 minutes of focused work, 5-minute break, repeat 4 times, then a longer 20-minute break. Track your completed sessions to stay motivated.`,
  ];
  return pick(responses);
}

export function getAssistantResponse(
  userMessage: string,
  context: AssistantContext,
): AssistantResponse {
  const msg = userMessage.toLowerCase();

  // Detect intent
  if (/explain|what is|understand|how does/.test(msg) && context.difficultTopics.length > 0) {
    const topic = context.difficultTopics.find((t) => msg.includes(t.toLowerCase())) || context.difficultTopics[0];
    return { content: explainTopic(topic), isDemo: true };
  }

  if (/next|recommend|should i (study|do)|what should i/.test(msg)) {
    const task = context.nextTask || 'the most urgent pending task in your timetable';
    return { content: nextTaskSuggestion(task), isDemo: true };
  }

  if (/revi[sz]|strateg|how (to|should i) (study|prepare)/.test(msg)) {
    const subject = context.subjects.find((s) => msg.includes(s.toLowerCase())) || context.subjects[0] || 'this subject';
    return { content: revisionStrategy(subject), isDemo: true };
  }

  if (/break|split|divide|smaller|chunk|sub.?task/.test(msg)) {
    const topic = context.difficultTopics.find((t) => msg.includes(t.toLowerCase())) || context.difficultTopics[0] || 'this topic';
    return { content: breakDownTopic(topic), isDemo: true };
  }

  return { content: generalAdvice(), isDemo: true };
}

export function getDemoPreamble(): string {
  return DEMO_PREAMBLE;
}

export function isDemoMode(): boolean {
  return !import.meta.env.VITE_GEMINI_API_KEY;
}
