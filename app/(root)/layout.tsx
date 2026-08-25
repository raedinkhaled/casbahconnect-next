import LeftSideBar from "@/components/shared/leftsidebar/LeftSideBar";
import Navbar from "@/components/shared/navbar/Navbar";
import RightSideBar from "@/components/shared/rightsidebar/RightSideBar";
import { Toaster } from "@/components/ui/toaster";
import React from "react";
import { getCurrentUser } from "@/lib/auth-user";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const currentUser = await getCurrentUser();
  const userId = currentUser ? String(currentUser._id) : undefined;
  const userImage = currentUser
    ? currentUser.picture ||
      currentUser.image ||
      "/assets/images/default-logo.svg"
    : undefined;

  return (
    <main className="background-light850_dark100 relative">
      <Navbar userId={userId} userImage={userImage} />
      <div className="flex">
        <LeftSideBar userId={userId} />
        <section className="max:md:pb-14 flex min-h-screen flex-1 flex-col px-6 pb-6 pt-36 sm:px-14">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </section>
        <RightSideBar />
      </div>
      <Toaster />
    </main>
  );
};

export default Layout;
