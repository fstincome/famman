import { useEffect, useState } from "react";
import logoImg from "@/assets/logo.png";

const QUOTES: { text: string; source: string }[] = [
  { text: "La famille n'est pas une chose importante, c'est tout.", source: "Michael J. Fox" },
  { text: "Heureux l'homme qui a trouvé la sagesse.", source: "Proverbes 3:13" },
  { text: "Une famille unie est la première école du bonheur.", source: "Proverbe africain" },
  { text: "Le bien-être commence par la gratitude quotidienne.", source: "Sagesse populaire" },
  { text: "Tout ce que vous faites, faites-le de bon cœur.", source: "Colossiens 3:23" },
  { text: "Progresser, c'est avancer d'un pas chaque jour, même petit.", source: "Lao Tseu" },
  { text: "La santé est la véritable richesse d'une famille.", source: "Mahatma Gandhi" },
  { text: "L'amour est patient, l'amour est bon.", source: "1 Corinthiens 13:4" },
  { text: "Un foyer rempli de rires vaut tous les trésors du monde.", source: "Proverbe" },
  { text: "Épargner aujourd'hui, c'est protéger demain.", source: "Benjamin Franklin" },
  { text: "Confie ton sort à l'Éternel et il agira.", source: "Psaume 37:5" },
  { text: "Le succès familial se construit autour de la table, pas du bureau.", source: "Anonyme" },
  { text: "Les familles qui mangent ensemble réussissent mieux à l'école.", source: "Étude Harvard" },
  { text: "Prendre soin de soi, c'est aussi prendre soin des siens.", source: "Sagesse" },
  { text: "Là où est ton trésor, là aussi sera ton cœur.", source: "Matthieu 6:21" },
  { text: "La discipline budgétaire est un acte d'amour envers ses enfants.", source: "Dave Ramsey" },
  { text: "Petites économies, grands rêves réalisés.", source: "Proverbe" },
  { text: "15 minutes de marche par jour prolongent la vie de 3 ans.", source: "OMS" },
  { text: "Que la paix de Dieu règne dans vos cœurs.", source: "Colossiens 3:15" },
  { text: "Un projet familial partagé devient une force inarrêtable.", source: "Anonyme" },
];

export function QuotesTicker() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [typed, setTyped] = useState("");

  const quote = QUOTES[index];
  const fullText = `« ${quote.text} »`;

  // Typewriter effect
  useEffect(() => {
    setTyped("");
    let i = 0;
    const speed = 35;
    const typer = setInterval(() => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(typer);
    }, speed);
    return () => clearInterval(typer);
  }, [fullText]);

  // Rotate
  useEffect(() => {
    const hold = Math.max(5000, fullText.length * 60 + 3500);
    const t = setTimeout(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
    }, hold);
    return () => clearTimeout(t);
  }, [index, fullText.length]);

  const isComplete = typed.length >= fullText.length;

  return (
    <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b border-border">
      <div className="flex items-start gap-3 px-4 py-2.5">
        <img
          src={logoImg}
          alt="Logo"
          className="w-6 h-6 rounded object-contain flex-shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm italic text-foreground/90 leading-snug break-words">
            {typed}
            {!isComplete && <span className="inline-block w-0.5 h-3 ml-0.5 bg-primary align-middle animate-pulse" />}
          </p>
          {isComplete && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 animate-fade-in">
              — {quote.source}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
