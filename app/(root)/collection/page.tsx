import QuestionCard from "@/components/cards/QuestionCard";

import Filter from "@/components/shared/Filter";
import NoResult from "@/components/shared/NoResult";
import Pagination from "@/components/shared/Pagination";
import LoacalSearch from "@/components/shared/search/LoacalSearch";

import { QuestionFilters } from "@/constants/filters";

import { getSavedQuestions } from "@/lib/actions/user.action";
import { SearchParamsProps } from "@/types";
import { getCurrentUser } from "@/lib/auth-user";
import { redirect } from "next/navigation";

export default async function Collection({ searchParams }: SearchParamsProps) {
  const query = await searchParams;
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?callbackUrl=/collection");

  const result = await getSavedQuestions({
    searchQuery: query.q,
    filter: query.filter,
    page: query.page ? +query.page : 1,
  });

  return (
    <>
      <h1 className="h1-bold text-dark100_light900">Saved Questions</h1>

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LoacalSearch
          route="/collection"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search for questions..."
          otherClasses="flex-1"
        />
        <Filter
          filters={QuestionFilters}
          otherClasses="min-h-[56px] sm:min-w-[170px]"
        />
      </div>

      <div className="mt-10 flex w-full flex-col gap-6">
        {result.questions.length > 0 ? (
          result.questions.map((question: any) => (
            <QuestionCard
              key={question._id}
              _id={question._id}
              title={question.title}
              tags={question.tags}
              author={question.author}
              upvotes={question.upvotes}
              answers={question.answers}
              views={question.views}
              createdAt={question.createdAt}
              viewerId={String(currentUser._id)}
            />
          ))
        ) : (
          <NoResult
            title="There's no saved question to show"
            description="Be the first to brake the silence. Ask a Question and kickstart the discussion. Our query could be the next big thing other learn from. GetInvolved!"
            link="/ask-question"
            linkTitle="Ask a Question"
          />
        )}
      </div>

      <div className="mt-10">
        <Pagination
          pageNumber={query.page ? +query.page : 1}
          isNext={result.isNext}
        />
      </div>
    </>
  );
}
