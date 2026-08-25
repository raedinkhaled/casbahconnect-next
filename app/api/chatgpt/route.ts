import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth-user";

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "The AI answer service is not configured" },
        { status: 503 },
      );
    }

    const body: unknown = await request.json();
    const question =
      typeof body === "object" && body && "question" in body
        ? String(body.question).trim()
        : "";

    if (!question || question.length > 10_000) {
      return NextResponse.json(
        { error: "A valid question is required" },
        { status: 400 },
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a knowledgeable assistant that provides accurate, concise information.",
          },
          {
            role: "user",
            content: `Tell me ${question}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "The AI answer service returned an error" },
        { status: 502 },
      );
    }

    const responseData = await response.json();
    const reply = responseData.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json(
        { error: "The AI answer service returned no content" },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
