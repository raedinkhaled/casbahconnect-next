"use server";

import { revalidatePath } from "next/cache";
import type { QueryFilter } from "mongoose";

import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import Question, { type IQuestion } from "@/database/question.model";
import Tag from "@/database/tag.model";
import User from "@/database/user.model";
import { requireCurrentUser } from "@/lib/auth-user";
import { connectToDatabase } from "@/lib/mongoose";
import type {
  CreateQuestionParams,
  DeleteQuestionParams,
  EditQuestionParams,
  GetQuestionByIdParams,
  GetQuestionsParams,
  QuestionVoteParams,
  RecommendedParams,
} from "./shared.types";

const sameId = (left: unknown, right: unknown) => String(left) === String(right);

export async function getQuestions(params: GetQuestionsParams) {
  await connectToDatabase();
  const { searchQuery, filter, page = 1, pageSize = 20 } = params;
  const skipAmount = (page - 1) * pageSize;
  const query: QueryFilter<IQuestion> = {};

  if (searchQuery) {
    query.$or = [
      { title: { $regex: searchQuery, $options: "i" } },
      { content: { $regex: searchQuery, $options: "i" } },
    ];
  }

  let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
  if (filter === "frequent") sortOptions = { views: -1 };
  if (filter === "unanswered") query.answers = { $size: 0 };

  const [questions, totalQuestion] = await Promise.all([
    Question.find(query)
      .populate({ path: "tags", model: Tag })
      .populate({ path: "author", model: User })
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions),
    Question.countDocuments(query),
  ]);

  return {
    questions,
    isNext: totalQuestion > skipAmount + questions.length,
  };
}

export async function createQuestion(params: CreateQuestionParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const { title, content, tags, path } = params;

  const question = await Question.create({ title, content, author: actor._id });
  const tagDocuments = [];

  for (const rawTag of tags) {
    const tag = rawTag.trim();
    const escapedTag = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existingTag = await Tag.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${escapedTag}$`, "i") } },
      {
        $setOnInsert: { name: tag, description: `${tag} questions` },
        $addToSet: { questions: question._id },
      },
      { upsert: true, new: true },
    );
    tagDocuments.push(existingTag._id);
  }

  await Promise.all([
    Question.findByIdAndUpdate(question._id, {
      $addToSet: { tags: { $each: tagDocuments } },
    }),
    Interaction.create({
      user: actor._id,
      action: "ask-question",
      question: question._id,
      tags: tagDocuments,
    }),
    User.findByIdAndUpdate(actor._id, { $inc: { reputation: 5 } }),
  ]);

  revalidatePath(path);
  return { questionId: String(question._id) };
}

export async function getQuestionById({ questionId }: GetQuestionByIdParams) {
  await connectToDatabase();
  return Question.findById(questionId)
    .populate({ path: "tags", model: Tag, select: "_id name" })
    .populate({
      path: "author",
      model: User,
      select: "_id name username email image picture",
    });
}

async function voteQuestion(
  params: QuestionVoteParams,
  direction: "up" | "down",
) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const question = await Question.findById(params.questionId);

  if (!question) throw new Error("Question not found");
  if (sameId(question.author, actor._id)) {
    throw new Error("You cannot vote on your own question");
  }

  const hasUpvoted = question.upvotes.some((id: unknown) =>
    sameId(id, actor._id),
  );
  const hasDownvoted = question.downvotes.some((id: unknown) =>
    sameId(id, actor._id),
  );

  if (direction === "up") {
    if (hasUpvoted) {
      question.upvotes.pull(actor._id);
    } else {
      question.downvotes.pull(actor._id);
      question.upvotes.addToSet(actor._id);
    }
  } else if (hasDownvoted) {
    question.downvotes.pull(actor._id);
  } else {
    question.upvotes.pull(actor._id);
    question.downvotes.addToSet(actor._id);
  }

  const actorDelta =
    direction === "up"
      ? hasUpvoted
        ? -1
        : hasDownvoted
          ? 0
          : 1
      : hasDownvoted
        ? -1
        : hasUpvoted
          ? 0
          : 1;
  const authorDelta =
    direction === "up"
      ? hasUpvoted
        ? -10
        : hasDownvoted
          ? 20
          : 10
      : hasDownvoted
        ? 10
        : hasUpvoted
          ? -20
          : -10;

  await Promise.all([
    question.save(),
    User.findByIdAndUpdate(actor._id, { $inc: { reputation: actorDelta } }),
    User.findByIdAndUpdate(question.author, {
      $inc: { reputation: authorDelta },
    }),
  ]);
  revalidatePath(params.path);
}

export async function upvoteQuestion(params: QuestionVoteParams) {
  return voteQuestion(params, "up");
}

export async function downvoteQuestion(params: QuestionVoteParams) {
  return voteQuestion(params, "down");
}

export async function deleteQuestion({ questionId, path }: DeleteQuestionParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const question = await Question.findById(questionId);

  if (!question) throw new Error("Question not found");
  if (!sameId(question.author, actor._id)) throw new Error("Forbidden");

  await Promise.all([
    Question.deleteOne({ _id: questionId }),
    Answer.deleteMany({ question: questionId }),
    Interaction.deleteMany({ question: questionId }),
    Tag.updateMany(
      { questions: questionId },
      { $pull: { questions: questionId } },
    ),
  ]);
  revalidatePath(path);
}

export async function editQuestion(params: EditQuestionParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const question = await Question.findById(params.questionId);

  if (!question) throw new Error("Question not found");
  if (!sameId(question.author, actor._id)) throw new Error("Forbidden");

  question.title = params.title;
  question.content = params.content;
  await question.save();
  revalidatePath(params.path);
}

export async function getHotQuestions() {
  await connectToDatabase();
  return Question.find({}).sort({ views: -1, upvotes: -1 }).limit(5);
}

export async function getRecommendedQuestions(params: RecommendedParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const { page = 1, pageSize = 20, searchQuery } = params;
  const skipAmount = (page - 1) * pageSize;
  const interactions = await Interaction.find({ user: actor._id }).select("tags");
  const distinctTagIds = [
    ...new Set(
      interactions.flatMap((interaction) =>
        interaction.tags.map((tag: unknown) => String(tag)),
      ),
    ),
  ];
  const query: QueryFilter<IQuestion> = {
    tags: { $in: distinctTagIds },
    author: { $ne: actor._id },
  };

  if (searchQuery) {
    query.$or = [
      { title: { $regex: searchQuery, $options: "i" } },
      { content: { $regex: searchQuery, $options: "i" } },
    ];
  }

  const [questions, totalQuestions] = await Promise.all([
    Question.find(query)
      .populate({ path: "tags", model: Tag })
      .populate({ path: "author", model: User })
      .skip(skipAmount)
      .limit(pageSize),
    Question.countDocuments(query),
  ]);

  return {
    questions,
    isNext: totalQuestions > skipAmount + questions.length,
  };
}
