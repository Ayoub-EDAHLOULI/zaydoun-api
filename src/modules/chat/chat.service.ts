import fs from "fs";
import OpenAI from "openai";
import { prisma } from "../../lib/prisma";
import { chunkService } from "../chunk/chunk.service";
import { conversationService } from "../conversation/conversation.service";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";
import { fileUtils } from "../../shared/utils/file.util";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Voice command detection
// Intercept short intents before hitting the full RAG pipeline.
// Extend this map as new hands-free commands are added.
// ---------------------------------------------------------------------------
const VOICE_COMMANDS: { pattern: RegExp; intent: string }[] = [
  { pattern: /\b(stop|pause|cancel)\b/i, intent: "STOP" },
  { pattern: /\b(repeat|again|say that again)\b/i, intent: "REPEAT" },
  { pattern: /\b(slower|slow down)\b/i, intent: "SLOWER" },
  { pattern: /\b(louder|volume up)\b/i, intent: "LOUDER" },
];

function detectVoiceCommand(text: string): string | null {
  for (const cmd of VOICE_COMMANDS) {
    if (cmd.pattern.test(text)) return cmd.intent;
  }
  return null;
}

function buildSystemPrompt(contextText: string, languageCode?: string): string {
  const langInstruction = languageCode
    ? `You MUST respond exclusively in the language with ISO code "${languageCode}". Do not switch languages under any circumstances.`
    : `Respond in the language the user speaks to you.`;

  return `You are Zaydoun, a highly intelligent Moroccan AI assistant discussing a book.
Use the following book excerpts to answer the user. Speak naturally and concisely.
${langInstruction}

BOOK EXCERPTS:
${contextText}`;
}

// ---------------------------------------------------------------------------
export const chatService = {
  async processTextMessage(
    conversationId: string,
    userId: string,
    userText: string,
    languageCode?: string,
  ) {
    // Single query: fetch conversation + verify ownership atomically
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { take: 10, orderBy: { createdAt: "desc" } } },
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    // Save user message
    await conversationService.addMessage(conversationId, userId, {
      role: "user",
      content: userText,
    });

    // Embed & search pgvector (ownership enforced inside searchChunks via JOIN)
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userText,
    });

    const relevantChunks = await chunkService.searchChunks(
      conversation.bookId,
      embedRes.data[0].embedding,
      userId,
      undefined,
      5,
    );

    const contextText = relevantChunks.length
      ? relevantChunks
          .map((c) => `[Page ${c.pageNumber}]: ${c.content}`)
          .join("\n\n")
      : "No relevant excerpts found. Answer from your general knowledge about the book.";

    // Build conversation history — stored desc, need asc for LLM
    const chatHistory = [...conversation.messages].reverse().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const llmResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(contextText, languageCode),
        },
        ...chatHistory,
        { role: "user", content: userText },
      ],
    });

    const aiText =
      llmResponse.choices[0].message.content || "I couldn't process that.";
    const inputTokens = llmResponse.usage?.prompt_tokens ?? 0;
    const outputTokens = llmResponse.usage?.completion_tokens ?? 0;

    const aiMessage = await conversationService.addMessage(
      conversationId,
      userId,
      { role: "assistant", content: aiText, inputTokens, outputTokens },
    );

    return { userText, aiMessage };
  },

  async processVoiceMessage(
    conversationId: string,
    userId: string,
    audioFilePath: string,
    languageCode?: string,
  ) {
    // Single query: fetch conversation + verify ownership atomically
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: { messages: { take: 5, orderBy: { createdAt: "desc" } } },
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    // ==========================================
    // 1. EARS: Whisper STT — Ghost Architecture
    // The uploaded file is ephemeral: deleted immediately after transcription
    // regardless of success or failure (finally block guarantees cleanup).
    // ==========================================
    const audioStats = await fs.promises.stat(audioFilePath);
    // Approximate duration: ~16 kbps for typical compressed audio
    const estimatedAudioSeconds = audioStats.size / (16_000 / 8);

    let userText: string;
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: "whisper-1",
        ...(languageCode ? { language: languageCode } : {}),
      });
      userText = transcription.text;
    } finally {
      // Always delete the raw upload — it must never persist on disk
      await fileUtils.safeDelete(audioFilePath);
    }

    // ==========================================
    // 2. VOICE COMMAND DETECTION
    // Short-circuit the full RAG pipeline for hands-free control intents.
    // ==========================================
    const voiceIntent = detectVoiceCommand(userText);
    if (voiceIntent) {
      // Save the raw utterance so the timeline stays coherent
      await conversationService.addMessage(conversationId, userId, {
        role: "user",
        content: userText,
        audioSeconds: estimatedAudioSeconds,
      });
      // Return the intent for the controller/client to handle
      return { userText, aiMessage: null, audioUrl: null, voiceIntent };
    }

    // Save user message — no audioPath since the file has already been deleted
    await conversationService.addMessage(conversationId, userId, {
      role: "user",
      content: userText,
      audioSeconds: estimatedAudioSeconds,
    });

    // ==========================================
    // 3. MEMORY: Embed & Search pgvector
    // Ownership enforced inside searchChunks via JOIN on books.user_id
    // ==========================================
    const embedRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: userText,
    });

    const relevantChunks = await chunkService.searchChunks(
      conversation.bookId,
      embedRes.data[0].embedding,
      userId,
      undefined,
      5,
    );

    const contextText = relevantChunks.length
      ? relevantChunks
          .map((c) => `[Page ${c.pageNumber}]: ${c.content}`)
          .join("\n\n")
      : "No relevant excerpts found. Answer from your general knowledge about the book.";

    // ==========================================
    // 4. BRAIN: GPT-4o-mini (RAG)
    // ==========================================
    const llmResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(contextText, languageCode),
        },
        { role: "user", content: userText },
      ],
    });

    const aiText =
      llmResponse.choices[0].message.content || "I couldn't process that.";
    const inputTokens = llmResponse.usage?.prompt_tokens ?? 0;
    const outputTokens = llmResponse.usage?.completion_tokens ?? 0;

    // ==========================================
    // 5. MOUTH: TTS — inline base64
    // Return audio as a data URI in the JSON response so the mobile client
    // plays it immediately without a second HTTP request or any temp file.
    // ==========================================
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: aiText,
    });

    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    const audioDataUri = `data:audio/mpeg;base64,${buffer.toString("base64")}`;

    const aiMessage = await conversationService.addMessage(
      conversationId,
      userId,
      {
        role: "assistant",
        content: aiText,
        inputTokens,
        outputTokens,
      },
    );

    return {
      userText,
      aiMessage,
      audioUrl: audioDataUri,
      voiceIntent: null,
      _aiAudioPath: null,
    };
  },
};
