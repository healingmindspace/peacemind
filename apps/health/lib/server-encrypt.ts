import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY environment variable is required");
}

const KEY = Buffer.from(
  process.env.ENCRYPTION_KEY.slice(0, 32).padEnd(32, "0"),
  "utf-8"
);

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();
  // Format: enc:iv:tag:ciphertext (all base64)
  return `enc:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  // Handle old unencrypted plain text (e.g. mood triggers stored before encryption)
  if (!ciphertext.startsWith("enc:")) {
    // Check if it looks like valid base64 (journals used base64 before enc:)
    if (/^[A-Za-z0-9+/=]+$/.test(ciphertext) && ciphertext.length > 20) {
      try {
        return Buffer.from(ciphertext, "base64").toString("utf-8");
      } catch {
        return ciphertext;
      }
    }
    return ciphertext;
  }

  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 4) return ciphertext;
    const iv = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const data = parts[3];
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(data, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // Fallback for old data
    try {
      return Buffer.from(ciphertext, "base64").toString("utf-8");
    } catch {
      return ciphertext;
    }
  }
}
