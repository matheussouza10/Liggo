/** Shared shapes for the stage screens (client-safe). */
export type DrawEntryProps = {
  defaultMode: "MANUAL" | "RANDOM" | "RANKING" | "SNAKE";
  candidates: { id: string; name: string; seed: number | null }[];
};
