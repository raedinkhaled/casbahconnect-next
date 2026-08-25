import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email | Casbah Connect",
};

export default function VerifyRequestPage() {
  return (
    <section className="background-light900_dark200 light-border w-full max-w-md rounded-2xl border p-8 text-center shadow-light-300">
      <h1 className="h2-bold text-dark100_light900">Check your email</h1>
      <p className="body-regular text-dark400_light700 mt-3">
        We sent a one-time sign-in link. It expires in ten minutes and can only
        be used once.
      </p>
      <Link className="primary-text-gradient mt-6 inline-block font-semibold" href="/sign-in">
        Use a different email
      </Link>
    </section>
  );
}
