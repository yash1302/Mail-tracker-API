import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import { google } from "googleapis";
import sanitizeHtml from "sanitize-html";

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

const uploadFromBuffer = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "my_app" },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
    stream.end(fileBuffer);
  });
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

export const addTrackingPixel = (html, trackingId) => {
  console.log(
    "PIXEL URL:",
    `${process.env.API_URL}/api/gmail/t/open/${trackingId}`,
  );
  const pixel = ` <img 
      src="${process.env.API_URL}/api/gmail/t/open/${trackingId}?r=${Math.random()}" 
      width="1" 
      height="1" 
      style="display:none; opacity:0;" 
      alt=""
    />`;
  return html + pixel;
};

export const replaceLinksWithTracking = (html, trackingId) => {
  if (!html) return html;

  return html.replace(/href=["'](.*?)["']/gi, (match, url) => {
    // 🔹 Skip invalid / non-trackable links
    if (
      !url ||
      url.startsWith("#") ||
      url.startsWith("mailto:") ||
      url.startsWith("tel:")
    ) {
      return match;
    }

    // 🔹 Prevent double tracking
    if (url.includes("/t/click/")) {
      return match;
    }

    const encoded = encodeURIComponent(url);

    const trackedUrl = `${process.env.API_URL}/api/gmail/t/click/${trackingId}?url=${encoded}`;

    return `href="${trackedUrl}" target="_blank" rel="noopener noreferrer"`;
  });
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

export const sanitizeEmailHtml = (html) => {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "b",
      "i",
      "strong",
      "em",
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

/**
 * 🔹 Linkify ONLY if no <a> tags exist
 */
export const linkifyIfNeeded = (html) => {
  if (!html) return html;

  // already has links → skip
  if (/<a\s+href=/i.test(html)) return html;

  const urlRegex = /(https?:\/\/[^\s<]+)/g;

  return html.replace(urlRegex, (url) => {
    return `<a href="${url}">${url}</a>`;
  });
};

export default {
  hashPassword,
  verifyPassword,
  generateJwtToken,
  verifyToken,
  imageUpload,
  uploadFromBuffer,
};
