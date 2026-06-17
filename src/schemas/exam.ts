import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const questionTypeSchema = z.enum(['mcq', 'true-false', 'fill-blank']);

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
  questions: z.array(questionSchema).length(10)
});

export const examSchema = generatedExamSchema.extend({
  id: z.string(),
  userId: z.string(),
  prompt: z.string(),
  createdAt: z.string()
});

export const generateExamRequestSchema = z.object({
  prompt: z.string().trim().min(20, 'Prompt must be at least 20 characters.').max(8000),
  difficulty: difficultySchema
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
  }))
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
