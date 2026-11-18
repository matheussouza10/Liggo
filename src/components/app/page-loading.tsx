import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder while a page reads the session and its data. */
export function PageLoading() {
  return (
    <div aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="mt-4 h-5 w-96 max-w-full" />
    </div>
  );
}
