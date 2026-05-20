# 🧠 Zaydoun API

*Your unfiltered, polyglot, page-aware AI reading companion.*

Zaydoun is the backend orchestrator for a context-aware reading and language-practice ecosystem. Unlike standard RAG systems that summarize general concepts, Zaydoun indexes PDF books with **strict page-level granularity**. You can ask, *"What's the logical fallacy on page 50?"* and he will retrieve the exact text block, analyze it, and debate you—all while acting like your unfiltered, highly intellectual Moroccan homie.

This API serves as the brain for Phase 1 (Web/Mobile Apps) and Phase 2 (Raspberry Pi Physical Robot).

## 🚀 Tech Stack

- **Framework:** Node.js / Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (Local or Hosted)
- **Vector Engine:** `pgvector` for semantic search
- **ORM:** Prisma
- **AI Services:** OpenAI (Whisper API for STT, GPT-4o-mini for routing/logic, TTS-1 for Voice)

## ✨ Core Features

- **Strict Page-Anchored Retrieval:** Semantic searches are hard-filtered by `book_id` and `page_number` before vector similarity is calculated, ensuring zero cross-page hallucinations.
- **Polyglot Immersion Engine:** Dynamically switches languages (English, French, Spanish, Arabic, Chinese) mid-conversation to act as a rigorous fluency coach.
- **Streaming Audio Pipeline:** Buffers LLM tokens and streams audio chunks directly to the client for sub-2.5s voice-to-voice latency.
- **The "Zaydoun" Persona:** Injected at the system-prompt level to act as a witty, intellectually bold companion who isn't afraid to use Moroccan Darija slang or bluntly call out flawed logic.

## 🛠️ Local Development Setup

If you want to clone this project and run it locally, follow these steps:

### 1. Clone the repository
```bash
git clone [https://github.com/Ayoub-EDAHLOULI/zaydoun-api.git](https://github.com/Ayoub-EDAHLOULI/zaydoun-api.git)
cd zaydoun-api
```

### 2. Install dependencies
```bash
npm install
```

### 2. Setup PostgreSQL & pgvector
Since this project uses AI vector embeddings, your PostgreSQL database must have the pgvector extension installed.

    If running natively: Install pgvector for your specific OS.

    If using Docker: Use the official pgvector/pgvector Docker image.

### 4. Environment Variables
Create a .env file in the root directory and configure the following variables.

```
# Database
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@localhost:5432/zaydoun_db?schema=public"

# Server & Client URLs
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="sk-proj-..."

# JWT Secrets (Generate strong random strings for these)
JWT_ACCESS_SECRET="your-super-secret-access-token-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-token-key"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
```

### 5. Database Setup (Prisma)
Once your database is running and pgvector is enabled, push the Prisma schema to create all the necessary tables (Users, Books, Conversations, and Vector Chunks):

```bash
npx prisma db push
```

### 6. Start the Dev Server
Run the application with hot-reloading:

```bash
npm run dev
```

The server will start at http://localhost:5000.

Built with ☕ and Moroccan Darija. Ayoub EDAHLOULI :)
