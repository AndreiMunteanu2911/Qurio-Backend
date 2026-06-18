import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';

export const dailyRouter = Router();

const dailyCol = db.collection('daily');
const currencyCol = db.collection('currency');
const resultsCol = db.collection('results');

const QUEST_TEMPLATES = [
  { id: 'complete_exam', name: 'Complete 1 exam', description: 'Complete any exam today.', target: 1, reward: 15 },
  { id: 'get_correct_5', name: 'Get 5 correct', description: 'Answer 5 questions correctly today.', target: 5, reward: 15 },
  { id: 'score_80_hard', name: 'Hard worker', description: 'Score 80%+ on a hard exam today.', target: 1, reward: 25 },
  { id: 'three_categories', name: 'Category explorer', description: 'Take exams in 3 different categories today.', target: 3, reward: 20 },
  { id: 'complete_three_exams', name: 'Exam spree', description: 'Complete 3 exams today.', target: 3, reward: 30 },
  { id: 'get_correct_10', name: 'Get 10 correct', description: 'Answer 10 questions correctly today.', target: 10, reward: 25 },
  { id: 'perfect_score', name: 'Perfect score', description: 'Score 100% on any exam today.', target: 1, reward: 20 },
  { id: 'streak_3_answers', name: 'Answer streak', description: 'Get 3 answers correct in a row on one exam.', target: 3, reward: 15 },
] as const;

const LOGIN_BONUS_BASE = 5;
const LOGIN_STREAK_BONUS = 1;

dailyRouter.use('/api/daily', requireAuth);

dailyRouter.get('/api/daily', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const today = new Date().toISOString().slice(0, 10);

    const dailySnap = await dailyCol.doc(uid).get();
    const dailyData = dailySnap.exists ? dailySnap.data()! : {};

    const lastLoginDate = (dailyData.lastLoginDate as string) ?? '';
    const isNewDay = lastLoginDate !== today;

    // Calculate login streak
    let loginStreak = (dailyData.loginStreak as number) ?? 0;
    if (isNewDay) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      if (lastLoginDate === yesterdayStr) {
        loginStreak += 1;
      } else {
        loginStreak = 1;
      }
    }

    const loginClaimedToday = !isNewDay && ((dailyData.loginClaimedToday as boolean) ?? false);

    // Ensure quest is assigned even for new users
    if (!dailyData.dailyQuest) {
      await assignDailyQuestIfNeeded(uid, today);
      const refreshedSnap = await dailyCol.doc(uid).get();
      if (refreshedSnap.exists) {
        const refreshedData = refreshedSnap.data()!;
        dailyData.dailyQuest = refreshedData.dailyQuest as { templateId: string; claimed: boolean } | null;
      }
    }

    // Daily quest
    const dailyQuest = (dailyData.dailyQuest as { templateId: string; claimed: boolean } | null) ?? null;
    const questTemplate = dailyQuest ? QUEST_TEMPLATES.find((t) => t.id === dailyQuest.templateId) ?? null : null;

    // Check quest progress from today's results
    let questProgress = 0;
    let questCompleted = false;
    if (questTemplate && dailyQuest) {
      const todayResults = await resultsCol
        .where('userId', '==', uid)
        .where('createdAt', '>=', today)
        .get();
      const results = todayResults.docs.map((d) => d.data());

      questProgress = evaluateQuestProgress(questTemplate.id, results);
      questCompleted = questProgress >= questTemplate.target && !dailyQuest.claimed;
    }

    const loginBonus = LOGIN_BONUS_BASE + (loginStreak > 1 ? LOGIN_STREAK_BONUS : 0);

    res.json({
      loginStreak,
      loginClaimedToday,
      canClaimLogin: isNewDay && !loginClaimedToday,
      loginBonus,
      dailyQuest: questTemplate
        ? { ...questTemplate, progress: questProgress, completed: questCompleted, claimed: dailyQuest?.claimed ?? false }
        : null
    });
  } catch (error) {
    next(error);
  }
});

dailyRouter.post('/api/daily/claim-login', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const today = new Date().toISOString().slice(0, 10);

    const dailySnap = await dailyCol.doc(uid).get();
    const dailyData = dailySnap.exists ? dailySnap.data()! : {};

    const lastLoginDate = (dailyData.lastLoginDate as string) ?? '';
    let loginStreak = (dailyData.loginStreak as number) ?? 0;

    if (lastLoginDate === today) {
      res.json({ coinsAwarded: 0, loginStreak, message: 'Already claimed today.' });
      return;
    }

    // Update streak
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    if (lastLoginDate === yesterdayStr) {
      loginStreak += 1;
    } else {
      loginStreak = 1;
    }

    const coinsAwarded = LOGIN_BONUS_BASE + (loginStreak > 1 ? LOGIN_STREAK_BONUS : 0);

    // Award currency
    const currencyRef = currencyCol.doc(uid);
    const currencySnap = await currencyRef.get();
    const currentBalance = currencySnap.exists ? ((currencySnap.data()?.balance as number) ?? 0) : 0;
    await currencyRef.set({
      userId: uid,
      balance: currentBalance + coinsAwarded,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Update daily state
    await dailyCol.doc(uid).set({
      userId: uid,
      lastLoginDate: today,
      loginStreak,
      loginClaimedToday: true
    }, { merge: true });

    // Assign daily quest if not already assigned
    await assignDailyQuestIfNeeded(uid, today);

    res.json({ coinsAwarded, loginStreak });
  } catch (error) {
    next(error);
  }
});

dailyRouter.post('/api/daily/claim-quest', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const today = new Date().toISOString().slice(0, 10);

    const dailySnap = await dailyCol.doc(uid).get();
    if (!dailySnap.exists) {
      res.status(400).json({ error: { message: 'No daily quest.' } });
      return;
    }

    const dailyData = dailySnap.data()!;
    const quest = dailyData.dailyQuest as { templateId: string; claimed: boolean } | null;

    if (!quest || quest.claimed) {
      res.status(400).json({ error: { message: 'Quest already claimed.' } });
      return;
    }

    const template = QUEST_TEMPLATES.find((t) => t.id === quest.templateId);
    if (!template) {
      res.status(400).json({ error: { message: 'Invalid quest.' } });
      return;
    }

    // Verify completion
    const todayResults = await resultsCol
      .where('userId', '==', uid)
      .where('createdAt', '>=', today)
      .get();
    const results = todayResults.docs.map((d) => d.data());
    const progress = evaluateQuestProgress(template.id, results);

    if (progress < template.target) {
      res.status(400).json({ error: { message: 'Quest not yet completed.' } });
      return;
    }

    // Award currency
    const currencyRef = currencyCol.doc(uid);
    const currencySnap = await currencyRef.get();
    const currentBalance = currencySnap.exists ? ((currencySnap.data()?.balance as number) ?? 0) : 0;
    await currencyRef.set({
      userId: uid,
      balance: currentBalance + template.reward,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Mark claimed
    await dailyCol.doc(uid).set({
      userId: uid,
      dailyQuest: { ...quest, claimed: true }
    }, { merge: true });

    res.json({ coinsAwarded: template.reward });
  } catch (error) {
    next(error);
  }
});

// ── Helpers ──

function evaluateQuestProgress(templateId: string, todayResults: FirebaseFirestore.DocumentData[]): number {
  switch (templateId) {
    case 'complete_exam':
      return todayResults.length;
    case 'get_correct_5':
      return todayResults.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0);
    case 'get_correct_10':
      return todayResults.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0);
    case 'score_80_hard': {
      const hardResults = todayResults.filter((r) => r.difficulty === 'hard');
      return hardResults.filter((r) => (r.score as number) >= (r.totalQuestions as number) * 0.8).length;
    }
    case 'three_categories': {
      const cats = new Set(todayResults.map((r) => r.category as string).filter(Boolean));
      return cats.size;
    }
    case 'complete_three_exams':
      return Math.min(todayResults.length, 3);
    case 'perfect_score':
      return todayResults.filter((r) => (r.score as number) === (r.totalQuestions as number)).length;
    case 'streak_3_answers': {
      // Check if any exam result has 3+ consecutive correct answers
      let maxStreak = 0;
      for (const r of todayResults) {
        const answers = r.answers as Array<{ correct: boolean }> | undefined;
        if (!answers) continue;
        let streak = 0;
        for (const a of answers) {
          if (a.correct) { streak += 1; maxStreak = Math.max(maxStreak, streak); }
          else { streak = 0; }
        }
      }
      return maxStreak >= 3 ? 1 : 0;
    }
    default:
      return 0;
  }
}

async function assignDailyQuestIfNeeded(uid: string, today: string) {
  const dailySnap = await dailyCol.doc(uid).get();
  const dailyData = dailySnap.exists ? dailySnap.data()! : {};
  if (dailyData.dailyQuest) return; // Already assigned

  // Check last few quests to avoid repeats
  const recentQuestIds = (dailyData.recentQuestIds as string[]) ?? [];

  let candidates = QUEST_TEMPLATES.filter((t) => !recentQuestIds.includes(t.id));
  if (candidates.length === 0) candidates = [...QUEST_TEMPLATES];

  const chosen = candidates[Math.floor(Math.random() * candidates.length)]!;

  await dailyCol.doc(uid).set({
    dailyQuest: { templateId: chosen.id, claimed: false },
    recentQuestIds: [...recentQuestIds.slice(-3), chosen.id]
  }, { merge: true });
}
