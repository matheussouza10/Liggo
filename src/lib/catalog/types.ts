export type CatalogKey = "sports" | "event-types" | "formats";

export type ParticipationType = "INDIVIDUAL" | "PAIR" | "TEAM";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  itemCount: number;
};

export type ItemRow = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  active: boolean;
  description: string | null;
  participationTypes: ParticipationType[];
  allowsGroups: boolean;
  allowsRepechage: boolean;
};

export type ItemInput = {
  name: string;
  categoryId: string;
  description: string | null;
  participationTypes: ParticipationType[];
  allowsGroups: boolean;
  allowsRepechage: boolean;
};

export type CatalogFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};
