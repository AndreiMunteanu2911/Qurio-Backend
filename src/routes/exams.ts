import { Router } from 'express';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { generateExamRequestSchema, type Exam } from '../schemas/exam.js';
import { generateExamWithAI } from '../services/openRouterService.js';
import { db } from '../lib/firebase.js';
import { ApiError } from '../lib/errors.js';

export const examsRouter = Router();

const collection = db.collection('exams');

function assignIds(questions: DocumentData['questions']) {
  return (questions ?? []).map((q: Record<string, unknown>, i: number) => ({
    ...q,
    id: q.id || `q${i + 1}`,
    type: q.type || 'mcq'
  }));
}

function toExam(id: string, data: DocumentData): Exam {
  const createdAt =
    typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString();

  return {
    id,
    userId: String(data.userId),
    prompt: String(data.prompt),
    difficulty: data.difficulty,
    title: String(data.title),
    questions: assignIds(data.questions),
    createdAt
  };
}

function getExamId(value: string | undefined) {
  if (!value) {
    throw new ApiError(400, 'missing_exam_id', 'Exam ID is required.');
  }
  return value;
}

examsRouter.use('/api/exams', requireAuth);

examsRouter.post('/api/exams/generate', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const body = generateExamRequestSchema.parse(req.body);
    const generated = await generateExamWithAI(body.prompt, body.difficulty);
    const now = new Date().toISOString();

    const questions = assignIds(generated.questions);

    const doc = await collection.add({
      userId: uid,
      prompt: body.prompt,
      difficulty: body.difficulty,
      title: generated.title,
      questions,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).json({
      id: doc.id,
      userId: uid,
      prompt: body.prompt,
      difficulty: body.difficulty,
      title: generated.title,
      questions,
      createdAt: now
    });
  } catch (error) {
    next(error);
  }
});

examsRouter.get('/api/exams', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snapshot = await collection.where('userId', '==', uid).get();
    const exams = snapshot.docs
      .map((doc) => toExam(doc.id, doc.data()))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    res.json(exams);
  } catch (error) {
    next(error);
  }
});

examsRouter.get('/api/exams/:examId', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const examId = getExamId(req.params.examId);
    const doc = await collection.doc(examId).get();

    if (!doc.exists) {
      throw new ApiError(404, 'exam_not_found', 'Exam not found.');
    }

    const exam = toExam(doc.id, doc.data() ?? {});
    if (exam.userId !== uid) {
      throw new ApiError(404, 'exam_not_found', 'Exam not found.');
    }

    res.json(exam);
  } catch (error) {
    next(error);
  }
});

examsRouter.delete('/api/exams/:examId', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const examId = getExamId(req.params.examId);
    const ref = collection.doc(examId);
    const doc = await ref.get();

    if (!doc.exists) {
      throw new ApiError(404, 'exam_not_found', 'Exam not found.');
    }

    const data = doc.data();
    if (data?.userId !== uid) {
      throw new ApiError(404, 'exam_not_found', 'Exam not found.');
    }

    await ref.delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
