import QuestionForm from "@/components/forms/QuestionForm";
import { getCurrentUser } from "@/lib/auth-user";

import { redirect } from "next/navigation";
import React from "react";

const AskQuestion = async () => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in?callbackUrl=/ask-question");

  return (
    <div>
      <h1 className="h1-bold text-dark100_light900">Ask a Question</h1>
      <div className="mt-9">
        <QuestionForm />
      </div>
    </div>
  );
};

export default AskQuestion;
