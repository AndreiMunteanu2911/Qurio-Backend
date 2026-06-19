import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';
import { type Difficulty, type ExamSettings, type GeneratedExam, generatedExamSchema, CATEGORIES } from '../schemas/exam.js';

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

const categoryList = CATEGORIES.join(', ');

function difficultyGuidance(difficulty: Difficulty): string {
  if (difficulty === 'easy') {
    return [
      'Test precise definitions, direct implications, and one-step distinctions.',
      'Distractors must be plausible to a beginner who skimmed the material.',
      'All four options should look believable on first glance — avoid making any option obviously unrelated to the topic.'
    ].join(' ');
  }

  if (difficulty === 'medium') {
    return [
      'Require applying the material, comparing close concepts, or identifying consequences.',
      'At least 6 questions should require reasoning beyond direct recall.',
      'Distractors must be conceptually close, not obviously wrong.',
      'Each distractor should contain topic-appropriate terminology so none stands out as fake.'
    ].join(' ');
  }

  return [
    'Require synthesis, edge cases, subtle distinctions, causal reasoning, or applying ideas to new scenarios.',
    'At least 8 questions should require multi-step reasoning beyond direct recall.',
    'Distractors must be highly plausible and should reflect common misconceptions.',
    'Do not ask trivia or vocabulary-only questions.'
  ].join(' ');
}

function questionMixText(settings: ExamSettings) {
  return [
    `- ${settings.questionTypeMix.mcq} mcq (multiple choice, 4 options each)`,
    `- ${settings.questionTypeMix.trueFalse} true-false (options: ["True","False"])`,
    `- ${settings.questionTypeMix.fillBlank} fill-blank (question has _____ placeholder, 4 options to fill it)`
  ].filter((line) => !line.startsWith('- 0 ')).join('\n');
}

function generationMessages(prompt: string, difficulty: Difficulty, settings: ExamSettings): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'You generate rigorous production-quality exams. Return ONLY valid JSON.',
        'Schema:',
        '{"title":"string","difficulty":"easy|medium|hard","category":"string","questions":[',
        '  {"id":"q1","type":"mcq","question":"string","options":["a","b","c","d"],"correctAnswerIndex":0,"explanation":"string"},',
        '  {"id":"q2","type":"true-false","question":"string","options":["True","False"],"correctAnswerIndex":0,"explanation":"string"},',
        '  {"id":"q3","type":"fill-blank","question":"string with _____","options":["a","b","c","d"],"correctAnswerIndex":0,"explanation":"string"}',
        ']}',
        'No markdown, no commentary.',
        '',
        `Generate exactly ${settings.questionCount} questions with this mix:`,
        questionMixText(settings),
        '',
        'For true-false: correctAnswerIndex 0 = True, 1 = False.',
        'For fill-blank: the question must contain _____ where the answer fills in.',
        `Use ids: q1 through q${settings.questionCount}.`,
        'Never make the correct answer longer or more specific than distractors.',
        'Every distractor must be a plausible answer that someone unfamiliar with the topic could reasonably pick.',
        'The correct answer should not be the only option that contains key terms from the source material.',
        'All options must use similar vocabulary depth — do not put technical terms only in the correct answer.',
        '',
        `Pick the single best category from this list: ${categoryList}.`,
        'The "category" field must exactly match one of these values.'
      ].join('\n')
    },
    {
      role: 'user',
      content: `Create exactly ${settings.questionCount} questions at ${difficulty} difficulty. ${difficultyGuidance(difficulty)} Base every question strictly on this source:\n\n${prompt}`
    }
  ];
}

function repairMessages(raw: string, settings: ExamSettings): ChatMessage[] {
  return [
    {
      role: 'system',
      content: [
        'Repair malformed exam JSON. Return ONLY valid JSON matching this schema:',
        '{"title":"string","difficulty":"easy|medium|hard","category":"string","questions":[',
        '  {"id":"q1","type":"mcq","question":"string","options":["a","b","c","d"],"correctAnswerIndex":0,"explanation":"string"}',
        ']}',
        `Exactly ${settings.questionCount} questions. Mix: ${settings.questionTypeMix.mcq} mcq, ${settings.questionTypeMix.trueFalse} true-false, ${settings.questionTypeMix.fillBlank} fill-blank.`,
        `Category must be one of: ${categoryList}.`
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

function validateGeneratedExam(exam: GeneratedExam, settings: ExamSettings) {
  const counts = exam.questions.reduce((acc, question) => {
    const type = question.type ?? 'mcq';
    if (type === 'true-false') acc.trueFalse += 1;
    else if (type === 'fill-blank') acc.fillBlank += 1;
    else acc.mcq += 1;
    return acc;
  }, { mcq: 0, trueFalse: 0, fillBlank: 0 });

  if (
    exam.questions.length !== settings.questionCount ||
    counts.mcq !== settings.questionTypeMix.mcq ||
    counts.trueFalse !== settings.questionTypeMix.trueFalse ||
    counts.fillBlank !== settings.questionTypeMix.fillBlank
  ) {
    throw new ApiError(502, 'invalid_ai_json', 'The generated exam did not match the requested settings.');
  }

  return exam;
}

function parseGeneratedExam(raw: string, settings: ExamSettings): GeneratedExam {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return validateGeneratedExam(generatedExamSchema.parse(parsed), settings);
  } catch {
    throw new ApiError(502, 'invalid_ai_json', 'The generated exam did not match the expected format.');
  }
}

export async function generateExamWithAI(prompt: string, difficulty: Difficulty, settings: ExamSettings): Promise<GeneratedExam> {
  const raw = await requestJson(generationMessages(prompt, difficulty, settings), 0.55);

  try {
    return parseGeneratedExam(raw, settings);
  } catch {
    const repaired = await requestJson(repairMessages(raw, settings), 0);
    return parseGeneratedExam(repaired, settings);
  }
}

