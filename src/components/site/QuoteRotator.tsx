import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/quotes";

const CHANGE_EVERY_MS = 10 * 60 * 1000; // a new saying every 10 minutes
const FADE_MS = 700;

const currentIndex = () => Math.floor(Date.now() / CHANGE_EVERY_MS) % QUOTES.length;

/** One saying at a time, shown over the hero picture. Changes on every 10-minute mark of the clock. */
export function QuoteRotator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let swap: ReturnType<typeof setTimeout>;
    setIndex(currentIndex());
    const schedule = () => {
      const wait = CHANGE_EVERY_MS - (Date.now() % CHANGE_EVERY_MS);
      timer = setTimeout(() => {
        setVisible(false);
        swap = setTimeout(() => { setIndex(currentIndex()); setVisible(true); schedule(); }, FADE_MS);
      }, wait);
    };
    schedule();
    return () => { clearTimeout(timer); clearTimeout(swap); };
  }, []);

  const q = QUOTES[index];
  return (
    <figure
      aria-label="A thought for the day"
      className={`mt-10 max-w-xl border-l-2 border-primary pl-4 transition-opacity motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <blockquote className="text-lg italic leading-snug text-foreground/90 [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] sm:text-xl">“{q.text}”</blockquote>
      <figcaption className="mt-2 text-sm font-semibold text-primary [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">— {q.author}</figcaption>
    </figure>
  );
}
