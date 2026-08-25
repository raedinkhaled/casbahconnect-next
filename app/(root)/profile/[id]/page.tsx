import AnswersTab from "@/components/shared/AnswersTab";
import { ProfileLink } from "@/components/shared/ProfileLink";
import QuestionTab from "@/components/shared/QuestionTab";
import Stats from "@/components/shared/Stats";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getUserInfo } from "@/lib/actions/user.action";
import { getFormattedDate } from "@/lib/utils";
import { URLProps } from "@/types";
import { getCurrentUser } from "@/lib/auth-user";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const Page = async ({ params, searchParams }: URLProps) => {
  const currentUser = await getCurrentUser();
  const userInfo = await getUserInfo({ userId: params.id });
  const viewerId = currentUser ? String(currentUser._id) : undefined;
  const profileImage =
    userInfo.user.picture ||
    userInfo.user.image ||
    "/assets/images/default-logo.svg";

  return (
    <>
      <div className="flex flex-col-reverse items-start justify-between sm:flex-row">
        <div className="flex flex-col items-start gap-4 lg:flex-row ">
          <Image
            src={profileImage}
            alt="profile picture"
            width={140}
            height={140}
            className="rounded-full object-cover"
          />
          <div className="mt-3">
            <h2 className="h2-bold text-dark100_light900">
              {userInfo.user.name || userInfo.user.email.split("@")[0]}
            </h2>
            <p className="paragraph-regular text-dark200_light800">
              @{userInfo.user.username || userInfo.user.email.split("@")[0]}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-start gap-5">
              {userInfo.user.location && (
                <ProfileLink
                  imgUrl="/assets/icons/location.svg"
                  title={userInfo.user.location}
                />
              )}

              {userInfo.user.portfolioWebsite && (
                <ProfileLink
                  imgUrl="/assets/icons/link.svg"
                  href={userInfo.user.portfolioWebsite}
                  title="Portfolio"
                />
              )}

              <ProfileLink
                imgUrl="/assets/icons/calendar.svg"
                title={getFormattedDate(userInfo.user.joinedAt)}
              />
            </div>

            {userInfo.user.bio && (
              <p className="paragraph-regular text-dark400_light800 mt-8">
                {userInfo.user.bio}
              </p>
            )}
          </div>
        </div>
        <div className="max:sm:mb-5 max:sm:w-full flex justify-end sm:mt-3">
            {viewerId === String(userInfo.user._id) && (
              <Link href="/profile/edit">
                <Button className="paragraph-medium btn-secondary text-dark300_light900 min-h-[46px] min-w-[175px] px-4 py-3">
                  Edit Profile
                </Button>
              </Link>
            )}
        </div>
      </div>
      <Stats
        reputation={userInfo.reputation}
        totalQuestions={userInfo.totalQuestion}
        totalAnswers={userInfo.totalAnswers}
        badgeCounts={userInfo.badgeCounts}
      />
      <div className="mt-10 flex gap-10">
        <Tabs defaultValue="top-posts" className="flex-1">
          <TabsList className="background-light800_dark400 min-h-[42px] p-1">
            <TabsTrigger value="top-posts" className="tab">
              Top Posts
            </TabsTrigger>
            <TabsTrigger value="answers" className="tab">
              Answers
            </TabsTrigger>
          </TabsList>
          <TabsContent
            className="mt-5 flex w-full flex-col gap-6"
            value="top-posts"
          >
            <QuestionTab
              searchParams={searchParams}
              userId={String(userInfo.user._id)}
              viewerId={viewerId}
            />
          </TabsContent>
          <TabsContent value="answers" className="flex w-full flex-col gap-6">
            <AnswersTab
              searchParams={searchParams}
              userId={String(userInfo.user._id)}
              viewerId={viewerId}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Page;
