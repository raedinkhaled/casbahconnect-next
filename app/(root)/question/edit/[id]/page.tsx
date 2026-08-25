import QuestionForm from "@/components/forms/QuestionForm";
import { getQuestionById } from "@/lib/actions/question.action";
import { ParamsProps } from "@/types";
import { getCurrentUser } from "@/lib/auth-user";
import { notFound, redirect } from "next/navigation";
import React from "react";

const Page = async ({ params }: ParamsProps) => {
  const [{ id }, currentUser] = await Promise.all([params, getCurrentUser()]);
  if (!currentUser) redirect(`/sign-in?callbackUrl=/question/edit/${id}`);

  const result = await getQuestionById({ questionId: id });
  if (!result) notFound();
  if (String(result.author._id) !== String(currentUser._id)) {
    redirect(`/question/${id}`);
  }

  return (
    <>
      <h1 className="h1-bold text-dark100_light900">Edit Question</h1>
      <div className="mt-9">
        <QuestionForm
          type="edit"
          questionDetails={JSON.stringify(result)}
        />
      </div>
    </>
  );
};

export default Page;
