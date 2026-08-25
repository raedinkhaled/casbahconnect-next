import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-user";

const Page = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/sign-in?callbackUrl=/profile");
  }

  redirect(`/profile/${currentUser._id}`);
};

export default Page;
