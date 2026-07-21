import {
  cleanAiEmailBody,
  formatConversationForAI,
  buildAIReplyPrompt,
  generateGeminiReply,
} from "../../common/utils.js";
import Message from "../models/messageModel.js";

export const generateAIReply = async (
  threadId,
  tone = "professional",
  type = "followup",
) => {
  try {
    if (!threadId) {
      throw new Error("Thread ID is required");
    }

    // Get all thread messages
    const messages = await Message.find({
      threadId,
    })
      .sort({
        createdAt: 1,
      })
      .lean();

    const existingSubject =
      messages.find((m) => m.subject)?.subject?.trim() || "";

    let finalSubject = "";

    if (existingSubject) {
      finalSubject = existingSubject.startsWith("Re:")
        ? existingSubject
        : `Re: ${existingSubject}`;
    }

    if (!messages.length) {
      throw new Error("No messages found for the given thread ID");
    }

    // Clean bodies
    const cleanedMessages = messages.map((msg) => ({
      ...msg,

      cleanBody: cleanAiEmailBody(
        msg.textBody || msg.htmlBody || msg.bodyPreview || "",
      ),
    }));

    // Format conversation
    const conversation = formatConversationForAI(cleanedMessages);

    // Build prompt
    const prompt = buildAIReplyPrompt({
      tone,
      conversation,
      type,
      subject: finalSubject,
    });

    const aiResponse = await generateGeminiReply({
      prompt,
      systemInstruction: `
You are an advanced AI email assistant.

Your task is to generate highly contextual
professional emails based on complete thread history.

You must:
- Understand conversation flow
- Understand sender intent
- Generate natural responses
- Avoid repetition
- Keep emails concise and human-like
- Maintain continuity across replies/followups
`,
    });

    const cleaned = aiResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      success: true,
      data: {
        threadId,
        tone,
        subject: parsed.subject || finalSubject,
        reply: parsed.body,
      },
    };
  } catch (error) {
    console.error("Generate AI Reply Error:", error);

    return {
      success: false,
      message: "Failed to generate AI reply",
    };
  }
};
