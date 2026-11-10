import { ChevronDown, Link2, Webhook } from "lucide-react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  url: string;
  onUrlChange: (v: string) => void;
}

export function WebhookSettings({ open, onOpenChange, url, onUrlChange }: Props) {
  const configured = /^https?:\/\/.+/i.test(url.trim());
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="surface-card overflow-hidden">
      <CollapsibleTrigger className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <Webhook className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Conexión con n8n</p>
          <p className="truncate text-xs text-muted-foreground">
            {configured ? url : "Sin configurar — pega la URL de tu webhook"}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${configured ? "bg-risk-low-soft text-risk-low" : "bg-safety-soft text-risk-medium-ink"}`}
        >
          {configured ? "Activo" : "Pendiente"}
        </span>
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 border-t border-border bg-muted/40 px-4 py-4">
          <Label htmlFor="webhook-url" className="text-xs font-semibold uppercase tracking-wide">
            URL del Webhook de n8n
          </Label>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="webhook-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://tu-n8n.com/webhook/prl-audit"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              className="h-11 bg-card pl-9 font-mono text-sm"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Se guarda solo en este dispositivo. Usa la URL de producción del nodo Webhook (método POST).
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
