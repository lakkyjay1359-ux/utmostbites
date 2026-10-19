import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteControl({ label, confirmation, disabled = false, onDelete }: {
  label: string; confirmation: string; disabled?: boolean; onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return <Button variant="ghost" size="icon" className="text-destructive" aria-label={label} title={disabled ? `${label} — protected` : label} disabled={disabled || busy} onClick={async () => {
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    try { await onDelete(); toast.success("Deleted"); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete. Please try again."); }
    finally { setBusy(false); }
  }}><Trash2 /></Button>;
}