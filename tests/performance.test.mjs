import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setImmediate } from "node:timers/promises";
import test from "node:test";
import { Types } from "mongoose";
import { sourceLoader } from "./helpers/load-source.mjs";

function hooks() {
  const effects = [];
  const updates = [];
  return {
    effects, updates,
    react: {
      useState(initial) { return [initial, (value) => updates.push(value)]; },
      useEffect(effect) { effects.push(effect); },
      useTransition() { return [false, (action) => action()]; },
      useRef(value) { return { current: value }; },
    },
  };
}

function findElement(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  const children = [tree.props?.children].flat(Infinity);
  for (const child of children) {
    const found = findElement(child, predicate);
    if (found) return found;
  }
  return null;
}

function clientFixture(t, auth = {}) {
  const state = hooks();
  const navigation = [];
  const previousWindow = global.window;
  global.window = {
    location: { origin: "https://example.test", assign() { assert.fail("Authentication must not reload the document"); } },
  };
  t.after(() => { global.window = previousWindow; });
  const load = sourceLoader({
    react: state.react,
    "next/navigation": {
      useSearchParams: () => new URLSearchParams("callbackUrl=/collection"),
      useRouter: () => ({
        replace(url) { navigation.push(["replace", url]); },
        refresh() { navigation.push(["refresh"]); },
      }),
    },
    "next-auth/react": auth,
    "@/components/ui/button": { Button: "button" },
    "@/components/ui/input": { Input: "input" },
    "next/image": "img",
    "next/link": "a",
  });
  return { load, navigation, ...state };
}

test("client redirects preserve local paths and reject unsafe targets", () => {
  const { getLocalRedirect } = sourceLoader()("lib/navigation.ts");
  const origin = "https://example.test";
  assert.equal(getLocalRedirect("/question/123?q=react#answer", origin), "/question/123?q=react#answer");
  assert.equal(getLocalRedirect(origin + "/collection", origin), "/collection");
  for (const url of ["javascript:alert(1)", "https://external.test", "//external.test", origin + "//external.test", "http://["]) {
    assert.equal(getLocalRedirect(url, origin), "/");
  }
});

test("demo login navigates without a document reload and refreshes shared auth state", async (t) => {
  const calls = [];
  const context = clientFixture(t, {
    async signIn(provider, options) {
      calls.push({ provider, options });
      return { ok: true, url: "https://example.test/collection" };
    },
  });
  const tree = context.load("components/auth/SignInForm.tsx").default({ callbackUrl: "/collection" });
  await findElement(tree, (node) => node.props?.children === "Continue as Demo User").props.onClick();
  assert.equal(calls[0].provider, "demo");
  assert.equal(calls[0].options.redirect, false);
  assert.equal(calls[0].options.callbackUrl, "/collection");
  assert.deepEqual(context.navigation, [["replace", "/collection"], ["refresh"]]);
});

test("email login uses client navigation to verification without refreshing an unchanged session", async (t) => {
  const context = clientFixture(t, {
    async signIn(provider, options) {
      assert.equal(provider, "email");
      assert.equal(options.redirect, false);
      return { url: "https://example.test/verify-request" };
    },
  });
  const tree = context.load("components/auth/SignInForm.tsx").default();
  await tree.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(context.navigation, [["replace", "/verify-request"]]);
});

test("sign-out clears the session before navigation and refreshes the shared layout", async (t) => {
  const context = clientFixture(t, {
    async signOut(options) {
      assert.deepEqual(options, { redirect: false, callbackUrl: "/" });
      assert.equal(context.navigation.length, 0);
      return { url: "https://example.test/" };
    },
  });
  const tree = context.load("components/auth/UserMenu.tsx").default({ userId: "member", imageUrl: "/avatar.svg" });
  await findElement(tree, (node) => node.props?.children === "Sign out").props.onClick();
  assert.deepEqual(context.navigation, [["replace", "/"], ["refresh"]]);
});

test("failed sign-out retains the current page and provides retry feedback", async (t) => {
  const context = clientFixture(t, { async signOut() { throw new Error("Offline"); } });
  const tree = context.load("components/auth/UserMenu.tsx").default({ userId: "member", imageUrl: "/avatar.svg" });
  await findElement(tree, (node) => node.props?.children === "Sign out").props.onClick();
  assert.deepEqual(context.navigation, []);
  assert.ok(context.updates.includes("Could not sign out. Please try again."));
});

test("global search filter changes update history without requesting a server navigation", (t) => {
  const state = hooks();
  const previousWindow = global.window;
  const history = [];
  global.window = { history: { replaceState(_state, _title, url) { history.push(url); } } };
  t.after(() => { global.window = previousWindow; });
  const Filters = sourceLoader({
    react: state.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams("global=react") },
    "@/lib/utils": { formUrlQuery({ key, value }) { return "/?global=react&" + key + "=" + value; } },
  })("components/shared/search/GlobalFilters.tsx").default;
  const tree = Filters();
  awaitableClick(findElement(tree, (node) => typeof node.props?.onClick === "function"));
  assert.equal(history.length, 1);
  assert.match(history[0], /global=react&type=/);
});

function awaitableClick(element) {
  assert.ok(element);
  element.props.onClick();
}

test("outdated global search requests are aborted and cannot overwrite results", async (t) => {
  const state = hooks();
  let resolve;
  let signal;
  const previousFetch = global.fetch;
  global.fetch = (url, options) => {
    assert.match(url, /^\/api\/search\?q=react$/);
    signal = options.signal;
    return new Promise((done) => { resolve = done; });
  };
  t.after(() => { global.fetch = previousFetch; });
  const SearchResult = sourceLoader({
    react: state.react,
    "next/navigation": { useSearchParams: () => new URLSearchParams("global=react") },
    "next/link": "a", "next/image": "img",
    "./GlobalFilters": { __esModule: true, default: "filters" },
  })("components/shared/search/GlobalResult.tsx").default;
  SearchResult();
  const cleanup = state.effects[0]();
  const updatesBeforeCleanup = state.updates.length;
  cleanup();
  assert.equal(signal.aborted, true);
  resolve({ ok: true, async json() { return [{ id: "old", title: "Old result", type: "question" }]; } });
  await setImmediate();
  assert.equal(state.updates.length, updatesBeforeCleanup);
});

test("public search endpoint limits input and returns bounded results without caching", async () => {
  const queries = [];
  const { GET } = sourceLoader({
    "@/lib/actions/general.action": {
      async globalSearch(params) { queries.push(params); return JSON.stringify([{ id: "question", title: "React", type: "question" }]); },
    },
  })("app/api/search/route.ts");
  const response = await GET({ nextUrl: new URL("https://example.test/api/search?q=react&type=question") });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(queries, [{ query: "react", type: "question" }]);
  assert.equal((await response.json())[0].title, "React");
  const rejected = await GET({ nextUrl: new URL("https://example.test/api/search?q=" + "x".repeat(201)) });
  assert.equal(rejected.status, 400);
  assert.equal(queries.length, 1);
});

test("MongoDB auth client is reused without opening a connection during import", (t) => {
  const previousUri = process.env.MONGODB_URL;
  const previousClient = global._mongoClient;
  process.env.MONGODB_URL = "mongodb://127.0.0.1:27017/test-only";
  delete global._mongoClient;
  t.after(() => {
    if (previousUri === undefined) delete process.env.MONGODB_URL;
    else process.env.MONGODB_URL = previousUri;
    if (previousClient === undefined) delete global._mongoClient;
    else global._mongoClient = previousClient;
  });
  let instances = 0;
  let connections = 0;
  class MongoClient {
    constructor() { instances++; }
    async connect() { connections++; return this; }
  }
  const mocks = { mongodb: { MongoClient } };
  const first = sourceLoader(mocks)("lib/mongodb.ts").default;
  const second = sourceLoader(mocks)("lib/mongodb.ts").default;
  assert.equal(first, second);
  assert.equal(instances, 1);
  assert.equal(connections, 0);
});

function searchFixture() {
  const requests = [];
  const mocks = { "@/lib/mongoose": { async connectToDatabase() {} } };
  for (const kind of ["question", "answer", "tag", "user"]) {
    mocks[`@/database/${kind}.model`] = {
      __esModule: true,
      default: {
        find(filter) {
          const request = { kind, filter };
          const query = {
            select(fields) { request.fields = fields; return query; },
            limit(limit) { request.limit = limit; return query; },
            lean() {
              requests.push(request);
              return new Promise((resolve) => { request.resolve = resolve; });
            },
          };
          return query;
        },
      },
    };
  }
  return { requests, search: sourceLoader(mocks)("lib/actions/general.action.ts").globalSearch };
}

test("global search starts all collections concurrently and projects only result fields", async () => {
  const { requests, search } = searchFixture();
  const pending = search({ query: "react" });
  await setImmediate();
  assert.equal(requests.length, 4, "All four reads must start before any result resolves");
  for (const request of requests) {
    assert.equal(request.limit, 2);
    assert.equal(request.fields, request.kind === "answer" ? "_id question" : request.kind === "question" ? "_id title" : "_id name");
    request.resolve([{ _id: request.kind, question: "parent-question", name: "React", title: "React" }]);
  }
  const results = JSON.parse(await pending);
  assert.deepEqual(results.map((result) => result.type), ["question", "answer", "tag", "user"]);
  assert.equal(results[1].id, "parent-question");
});

test("filtered search normalizes type, limits one collection, and treats input literally", async () => {
  const { requests, search } = searchFixture();
  const pending = search({ query: "react.*", type: "ANSWER" });
  await setImmediate();
  assert.equal(requests.length, 1);
  assert.equal(requests[0].kind, "answer");
  assert.equal(requests[0].limit, 8);
  assert.equal(requests[0].filter.content.$regex, "react\\.\\*");
  requests[0].resolve([]);
  assert.deepEqual(JSON.parse(await pending), []);
  assert.deepEqual(JSON.parse(await search({ query: " " })), []);
  assert.equal(requests.length, 1);
});

test("community tags are fetched once for a whole page and keep real tag IDs", async () => {
  let aggregateCalls = 0;
  const userId = new Types.ObjectId();
  const tagId = new Types.ObjectId();
  const ids = Array.from({ length: 20 }, () => new Types.ObjectId());
  ids[0] = userId;
  const { getTopTagsForUsers } = sourceLoader({
    "@/lib/mongoose": { async connectToDatabase() {} },
    "@/database/tag.model": { __esModule: true, default: { collection: { name: "tags" } } },
    "@/database/interaction.model": {
      __esModule: true,
      default: {
        async aggregate(pipeline) {
          aggregateCalls++;
          assert.deepEqual(pipeline[0].$match.user.$in, ids);
          return [{ _id: userId, tags: [{ _id: tagId, name: "typescript" }] }];
        },
      },
    },
  })("lib/user-tags.ts");
  const tags = await getTopTagsForUsers(ids);
  assert.deepEqual(tags[String(userId)], [{ _id: String(tagId), name: "typescript" }]);
  assert.equal(aggregateCalls, 1);
  assert.deepEqual(await getTopTagsForUsers([]), {});
  assert.equal(aggregateCalls, 1);
});

test("profile stats use two aggregates with unchanged totals and badge criteria", async () => {
  let aggregates = 0;
  const user = { _id: new Types.ObjectId(), reputation: 15 };
  const { getUserInfo } = sourceLoader({
    "@/lib/mongoose": { async connectToDatabase() {} },
    "@/lib/auth-user": {},
    "@/lib/demo-user": {},
    "@/lib/user-tags": {},
    "@/lib/validations": {},
    "@/lib/utils": { assignBadges({ criteria }) { return criteria; } },
    "next/cache": { revalidatePath() {} },
    "@/database/tag.model": {},
    "@/database/user.model": { __esModule: true, default: { async findById() { return user; } } },
    "@/database/question.model": { __esModule: true, default: {
      async aggregate() { aggregates++; return [{ count: 4, totalUpvotes: 8, totalViews: 100 }]; },
      countDocuments() { assert.fail("Count must be included in the aggregate"); },
    } },
    "@/database/answer.model": { __esModule: true, default: {
      async aggregate() { aggregates++; return [{ count: 3, totalUpvotes: 6 }]; },
      countDocuments() { assert.fail("Count must be included in the aggregate"); },
    } },
  })("lib/actions/user.action.ts");
  const result = await getUserInfo({ userId: String(user._id) });
  assert.equal(aggregates, 2);
  assert.equal(result.totalQuestion, 4);
  assert.equal(result.totalAnswers, 3);
  assert.deepEqual(result.badgeCounts.map((item) => item.count), [4, 3, 8, 6, 100]);
});

test("answer votes do not send question view requests; demo views remain disabled", () => {
  for (const [type, isDemo, expected] of [["Answer", false, 0], ["Question", true, 0], ["Question", false, 1]]) {
    const state = hooks();
    let views = 0;
    const Votes = sourceLoader({
      react: state.react,
      "next/navigation": { useRouter: () => ({}), usePathname: () => "/question/123" },
      "next/image": "img",
      "@/lib/actions/answer.action": {},
      "@/lib/actions/question.action": {},
      "@/lib/actions/user.action": {},
      "@/lib/actions/interaction.action": { async viewQuestion() { views++; } },
      "@/lib/utils": { formatNumber: String },
      "../ui/use-toast": { toast() {} },
    })("components/shared/Votes.tsx").default;
    Votes({ type, isDemo, itemId: "123", upvotes: 0, downvotes: 0 });
    state.effects[0]();
    assert.equal(views, expected);
  }
});

test("syntax highlighting waits for idle time and only visits the current post", (t) => {
  const state = hooks();
  const content = { querySelector: () => ({}) };
  state.react.useRef = () => ({ current: content });
  let highlight;
  let cancel;
  const previousWindow = global.window;
  global.window = {
    requestIdleCallback(callback) { highlight = callback; return 7; },
    cancelIdleCallback(id) { cancel = id; },
  };
  t.after(() => { global.window = previousWindow; });
  const calls = [];
  const mocks = {
    react: state.react,
    prismjs: { highlightAllUnder(node) { calls.push(node); } },
    "html-react-parser": () => "content",
  };
  const source = readFileSync(new URL("../components/shared/ParseHTML.tsx", import.meta.url), "utf8");
  for (const match of source.matchAll(/import "(prismjs[^\"]+)"/g)) mocks[match[1]] = {};
  sourceLoader(mocks)("components/shared/ParseHTML.tsx").default({ data: "<pre><code>test</code></pre>" });
  const cleanup = state.effects[0]();
  assert.deepEqual(calls, []);
  highlight();
  assert.deepEqual(calls, [content]);
  cleanup();
  assert.equal(cancel, 7);
});
