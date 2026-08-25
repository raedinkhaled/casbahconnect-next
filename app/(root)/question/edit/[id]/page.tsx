import QuestionForm from "@/components/forms/QuestionForm";
import { getQuestionById } from "@/lib/actions/question.action";
import { ParamsProps } from "@/types";
import { getCurrentUser } from "@/lib/auth-user";
import { redirect } from "next/navigation";
import React from "react";

const Page = async ({ params }: ParamsProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(`/sign-in?callbackUrl=/question/edit/${params.id}`);

  const result = await getQuestionById({ questionId: params.id });

  return (
    <>
      <h1 className="h1-bold text-dark100_light900">Edit Question</h1>
      <div className="mt-9">
        <QuestionForm
          type="edit"
          mongoUserId={JSON.stringify(currentUser._id)}
          questionDetails={JSON.stringify(result)}
        />
      </div>
    </>
  );
};

export default Page;
