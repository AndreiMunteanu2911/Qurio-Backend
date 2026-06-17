import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { submitResultSchema } from '../schemas/exam.js';
import { db } from '../lib/firebase.js';

export const resultsRouter = Router();

const collection = db.collection('results');

resultsRouter.use('/api/results', requireAuth);

resultsRouter.post('/api/results', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const body = submitResultSchema.parse(req.body);
    const now = new Date().toISOString();

    const doc = await collection.add({
      userId: uid,
      examId: body.examId,
      examTitle: body.examTitle,
      difficulty: body.difficulty,
      score: body.score,
      totalQuestions: body.totalQuestions,
      answers: body.answers,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp()
    });

    res.status(201).json({ id: doc.id, ...body, createdAt: now });
  } catch (error) {
    next(error);
  }
});

resultsRouter.get('/api/results', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snapshot = await collection.where('userId', '==', uid).get();

    const results = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; createdAt: string; [key: string]: unknown }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

    res.json(results);
  } catch (error) {
    next(error);
  }
});
