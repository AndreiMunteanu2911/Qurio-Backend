import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';
import { type Difficulty, type GeneratedExam, generatedExamSchema } from '../schemas/exam.js';

type ChatMessage = {
  role: 'system' | 'user';
  content: string;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const endpoint = 'https://openrouter.ai/api/v1/chat/completions';

function difficultyGuidance(difficulty: Difficulty): string {
  if (difficulty === 'easy') {
    return [
      'Test precise definitions, direct implications, and one-step distinctions.',
      'Distractors must be plausible to a beginner who skimmed the material.'
    ].join(' ');
  }

  if (difficulty === 'medium') {
    return [
      'Require applying the material, comparing close concepts, or identifying consequences.',
      'At least 6 questions should require reasoning beyond direct recall.',
      'Distractors must be conceptually close, not obviously wrong.'
    ].join(' ');
  }

  return [
    'Require synthesis, edge cases, subtle distinctions, causal reasoning, or applying ideas to new scenarios.',
    'At least 8 questions should require multi-step reasoning beyond direct recall.',
    'Distractors must be highly plausible and should reflect common misconceptions.',
    'Do not ask trivia or vocabulary-only questions.'
  ].join(' ');
}

function generationMessages(prompt: string, difficulty: Difficulty): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You generate rigorous production-quality exams. Return ONLY valid JSON.',
        'Schema:',
        '{"title":"string","difficulty":"easy|medium|hard","questions":[',
        '  {"id":"q1","type":"mcq","question":"string","options":["a","b","c","d"],"correctAnswerIndex":0,"explanation":"string"},',
        '  {"id":"q2","type":"true-false","question":"string","options":["True","False"],"correctAnswerIndex":0,"explanation":"string"},',
        '  {"id":"q3","type":"fill-blank","question":"string with _____","options":["a","b","c","d"],"correctAnswerIndex":0,"explanation":"string"}',
        ']}',
        'No markdown, no commentary.',
        '',
        'Generate exactly 10 questions with this mix:',
        '- 6 mcq (multiple choice, 4 options each)',
        '- 2 true-false (options: ["True","False"])',
        '- 2 fill-blank (question has _____ placeholder, 4 options to fill it)',
        '',
        'For true-false: correctAnswerIndex 0 = True, 1 = False.',
        'For fill-blank: the question must contain _____ where the answer fills in.',
        'Use ids: q1 through q10.',
        'Never make the correct answer longer or more specific than distractors.'
      ].join('\n')
    },
    {
      role: 'user',
      content: `Create exactly 10 questions at ${difficulty} difficulty. ${difficultyGuidance(difficulty)} Base every question strictly on this source:\n\n${prompt}`
    }
  ];
}

function repairMessages(raw: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'Repair malformed exam JSON. Return ONLY valid JSON matching this schema:',
        '{"title":"string","difficulty":"easy|medium|hard","questions":[',
        '  {"id":"q1","type":"mcq","question":"string","options":["a","b","c","d"],"correctAnswerIndex":0,"explanation":"string"}',
        ']}',
        'Exactly 10 questions. Mix: 6 mcq, 2 true-false, 2 fill-blank.'
      ].join('\n')
    },
    {
      role: 'user',
      content: raw
    }
  ];
}

async function requestJson(messages: ChatMessage[], temperature: number) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://qurio.app',
      'X-Title': 'Qurio'
    },
    body: JSON.stringify({
      model: env.OPENROUTER_MODEL,
      messages,
      temperature,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'openrouter_error', 'Exam generation failed. Please try again.');
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new ApiError(502, 'empty_ai_response', 'The AI provider returned an empty response.');
  }

  return content;
}

function parseGeneratedExam(raw: string): GeneratedExam {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return generatedExamSchema.parse(parsed);
  } catch {
    throw new ApiError(502, 'invalid_ai_json', 'The generated exam did not match the expected format.');
  }
}

export async function generateExamWithAI(prompt: string, difficulty: Difficulty): Promise<GeneratedExam> {
  const raw = await requestJson(generationMessages(prompt, difficulty), 0.55);

  try {
    return parseGeneratedExam(raw);
  } catch {
    const repaired = await requestJson(repairMessages(raw), 0);
    return parseGeneratedExam(repaired);
  }
}
