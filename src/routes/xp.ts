import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';
import { levelFromXp } from '../lib/level.js';

export const xpRouter = Router();

const xpCol = db.collection('xp');

xpRouter.use('/api/xp', requireAuth);

xpRouter.get('/api/xp', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snap = await xpCol.doc(uid).get();

    if (!snap.exists) {
      res.json({ totalXp: 0, level: 1 });
      return;
    }

    const totalXp = (snap.data()?.totalXp as number) ?? 0;
    res.json({ totalXp, level: levelFromXp(totalXp) });
  } catch (error) {
    next(error);
  }
});
