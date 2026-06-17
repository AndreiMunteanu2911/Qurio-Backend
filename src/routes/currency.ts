import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';

export const currencyRouter = Router();

const currencyCol = db.collection('currency');

currencyRouter.use('/api/currency', requireAuth);

currencyRouter.get('/api/currency', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snap = await currencyCol.doc(uid).get();

    const balance = snap.exists ? ((snap.data()?.balance as number) ?? 0) : 0;
    res.json({ balance });
  } catch (error) {
    next(error);
  }
});
