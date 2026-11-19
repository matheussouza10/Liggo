"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the print dialog; choosing "Salvar como PDF" there produces the PDF. */
export function PrintButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      <PrinterIcon data-icon="inline-start" />
      Imprimir ou salvar em PDF
    </Button>
  );
}
