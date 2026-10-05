import type { ReactNode } from "react";

import { DEMO_DISABLED_MESSAGE } from "@/lib/demo";

export default function DemoNotice({ children }: { children?: ReactNode }) {
  return (
    <aside
      aria-label="Demo mode"
      className="background-light800_dark300 light-border mb-6 rounded-lg border p-4"
    >
      <p className="paragraph-semibold text-dark200_light900">Demo Mode</p>
      <p className="body-regular text-dark400_light700 mt-1">
        {children ?? DEMO_DISABLED_MESSAGE}
      </p>
    </aside>
  );
}
