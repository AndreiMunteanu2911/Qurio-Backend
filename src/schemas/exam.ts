import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const questionTypeSchema = z.enum(['mcq', 'true-false', 'fill-blank']);
export const explanationModeSchema = z.enum(['immediate', 'end']);

export const examSettingsSchema = z.object({
  questionCount: z.number().int().min(5).max(20),
  questionTypeMix: z.object({
    mcq: z.number().int().min(0).max(20),
    trueFalse: z.number().int().min(0).max(20),
    fillBlank: z.number().int().min(0).max(20)
  }),
  timeLimitMinutes: z.number().int().min(3).max(60),
  explanationMode: explanationModeSchema
}).refine((settings) => {
  const total = settings.questionTypeMix.mcq + settings.questionTypeMix.trueFalse + settings.questionTypeMix.fillBlank;
  return total === settings.questionCount;
}, {
  message: 'Question type counts must add up to the question count.',
  path: ['questionTypeMix']
}).refine((settings) => settings.questionTypeMix.mcq + settings.questionTypeMix.trueFalse + settings.questionTypeMix.fillBlank > 0, {
  message: 'At least one question type is required.',
  path: ['questionTypeMix']
});

export const defaultExamSettings = {
  questionCount: 10,
  questionTypeMix: {
    mcq: 6,
    trueFalse: 2,
    fillBlank: 2
  },
  timeLimitMinutes: 10,
  explanationMode: 'immediate'
} as const;

export const categorySchema = z.enum([
  'biology', 'chemistry', 'physics', 'mathematics', 'computer-science',
  'engineering', 'medicine', 'psychology', 'sociology', 'economics',
  'business', 'history', 'geography', 'literature', 'philosophy',
  'law', 'art', 'music', 'languages', 'education', 'general'
]);

export const questionSchema = z.object({
  id: z.string().optional(),
  type: questionTypeSchema.optional(),
  question: z.string().min(4).max(700),
  options: z.array(z.string().min(1).max(240)).min(2).max(4),
  correctAnswerIndex: z.number().int().min(0),
  explanation: z.string().min(4).max(1000)
});

export const generatedExamSchema = z.object({
  title: z.string().min(3).max(120),
  difficulty: difficultySchema,
  category: categorySchema,
  questions: z.array(questionSchema).min(5).max(20)
});

export const examSchema = generatedExamSchema.extend({
  id: z.string(),
  userId: z.string(),
  prompt: z.string(),
  settings: examSettingsSchema.default(defaultExamSettings),
  createdAt: z.string()
});

export const generateExamRequestSchema = z.object({
  prompt: z.string().trim().min(20, 'Prompt must be at least 20 characters.').max(8000),
  difficulty: difficultySchema,
  settings: examSettingsSchema.default(defaultExamSettings)
});

export const submitResultSchema = z.object({
  examId: z.string(),
  examTitle: z.string(),
  difficulty: difficultySchema,
  category: categorySchema.optional(),
  score: z.number().int().min(0),
  totalQuestions: z.number().int().min(1),
  answers: z.array(z.object({
    questionId: z.string(),
    selected: z.number().int().min(0),
    correct: z.boolean()
  })),
  powerUpsUsed: z.array(z.string()).optional()
});

export const addMistakesSchema = z.object({
  mistakes: z.array(z.object({
    examId: z.string(),
    examTitle: z.string(),
    difficulty: difficultySchema,
    question: questionSchema
  }))
});

export type Difficulty = z.infer<typeof difficultySchema>;
export type ExplanationMode = z.infer<typeof explanationModeSchema>;
export type ExamSettings = z.infer<typeof examSettingsSchema>;
export type QuestionType = z.infer<typeof questionTypeSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Question = z.infer<typeof questionSchema>;
export type GeneratedExam = z.infer<typeof generatedExamSchema>;
export type Exam = z.infer<typeof examSchema>;
export type ExamResult = z.infer<typeof submitResultSchema>;

export const CATEGORIES: [string, ...string[]] = [
  'biology', 'chemistry', 'physics', 'mathematics', 'computer-science',
  'engineering', 'medicine', 'psychology', 'sociology', 'economics',
  'business', 'history', 'geography', 'literature', 'philosophy',
  'law', 'art', 'music', 'languages', 'education', 'general'
] as const;
