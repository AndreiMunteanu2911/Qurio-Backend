import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { examsRouter } from './routes/exams.js';
import { healthRouter } from './routes/health.js';
import { mistakesRouter } from './routes/mistakes.js';
import { resultsRouter } from './routes/results.js';
import { sharedRouter } from './routes/shared.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use(examsRouter);
app.use(mistakesRouter);
app.use(resultsRouter);
app.use(sharedRouter);

app.use(notFoundHandler);
app.use(errorHandler);
