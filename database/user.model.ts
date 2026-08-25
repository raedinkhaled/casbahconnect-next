import { Schema, model, models, Document } from "mongoose";

export interface IUser extends Document {
  name?: string | null;
  username?: string;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  bio?: string;
  picture?: string;
  location?: string;
  portfolioWebsite?: string;
  reputation?: number;
  saved: Schema.Types.ObjectId[];
  joinedAt: Date;
}

const UserSchema = new Schema({
  name: { type: String },
  username: { type: String, unique: true, sparse: true },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  emailVerified: { type: Date, default: null },
  image: { type: String, default: null },
  bio: { type: String },
  picture: { type: String, default: "/assets/images/default-logo.svg" },
  location: { type: String },
  portfolioWebsite: { type: String },
  reputation: { type: Number, default: 0 },
  saved: [{ type: Schema.Types.ObjectId, ref: "Question" }],
  joinedAt: { type: Date, default: Date.now },
});

const User = models.User || model("User", UserSchema);

export default User;
