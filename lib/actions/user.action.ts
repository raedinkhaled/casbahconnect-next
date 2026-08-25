"use server";

import { revalidatePath } from "next/cache";
import type { QueryFilter } from "mongoose";

import Answer from "@/database/answer.model";
import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import User, { type IUser } from "@/database/user.model";
import { requireCurrentUser } from "@/lib/auth-user";
import { connectToDatabase } from "@/lib/mongoose";
import { ProfileSchema } from "@/lib/validations";
import { assignBadges } from "@/lib/utils";
import type { BadgeCriteriaType } from "@/types";
import type {
  GetAllUsersParams,
  GetSavedQuestionsParams,
  GetUserByIdParams,
  GetUserStatsParams,
  ToggleSaveQuestionParams,
  UpdateUserParams,
} from "./shared.types";

const sameId = (left: unknown, right: unknown) => String(left) === String(right);

export async function getAllUsers(params: GetAllUsersParams) {
  await connectToDatabase();
  const { searchQuery, filter, page = 1, pageSize = 20 } = params;
  const skipAmount = (page - 1) * pageSize;
  const query: QueryFilter<IUser> = {};

  if (searchQuery) {
    query.$or = [
      { name: { $regex: searchQuery, $options: "i" } },
      { username: { $regex: searchQuery, $options: "i" } },
      { email: { $regex: searchQuery, $options: "i" } },
    ];
  }

  let sortOptions: Record<string, 1 | -1> = { joinedAt: -1 };
  if (filter === "old_users") sortOptions = { joinedAt: 1 };
  if (filter === "top_contributors") sortOptions = { reputation: -1 };

  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions),
    User.countDocuments(query),
  ]);

  return { users, isNext: totalUsers > skipAmount + users.length };
}

export async function getUserById({ userId }: GetUserByIdParams) {
  await connectToDatabase();
  return User.findById(userId);
}

export async function updateUser({ updateData, path }: UpdateUserParams) {
  const actor = await requireCurrentUser();
  const safeUpdate = ProfileSchema.parse(updateData);
  await connectToDatabase();

  await User.findByIdAndUpdate(actor._id, safeUpdate, {
    new: true,
    runValidators: true,
  });
  revalidatePath(path);
  revalidatePath(`/profile/${actor._id}`);
}

export async function toggleSaveQuestion({
  questionId,
  path,
}: ToggleSaveQuestionParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const hasSaved = actor.saved.some((id: unknown) => sameId(id, questionId));

  await User.findByIdAndUpdate(actor._id, {
    [hasSaved ? "$pull" : "$addToSet"]: { saved: questionId },
  });
  revalidatePath(path);
}

export async function getSavedQuestions(params: GetSavedQuestionsParams) {
  const actor = await requireCurrentUser();
  await connectToDatabase();
  const { page = 1, pageSize = 20, filter, searchQuery } = params;
  const skipAmount = (page - 1) * pageSize;
  const match = searchQuery
    ? { title: { $regex: searchQuery, $options: "i" } }
    : {};
  let sort: Record<string, 1 | -1> = { createdAt: -1 };

  if (filter === "oldest") sort = { createdAt: 1 };
  if (filter === "most_voted") sort = { upvotes: -1 };
  if (filter === "most_viewed") sort = { views: -1 };
  if (filter === "most_answered") sort = { answers: -1 };

  const user = await User.findById(actor._id).populate({
    path: "saved",
    match,
    options: { sort, skip: skipAmount, limit: pageSize + 1 },
    populate: [
      { path: "tags", model: Tag, select: "_id name" },
      {
        path: "author",
        model: User,
        select: "_id name username email image picture",
      },
    ],
  });

  if (!user) throw new Error("User not found");
  const savedQuestions = user.saved;

  return {
    questions: savedQuestions.slice(0, pageSize),
    isNext: savedQuestions.length > pageSize,
  };
}

export async function getUserInfo({ userId }: GetUserByIdParams) {
  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const [questionUpvotes, answerUpvotes, questionViews, totalQuestion, totalAnswers] =
    await Promise.all([
      Question.aggregate([
        { $match: { author: user._id } },
        { $project: { upvotes: { $size: "$upvotes" } } },
        { $group: { _id: null, totalUpvotes: { $sum: "$upvotes" } } },
      ]).then(([result]) => result),
      Answer.aggregate([
        { $match: { author: user._id } },
        { $project: { upvotes: { $size: "$upvotes" } } },
        { $group: { _id: null, totalUpvotes: { $sum: "$upvotes" } } },
      ]).then(([result]) => result),
      Question.aggregate([
        { $match: { author: user._id } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } },
      ]).then(([result]) => result),
      Question.countDocuments({ author: user._id }),
      Answer.countDocuments({ author: user._id }),
    ]);

  const criteria = [
    { type: "QUESTION_COUNT" as BadgeCriteriaType, count: totalQuestion },
    { type: "ANSWER_COUNT" as BadgeCriteriaType, count: totalAnswers },
    {
      type: "QUESTION_UPVOTES" as BadgeCriteriaType,
      count: questionUpvotes?.totalUpvotes || 0,
    },
    {
      type: "ANSWER_UPVOTES" as BadgeCriteriaType,
      count: answerUpvotes?.totalUpvotes || 0,
    },
    {
      type: "TOTAL_VIEWS" as BadgeCriteriaType,
      count: questionViews?.totalViews || 0,
    },
  ];

  return {
    user,
    totalQuestion,
    totalAnswers,
    badgeCounts: assignBadges({ criteria }),
    reputation: user.reputation || 0,
  };
}

export async function getUserQuestions(params: GetUserStatsParams) {
  await connectToDatabase();
  const { userId, page = 1, pageSize = 10 } = params;
  const skipAmount = (page - 1) * pageSize;
  const [questions, totalQuestion] = await Promise.all([
    Question.find({ author: userId })
      .skip(skipAmount)
      .limit(pageSize)
      .sort({ createdAt: -1, views: -1, upvotes: -1 })
      .populate("tags", "_id name")
      .populate("author", "_id name username email image picture"),
    Question.countDocuments({ author: userId }),
  ]);

  return {
    totalQuestion,
    questions,
    isNext: totalQuestion > skipAmount + questions.length,
  };
}

export async function getUserAnswers(params: GetUserStatsParams) {
  await connectToDatabase();
  const { userId, page = 1, pageSize = 10 } = params;
  const skipAmount = (page - 1) * pageSize;
  const [answers, totalAnswers] = await Promise.all([
    Answer.find({ author: userId })
      .skip(skipAmount)
      .limit(pageSize)
      .sort({ upvotes: -1 })
      .populate("question", "_id title")
      .populate("author", "_id name username email image picture"),
    Answer.countDocuments({ author: userId }),
  ]);

  return {
    totalAnswers,
    answers,
    isNext: totalAnswers > skipAmount + answers.length,
  };
}
