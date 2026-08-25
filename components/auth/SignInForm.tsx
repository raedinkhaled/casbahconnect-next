"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await signIn("email", {
      email,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("We could not send the sign-in link. Check the address and try again.");
      setIsSubmitting(false);
      return;
    }

    window.location.assign(result?.url || "/verify-request");
  }

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label
          className="paragraph-semibold text-dark400_light700"
          htmlFor="email"
        >
          Email address
        </label>
        <Input
          autoComplete="email"
          className="background-light800_dark300 light-border-2 min-h-14"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
          type="email"
          value={email}
        />
      </div>
      {error && <p className="body-regular text-red-500">{error}</p>}
      <Button
        className="primary-gradient min-h-12 text-light-900"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Sending link…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
