import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch { /* Older browsers or clipboard permissions use the fallback. */ }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.className = "fixed left-0 top-0 opacity-0";
  const active = document.activeElement;
  document.body.appendChild(field);
  field.select();
  try {
    if (!document.execCommand("copy")) throw new Error("Copy failed");
  } finally {
    field.remove();
    if (active instanceof HTMLElement) active.focus();
  }
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <Button type="button" variant="outline" size="sm" aria-live="polite" onClick={async () => {
    try {
      await copyText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Couldn't copy. Select the text and copy it manually."); }
  }}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : label}</Button>;
}