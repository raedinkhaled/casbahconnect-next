import type { Metadata } from "next";
import { Suspense } from "react";

import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in | Casbah Connect",
  description: "Sign in to Casbah Connect with a secure email link.",
};

export default function SignInPage() {
  return (
    <section className="background-light900_dark200 light-border w-full max-w-md rounded-2xl border p-8 shadow-light-300">
      <h1 className="h2-bold text-dark100_light900">Welcome back</h1>
      <p className="body-regular text-dark400_light700 mb-7 mt-2">
        Enter your email and we&apos;ll send you a one-time sign-in link.
      </p>
      <Suspense fallback={<p>Loading sign-in…</p>}>
        <SignInForm />
      </Suspense>
    </section>
  );
}
