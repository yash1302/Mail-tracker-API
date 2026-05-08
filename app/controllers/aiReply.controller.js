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
    });

    // Gemini response
    const reply = await generateGeminiReply({
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

    return {
      success: true,
      data: {
        threadId,
        tone,
        reply,
      },
    };
  } catch (error) {
    console.error("Generate AI Reply Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate AI reply",
    });
  }
};
