import { getServerSession } from "next-auth";

import User, { type IUser } from "@/database/user.model";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

export async function getCurrentUser(): Promise<IUser | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  await connectToDatabase();
  return User.findById(userId);
}

export async function requireCurrentUser(): Promise<IUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
