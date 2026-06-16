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

function generationMessages(prompt: string, difficulty: Difficulty): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You generate production-quality exams. Return ONLY valid JSON with this schema: {"title":"string","difficulty":"easy|medium|hard","questions":[{"question":"string","options":["string","string","string","string"],"correctAnswerIndex":0,"explanation":"string"}]}. No markdown, no commentary.'
    },
    {
      role: 'user',
      content: `Create exactly 10 multiple-choice questions at ${difficulty} difficulty. Base every question strictly on this source text or topic. Each question must have exactly 4 options and one correctAnswerIndex from 0 to 3. Source:\n\n${prompt}`
    }
  ];
}

function repairMessages(raw: string): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'Repair malformed exam JSON. Return ONLY valid JSON matching {"title":"string","difficulty":"easy|medium|hard","questions":[{"question":"string","options":["string","string","string","string"],"correctAnswerIndex":0,"explanation":"string"}]} with exactly 10 questions.'
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
  const raw = await requestJson(generationMessages(prompt, difficulty), 0.4);

  try {
    return parseGeneratedExam(raw);
  } catch {
    const repaired = await requestJson(repairMessages(raw), 0);
    return parseGeneratedExam(repaired);
  }
}
