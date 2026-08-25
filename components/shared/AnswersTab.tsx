import { getUserAnswers } from "@/lib/actions/user.action";
import type { RouteSearchParams } from "@/types";
import React from "react";
import AnswerCard from "../cards/AnswerCard";
import Pagination from "./Pagination";

interface Props {
  searchParams: RouteSearchParams;
  userId: string;
  viewerId?: string | null;
}
type UserAnswer = Awaited<ReturnType<typeof getUserAnswers>>["answers"][number];

const AnswersTab = async ({ searchParams, userId, viewerId }: Props) => {
  const result = await getUserAnswers({
    userId,
    page: searchParams.page ? +searchParams.page : 1,
  });
  return (
    <>
      {result.answers.map((answer: UserAnswer) => (
        <AnswerCard
          key={answer._id}
          _id={answer._id}
          viewerId={viewerId}
          question={answer.question}
          author={answer.author}
          upvotes={answer.upvotes.length}
          createdAt={answer.createdAt}
        />
      ))}

      <div className="mt-5">
        <Pagination
          pageNumber={searchParams?.page ? +searchParams.page : 1}
          isNext={result.isNext}
        />
      </div>
    </>
  );
};

export default AnswersTab;
