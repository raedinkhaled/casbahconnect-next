import ProfileForm from "@/components/forms/ProfileForm";
import DemoNotice from "@/components/auth/DemoNotice";

import { getCurrentUser } from "@/lib/auth-user";
import { redirect } from "next/navigation";
import React from "react";

const Page = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?callbackUrl=/profile/edit");

  return (
    <>
      <h1 className="h1-bold text-dark100_light900">Edit Profile</h1>

      <div className="mt-9">
        {currentUser.isDemo ? (
          <DemoNotice />
        ) : (
          <ProfileForm user={JSON.stringify(currentUser)} />
        )}
      </div>
    </>
  );
};

export default Page;
