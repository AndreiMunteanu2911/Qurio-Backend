import { z } from 'zod';

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);

export const questionSchema = z.object({
  question: z.string().min(8).max(700),
  options: z.tuple([
    z.string().min(1).max(240),
    z.string().min(1).max(240),
    z.string().min(1).max(240),
    z.string().min(1).max(240)
  ]),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(8).max(1000)
});

export const generatedExamSchema = z.object({
  title: z.string().min(3).max(120),
  difficulty: difficultySchema,
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

export type Difficulty = z.infer<typeof difficultySchema>;
export type GeneratedExam = z.infer<typeof generatedExamSchema>;
export type Exam = z.infer<typeof examSchema>;
