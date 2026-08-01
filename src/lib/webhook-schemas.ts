import { z } from "zod";

const uuid = z.string().uuid("owner_id must be a UUID");

export const base44PayloadSchema = z.object({
  owner_id: uuid,
  raw: z.string().trim().min(10, "raw report too short").max(200_000, "raw report too large"),
});
export type Base44Payload = z.infer<typeof base44PayloadSchema>;

export const messageSourceSchema = z.enum(["imessage", "sms", "whatsapp", "email", "manual"]);

export const imessagePayloadSchema = z.object({
  owner_id: uuid,
  source: messageSourceSchema.default("imessage"),
  raw_text: z.string().trim().min(1, "raw_text is required").max(20_000, "raw_text too large"),
});
export type IMessagePayload = z.infer<typeof imessagePayloadSchema>;

/** Flatten a ZodError into a short, safe, user-facing string. */
export function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
    .join("; ")
    .slice(0, 500);
}
