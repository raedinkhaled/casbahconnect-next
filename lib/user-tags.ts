import { Types } from "mongoose";
import Interaction from "@/database/interaction.model";
import Tag from "@/database/tag.model";
import { connectToDatabase } from "@/lib/mongoose";

export interface UserTag {
  _id: string;
  name: string;
}

export async function getTopTagsForUsers(userIds: Types.ObjectId[], limit = 3): Promise<Record<string, UserTag[]>> {
  if (userIds.length === 0) return {};
  await connectToDatabase();
  const groups: { _id: Types.ObjectId; tags: { _id: Types.ObjectId; name: string }[] }[] =
    await Interaction.aggregate([
      { $match: { user: { $in: userIds } } },
      { $unwind: "$tags" },
      { $group: { _id: { user: "$user", tag: "$tags" }, count: { $sum: 1 } } },
      { $sort: { count: -1, "_id.tag": 1 } },
      { $lookup: { from: Tag.collection.name, localField: "_id.tag", foreignField: "_id", as: "tag" } },
      { $unwind: "$tag" },
      { $group: { _id: "$_id.user", tags: { $push: { _id: "$tag._id", name: "$tag.name" } } } },
      { $project: { tags: { $slice: ["$tags", Math.max(1, Math.min(limit, 10))] } } },
    ]);

  const result: Record<string, UserTag[]> = {};
  for (const group of groups) {
    result[String(group._id)] = group.tags.map((tag) => ({ _id: String(tag._id), name: tag.name }));
  }
  return result;
}
