"use server";

import { revalidatePath } from "next/cache";

import Answer from "@/database/answer.model";
import Interaction from "@/database/interaction.model";
import Question from "@/database/question.model";
import User from "@/database/user.model";
import { requireCurrentUser } from "@/lib/auth-user";
import { connectToDatabase } from "@/lib/mongoose";
import type {
  AnswerVoteParams,
  CreateAnswerParams,
  DeleteAnswerParams,
  GetAnswersParams,
} from "./shared.types";

const sameId = (left: unknown, right: unknown) => String(left) === String(right);

export async function createAnswer(params: CreateAnswerParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const question = await Question.findById(params.question);

  if (!question) throw new Error("Question not found");

  const answer = await Answer.create({
    content: params.content,
    author: actor._id,
    question: question._id,
  });

  await Promise.all([
    Question.findByIdAndUpdate(question._id, {
      $addToSet: { answers: answer._id },
    }),
    Interaction.create({
      user: actor._id,
      action: "answer",
      question: question._id,
      answer: answer._id,
      tags: question.tags,
    }),
    User.findByIdAndUpdate(actor._id, { $inc: { reputation: 10 } }),
  ]);

  revalidatePath(params.path);
}

export async function getAnwsers(params: GetAnswersParams) {
  await connectToDatabase();
  const { questionId, sortBy, page = 1, pageSize = 10 } = params;
  const skipAmount = (page - 1) * pageSize;
  let sortOption: Record<string, 1 | -1> = { createdAt: -1 };

  if (sortBy === "highestUpvotes") sortOption = { upvotes: -1 };
  if (sortBy === "lowestUpvotes") sortOption = { upvotes: 1 };
  if (sortBy === "old") sortOption = { createdAt: 1 };

  const [answers, totalAnswers] = await Promise.all([
    Answer.find({ question: questionId })
      .populate("author", "_id name username email image picture")
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOption),
    Answer.countDocuments({ question: questionId }),
  ]);

  return {
    answers,
    isNext: totalAnswers > skipAmount + answers.length,
  };
}

async function voteAnswer(params: AnswerVoteParams, direction: "up" | "down") {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const answer = await Answer.findById(params.answerId);

  if (!answer) throw new Error("Answer not found");
  if (sameId(answer.author, actor._id)) {
    throw new Error("You cannot vote on your own answer");
  }

  const hasUpvoted = answer.upvotes.some((id: unknown) => sameId(id, actor._id));
  const hasDownvoted = answer.downvotes.some((id: unknown) =>
    sameId(id, actor._id),
  );

  if (direction === "up") {
    if (hasUpvoted) {
      answer.upvotes.pull(actor._id);
    } else {
      answer.downvotes.pull(actor._id);
      answer.upvotes.addToSet(actor._id);
    }
  } else if (hasDownvoted) {
    answer.downvotes.pull(actor._id);
  } else {
    answer.upvotes.pull(actor._id);
    answer.downvotes.addToSet(actor._id);
  }

  const actorDelta =
    direction === "up"
      ? hasUpvoted
        ? -2
        : hasDownvoted
          ? 0
          : 2
      : hasDownvoted
        ? -2
        : hasUpvoted
          ? 0
          : 2;
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
    answer.save(),
    User.findByIdAndUpdate(actor._id, { $inc: { reputation: actorDelta } }),
    User.findByIdAndUpdate(answer.author, {
      $inc: { reputation: authorDelta },
    }),
  ]);
  revalidatePath(params.path);
}

export async function upvoteAnswer(params: AnswerVoteParams) {
  return voteAnswer(params, "up");
}

export async function downvoteAnswer(params: AnswerVoteParams) {
  return voteAnswer(params, "down");
}

export async function deleteAnswer({ answerId, path }: DeleteAnswerParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const answer = await Answer.findById(answerId);

  if (!answer) throw new Error("Answer not found");
  if (!sameId(answer.author, actor._id)) throw new Error("Forbidden");

  await Promise.all([
    Answer.deleteOne({ _id: answerId }),
    Question.updateOne(
      { _id: answer.question },
      { $pull: { answers: answerId } },
    ),
    Interaction.deleteMany({ answer: answerId }),
  ]);
  revalidatePath(path);
}
