import { Camera, ImagePlus, RefreshCw, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  previewUrl: string | null;
  fileName?: string | undefined;
  onFile: (file: File) => void;
  onClear: () => void;
  scanning?: boolean | undefined;
}

const ACCEPT = ["image/jpeg", "image/png"];

export function PhotoDropzone({ previewUrl, fileName, onFile, onClear, scanning }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) onFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT.join(",")}
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {previewUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-primary">
          <img
            src={previewUrl}
            alt="Vista previa de la evidencia"
            className="mx-auto max-h-[420px] w-full object-contain"
          />
          {scanning && (
            <div className="pointer-events-none absolute inset-0 bg-primary/30">
              <div className="animate-scan absolute inset-x-0 h-[3px] bg-safety shadow-safety" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-primary/90 to-transparent p-3 pt-10">
            <p className="min-w-0 flex-1 truncate text-xs font-medium text-primary-foreground/90">
              {fileName}
            </p>
            {!scanning && (
              <>
                <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                  <RefreshCw /> Cambiar
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  onClick={onClear}
                  aria-label="Quitar foto"
                >
                  <X />
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`group flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-14 ${
            dragging
              ? "border-safety bg-safety-soft"
              : "border-input bg-muted/50 hover:border-safety hover:bg-safety-soft/60"
          }`}
        >
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Camera className="size-8" />
          </div>
          <div>
            <p className="font-display text-xl font-semibold uppercase tracking-wide">
              Abrir cámara o galería
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Pulsa para hacer la foto o arrastra una imagen aquí
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ImagePlus className="size-3.5" /> JPG o PNG
          </span>
        </button>
      )}
    </div>
  );
}
