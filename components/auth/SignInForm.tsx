"use client";

import { FormEvent, useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getLocalRedirect } from "@/lib/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInForm({ callbackUrl = "/" }: { callbackUrl?: string } = {}) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"email" | "demo" | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending("email");

    try {
      const result = await signIn("email", {
        email,
        callbackUrl,
        redirect: false,
      });

      if (!result || result.error) {
        setError("We could not send the sign-in link. Check the address and try again.");
        return;
      }

      startTransition(() => {
        router.replace(getLocalRedirect(result.url || "/verify-request", window.location.origin, "/verify-request"));
      });
    } catch {
      setError("We could not send the sign-in link. Check the address and try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleDemoSignIn() {
    setError(null);
    setPending("demo");

    try {
      const result = await signIn("demo", { callbackUrl, redirect: false });
      if (!result?.ok || !result.url) {
        setError("We could not start demo mode. Please try again.");
        return;
      }

      const destination = getLocalRedirect(result.url, window.location.origin);
      startTransition(() => {
        router.replace(destination);
        // Invalidate prefetched anonymous pages and refresh the shared auth UI.
        router.refresh();
      });
    } catch {
      setError("We could not start demo mode. Please try again.");
    } finally {
      setPending(null);
    }
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
      {error && <p className="body-regular text-red-500" role="alert">{error}</p>}
      <Button
        className="primary-gradient min-h-12 text-light-900"
        disabled={pending !== null || isNavigating}
        type="submit"
      >
        {pending === "email" ? "Sending link…" : "Email me a sign-in link"}
      </Button>
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="light-border flex-1 border-t" />
        <span className="small-regular text-dark400_light700">or</span>
        <div className="light-border flex-1 border-t" />
      </div>
      <div className="space-y-2 text-center">
        <Button
          className="primary-gradient min-h-12 w-full text-light-900"
          disabled={pending !== null || isNavigating}
          onClick={handleDemoSignIn}
          type="button"
        >
          {pending === "demo" ? "Starting demo…" : "Continue as Demo User"}
        </Button>
        <p className="small-regular text-dark400_light700">No account required</p>
      </div>
    </form>
  );
}
