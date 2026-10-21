import { useLanguage } from "@/i18n/LanguageContext";

export function AppFooter() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card px-6 py-4 flex flex-col items-center gap-1 text-center">
      <p className="text-xs text-muted-foreground">
        © {year} SIGHT FAMILY — {t.app.rights}
      </p>
      <p className="text-xs text-muted-foreground">
        {t.app.madeWith} <span aria-hidden="true">❤️</span> {t.app.by}{" "}
        <a
          href="https://www.sightnetwork.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          SIGHT AFRICA
        </a>
      </p>
    </footer>
  );
}
