import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const QUOTES = [
  "La famille n'est pas une chose importante, c'est tout. — Michael J. Fox",
  "« Heureux l'homme qui a trouvé la sagesse. » — Proverbes 3:13",
  "Une famille unie est la première école du bonheur.",
  "Le bien-être commence par la gratitude quotidienne.",
  "« Tout ce que vous faites, faites-le de bon cœur. » — Colossiens 3:23",
  "Progresser, c'est avancer d'un pas chaque jour, même petit.",
  "La santé est la véritable richesse d'une famille.",
  "« L'amour est patient, l'amour est bon. » — 1 Corinthiens 13:4",
  "Un foyer rempli de rires vaut tous les trésors du monde.",
  "Épargner aujourd'hui, c'est protéger demain.",
  "« Confie ton sort à l'Éternel et il agira. » — Psaume 37:5",
  "Le succès familial se construit autour de la table, pas du bureau.",
  "Anecdote : les familles qui mangent ensemble réussissent mieux à l'école.",
  "Prendre soin de soi, c'est aussi prendre soin des siens.",
  "« Là où est ton trésor, là aussi sera ton cœur. » — Matthieu 6:21",
  "La discipline budgétaire est un acte d'amour envers ses enfants.",
  "Petites économies, grands rêves réalisés.",
  "Anecdote : 15 minutes de marche par jour prolongent la vie de 3 ans.",
  "« Que la paix de Dieu règne dans vos cœurs. » — Colossiens 3:15",
  "Un projet familial partagé devient une force inarrêtable.",
];

export function QuotesTicker() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setFading(false);
      }, 300);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b border-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 max-w-full">
        <Sparkles className="w-4 h-4 text-primary flex-shrink-0 animate-pulse" />
        <p
          key={index}
          className={`text-xs sm:text-sm italic text-foreground/80 truncate transition-opacity duration-300 ${
            fading ? "opacity-0" : "opacity-100 animate-fade-in"
          }`}
        >
          {QUOTES[index]}
        </p>
      </div>
    </div>
  );
}
