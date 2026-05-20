# 🧠 Zaydoun API

*Your unfiltered, polyglot, page-aware AI reading companion.*

Zaydoun is the backend orchestrator for a context-aware reading and language-practice ecosystem. Unlike standard RAG systems that summarize general concepts, Zaydoun indexes PDF books with **strict page-level granularity**. You can ask, *"What's the logical fallacy on page 50?"* and he will retrieve the exact text block, analyze it, and debate you—all while acting like your unfiltered, highly intellectual Moroccan homie.

This API serves as the brain for Phase 1 (Web/Mobile Apps) and Phase 2 (Raspberry Pi Physical Robot).

## 🚀 Tech Stack

- **Framework:** Node.js / Express.js
- **Language:** TypeScript
- **Database:** PostgreSQL (hosted on Supabase)
- **Vector Engine:** `pgvector` for semantic search
- **ORM:** Prisma
- **AI Services:** OpenAI (Whisper API for STT, GPT-4o-mini for routing/logic, TTS-1 for Voice)

## ✨ Core Features

- **Strict Page-Anchored Retrieval:** Semantic searches are hard-filtered by `book_id` and `page_number` before vector similarity is calculated, ensuring zero cross-page hallucinations.
- **Polyglot Immersion Engine:** Dynamically switches languages (English, French, Spanish, Arabic, Chinese) mid-conversation to act as a rigorous fluency coach.
- **Streaming Audio Pipeline:** Buffers LLM tokens and streams audio chunks directly to the client for sub-2.5s voice-to-voice latency.
- **The "Zaydoun" Persona:** Injected at the system-prompt level to act as a witty, intellectually bold companion who isn't afraid to use Moroccan Darija slang or bluntly call out flawed logic.

## 🛠️ Local Development Setup

### 1. Clone the repository
```bash
git clone [https://github.com/Ayoub-EDAHLOULI/zaydoun-api.git](https://github.com/Ayoub-EDAHLOULI/zaydoun-api.git)
cd zaydoun-api
