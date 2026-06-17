import { Router } from 'express';
import { db } from '../lib/firebase.js';
import { ApiError } from '../lib/errors.js';
import type { DocumentData } from 'firebase-admin/firestore';

export const sharedRouter = Router();

const collection = db.collection('exams');

function toExam(id: string, data: DocumentData) {
  const createdAt =
    typeof data.createdAt === 'string' ? data.createdAt : data.createdAt?.toDate?.().toISOString() ?? new Date().toISOString();

  return {
    id,
    title: String(data.title),
    difficulty: data.difficulty,
    questions: data.questions,
    createdAt
  };
}

sharedRouter.get('/api/shared/:examId', async (req, res, next) => {
  try {
    const examId = req.params.examId;
    if (!examId) {
      throw new ApiError(400, 'missing_exam_id', 'Exam ID is required.');
    }

    const doc = await collection.doc(examId).get();
    if (!doc.exists) {
      throw new ApiError(404, 'exam_not_found', 'Exam not found.');
    }

    const exam = toExam(doc.id, doc.data() ?? {});
    res.json(exam);
  } catch (error) {
    next(error);
  }
});
