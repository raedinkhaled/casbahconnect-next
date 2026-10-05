import type { getUserQuestions } from "@/lib/actions/user.action";
import type { RouteSearchParams } from "@/types";
import React from "react";
import QuestionCard from "../cards/QuestionCard";
import Pagination from "./Pagination";

interface Props {
  searchParams: RouteSearchParams;
  result: Awaited<ReturnType<typeof getUserQuestions>>;
  viewerId?: string | null;
}
type UserQuestion = Awaited<ReturnType<typeof getUserQuestions>>["questions"][number];

const QuestionTab = ({ searchParams, result, viewerId }: Props) => {
  return (
    <>
      {result.questions.map((question: UserQuestion) => (
        <QuestionCard
          key={question._id}
          _id={question._id}
          viewerId={viewerId}
          title={question.title}
          tags={question.tags}
          author={question.author}
          upvotes={question.upvotes}
          answers={question.answers}
          views={question.views}
          createdAt={question.createdAt}
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

export default QuestionTab;
