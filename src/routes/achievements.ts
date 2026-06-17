import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';

export const achievementsRouter = Router();

const achievementsCol = db.collection('userAchievements');

const ACHIEVEMENT_DEFS = [
  { id: 'first_exam', name: 'First Exam', description: 'Complete your first exam' },
  { id: 'perfect_score', name: 'Perfect Score', description: 'Get a perfect score' },
  { id: 'streak_3', name: '3-Day Streak', description: 'Maintain a 3-day streak' },
  { id: 'streak_7', name: '7-Day Streak', description: 'Maintain a 7-day streak' },
  { id: 'streak_30', name: '30-Day Streak', description: 'Maintain a 30-day streak' },
  { id: 'ten_exams', name: 'Ten Exams', description: 'Complete 10 exams' },
  { id: 'twenty_five_exams', name: '25 Exams', description: 'Complete 25 exams' },
  { id: 'fifty_exams', name: '50 Exams', description: 'Complete 50 exams' },
  { id: 'hundred_correct', name: '100 Correct', description: 'Get 100 questions correct' },
  { id: 'five_hundred_correct', name: '500 Correct', description: 'Get 500 questions correct' },
  { id: 'thousand_correct', name: '1000 Correct', description: 'Get 1000 questions correct' },
  { id: 'all_difficulties', name: 'All Difficulties', description: 'Complete exams at easy, medium, and hard' },
  { id: 'mistake_free', name: 'Mistake Free', description: 'Complete an exam with no mistakes' }
] as const;

achievementsRouter.use('/api/achievements', requireAuth);

achievementsRouter.get('/api/achievements', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snap = await achievementsCol.doc(uid).get();

    const unlocked = new Set<string>();
    if (snap.exists) {
      const list = (snap.data()?.achievements as Array<{ id: string }>) ?? [];
      list.forEach((a) => unlocked.add(a.id));
    }

    const achievements = ACHIEVEMENT_DEFS.map((def) => ({
      ...def,
      unlocked: unlocked.has(def.id),
      unlockedAt: unlocked.has(def.id)
        ? (snap.data()?.achievements as Array<{ id: string; unlockedAt: string }>)?.find((a) => a.id === def.id)?.unlockedAt ?? null
        : null
    }));

    res.json(achievements);
  } catch (error) {
    next(error);
  }
});
