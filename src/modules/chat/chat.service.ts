import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { prisma } from "../../lib/prisma";
import { chunkService } from "../chunk/chunk.service";
import { conversationService } from "../conversation/conversation.service";
import { AppError } from "../../shared/utils/errors";
import { StatusCodes } from "../../shared/constants/status-codes";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const AUDIO_DIR = path.join(process.cwd(), "public", "uploads", "audio");

export const chatService = {
  async processTextMessage(
    conversationId: string,
    userId: string,
    userText: string,
    languageCode?: string,
  ) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { take: 10, orderBy: { createdAt: "desc" } } },
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);
    if (conversation.userId !== userId)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    // Save user message
    await conversationService.addMessage(conversationId, userId, {
      role: "user",
      content: userText,
    });

    // Embed & search pgvector
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

    const contextText = relevantChunks
      .map((c) => `[Page ${c.pageNumber}]: ${c.content}`)
      .join("\n\n");

    // Build conversation history for context (most recent first → reverse)
    const history = [...conversation.messages].reverse();
    const chatHistory = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const langInstruction = languageCode
      ? `You MUST respond exclusively in the language with ISO code "${languageCode}". Do not switch languages under any circumstances.`
      : `Respond in the language the user speaks to you.`;

    const systemPrompt = `You are Zaydoun, a highly intelligent Moroccan AI assistant discussing a book.
Use the following book excerpts to answer the user. Speak naturally and concisely.
${langInstruction}

BOOK EXCERPTS:
${contextText}`;

    const llmResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
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
      {
        role: "assistant",
        content: aiText,
        inputTokens,
        outputTokens,
      },
    );

    return { userText, aiMessage };
  },

  async processVoiceMessage(
    conversationId: string,
    userId: string,
    audioFilePath: string,
    languageCode?: string,
  ) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: { take: 5, orderBy: { createdAt: "desc" } } }, // Get recent memory
    });

    if (!conversation)
      throw new AppError("Conversation not found", StatusCodes.NOT_FOUND);

    // ==========================================
    // 1. EARS: Whisper STT (Speech to Text)
    // ==========================================
    const audioStats = await fs.promises.stat(audioFilePath);
    // Approximate duration: ~16 kbps for typical compressed audio
    const estimatedAudioSeconds = audioStats.size / (16_000 / 8);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
    });
    const userText = transcription.text;

    // Save User Message — charge whisper cost to the user turn
    await conversationService.addMessage(conversationId, userId, {
      role: "user",
      content: userText,
      audioPath: audioFilePath.replace(process.cwd() + "/public", ""),
      audioSeconds: estimatedAudioSeconds,
    });

    // ==========================================
    // 2. MEMORY: Embed & Search pgvector
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
      5, // Get top 5 most relevant chunks from the book
    );

    const contextText = relevantChunks
      .map((c) => `[Page ${c.pageNumber}]: ${c.content}`)
      .join("\n\n");

    // ==========================================
    // 3. BRAIN: GPT-4o-mini (RAG)
    // ==========================================
    const langInstruction = languageCode
      ? `You MUST respond exclusively in the language with ISO code "${languageCode}". Do not switch languages under any circumstances.`
      : `Respond in the language the user speaks to you.`;

    const systemPrompt = `You are Zaydoun, a highly intelligent Moroccan AI assistant discussing a book.
Use the following book excerpts to answer the user. Speak naturally and concisely.
${langInstruction}

BOOK EXCERPTS:
${contextText}`;

    const llmResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userText },
      ],
    });

    const aiText =
      llmResponse.choices[0].message.content || "I couldn't process that.";
    const inputTokens = llmResponse.usage?.prompt_tokens ?? 0;
    const outputTokens = llmResponse.usage?.completion_tokens ?? 0;

    // ==========================================
    // 4. MOUTH: TTS (Text to Speech)
    // ==========================================
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: aiText,
    });

    const aiAudioFilename = `zaydoun-${Date.now()}.mp3`;
    const aiAudioPath = path.join(AUDIO_DIR, aiAudioFilename);
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    await fs.promises.writeFile(aiAudioPath, buffer);

    const relativeAudioUrl = `/uploads/audio/${aiAudioFilename}`;

    // Save AI Message — charge LLM tokens + TTS chars to the assistant turn
    const aiMessage = await conversationService.addMessage(
      conversationId,
      userId,
      {
        role: "assistant",
        content: aiText,
        audioPath: relativeAudioUrl,
        inputTokens,
        outputTokens,
      },
    );

    return {
      userText,
      aiMessage,
      audioUrl: relativeAudioUrl, // Expo will play this URL!
    };
  },
};
