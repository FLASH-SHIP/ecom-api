import { TelegramIcon } from "@ecom/ui/components/icon-component/TelegramIcon"
import { WhatsappIcon } from "@ecom/ui/components/icon-component/WhatsappIcon"

export function AuthSupportInfo() {
  return (
    <div className="flex items-center justify-center gap-4 border-t border-border pt-4 mt-1 select-none">
      <a
        href="https://t.me/+84943024337"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <TelegramIcon />
        <span>+84 943 024 337</span>
      </a>
      <a
        href="https://wa.me/84852763445"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <WhatsappIcon />
        <span>+84 852 763 445</span>
      </a>
    </div>
  );
}
