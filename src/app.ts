import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { achievementsRouter } from './routes/achievements.js';
import { completeRouter } from './routes/complete.js';
import { currencyRouter } from './routes/currency.js';
import { dailyRouter } from './routes/daily.js';
import { examsRouter } from './routes/exams.js';
import { healthRouter } from './routes/health.js';
import { inventoryRouter } from './routes/inventory.js';
import { mistakesRouter } from './routes/mistakes.js';
import { progressRouter } from './routes/progress.js';
import { resultsRouter } from './routes/results.js';
import { sharedRouter } from './routes/shared.js';
import { streaksRouter } from './routes/streaks.js';
import { xpRouter } from './routes/xp.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.use(healthRouter);
app.use(currencyRouter);
app.use(dailyRouter);
app.use(inventoryRouter);
app.use(progressRouter);
app.use(examsRouter);
app.use(completeRouter);
app.use(mistakesRouter);
app.use(resultsRouter);
app.use(xpRouter);
app.use(streaksRouter);
app.use(achievementsRouter);
app.use(sharedRouter);

app.use(notFoundHandler);
app.use(errorHandler);
