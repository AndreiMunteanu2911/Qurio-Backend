import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';

export const streaksRouter = Router();

const streaksCol = db.collection('streaks');

streaksRouter.use('/api/streaks', requireAuth);

streaksRouter.get('/api/streaks', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snap = await streaksCol.doc(uid).get();

    if (!snap.exists) {
      res.json({ currentStreak: 0, longestStreak: 0 });
      return;
    }

    const data = snap.data()!;
    res.json({
      currentStreak: data.currentStreak as number ?? 0,
      longestStreak: data.longestStreak as number ?? 0
    });
  } catch (error) {
    next(error);
  }
});
