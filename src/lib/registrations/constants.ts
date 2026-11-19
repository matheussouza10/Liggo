export const CATEGORY_GENDER_LABELS = {
  MALE: "Masculino",
  FEMALE: "Feminino",
  MIXED: "Misto",
} as const;

export const STAFF_ROLE_LABELS = {
  COACH: "Técnico",
  ASSISTANT: "Auxiliar técnico",
  MANAGER: "Responsável",
  PHYSIO: "Preparador ou fisioterapeuta",
  OTHER: "Outro",
} as const;

export const REGISTRATION_LIMITS = {
  maxMembers: 60,
  maxStaff: 10,
  maxShirt: 999,
} as const;
