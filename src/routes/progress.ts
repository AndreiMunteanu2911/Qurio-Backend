import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';

export const progressRouter = Router();

const progressCol = db.collection('examProgress');

progressRouter.use('/api/exams/progress', requireAuth);

// Save or update exam progress
progressRouter.post('/api/exams/progress', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const { examId, currentIndex, answers, score } = req.body as {
      examId: string;
      currentIndex: number;
      answers: { questionId: string; selected: number; correct: boolean }[];
      score: number;
    };

    if (!examId || currentIndex === undefined) {
      res.status(400).json({ error: { message: 'examId and currentIndex are required.' } });
      return;
    }

    const docId = `${uid}_${examId}`;
    await progressCol.doc(docId).set({
      userId: uid,
      examId,
      currentIndex,
      answers,
      score,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    res.status(200).json({ saved: true });
  } catch (error) {
    next(error);
  }
});

// List all exams with saved progress
progressRouter.get('/api/exams/progress', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snap = await progressCol.where('userId', '==', uid).get();
    const examIds = snap.docs.map((d) => d.data().examId as string);
    res.json({ examIds });
  } catch (error) {
    next(error);
  }
});

// Get exam progress
progressRouter.get('/api/exams/progress/:examId', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const { examId } = req.params;
    const docId = `${uid}_${examId}`;
    const snap = await progressCol.doc(docId).get();

    if (!snap.exists) {
      res.json({ hasProgress: false });
      return;
    }

    const data = snap.data()!;
    res.json({
      hasProgress: true,
      examId: data.examId,
      currentIndex: data.currentIndex,
      answers: data.answers,
      score: data.score,
      updatedAt: data.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

// Clear exam progress (on completion)
progressRouter.delete('/api/exams/progress/:examId', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const { examId } = req.params;
    const docId = `${uid}_${examId}`;
    await progressCol.doc(docId).delete();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
