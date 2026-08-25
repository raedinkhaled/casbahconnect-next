import { MongoDBAdapter } from "@auth/mongodb-adapter";
import type { Adapter } from "next-auth/adapters";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";

import User from "@/database/user.model";
import { connectToDatabase } from "@/lib/mongoose";
import clientPromise from "@/lib/mongodb";

const THIRTY_DAYS = 30 * 24 * 60 * 60;
const TEN_MINUTES = 10 * 60;
const emailPort = Number(process.env.EMAIL_SERVER_PORT ?? 465);

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: "devflow",
  }) as Adapter,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST ?? "smtp.resend.com",
        port: emailPort,
        secure: emailPort === 465,
        auth: {
          user: process.env.EMAIL_SERVER_USER ?? "resend",
          pass: process.env.EMAIL_SERVER_PASSWORD ?? "",
        },
      },
      from: process.env.EMAIL_FROM ?? "Casbah Connect <auth@example.com>",
      maxAge: TEN_MINUTES,
    }),
  ],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/verify-request",
    error: "/sign-in",
  },
  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS,
  },
  jwt: {
    maxAge: THIRTY_DAYS,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      await connectToDatabase();

      const emailName = user.email?.split("@")[0] ?? "member";
      const safeName = emailName.replace(/[^a-zA-Z0-9_]/g, "") || "member";

      await User.findByIdAndUpdate(user.id, {
        $set: {
          name: user.name || emailName,
          username: `${safeName}_${user.id.slice(-6)}`,
          picture: user.image || "/assets/images/default-logo.svg",
          joinedAt: new Date(),
        },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
