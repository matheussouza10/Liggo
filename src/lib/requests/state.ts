/** Whether a public registration form accepts requests right now. */
export type OpenState =
  { open: true } | { open: false; reason: "closed" | "deadline" | "ended" };

/** The deadline day counts until its last second in Brazil (UTC-3). */
export function deadlineEnd(dateInput: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) return null;
  const d = new Date(`${dateInput}T23:59:59-03:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function registrationOpenState(
  event: {
    registrationOpen: boolean;
    registrationDeadline: Date | null;
    endDate: Date;
  },
  now: Date,
): OpenState {
  if (!event.registrationOpen) return { open: false, reason: "closed" };
  // endDate is a UTC-midnight date: the event is over once that whole day passed.
  if (now.getTime() >= event.endDate.getTime() + 24 * 60 * 60 * 1000)
    return { open: false, reason: "ended" };
  if (
    event.registrationDeadline &&
    now.getTime() > event.registrationDeadline.getTime()
  )
    return { open: false, reason: "deadline" };
  return { open: true };
}

export const CLOSED_MESSAGES = {
  closed: "As inscrições deste evento não estão abertas.",
  deadline: "O prazo de inscrições deste evento terminou.",
  ended: "Este evento já terminou.",
} as const;
