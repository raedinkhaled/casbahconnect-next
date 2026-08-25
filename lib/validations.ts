import * as z from "zod";

export const RICH_TEXT_MIN_LENGTH = 30;
export const RICH_TEXT_MAX_LENGTH = 20000;

// TinyMCE stores content as HTML, so a raw z.string().min()/.max() would count
// markup characters rather than what the user actually wrote. Strip tags first
// so the limit (and its error message) reflects visible text.
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

const richTextField = z
  .string()
  .max(
    RICH_TEXT_MAX_LENGTH,
    `Must be under ${RICH_TEXT_MAX_LENGTH.toLocaleString()} characters`
  )
  .refine((value) => stripHtml(value).length >= RICH_TEXT_MIN_LENGTH, {
    message: `Must be at least ${RICH_TEXT_MIN_LENGTH} characters, not counting formatting`,
  });

export const QuestionsSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(130, "Title cannot be longer than 130 characters"),
  explanation: richTextField,
  tags: z
    .array(
      z
        .string()
        .min(1, "Tag cannot be empty")
        .max(15, "Tag cannot be longer than 15 characters")
    )
    .min(1, "Please add at least 1 tag")
    .max(3, "You can only add up to 3 tags"),
});

export const AnswerSchema = z.object({
  answer: richTextField,
});

export const ProfileSchema = z.object({
  name: z.string().min(5).max(50),
  username: z.string().min(5).max(50),
  bio: z.string().min(10).max(150),
  portfolioWebsite: z.string().url(),
  location: z.string().min(5).max(50),
});
