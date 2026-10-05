"use client";
import { downvoteAnswer, upvoteAnswer } from "@/lib/actions/answer.action";
import { viewQuestion } from "@/lib/actions/interaction.action";
import {
  downvoteQuestion,
  upvoteQuestion,
} from "@/lib/actions/question.action";
import { toggleSaveQuestion } from "@/lib/actions/user.action";
import { formatNumber } from "@/lib/utils";
import { DEMO_DISABLED_MESSAGE } from "@/lib/demo";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { toast } from "../ui/use-toast";

interface Props {
  type: string;
  itemId: string;
  userId?: string;
  isDemo?: boolean;
  upvotes: number;
  hasUpvoted: boolean;
  downvotes: number;
  hasDownvoted: boolean;
  hasSaved?: boolean;
}

const Votes = ({
  type,
  itemId,
  userId,
  isDemo = false,
  upvotes,
  hasUpvoted,
  downvotes,
  hasDownvoted,
  hasSaved,
}: Props) => {
  const pathname = usePathname();
  const router = useRouter();
  const showDemoNotice = () => toast({
    title: "Demo Mode",
    description: DEMO_DISABLED_MESSAGE,
  });
  const handleSave = async () => {
    if (isDemo) return showDemoNotice();
    if (!userId) {
      return toast({
        title: "Please sign in",
        description: "You must be signed in to save a question",
      });
    }

    await toggleSaveQuestion({
      questionId: itemId,
      path: pathname,
    });
    router.refresh();

    return toast({
      title: `Question ${!hasSaved ? "saved" : "removed from your collection"}`,
      variant: !hasSaved ? "default" : "destructive",
    });
  };

  const handleVote = async (action: string) => {
    if (isDemo) return showDemoNotice();
    if (!userId) {
      return toast({
        title: "Please log in",
        description: "You must be logged in to perform this action",
      });
    }
    if (action === "upvote") {
      if (type === "Question") {
        await upvoteQuestion({
          questionId: itemId,
          path: pathname,
        });
      } else if (type === "Answer") {
        await upvoteAnswer({
          answerId: itemId,
          path: pathname,
        });
      }
      router.refresh();
      return toast({
        title: `Upvote ${!hasUpvoted ? "added" : "removed"}`,
        variant: !hasUpvoted ? "default" : "destructive",
      });
    } else if (action === "downvote") {
      if (type === "Question") {
        await downvoteQuestion({
          questionId: itemId,
          path: pathname,
        });
      } else if (type === "Answer") {
        await downvoteAnswer({
          answerId: itemId,
          path: pathname,
        });
      }
      router.refresh();
      return toast({
        title: `Downvote ${!hasDownvoted ? "added" : "removed"}`,
        variant: !hasDownvoted ? "default" : "destructive",
      });
    }
  };

  useEffect(() => {
    if (isDemo || type !== "Question") return;
    void viewQuestion({
      questionId: itemId,
    }).catch(console.error);
  }, [itemId, userId, isDemo, type]);

  return (
    <div className="flex gap-5">
      <div className="flex-center gap-2.5">
        <div className="flex-center gap-1.5">
          <Image
            src={
              hasUpvoted
                ? "/assets/icons/upvoted.svg"
                : "/assets/icons/upvote.svg"
            }
            alt="upvote icon"
            width={18}
            height={18}
            className="cursor-pointer"
            onClick={() => handleVote("upvote")}
          />
          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatNumber(upvotes)}
            </p>
          </div>
        </div>

        <div className="flex-center gap-1.5">
          <Image
            src={
              hasDownvoted
                ? "/assets/icons/downvoted.svg"
                : "/assets/icons/downvote.svg"
            }
            alt="downvote icon"
            width={18}
            height={18}
            className="cursor-pointer"
            onClick={() => handleVote("downvote")}
          />
          <div className="flex-center background-light700_dark400 min-w-[18px] rounded-sm p-1">
            <p className="subtle-medium text-dark400_light900">
              {formatNumber(downvotes)}
            </p>
          </div>
        </div>
      </div>
      {type === "Question" && (
        <Image
          src={
            hasSaved
              ? "/assets/icons/star-filled.svg"
              : "/assets/icons/star-red.svg"
          }
          alt="star icon"
          width={18}
          height={18}
          className="cursor-pointer"
          onClick={() => handleSave()}
        />
      )}
    </div>
  );
};

export default Votes;
