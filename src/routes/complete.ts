import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { submitResultSchema, type Question } from '../schemas/exam.js';
import { db } from '../lib/firebase.js';
import { levelFromXp } from '../lib/level.js';

export const completeRouter = Router();

const resultsCol = db.collection('results');
const mistakesCol = db.collection('mistakes');
const xpCol = db.collection('xp');
const streaksCol = db.collection('streaks');
const achievementsCol = db.collection('userAchievements');
const currencyCol = db.collection('currency');
const inventoryCol = db.collection('inventory');
const examsCol = db.collection('exams');

const CURRENCY_PER_COMPLETION = { easy: 10, medium: 20, hard: 30 } as const;
const CURRENCY_PER_ACHIEVEMENT: Record<string, number> = {
  first_exam: 50, perfect_score: 100, streak_3: 75, streak_7: 150, streak_30: 500,
  ten_exams: 100, twenty_five_exams: 250, fifty_exams: 500,
  hundred_correct: 100, five_hundred_correct: 500, thousand_correct: 1000,
  all_difficulties: 200, mistake_free: 150
};

const XP_PER_CORRECT = { easy: 10, medium: 20, hard: 30 } as const;

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

completeRouter.use('/api/exams/complete', requireAuth);

completeRouter.post('/api/exams/complete', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const resultBody = submitResultSchema.parse(req.body);
    const powerUpsUsed = resultBody.powerUpsUsed ?? [];

    // ── Phase 1: Read everything ──

    const examSnap = await examsCol.doc(resultBody.examId).get();
    const examData = examSnap.exists ? examSnap.data()! : null;
    const questions = (examData?.questions as Question[] | undefined) ?? [];

    const xpRef = xpCol.doc(uid);
    const streakRef = streaksCol.doc(uid);
    const achRef = achievementsCol.doc(uid);
    const currencyRef = currencyCol.doc(uid);
    const inventoryRef = inventoryCol.doc(uid);

    const [xpSnap, streakSnap, achSnap, currencySnap, inventorySnap] = await Promise.all([
      xpRef.get(), streakRef.get(), achRef.get(), currencyRef.get(), inventoryRef.get()
    ]);

    const allResultsSnap = await resultsCol.where('userId', '==', uid).get();
    const allResults = allResultsSnap.docs.map((d) => ({ ...d.data(), id: d.id })) as Array<Record<string, unknown> & { id: string }>;
    const totalExams = allResults.length;
    const totalCorrect = allResults.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0);

    const existingExamResults = allResults.filter((r) => r.examId === resultBody.examId);
    const isFirstCompletion = existingExamResults.length === 0;

    const difficultiesUsed = new Set(allResults.map((r) => r.difficulty as string));

    // ── Phase 2: Compute mutations ──

    // XP
    const correctCount = resultBody.answers.filter((a) => a.correct).length;
    let xpPerQuestion = XP_PER_CORRECT[resultBody.difficulty];
    if (powerUpsUsed.includes('double_xp')) {
      xpPerQuestion *= 2;
    }
    const xpAwarded = correctCount * xpPerQuestion;

    const oldTotalXp = xpSnap.exists ? ((xpSnap.data()?.totalXp as number) ?? 0) : 0;
    const totalXpFinal = oldTotalXp + xpAwarded;
    const oldLevel = levelFromXp(oldTotalXp);
    const newLevel = levelFromXp(totalXpFinal);
    const levelsGained = newLevel - oldLevel;

    // Streak
    const inventoryData = inventorySnap.exists ? inventorySnap.data()! : {};
    const invItems = (inventoryData.items as Array<{ itemId: string; quantity: number; acquiredAt: string }>) ?? [];

    let currentStreak = 1;
    let longestStreak = 1;
    let streakFrozen = false;

    if (streakSnap.exists) {
      const data = streakSnap.data()!;
      currentStreak = (data.currentStreak as number) ?? 0;
      longestStreak = (data.longestStreak as number) ?? 0;
      const lastDate = (data.lastActiveDate as string) ?? '';

      if (lastDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (lastDate === yesterdayStr) {
          currentStreak += 1;
        } else if (powerUpsUsed.includes('streak_freeze') && currentStreak > 0) {
          // Streak freeze consumed — don't reset but don't increment either
          streakFrozen = true;
        } else {
          // Check if user has streak_freeze in inventory and apply automatically
          const freezeItem = invItems.find((i) => i.itemId === 'streak_freeze' && i.quantity > 0);
          if (freezeItem) {
            streakFrozen = true;
          } else {
            currentStreak = 1;
          }
        }
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    // Achievements
    const achData = achSnap.data() as { achievements?: Array<{ id: string }> } | undefined;
    const unlocked = new Set(achData?.achievements?.map((a: { id: string }) => a.id) ?? []);
    const newlyUnlocked: Array<{ id: string; name: string; description: string; unlockedAt: string }> = [];

    for (const ach of ACHIEVEMENT_DEFS) {
      if (unlocked.has(ach.id)) continue;

      let earned = false;
      switch (ach.id) {
        case 'first_exam': earned = totalExams >= 1; break;
        case 'perfect_score': earned = resultBody.score === resultBody.totalQuestions; break;
        case 'streak_3': earned = currentStreak >= 3; break;
        case 'streak_7': earned = currentStreak >= 7; break;
        case 'streak_30': earned = currentStreak >= 30; break;
        case 'ten_exams': earned = totalExams >= 10; break;
        case 'twenty_five_exams': earned = totalExams >= 25; break;
        case 'fifty_exams': earned = totalExams >= 50; break;
        case 'hundred_correct': earned = totalCorrect >= 100; break;
        case 'five_hundred_correct': earned = totalCorrect >= 500; break;
        case 'thousand_correct': earned = totalCorrect >= 1000; break;
        case 'all_difficulties': earned = difficultiesUsed.has('easy') && difficultiesUsed.has('medium') && difficultiesUsed.has('hard'); break;
        case 'mistake_free': earned = resultBody.score === resultBody.totalQuestions; break;
      }

      if (earned) {
        newlyUnlocked.push({ id: ach.id, name: ach.name, description: ach.description, unlockedAt: now });
        unlocked.add(ach.id);
      }
    }

    // Currency
    let currencyAwarded = 0;
    const currentBalance = currencySnap.exists ? ((currencySnap.data()?.balance as number) ?? 0) : 0;

    if (isFirstCompletion) currencyAwarded += CURRENCY_PER_COMPLETION[resultBody.difficulty];
    for (const ach of newlyUnlocked) currencyAwarded += CURRENCY_PER_ACHIEVEMENT[ach.id] ?? 0;
    if (levelsGained > 0) currencyAwarded += levelsGained * 25;

    // Mistakes
    const incorrectAnswers = resultBody.answers.filter((a) => !a.correct);
    const mistakeDocs = incorrectAnswers
      .map((a) => {
        const q = questions.find((q) => q.id === a.questionId);
        if (!q) return null;
        return {
          userId: uid,
          examId: resultBody.examId,
          examTitle: resultBody.examTitle,
          difficulty: resultBody.difficulty,
          question: q,
          createdAt: now
        };
      })
      .filter(Boolean);

    // Power-up inventory adjustments
    let updatedItems: Array<{ itemId: string; quantity: number; acquiredAt: string }> = [...invItems];
    if (streakFrozen) {
      const idx = updatedItems.findIndex((i) => i.itemId === 'streak_freeze');
      if (idx >= 0) {
        const existing = updatedItems[idx];
        if (existing) {
          updatedItems[idx] = { ...existing, quantity: existing.quantity - 1 };
        }
      }
    }

    // ── Phase 3: Atomic batch write ──

    const batch = db.batch();
    const resultRef = resultsCol.doc();
    batch.set(resultRef, {
      userId: uid,
      examId: resultBody.examId,
      examTitle: resultBody.examTitle,
      difficulty: resultBody.difficulty,
      category: resultBody.category ?? null,
      score: resultBody.score,
      totalQuestions: resultBody.totalQuestions,
      answers: resultBody.answers,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp()
    });

    batch.set(xpRef, {
      userId: uid,
      totalXp: totalXpFinal,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    batch.set(streakRef, {
      userId: uid,
      currentStreak,
      longestStreak,
      lastActiveDate: today,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    if (newlyUnlocked.length > 0) {
      const existing = achData?.achievements ?? [];
      batch.set(achRef, {
        userId: uid,
        achievements: [...existing, ...newlyUnlocked]
      }, { merge: true });
    }

    if (currencyAwarded > 0) {
      batch.set(currencyRef, {
        userId: uid,
        balance: currentBalance + currencyAwarded,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    for (const m of mistakeDocs) {
      if (m) {
        const ref = mistakesCol.doc();
        batch.set(ref, { ...m, updatedAt: FieldValue.serverTimestamp() });
      }
    }

    if (streakFrozen) {
      batch.set(inventoryRef, {
        userId: uid,
        items: updatedItems
      }, { merge: true });
    }

    await batch.commit();

    // ── Phase 4: Respond ──

    res.status(201).json({
      result: { id: resultRef.id, ...resultBody, createdAt: now },
      xp: { awarded: xpAwarded, totalXp: totalXpFinal, level: newLevel, levelsGained },
      streak: { currentStreak, longestStreak },
      newAchievements: newlyUnlocked,
      currencyAwarded
    });
  } catch (error) {
    next(error);
  }
});
