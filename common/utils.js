import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { google } from "googleapis";
import sanitizeHtml from "sanitize-html";
import axios from "axios";
import { convert } from "html-to-text";
import { geminiAI } from "../app/config/gemini.js";
import * as cheerio from "cheerio";

dotenv.config();

const secretKey = process.env.JWT_SECRET;

const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    throw error;
  }
};

const verifyPassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw error;
  }
};

const generateJwtToken = async (data) => {
  const options = { expiresIn: "1h" };
  return jsonwebtoken.sign(data, secretKey, options);
};

const verifyToken = async (token) => {
  try {
    const decoded = jsonwebtoken.verify(token, secretKey);
    return { success: true, data: decoded };
  } catch (err) {
    return { success: false, message: err.message };
  }
};

const imageUpload = async (dataURI) => {
  try {
    const data = await cloudinary.uploader.upload_large(dataURI, {
      resource_type: "auto",
    });
    return data.secure_url;
  } catch (error) {
    throw error;
  }
};

export const getOAuthClient = (refreshToken) => {
  const client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI,
  );

  client.setCredentials({
    refresh_token: refreshToken,
  });

  return client;
};

// helps to add tracking pixels to check if email is opened or not
export const addTrackingPixel = (html, trackingId) => {
  const pixel = ` <img 
      src="${process.env.API_URL}api/gmail/t/open/${trackingId}?r=${Math.random()}" 
      width="1" 
      height="1" 
      style="display:none; opacity:0;" 
      alt=""
    />`;
  return html + pixel;
};

// Used to convert link into trackable links by appending the tracking ID and original URL as query parameters.
export const replaceLinksWithTracking = (html, trackingId) => {
  if (!html) return html;

  return html.replace(
    /<a\s+([^>]*?)href=["'](.*?)["']([^>]*)>/gi,
    (match, pre, url, post) => {
      if (
        !url ||
        url.startsWith("#") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:")
      ) {
        return match;
      }

      if (url.includes("/t/click/")) {
        return match;
      }

      const encoded = encodeURIComponent(url);
      const trackedUrl = `${process.env.API_URL}api/gmail/t/click/${trackingId}?url=${encoded}`;

      return `<a ${pre}href="${trackedUrl}" ${post}>`;
    },
  );
};

export const stripHtml = (html) => {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ") // Replace nbsp with space
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
};

// This util is used to sanitize the HTML content of emails to prevent XSS attacks
// and ensure that only safe and allowed HTML tags and attributes are included.
export const sanitizeEmailHtml = (html) => {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "b",
      "i",
      "strong",
      "em",
      "u",
      "a",
      "ul",
      "ol",
      "li",
      "div",
      "span",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
};

// This util is used to convert link in emial body to clickable links if they are not already wrapped in anchor tags.
export const linkifyIfNeeded = (html) => {
  if (!html) return html;

  if (/<a\s+href=/i.test(html)) return html;

  const urlRegex = /(https?:\/\/[^\s<]+)/g;

  return html.replace(urlRegex, (url) => {
    return `<a href="${url}">${url}</a>`;
  });
};

const getResourceType = (mimeType) => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw"; // 🔥 pdf, doc, zip, etc.
};

const uploadFilesToCloudinary = async (files = [], draftId, messageId) => {
  if (!files.length) return [];

  return await Promise.all(
    files.map((file) => {
      return new Promise((resolve, reject) => {
        const resourceType = getResourceType(file.mimetype);
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "email_drafts",

            resource_type: resourceType,

            type: "upload",

            access_mode: "public",

            public_id: `${Date.now()}_${file.originalname.replace(/\s+/g, "_")}`,

            overwrite: false,
          },
          (error, result) => {
            if (error) return reject(error);

            resolve({
              filename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              url: result.secure_url,
              public_id: result.public_id,
            });
          },
        );

        stream.end(file.buffer);
      });
    }),
  );
};

// gets file from a given URL and returns it as a buffer, whichhas been uploaded to Cloudinary to send as gmail attachment.
const downloadFileFromUrl = async (url) => {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return Buffer.from(response.data);
};

export const cleanReplyBody = (html) => {
  if (!html) return "";

  const $ = cheerio.load(html);

  $(".gmail_quote").remove();
  $(".gmail_quote_container").remove();
  $("blockquote.gmail_quote").remove();
  $("#divRplyFwdMsg").remove();

  return $("body").html() || $.html();
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const cleanAiEmailBody = (html = "") => {
  return convert(html, {
    wordwrap: false,
    selectors: [
      {
        selector: "a",
        options: {
          ignoreHref: true,
        },
      },
    ],
  }).trim();
};

export const formatConversationForAI = (messages = []) => {
  return messages
    .map((msg) => {
      const sender = msg.direction === "incoming" ? "Client" : "Me";
      return `
          ${sender}:
          Subject: ${msg.subject || ""}

          ${msg.cleanBody || ""}
        `.trim();
    })
    .join("\n-------------------\n");
};

export const buildAIReplyPrompt = ({
  tone = "professional",
  conversation,
  type = "reply",
  followupStage = 1,
  subject = "",
}) => {
  const isFollowup = type === "followup";

  return `
You are an advanced AI email assistant.

Your job is to generate ${
    isFollowup ? "a follow-up email" : "an email reply"
  } based on the COMPLETE conversation history.

==========================================================
OUTPUT FORMAT (IMPORTANT)
==========================================================

Return ONLY valid JSON.

No markdown.
No explanation.
No \`\`\`json.
No extra text.

Return EXACTLY in this format:

{
  "subject": "...",
  "body": "<p>...</p>"
}

==========================================================
SUBJECT RULES
==========================================================

${
  subject
    ? `
The existing subject is:

"${subject}"

Return this SAME subject.
Do NOT invent a new one.

Example:

{
  "subject": "${subject}",
  "body": "<p>...</p>"
}
`
    : `
No subject currently exists.

Generate a concise professional subject.

Example:

{
  "subject": "Backend Developer Opportunity",
  "body": "<p>...</p>"
}
`
}

==========================================================
BODY RULES
==========================================================

Return ONLY clean HTML.

Allowed tags:

<p>
<br>
<strong>
<em>
<u>
<ul>
<ol>
<li>
<a>

Do NOT use:

<html>
<head>
<body>
<style>
table
div
span
markdown

==========================================================
FORMATTING
==========================================================

- Use paragraphs.
- Keep spacing clean.
- Use <strong> for emphasis.
- Use bullet points when appropriate.
- Use proper clickable links.
- Keep email modern.
- Sound like a human.
- Never explain what you're doing.

==========================================================
GENERAL RULES
==========================================================

- Understand entire conversation.
- Respond to latest context.
- Maintain conversation continuity.
- Never repeat previous emails.
- Never hallucinate.
- Keep concise.
- Professional language.
- Natural tone.

${
  isFollowup
    ? `
==========================================================
FOLLOW-UP RULES
==========================================================

This is follow-up number ${followupStage}.

Recipient has NOT replied.

Do NOT sound desperate.

Politely remind them.

Reference previous email naturally.

Keep it short.

End with a simple CTA.
`
    : `
==========================================================
REPLY RULES
==========================================================

Reply ONLY to the latest incoming message.

Answer every question.

Acknowledge what they said.

If they ask multiple questions,
answer all of them.

Do not ignore context.
`
}

==========================================================
TONE
==========================================================

${tone}

==========================================================
CONVERSATION
==========================================================

${conversation}

==========================================================
EXAMPLE OUTPUT
==========================================================

{
  "subject": "${subject || "Backend Developer Opportunity"}",
  "body": "<p>Hi John,</p><p>Thank you for your email.</p><p>I appreciate your response and would be happy to discuss the opportunity further.</p><p>Looking forward to hearing from you.</p><p>Best regards,<br/>Yashvardhan Jadhav</p>"
}
`;
};

export const generateGeminiReply = async ({ prompt, systemInstruction }) => {
  const response = await geminiAI.models.generateContent({
    model: "	gemini-3.1-flash-lite",

    contents: prompt,

    config: {
      temperature: 0.7,

      systemInstruction:
        systemInstruction ||
        `
You are an AI email assistant.
`,
    },
  });

  return response.text?.trim();
};

export default {
  hashPassword,
  verifyPassword,
  generateJwtToken,
  verifyToken,
  imageUpload,
  uploadFilesToCloudinary,
  downloadFileFromUrl,
};
