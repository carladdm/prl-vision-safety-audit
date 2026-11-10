import { HardHat, History, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  webhookConfigured: boolean;
}

export function AppHeader({ onOpenSettings, onOpenHistory, historyCount, webhookConfigured }: Props) {
  return (
    <header className="bg-hero text-primary-foreground">
      <div className="blueprint-grid">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-5 sm:py-7">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-safety text-safety-foreground shadow-safety">
            <HardHat className="size-7" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold uppercase leading-none tracking-wide sm:text-3xl">
              PRL Vision <span className="text-safety">Audit</span>
            </h1>
            <p className="mt-1 truncate text-sm text-primary-foreground/70">
              Asistente de Evaluación de Riesgos en Campo
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={onOpenHistory}
            className="h-11 gap-1.5 px-3 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground [&_svg]:size-5"
          >
            <History />
            <span className="hidden sm:inline">Historial</span>
            {historyCount > 0 && (
              <span className="rounded-full bg-safety px-1.5 text-xs font-bold text-safety-foreground">
                {historyCount}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            aria-label="Configurar webhook de n8n"
            className="relative size-11 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground [&_svg]:size-5"
          >
            <Settings2 />
            <span
              className={`absolute right-2 top-2 size-2 rounded-full ${webhookConfigured ? "bg-risk-low" : "bg-safety"}`}
            />
          </Button>
        </div>
      </div>
      <div className="hazard-stripe h-1.5" />
    </header>
  );
}
