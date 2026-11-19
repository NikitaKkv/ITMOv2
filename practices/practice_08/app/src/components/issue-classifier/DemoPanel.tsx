import { useEffect, useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SCREEN_STATES, type ScreenState } from "./mock-data";

interface Props {
  value: ScreenState;
  onChange: (state: ScreenState) => void;
}

export function DemoPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
      {open && (
        <Card id="demo-panel" className="w-56 p-3">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Состояние экрана
          </p>
          <div role="group" aria-label="Состояние экрана" className="grid gap-2">
            {SCREEN_STATES.map((s) => (
              <Button
                key={s.value}
                type="button"
                variant={value === s.value ? "default" : "outline"}
                aria-pressed={value === s.value}
                className="justify-start"
                onClick={() => onChange(s.value)}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </Card>
      )}
      <Button
        type="button"
        variant="outline"
        aria-expanded={open}
        aria-controls="demo-panel"
        className="shadow-card"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown /> : <FlaskConical />}
        Демо
      </Button>
    </div>
  );
}
