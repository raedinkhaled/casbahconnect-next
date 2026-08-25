import { Schema, model, models, Document, Types } from "mongoose";

export interface IAnswer extends Document<Types.ObjectId> {
  content: string;
  question: Types.ObjectId;
  author: Types.ObjectId;
  upvotes: Types.Array<Types.ObjectId>;
  downvotes: Types.Array<Types.ObjectId>;
  createdAt: Date;
}

const AnswerSchema = new Schema({
  content: { type: String, required: true },
  question: { type: Schema.Types.ObjectId, ref: "Question", required: true },
  author: { type: Schema.Types.ObjectId, ref: "User", required: true },
  upvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  downvotes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const Answer = models.Answer || model("Answer", AnswerSchema);

export default Answer;
