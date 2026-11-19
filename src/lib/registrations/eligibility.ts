import { ageOn } from "@/lib/people/format";

type CategoryRule = {
  gender: "MALE" | "FEMALE" | "MIXED";
  minAge: number | null;
  maxAge: number | null;
};
type AthleteFacts = { gender: "MALE" | "FEMALE" | "OTHER"; birthDate: Date };

/**
 * Why an athlete cannot play a category, or null when they can. Age is
 * measured on the event's start date.
 */
export function ineligibleReason(
  category: CategoryRule,
  athlete: AthleteFacts,
  eventStart: Date,
): string | null {
  if (category.gender === "MALE" && athlete.gender !== "MALE")
    return "Categoria masculina";
  if (category.gender === "FEMALE" && athlete.gender !== "FEMALE")
    return "Categoria feminina";

  const age = ageOn(athlete.birthDate, eventStart);
  if (category.minAge != null && age < category.minAge)
    return `Idade mínima ${category.minAge} anos`;
  if (category.maxAge != null && age > category.maxAge)
    return `Idade máxima ${category.maxAge} anos`;
  return null;
}
