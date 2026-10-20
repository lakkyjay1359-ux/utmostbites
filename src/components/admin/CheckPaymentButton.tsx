import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminCheckMpesaPayment } from "@/lib/mpesa.functions";

export function CheckPaymentButton({ id }: { id: string }) {
  const check = useServerFn(adminCheckMpesaPayment);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  return <Button variant="outline" size="sm" disabled={busy} className="mt-2 h-auto whitespace-normal" onClick={async () => {
    setBusy(true);
    try {
      const result = await check({ data: { id } });
      toast[result.paymentStatus === "failed" ? "error" : "success"](result.note || `Payment ${result.paymentStatus}`);
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not check payment"); }
    finally { setBusy(false); }
  }}><RefreshCw className={busy ? "animate-spin" : ""} />{busy ? "Checking…" : "Check payment status"}</Button>;
}