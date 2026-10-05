import { unstable_cache } from "next/cache";

import { getHotQuestions } from "@/lib/actions/question.action";
import { getTopPopularTags } from "@/lib/actions/tag.actions";

// Only public rankings are shared across requests. Sessions, saved questions,
// and authorization-sensitive data must never enter this cache.
export const getSidebarData = unstable_cache(async () => {
  const [hotQuestions, popularTags] = await Promise.all([
    getHotQuestions(),
    getTopPopularTags(),
  ]);
  return { hotQuestions, popularTags };
}, ["public-sidebar-v1"], { revalidate: 60 });
