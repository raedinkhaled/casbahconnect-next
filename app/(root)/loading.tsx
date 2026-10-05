import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section aria-label="Loading page" aria-busy="true" className="space-y-8">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-14 w-full" />
      <div className="space-y-6">
        {[1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    </section>
  );
}
