import { z } from "zod";

export const USER_TYPE_VALUES = ["youtuber", "agency", "curious"] as const;
export const REFERRAL_SOURCE_VALUES = [
  "melvynx",
  "twitter",
  "youtube",
  "google",
  "friend",
  "other",
] as const;

const YOUTUBE_HOST_PATTERN = /(^|\.)youtube\.com$|^youtu\.be$/i;

export function isValidYoutubeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return YOUTUBE_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

export const LeadQuestionsSchema = z
  .object({
    referralSource: z.enum(REFERRAL_SOURCE_VALUES),
    userType: z.enum(USER_TYPE_VALUES),
    youtubeChannelUrl: z
      .string()
      .refine(
        (value) => value === "" || isValidYoutubeUrl(value),
        "Please enter a valid YouTube channel URL (youtube.com or youtu.be)",
      )
      .transform((value) => (value === "" ? undefined : value))
      .optional(),
    videosPerMonth: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.userType === "youtuber" && !data.youtubeChannelUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["youtubeChannelUrl"],
        message: "YouTube channel link is required",
      });
    }
    if (
      (data.userType === "youtuber" || data.userType === "agency") &&
      !data.videosPerMonth
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["videosPerMonth"],
        message: "Please tell us how many videos per month",
      });
    }
  });

export type LeadQuestionsInput = z.infer<typeof LeadQuestionsSchema>;
