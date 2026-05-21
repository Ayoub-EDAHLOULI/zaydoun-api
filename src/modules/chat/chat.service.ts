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
  async processVoiceMessage(
    conversationId: string,
    userId: string,
    audioFilePath: string,
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
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: "whisper-1",
    });
    const userText = transcription.text;

    // Save User Message to DB
    await conversationService.addMessage(conversationId, userId, {
      role: "user",
      content: userText,
      audioPath: audioFilePath.replace(process.cwd() + "/public", ""), // save relative path
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
    const systemPrompt = `You are Zaydoun, a highly intelligent Moroccan AI assistant discussing a book. 
    Use the following book excerpts to answer the user. Speak naturally and concisely.
    Respond in the language the user speaks to you (Arabic/Darija/French/English/Spanish/Chinese/Japanese).
    
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

    // ==========================================
    // 4. MOUTH: TTS (Text to Speech)
    // ==========================================
    const ttsResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx", // Onyx has a great deep, authoritative voice for Zaydoun
      input: aiText,
    });

    const aiAudioFilename = `zaydoun-${Date.now()}.mp3`;
    const aiAudioPath = path.join(AUDIO_DIR, aiAudioFilename);
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    await fs.promises.writeFile(aiAudioPath, buffer);

    const relativeAudioUrl = `/uploads/audio/${aiAudioFilename}`;

    // Save AI Message to DB
    const aiMessage = await conversationService.addMessage(
      conversationId,
      userId,
      {
        role: "assistant",
        content: aiText,
        audioPath: relativeAudioUrl,
      },
    );

    return {
      userText,
      aiMessage,
      audioUrl: relativeAudioUrl, // Expo will play this URL!
    };
  },
};
