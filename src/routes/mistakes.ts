import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { addMistakesSchema, type Question } from '../schemas/exam.js';
import { db } from '../lib/firebase.js';
import { ApiError } from '../lib/errors.js';

export const mistakesRouter = Router();

const collection = db.collection('mistakes');

mistakesRouter.use('/api/mistakes', requireAuth);

mistakesRouter.post('/api/mistakes', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const body = addMistakesSchema.parse(req.body);
    const now = new Date().toISOString();

    const writes = body.mistakes.map((m) => ({
      userId: uid,
      examId: m.examId,
      examTitle: m.examTitle,
      difficulty: m.difficulty,
      question: m.question,
      createdAt: now
    }));

    const batch = db.batch();
    const refs = writes.map((data) => collection.doc());
    refs.forEach((ref, i) => batch.set(ref, { ...writes[i], updatedAt: FieldValue.serverTimestamp() }));
    await batch.commit();

    const docs = await Promise.all(refs.map((ref) => ref.get()));
    const mistakes = docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(201).json(mistakes);
  } catch (error) {
    next(error);
  }
});

mistakesRouter.get('/api/mistakes', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snapshot = await collection.where('userId', '==', uid).get();

    const mistakes = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; createdAt: string; [key: string]: unknown }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    res.json(mistakes);
  } catch (error) {
    next(error);
  }
});

mistakesRouter.get('/api/mistakes/count', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snapshot = await collection.where('userId', '==', uid).count().get();
    res.json({ count: snapshot.data().count });
  } catch (error) {
    next(error);
  }
});

mistakesRouter.delete('/api/mistakes/:mistakeId', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const mistakeId = req.params.mistakeId;

    const doc = await collection.doc(mistakeId).get();
    if (!doc.exists) {
      throw new ApiError(404, 'mistake_not_found', 'Mistake not found.');
    }

    const data = doc.data();
    if (data?.userId !== uid) {
      throw new ApiError(404, 'mistake_not_found', 'Mistake not found.');
    }

    await doc.ref.delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
