import crypto from "crypto";

const SECRET = process.env.BROKER_CREDENTIALS_SECRET;

if (!SECRET || SECRET.length < 32) {
  throw new Error("BROKER_CREDENTIALS_SECRET must be set and be at least 32 characters long.");
}

const KEY = crypto.createHash("sha256").update(SECRET).digest();

export function encryptString(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptString(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function toBasicAuthHeader(apiKey: string, apiSecret: string): string {
  const encoded = Buffer.from(`${apiKey}:${apiSecret}`, "utf8").toString("base64");
  return `Basic ${encoded}`;
}
