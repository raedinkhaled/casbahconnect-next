"use server";

import { revalidatePath } from "next/cache";
import type { QueryFilter } from "mongoose";

import Answer from "@/database/answer.model";
import Question from "@/database/question.model";
import Tag from "@/database/tag.model";
import User, { type IUser } from "@/database/user.model";
import { requireCurrentUser, requireWritableUser } from "@/lib/auth-user";
import { DEMO_USER_ID } from "@/lib/demo";
import { getDemoUser } from "@/lib/demo-user";
import { connectToDatabase } from "@/lib/mongoose";
import { getTopTagsForUsers } from "@/lib/user-tags";
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

  const [users, totalUsers]: [Pick<IUser, "_id" | "name" | "username" | "email" | "image" | "picture">[], number] = await Promise.all([
    User.find(query)
      .select("_id name username email image picture")
      .skip(skipAmount)
      .limit(pageSize)
      .sort(sortOptions)
      .lean(),
    User.countDocuments(query),
  ]);

  const tagsByUser = await getTopTagsForUsers(users.map((user) => user._id));
  return {
    users: users.map((user) => ({
      ...user,
      _id: String(user._id),
      topTags: tagsByUser[String(user._id)] || [],
    })),
    isNext: totalUsers > skipAmount + users.length,
  };
}

export async function getUserById({ userId }: GetUserByIdParams) {
  if (userId === DEMO_USER_ID) return getDemoUser();
  await connectToDatabase();
  return User.findById(userId);
}

export async function updateUser({ updateData, path }: UpdateUserParams) {
  const actor = await requireWritableUser();
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
  const actor = await requireWritableUser();
  await connectToDatabase();
  const hasSaved = actor.saved.some((id: unknown) => sameId(id, questionId));

  await User.findByIdAndUpdate(actor._id, {
    [hasSaved ? "$pull" : "$addToSet"]: { saved: questionId },
  });
  revalidatePath(path);
}

export async function getSavedQuestions(params: GetSavedQuestionsParams) {
  const actor = await requireCurrentUser();
  if (actor.isDemo) return { questions: [], isNext: false };
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
  if (userId === DEMO_USER_ID) {
    return {
      user: getDemoUser(),
      totalQuestion: 0,
      totalAnswers: 0,
      badgeCounts: assignBadges({ criteria: [] }),
      reputation: 0,
    };
  }
  await connectToDatabase();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const [[questionStats], [answerStats]]:
    [{ totalUpvotes: number; totalViews: number; count: number }[], { totalUpvotes: number; count: number }[]] =
    await Promise.all([
      Question.aggregate([
        { $match: { author: user._id } },
        { $group: {
          _id: null,
          totalUpvotes: { $sum: { $size: "$upvotes" } },
          totalViews: { $sum: "$views" },
          count: { $sum: 1 },
        } },
      ]),
      Answer.aggregate([
        { $match: { author: user._id } },
        { $group: {
          _id: null,
          totalUpvotes: { $sum: { $size: "$upvotes" } },
          count: { $sum: 1 },
        } },
      ]),
    ]);

  const totalQuestion = questionStats?.count || 0;
  const totalAnswers = answerStats?.count || 0;

  const criteria = [
    { type: "QUESTION_COUNT" as BadgeCriteriaType, count: totalQuestion },
    { type: "ANSWER_COUNT" as BadgeCriteriaType, count: totalAnswers },
    {
      type: "QUESTION_UPVOTES" as BadgeCriteriaType,
      count: questionStats?.totalUpvotes || 0,
    },
    {
      type: "ANSWER_UPVOTES" as BadgeCriteriaType,
      count: answerStats?.totalUpvotes || 0,
    },
    {
      type: "TOTAL_VIEWS" as BadgeCriteriaType,
      count: questionStats?.totalViews || 0,
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
  if (params.userId === DEMO_USER_ID) {
    return { totalQuestion: 0, questions: [], isNext: false };
  }
  await connectToDatabase();
  const { userId, page = 1, pageSize = 10 } = params;
  const skipAmount = (page - 1) * pageSize;
  const [questions, totalQuestion] = await Promise.all([
    Question.find({ author: userId })
      .select("-content -downvotes")
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
  if (params.userId === DEMO_USER_ID) {
    return { totalAnswers: 0, answers: [], isNext: false };
  }
  await connectToDatabase();
  const { userId, page = 1, pageSize = 10 } = params;
  const skipAmount = (page - 1) * pageSize;
  const [answers, totalAnswers] = await Promise.all([
    Answer.find({ author: userId })
      .select("-content -downvotes")
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
