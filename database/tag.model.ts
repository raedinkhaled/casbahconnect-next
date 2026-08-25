import { Schema, model, models, Document, Types } from "mongoose";

export interface ITag extends Document<Types.ObjectId> {
  name: string;
  description: string;
  questions: Types.ObjectId[];
  followers: Types.ObjectId[];
  createdAt: Date;
}

const TagSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  questions: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const Tag = models.Tag || model("Tag", TagSchema);

export default Tag;
