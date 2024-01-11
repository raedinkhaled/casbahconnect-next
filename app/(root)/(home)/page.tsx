import QuestionCard from "@/components/cards/QuestionCard";
import HomeFilters from "@/components/home/HomeFilters";
import Filter from "@/components/shared/Filter";
import NoResult from "@/components/shared/NoResult";
import LoacalSearch from "@/components/shared/search/LoacalSearch";
import { Button } from "@/components/ui/button";
import { HomePageFilters } from "@/constants/filters";
import Link from "next/link";

const questions = [
  {
    _id: 1,
    title: "How to use React?",
    tags: [
      { _id: 1, name: "React" },
      { _id: 2, name: "Web Dev" },
    ],
    author: {
      _id: 101, // Assuming an _id for the author
      name: "John Doe",
      picture: "url_to_john_doe_picture", // Placeholder URL
    },
    createdAt: new Date("2021-09-01T12:00:00.000Z"),
    answers: [
      /* array of answer objects */
    ],
    views: 125365,
    upvotes: 5635,
  },
  {
    _id: 2,
    title: "How to center Div?",
    tags: [
      { _id: 1, name: "HTML" },
      { _id: 2, name: "CSS" },
    ],
    author: {
      _id: 102, // Assuming an _id for the author
      name: "John Mark",
      picture: "url_to_john_mark_picture", // Placeholder URL
    },
    createdAt: new Date("2024-01-10T12:00:00.000Z"),
    answers: [
      /* array of answer objects */
    ],
    views: 160,
    upvotes: 50,
  },
];

export default function Home() {
  return (
    <>
      <div className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">All Questions</h1>
        <Link href="/ask-question" className="max:sm:w-full flex justify-end">
          <Button className="primary-gradient min-h-[46px] px-4 py-3 !text-light-900">
            Ask a Question
          </Button>
        </Link>
      </div>

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LoacalSearch
          route="/"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search for questions..."
          otherClasses="flex-1"
        />
        <Filter
          filters={HomePageFilters}
          otherClasses="min-h-[56px] sm:min-w-[170px]"
          containerClasses="hidden max-md:flex"
        />
      </div>
      <HomeFilters />

      <div className="mt-10 flex w-full flex-col gap-6">
        {questions.length > 0 ? (
          questions.map((question) => (
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
            />
          ))
        ) : (
          <NoResult
            title="There's no question to show"
            description="Be the first to brake the silence. Ask a Question and kickstart the discussion. Our query could be the next big thing other learn from. GetInvolved!"
            link="/ask-question"
            linkTitle="Ask a Question"
          />
        )}
      </div>
    </>
  );
}
