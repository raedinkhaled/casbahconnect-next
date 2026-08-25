import { cache } from "react";
import { getServerSession } from "next-auth";

import User, { type IUser } from "@/database/user.model";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";

// Every layout and page calls this once, so without request-scoped
// memoization a single page load re-runs the session lookup and user
// query as many times as it appears in the component tree.
export const getCurrentUser = cache(async (): Promise<IUser | null> => {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) return null;

  await connectToDatabase();
  return User.findById(userId);
});

export async function requireCurrentUser(): Promise<IUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}
