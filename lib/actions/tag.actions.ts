"use server";

import { getTopTagsForUsers } from "@/lib/user-tags";
import User from "@/database/user.model";
import { connectToDatabase } from "../mongoose";
import {
  GetAllTagsParams,
  GetQuestionsByTagIdParams,
  GetTopInteractedTagsParams,
} from "./shared.types";
import Tag, { ITag } from "@/database/tag.model";
import { QueryFilter, Types } from "mongoose";
import Question from "@/database/question.model";

export async function getTopInteractedTags(params: GetTopInteractedTagsParams) {
  const { userId, limit } = params;
  const tags = await getTopTagsForUsers([new Types.ObjectId(userId)], limit);
  return tags[userId] || [];
}

export async function getAllTags(params: GetAllTagsParams) {
  try {
    await connectToDatabase();
    const { searchQuery, page = 1, pageSize = 20, filter } = params;
    const skipAmount = (page - 1) * pageSize;
    const query: QueryFilter<ITag> = {};

    if (searchQuery) {
      query.$or = [
        { name: { $regex: new RegExp(searchQuery, "i") } },
        { description: { $regex: new RegExp(searchQuery, "i") } },
      ];
    }

    let sortOption = {};

    switch (filter) {
      case "popular":
        sortOption = { questions: -1 };
        break;
      case "recent":
        sortOption = { createdAt: -1 };
        break;
      case "name":
        sortOption = { name: 1 };
        break;
      case "old":
        sortOption = { createdAt: 1 };
        break;

      default:
        break;
    }

    const [tags, totalTags] = await Promise.all([
      Tag.find(query)
        .select("_id name questions")
        .skip(skipAmount)
        .limit(pageSize)
        .sort(sortOption)
        .lean(),
      Tag.countDocuments(query),
    ]);

    const isNext = totalTags > skipAmount + tags.length;

    return { tags, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getQuestionsByTagId(params: GetQuestionsByTagIdParams) {
  try {
    await connectToDatabase();

    const { tagId, page = 1, pageSize = 10, searchQuery } = params;
    const skipAmount = (page - 1) * pageSize;

    const tagFilter: QueryFilter<ITag> = {
      _id: tagId,
    };

    const tag = await Tag.findOne(tagFilter).populate({
      path: "questions",
      model: Question,
      match: searchQuery
        ? { title: { $regex: searchQuery, $options: "i" } }
        : {},
      options: {
        skip: skipAmount,
        limit: pageSize + 1,
        sort: { createdAt: -1 },
      },
      populate: [
        {
          path: "tags",
          model: Tag,
          select: "_id name",
        },
        {
          path: "author",
          model: User,
          select: "_id name username email image picture",
        },
      ],
    });

    if (!tag) {
      throw new Error("Tag not found");
    }

    const questions = tag.questions;

    const isNext = questions.length > pageSize;

    return { tagTitle: tag.name, questions, isNext };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getTopPopularTags() {
  try {
    await connectToDatabase();

    const popularTags: { _id: Types.ObjectId; name: string; numberofQuestions: number }[] = await Tag.aggregate([
      { $project: { name: 1, numberofQuestions: { $size: "$questions" } } },
      { $sort: { numberofQuestions: -1 } },
      { $limit: 5 },
    ]);

    return popularTags.map((tag) => ({ ...tag, _id: String(tag._id) }));
  } catch (error) {
    console.log(error);
    throw error;
  }
}
