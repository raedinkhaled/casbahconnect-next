import User, { type IUser } from "@/database/user.model";
import {
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_IMAGE,
  DEMO_USER_NAME,
} from "@/lib/demo";

// Hydration only constructs a document in memory; never save this identity.
export function getDemoUser(): IUser & { isDemo: true } {
  const user: IUser = User.hydrate({
    _id: DEMO_USER_ID,
    name: DEMO_USER_NAME,
    username: "demo-user",
    email: DEMO_USER_EMAIL,
    picture: DEMO_USER_IMAGE,
    image: DEMO_USER_IMAGE,
    bio: "Exploring Casbah Connect in read-only demo mode.",
    reputation: 0,
    saved: [],
    joinedAt: new Date("2026-01-01T00:00:00.000Z"),
  });

  return Object.assign(user, { isDemo: true as const });
}
