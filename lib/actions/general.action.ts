"use server";

import Question from "@/database/question.model";
import { connectToDatabase } from "@/lib/mongoose";
import { SearchParams } from "./shared.types";
import Answer from "@/database/answer.model";
import Tag from "@/database/tag.model";
import User from "@/database/user.model";

interface SearchDocument {
  _id: unknown;
  title?: string;
  content?: string;
  name?: string;
  question?: unknown;
}

export async function globalSearch({ query, type }: SearchParams) {
  const term = query?.trim();
  if (!term) return JSON.stringify([]);
  await connectToDatabase();

  const modelsAndTypes = [
    { model: Question, searchField: "title", type: "question" },
    { model: Answer, searchField: "content", type: "answer" },
    { model: Tag, searchField: "name", type: "tag" },
    { model: User, searchField: "name", type: "user" },
  ] as const;
  const typeLower = type?.toLowerCase();
  const match = modelsAndTypes.find((item) => item.type === typeLower);
  const selected = match ? [match] : modelsAndTypes;
  const regexQuery = { $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

  // Search independent collections concurrently and fetch only popover fields.
  const groups = await Promise.all(selected.map(async ({ model, searchField, type }) => {
    const documents: SearchDocument[] = await model
      .find({ [searchField]: regexQuery })
      .select(type === "answer" ? "_id question" : "_id " + searchField)
      .limit(match ? 8 : 2)
      .lean();

    return documents.map((item) => ({
      title: type === "answer" ? "Answers containing " + term : item[searchField],
      type,
      id: String(type === "answer" ? item.question : item._id),
    }));
  }));

  return JSON.stringify(groups.flat());
}
