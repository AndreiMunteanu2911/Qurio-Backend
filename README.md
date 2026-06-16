# Qurio Backend

Qurio's backend securely creates and stores custom exams for each learner. It verifies that a user is signed in, asks the AI provider to generate a clean 10-question exam, validates the result, and saves the finished exam to the user's private library.

The backend keeps sensitive AI keys away from the browser. This means learners can use the web app without ever seeing or handling OpenRouter credentials.

## What It Powers

**Instant Custom Quizzes**  
Receives a topic or study prompt from the frontend and generates a 10-question multiple-choice exam.

**Interactive, Step-by-Step Learning**  
Returns structured exam data that the frontend can present one question at a time.

**Instant Feedback**  
Stores each question with the correct answer and a short explanation.

**Track Your Knowledge**  
Persists generated exams in Firestore so users can search, filter, retake, and delete saved exams.

## How It Works for a User

1. The user signs in on the frontend with Firebase Auth.
2. The frontend sends the Firebase ID token to this API.
3. The API verifies the token with Firebase Admin.
4. The user submits a prompt and difficulty.
5. The API requests a structured exam from OpenRouter.
6. The API validates the generated JSON and performs one repair pass if needed.
7. The API saves the exam to Firestore under the verified user ID.
8. The frontend shows the saved exam as an interactive quiz.

## 🛠️ For Developers: Under the Hood

### Tech Stack

- Node.js
- Express
- TypeScript with strict compiler settings
- Firebase Admin SDK for Auth and Firestore
- OpenRouter API
- Zod for request and AI-output validation

### Architecture Rules

- OpenRouter requests and `OPENROUTER_API_KEY` live only in this backend.
- Never trust client-provided user IDs.
- Always use the `uid` from `adminAuth.verifyIdToken`.
- API errors return JSON in this shape:

```json
{
  "error": {
    "code": "error_code",
    "message": "Human-readable message"
  }
}
```

### Data Models

```ts
type Exam = {
  id: string;
  userId: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  title: string;
  questions: Question[];
  createdAt: string;
};

type Question = {
  question: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  explanation: string;
};
```

### API Routes

- `GET /health` returns `{ "ok": true }`.
- `POST /api/exams/generate` creates, validates, stores, and returns an exam.
- `GET /api/exams` returns the current user's exams, newest first.
- `GET /api/exams/:examId` returns a specific owned exam.
- `DELETE /api/exams/:examId` deletes a specific owned exam.

Protected routes require:

```http
Authorization: Bearer <firebase-id-token>
```

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
PORT=8081
CORS_ORIGIN=http://localhost:5174
OPENROUTER_API_KEY=...
OPENROUTER_MODEL=openrouter/free
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Local Setup

```bash
npm install
npm run dev
```

### Deployment

Deploy this repository to Render as a Node service. Set the build command to `npm install && npm run build` and the start command to `npm start`. Add all environment variables in Render's dashboard.

This repository also includes `render.yaml` with the expected service shape, health check path, and required environment variables.
