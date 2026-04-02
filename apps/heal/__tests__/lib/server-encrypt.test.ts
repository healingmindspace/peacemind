import { describe, it, expect, beforeAll } from "vitest";

// Set env before import
beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-key-for-vitest-32chars!!!!!";
});

describe("server-encrypt", () => {
  let encrypt: (plaintext: string) => string;
  let decrypt: (ciphertext: string) => string;

  beforeAll(async () => {
    const mod = await import("@/lib/server-encrypt");
    encrypt = mod.encrypt;
    decrypt = mod.decrypt;
  });

  it("encrypts and decrypts a string correctly", () => {
    const original = "Hello, this is a secret message!";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.startsWith("enc:")).toBe(true);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles unicode / CJK characters", () => {
    const original = "你好世界 🌍 こんにちは";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("handles long text", () => {
    const original = "A".repeat(10000);
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertext each time (random IV)", () => {
    const original = "same text";
    const enc1 = encrypt(original);
    const enc2 = encrypt(original);
    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(original);
    expect(decrypt(enc2)).toBe(original);
  });

  it("decrypts old plain text data (unencrypted fallback)", () => {
    const plainText = "Work, Stress";
    const result = decrypt(plainText);
    expect(result).toBe(plainText);
  });

  it("decrypts old base64-encoded data", () => {
    const original = "This was base64 encoded before encryption was added";
    const base64 = Buffer.from(original).toString("base64");
    const result = decrypt(base64);
    expect(result).toBe(original);
  });

  it("returns corrupted data as-is instead of throwing", () => {
    const corrupt = "enc:invalid:data:here";
    const result = decrypt(corrupt);
    // Should not throw, returns something
    expect(typeof result).toBe("string");
  });
});
