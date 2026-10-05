import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";
import { sourceLoader } from "./helpers/load-source.mjs";

const requireDependency = createRequire(import.meta.url);

const loadModel = sourceLoader();
const User = loadModel("database/user.model.ts").default;
const demo = loadModel("lib/demo.ts");
const realUserId = "507f1f77bcf86cd799439011";

function fixture(session = null) {
  const databaseCalls = [];
  const writes = [];
  const adapterCalls = [];
  const realUser = User.hydrate({
    _id: realUserId, email: "member@example.test", name: "Member", saved: [],
  });
  const unavailableModel = new Proxy({}, {
    get(_target, method) {
      return () => {
        writes.push(String(method));
        throw new Error(`Unexpected database operation: ${String(method)}`);
      };
    },
  });
  const state = { session };
  const userModel = {
    hydrate: User.hydrate.bind(User),
    async findById(id) {
      databaseCalls.push(["findById", id]);
      return id === realUserId ? realUser : null;
    },
    async findByIdAndUpdate(id, data, options) {
      writes.push({ id: String(id), data, options });
      return realUser;
    },
  };
  const fakeAdapter = {
    async createUser() { adapterCalls.push("createUser"); },
  };
  const mocks = {
    react: { cache: (fn) => fn },
    "next-auth": { getServerSession: async () => state.session },
    "next/cache": { revalidatePath() {} },
    "@auth/mongodb-adapter": { MongoDBAdapter: () => fakeAdapter },
    "@/lib/mongodb": { __esModule: true, default: Promise.resolve({}) },
    "@/lib/mongoose": {
      async connectToDatabase() { databaseCalls.push(["connectToDatabase"]); },
    },
    "@/database/user.model": { __esModule: true, default: userModel },
  };
  for (const name of ["question", "answer", "tag", "interaction"]) {
    mocks[`@/database/${name}.model`] = {
      __esModule: true, default: unavailableModel,
    };
  }
  return { load: sourceLoader(mocks), mocks, state, databaseCalls, writes, adapterCalls };
}

const demoSession = () => ({
  user: { id: demo.DEMO_USER_ID, isDemo: true }, expires: "2099-01-01",
});

test("demo provider ignores submitted identity and preserves email auth configuration", async () => {
  const context = fixture();
  const { authOptions } = context.load("lib/auth.ts");
  const provider = authOptions.providers.find((item) => item.options.id === "demo");
  assert.equal(provider.type, "credentials");
  assert.deepEqual(provider.options.credentials, {});
  const user = await provider.options.authorize({ id: realUserId, role: "admin", isDemo: false });
  assert.deepEqual(user, {
    id: demo.DEMO_USER_ID, name: "Demo User", email: demo.DEMO_USER_EMAIL,
    image: demo.DEMO_USER_IMAGE, isDemo: true,
  });
  assert.equal(authOptions.session.strategy, "jwt");
  assert.equal(authOptions.session.maxAge, 30 * 24 * 60 * 60);
  assert.ok(authOptions.adapter);
  assert.ok(authOptions.providers.some((item) => item.type === "email"));
  assert.equal(authOptions.providers.find((item) => item.type === "email").options.maxAge, 600);
  assert.deepEqual(context.adapterCalls, []);
  assert.deepEqual(context.databaseCalls, []);
});

test("JWT and session preserve identity and isDemo through encryption and ignore client updates", async () => {
  const { authOptions } = fixture().load("lib/auth.ts");
  const token = await authOptions.callbacks.jwt({
    token: { custom: "preserved", sub: demo.DEMO_USER_ID },
    user: { id: demo.DEMO_USER_ID, isDemo: true }, account: { provider: "demo" },
  });
  const { encode, decode } = requireDependency("next-auth/jwt");
  const secret = "test-only-secret-with-no-production-access";
  const decoded = await decode({ token: await encode({ token, secret }), secret });
  assert.equal(decoded.isDemo, true);
  assert.equal(decoded.id, demo.DEMO_USER_ID);
  assert.equal(decoded.custom, "preserved");
  const updated = await authOptions.callbacks.jwt({
    token: decoded, trigger: "update", session: { user: { id: realUserId, isDemo: false } },
  });
  const session = await authOptions.callbacks.session({ session: { user: {} }, token: updated });
  assert.equal(session.user.isDemo, true);
  assert.equal(session.user.id, demo.DEMO_USER_ID);
});

test("email sign-in clears demo state and legacy email sessions remain normal", async () => {
  const { callbacks } = fixture().load("lib/auth.ts").authOptions;
  const token = await callbacks.jwt({
    token: { isDemo: true, custom: "preserved" },
    user: { id: realUserId, isDemo: true }, account: { provider: "email" },
  });
  assert.equal(token.id, realUserId);
  assert.equal(token.isDemo, false);
  assert.equal(token.custom, "preserved");
  const session = await callbacks.session({ session: { user: {} }, token: { sub: realUserId } });
  assert.deepEqual(session.user, { id: realUserId, isDemo: false });
});

test("existing-user email magic link completes NextAuth sign-in and remains single-use", async () => {
  const { AuthHandler } = requireDependency(path.join(
    path.dirname(requireDependency.resolve("next-auth")), "core/index.js",
  ));
  const { authOptions } = fixture().load("lib/auth.ts");
  const user = { id: realUserId, email: "member@example.test", name: "Member", emailVerified: null };
  let verification = null;
  let delivery = null;
  const errors = [];
  const options = {
    ...authOptions,
    secret: "test-only-secret-with-no-production-access",
    logger: { warn() {}, error(code) { errors.push(code); } },
    adapter: {
      async getUser() { return user; },
      async getUserByEmail(email) { return email === user.email ? user : null; },
      async updateUser(data) { return Object.assign(user, data); },
      async createVerificationToken(data) { verification = data; return data; },
      async useVerificationToken({ identifier, token }) {
        if (verification?.identifier !== identifier || verification?.token !== token) return null;
        const result = verification;
        verification = null;
        return result;
      },
      async createSession() { assert.fail("JWT login must not create database Session records"); },
    },
    providers: authOptions.providers.map((provider) => provider.type === "email" ? {
      ...provider,
      options: {
        ...provider.options,
        async sendVerificationRequest(data) { delivery = data; },
      },
    } : provider),
  };
  const cookies = {};
  async function request(action, { method = "GET", providerId, body, query = {} } = {}) {
    const result = await AuthHandler({
      options,
      req: { action, method, providerId, body, query, cookies, headers: { host: "localhost:3000" } },
    });
    for (const cookie of result.cookies ?? []) cookies[cookie.name] = cookie.value;
    return result;
  }

  const csrf = await request("csrf");
  const started = await request("signin", {
    method: "POST", providerId: "email",
    body: { csrfToken: csrf.body.csrfToken, email: user.email, callbackUrl: "/profile" },
  });
  assert.match(started.redirect, /verify-request/);
  assert.equal(delivery.identifier, user.email);
  assert.ok(verification.expires.getTime() - Date.now() <= 600000);
  const link = new URL(delivery.url);
  const query = Object.fromEntries(link.searchParams);
  const callback = await request("callback", { providerId: "email", query });
  assert.match(callback.redirect, /\/profile$/);
  const session = await request("session");
  assert.equal(session.body.user.id, realUserId);
  assert.equal(session.body.user.email, user.email);
  assert.equal(session.body.user.isDemo, false);
  assert.ok(user.emailVerified instanceof Date);
  const reused = await request("callback", { providerId: "email", query });
  assert.match(reused.redirect, /error=Verification/);
  assert.deepEqual(errors, []);
});

test("demo current user and profile are virtual and need no database access", async () => {
  const context = fixture(demoSession());
  const user = await context.load("lib/auth-user.ts").getCurrentUser();
  assert.equal(String(user._id), demo.DEMO_USER_ID);
  assert.equal(user.isDemo, true);
  assert.equal(user.isNew, false);
  const actions = context.load("lib/actions/user.action.ts");
  assert.equal((await actions.getUserInfo({ userId: demo.DEMO_USER_ID })).user.name, "Demo User");
  assert.equal((await actions.getUserById({ userId: demo.DEMO_USER_ID })).email, demo.DEMO_USER_EMAIL);
  assert.deepEqual(await actions.getSavedQuestions({}), { questions: [], isNext: false });
  assert.deepEqual(await actions.getUserQuestions({ userId: demo.DEMO_USER_ID }), {
    questions: [], totalQuestion: 0, isNext: false,
  });
  assert.deepEqual(await actions.getUserAnswers({ userId: demo.DEMO_USER_ID }), {
    answers: [], totalAnswers: 0, isNext: false,
  });
  assert.deepEqual(context.databaseCalls, []);
  assert.deepEqual(context.writes, []);
});

for (const [file, name, params] of [
  ["question", "createQuestion", { title: "Demo content", content: "Test", tags: [], path: "/" }],
  ["question", "editQuestion", { questionId: realUserId, title: "Edited", content: "Test", path: "/" }],
  ["question", "deleteQuestion", { questionId: realUserId, path: "/" }],
  ["question", "upvoteQuestion", { questionId: realUserId, path: "/" }],
  ["question", "downvoteQuestion", { questionId: realUserId, path: "/" }],
  ["answer", "createAnswer", { question: realUserId, content: "Test", path: "/" }],
  ["answer", "deleteAnswer", { answerId: realUserId, path: "/" }],
  ["answer", "upvoteAnswer", { answerId: realUserId, path: "/" }],
  ["answer", "downvoteAnswer", { answerId: realUserId, path: "/" }],
  ["user", "updateUser", { updateData: { email: "attacker@example.test" }, path: "/" }],
  ["user", "toggleSaveQuestion", { questionId: realUserId, path: "/" }],
]) {
  test(`direct ${name} call rejects demo before any database operation`, async () => {
    const context = fixture(demoSession());
    const action = context.load(`lib/actions/${file}.action.ts`)[name];
    await assert.rejects(action(params), { message: demo.DEMO_DISABLED_MESSAGE });
    assert.deepEqual(context.databaseCalls, []);
    assert.deepEqual(context.writes, []);
  });
}

test("direct question view calls do not change counts or interactions for demo", async () => {
  const context = fixture(demoSession());
  await context.load("lib/actions/interaction.action.ts").viewQuestion({ questionId: realUserId });
  assert.deepEqual(context.databaseCalls, []);
  assert.deepEqual(context.writes, []);
});

test("guard rejects missing auth, reserved demo IDs, and inconsistent demo sessions", async () => {
  const context = fixture();
  const { requireWritableUser, getCurrentUser } = context.load("lib/auth-user.ts");
  await assert.rejects(requireWritableUser(), { message: "Unauthorized" });
  for (const user of [
    { id: demo.DEMO_USER_ID, isDemo: false },
    { id: realUserId, isDemo: true },
  ]) {
    context.state.session = { user };
    await assert.rejects(requireWritableUser(), { message: demo.DEMO_DISABLED_MESSAGE });
    assert.equal(await getCurrentUser(), null);
  }
  assert.deepEqual(context.databaseCalls, []);
});

test("normal users retain mutation access with session-derived identity", async () => {
  const context = fixture({ user: { id: realUserId, isDemo: false } });
  const user = await context.load("lib/auth-user.ts").requireWritableUser();
  assert.equal(String(user._id), realUserId);
  assert.equal(user.isDemo, false);
  await context.load("lib/actions/user.action.ts").updateUser({
    updateData: {
      name: "Normal Member", username: "normal-member", bio: "About this member",
      portfolioWebsite: "https://example.test", location: "Vienna",
    },
    path: "/profile/edit",
  });
  assert.equal(context.writes.length, 1);
  assert.equal(context.writes[0].id, realUserId);
  assert.equal(context.writes[0].data.name, "Normal Member");
});

for (const [file, name, params] of [
  ["question", "editQuestion", { questionId: realUserId, path: "/" }],
  ["question", "deleteQuestion", { questionId: realUserId, path: "/" }],
  ["answer", "deleteAnswer", { answerId: realUserId, path: "/" }],
]) {
  test(`${name} retains ownership checks for normal users`, async () => {
    const context = fixture({ user: { id: realUserId, isDemo: false } });
    context.mocks[`@/database/${file}.model`] = {
      __esModule: true,
      default: {
        async findById() { return { author: "507f1f77bcf86cd799439012" }; },
        async deleteOne() { context.writes.push("delete"); },
        async save() { context.writes.push("save"); },
      },
    };
    const action = context.load(`lib/actions/${file}.action.ts`)[name];
    await assert.rejects(action(params), { message: "Forbidden" });
    assert.deepEqual(context.writes, []);
  });
}
