import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import AnswerForm from "@/components/forms/AnswerForm";
import AllAnswers from "@/components/shared/AllAnswers";
import Metric from "@/components/shared/Metric";
import ParseHTML from "@/components/shared/ParseHTML";
import RenderTag from "@/components/shared/RenderTag";
import Votes from "@/components/shared/Votes";
import { getQuestionById } from "@/lib/actions/question.action";
import { getCurrentUser } from "@/lib/auth-user";
import { formatNumber, getTimeStamp } from "@/lib/utils";
import type { URLProps } from "@/types";

export default async function QuestionPage({ params, searchParams }: URLProps) {
  const [{ id }, query, currentUser] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ]);
  const question = await getQuestionById({ questionId: id });
  if (!question) notFound();

  const userId = currentUser ? String(currentUser._id) : undefined;
  const authorImage =
    question.author.picture ||
    question.author.image ||
    "/assets/images/default-logo.svg";
  const authorName =
    question.author.name || question.author.email.split("@")[0];
  const hasUpvoted = question.upvotes.some(
    (vote: unknown) => String(vote) === userId,
  );
  const hasDownvoted = question.downvotes.some(
    (vote: unknown) => String(vote) === userId,
  );
  const hasSaved = Boolean(
    currentUser?.saved.some((saved: unknown) => String(saved) === String(question._id)),
  );

  return (
    <>
      <div className="flex-start w-full flex-col">
        <div className="flex w-full flex-col-reverse justify-between gap-5 sm:flex-row sm:items-center sm:gap-2">
          <Link
            className="flex items-center justify-start gap-1"
            href={`/profile/${question.author._id}`}
          >
            <Image
              alt="Author profile"
              className="rounded-full"
              height={22}
              src={authorImage}
              width={22}
            />
            <p className="paragraph-semibold text-dark300_light700">
              {authorName}
            </p>
          </Link>
          <div className="flex justify-end">
            <Votes
              downvotes={question.downvotes.length}
              hasDownvoted={hasDownvoted}
              hasSaved={hasSaved}
              hasUpvoted={hasUpvoted}
              itemId={String(question._id)}
              type="Question"
              upvotes={question.upvotes.length}
              userId={userId}
            />
          </div>
        </div>
        <h1 className="h2-semibold text-dark200_light900 mt-3.5 w-full text-left">
          {question.title}
        </h1>
      </div>

      <div className="mb-8 mt-5 flex flex-wrap gap-4">
        <Metric
          alt="clock icon"
          imgUrl="/assets/icons/clock.svg"
          textStyles="small-medium text-dark400_light800"
          title="Asked"
          value={` ${getTimeStamp(question.createdAt)}`}
        />
        <Metric
          alt="message"
          imgUrl="/assets/icons/message.svg"
          textStyles="small-medium text-dark400_light800"
          title="Answers"
          value={formatNumber(question.answers.length)}
        />
        <Metric
          alt="eye"
          imgUrl="/assets/icons/eye.svg"
          textStyles="small-medium text-dark400_light800"
          title="Views"
          value={formatNumber(question.views)}
        />
      </div>

      <ParseHTML data={question.content} />
      <div className="mt-8 flex flex-wrap gap-2">
        {question.tags.map((tag: any) => (
          <RenderTag
            _id={String(tag._id)}
            key={String(tag._id)}
            name={tag.name}
            showCount={false}
          />
        ))}
      </div>

      <AllAnswers
        filter={query.filter}
        page={query.page ? Number(query.page) : 1}
        questionId={String(question._id)}
        totalAnswers={question.answers.length}
        userId={userId}
      />

      {currentUser ? (
        <AnswerForm
          isAuthenticated
          question={question.content}
          questionId={String(question._id)}
        />
      ) : (
        <p className="body-regular text-dark400_light700 mt-10">
          <Link className="primary-text-gradient font-semibold" href={`/sign-in?callbackUrl=/question/${id}`}>
            Sign in
          </Link>{" "}
          to post an answer.
        </p>
      )}
    </>
  );
}
