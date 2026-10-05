import { cache } from "react";
import { getServerSession } from "next-auth";

import User, { type IUser } from "@/database/user.model";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongoose";
import { DEMO_DISABLED_MESSAGE, DEMO_USER_ID } from "@/lib/demo";
import { getDemoUser } from "@/lib/demo-user";

export type CurrentUser = IUser & { isDemo: boolean };

export const getCurrentSession = cache(() => getServerSession(authOptions));

// Every layout and page calls this once, so without request-scoped
// memoization a single page load re-runs the session lookup and user
// query as many times as it appears in the component tree.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getCurrentSession();
  const userId = session?.user?.id;

  if (!userId) return null;
  if (session.user.isDemo) {
    return userId === DEMO_USER_ID ? getDemoUser() : null;
  }
  // Never resolve the reserved demo ID to a database-backed account.
  if (userId === DEMO_USER_ID) return null;

  await connectToDatabase();
  const user: IUser | null = await User.findById(userId);
  return user ? Object.assign(user, { isDemo: false }) : null;
});

export async function requireCurrentUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  return user;
}

// All application writes must use this guard before querying or mutating data.
// Check the signed session first, so demo rejection never requires a DB lookup.
export async function requireWritableUser(): Promise<CurrentUser> {
  const session = await getCurrentSession();
  if (session?.user?.isDemo || session?.user?.id === DEMO_USER_ID) {
    throw new Error(DEMO_DISABLED_MESSAGE);
  }

  return requireCurrentUser();
}
