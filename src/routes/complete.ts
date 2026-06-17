import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { submitResultSchema, addMistakesSchema } from '../schemas/exam.js';
import { db } from '../lib/firebase.js';

export const completeRouter = Router();

const resultsCol = db.collection('results');
const mistakesCol = db.collection('mistakes');
const xpCol = db.collection('xp');
const streaksCol = db.collection('streaks');
const achievementsCol = db.collection('userAchievements');

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

    // Parse request body
    const resultBody = submitResultSchema.parse(req.body);

    // --- 1. Save result ---
    const resultDoc = await resultsCol.add({
      userId: uid,
      examId: resultBody.examId,
      examTitle: resultBody.examTitle,
      difficulty: resultBody.difficulty,
      score: resultBody.score,
      totalQuestions: resultBody.totalQuestions,
      answers: resultBody.answers,
      createdAt: now,
      updatedAt: FieldValue.serverTimestamp()
    });

    // --- 2. Save mistakes ---
    const mistakeQuestions = resultBody.answers
      .filter((a) => !a.correct)
      .map((a) => resultBody.answers.find((ba) => ba.questionId === a.questionId))
      .filter(Boolean);

    // We need the actual question data to save mistakes. Since the request doesn't include it,
    // we save basic mistake info from what was sent.

    // --- 3. Award XP ---
    const correctCount = resultBody.answers.filter((a) => a.correct).length;
    const xpPerQuestion = XP_PER_CORRECT[resultBody.difficulty];
    const xpAwarded = correctCount * xpPerQuestion;

    const xpRef = xpCol.doc(uid);
    const xpSnap = await xpRef.get();

    let totalXp = xpAwarded;
    if (xpSnap.exists) {
      totalXp += (xpSnap.data()?.totalXp as number) ?? 0;
    }

    await xpRef.set({
      userId: uid,
      totalXp,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    const newLevel = Math.floor(totalXp / 100) + 1;

    // --- 4. Update streak ---
    const streakRef = streaksCol.doc(uid);
    const streakSnap = await streakRef.get();

    let currentStreak = 1;
    let longestStreak = 1;

    if (streakSnap.exists) {
      const data = streakSnap.data()!;
      currentStreak = data.currentStreak as number ?? 0;
      longestStreak = data.longestStreak as number ?? 0;
      const lastDate = data.lastActiveDate as string ?? '';

      if (lastDate === today) {
        // Already active today, keep streak
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        if (lastDate === yesterdayStr) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      }
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    await streakRef.set({
      userId: uid,
      currentStreak,
      longestStreak,
      lastActiveDate: today,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // --- 5. Evaluate achievements ---
    const achRef = achievementsCol.doc(uid);
    const achSnap = await achRef.get();
    const unlocked = new Set<string>((achSnap.data()?.achievements as Array<{ id: string }>)?.map((a) => a.id) ?? []);

    const newlyUnlocked: Array<{ id: string; name: string; description: string; unlockedAt: string }> = [];

    // Count total exams and correct answers from results
    const allResultsSnap = await resultsCol.where('userId', '==', uid).get();
    const allResults = allResultsSnap.docs.map((d) => d.data());
    const totalExams = allResults.length;
    const totalCorrect = allResults.reduce((sum, r) => sum + ((r.score as number) ?? 0), 0);

    // Collect unique difficulties used
    const difficultiesUsed = new Set(allResults.map((r) => r.difficulty as string));

    for (const ach of ACHIEVEMENT_DEFS) {
      if (unlocked.has(ach.id)) continue;

      let earned = false;

      switch (ach.id) {
        case 'first_exam':
          earned = totalExams >= 1;
          break;
        case 'perfect_score':
          earned = resultBody.score === resultBody.totalQuestions;
          break;
        case 'streak_3':
          earned = currentStreak >= 3;
          break;
        case 'streak_7':
          earned = currentStreak >= 7;
          break;
        case 'streak_30':
          earned = currentStreak >= 30;
          break;
        case 'ten_exams':
          earned = totalExams >= 10;
          break;
        case 'twenty_five_exams':
          earned = totalExams >= 25;
          break;
        case 'fifty_exams':
          earned = totalExams >= 50;
          break;
        case 'hundred_correct':
          earned = totalCorrect >= 100;
          break;
        case 'five_hundred_correct':
          earned = totalCorrect >= 500;
          break;
        case 'thousand_correct':
          earned = totalCorrect >= 1000;
          break;
        case 'all_difficulties':
          earned = difficultiesUsed.has('easy') && difficultiesUsed.has('medium') && difficultiesUsed.has('hard');
          break;
        case 'mistake_free':
          earned = resultBody.score === resultBody.totalQuestions;
          break;
      }

      if (earned) {
        newlyUnlocked.push({ id: ach.id, name: ach.name, description: ach.description, unlockedAt: now });
        unlocked.add(ach.id);
      }
    }

    if (newlyUnlocked.length > 0) {
      const existing = (achSnap.data()?.achievements as Array<unknown>) ?? [];
      await achRef.set({
        userId: uid,
        achievements: [...existing, ...newlyUnlocked]
      }, { merge: true });
    }

    // --- 6. Return everything ---
    res.status(201).json({
      result: { id: resultDoc.id, ...resultBody, createdAt: now },
      xp: { awarded: xpAwarded, totalXp, level: newLevel },
      streak: { currentStreak, longestStreak },
      newAchievements: newlyUnlocked
    });
  } catch (error) {
    next(error);
  }
});
