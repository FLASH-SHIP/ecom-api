import { Card, CardContent } from "@ecom/ui/components/card";
import { HelpCircle } from "lucide-react";

interface NotesPanelProps {
  t: (key: string, variables?: Record<string, string | number>) => string;
}

export function NotesPanel({ t }: NotesPanelProps) {
  return (
    <div className="w-full lg:w-[360px] flex flex-col gap-6">
      <Card className="rounded-2xl border border-[#FFD2A8] bg-[#FFF5EB] dark:bg-amber-950/15 dark:border-amber-900/30 shadow-none">
        <CardContent className="p-6 flex flex-col gap-4 text-foreground">
          {/* Title */}
          <div className="flex items-center gap-2 text-[#D0721E] font-semibold text-base">
            <HelpCircle className="h-5 w-5 text-[#D0721E]" />
            <h3>{t("orders.import.notesTitle")}</h3>
          </div>

          {/* Notes Bullet Points */}
          <ul className="list-disc pl-5 text-xs leading-relaxed text-muted-foreground flex flex-col gap-3 marker:text-[#D0721E]">
            <li>{t("orders.import.notes.item1")}</li>
            <li>{t("orders.import.notes.item2")}</li>
            <li>{t("orders.import.notes.item3")}</li>
            <li>{t("orders.import.notes.item4")}</li>
          </ul>

          {/* Contact Support Banner */}
          <div className="mt-2 p-3 bg-[#FFE5CC] dark:bg-amber-950/45 rounded-lg text-center">
            <span className="text-xs font-semibold text-[#8F4F15] dark:text-amber-300">
              {t("orders.import.notes.contactSupport")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
