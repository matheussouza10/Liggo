import { prisma } from "@/lib/prisma";

/**
 * When a request ends without becoming a registration, the CPFs, e-mails and
 * phones of the people in it are erased: they only become records if approved.
 */
export function wipePersonalData(requestId: string) {
  return [
    prisma.registrationRequestMember.updateMany({
      where: { requestId },
      data: {
        cpf: null,
        email: null,
        phone: null,
        guardianName: null,
        guardianCpf: null,
      },
    }),
    prisma.registrationRequest.update({
      where: { id: requestId },
      data: { contactPhone: null, notes: null },
    }),
  ];
}
