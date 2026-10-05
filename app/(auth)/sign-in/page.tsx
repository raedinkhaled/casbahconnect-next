import type { Metadata } from "next";
import type { SearchParamsProps } from "@/types";

import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in | Casbah Connect",
  description: "Sign in with a secure email link or explore Casbah Connect as a demo user.",
};

export default async function SignInPage({ searchParams }: SearchParamsProps) {
  const query = await searchParams;
  const callbackUrl = typeof query.callbackUrl === "string" ? query.callbackUrl : "/";
  return (
    <section className="background-light900_dark200 light-border w-full max-w-md rounded-2xl border p-8 shadow-light-300">
      <h1 className="h2-bold text-dark100_light900">Welcome back</h1>
      <p className="body-regular text-dark400_light700 mb-7 mt-2">
        Sign in with a one-time email link, or explore instantly as a demo user.
      </p>
      <SignInForm callbackUrl={callbackUrl} />
    </section>
  );
}
