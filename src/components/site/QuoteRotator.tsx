import { useEffect, useState } from "react";
import { QUOTES } from "@/lib/quotes";

const SHOW_MS = 9000; // how long each saying stays
const FADE_MS = 500;  // fade out/in time

/** A quiet strip that swaps to a new saying every few seconds. */
export function QuoteRotator() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  // Start from a random saying after the page loads so each visit feels fresh.
  useEffect(() => { setIndex(Math.floor(Math.random() * QUOTES.length)); }, []);

  useEffect(() => {
    if (paused) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const timer = setInterval(() => {
      setVisible(false);
      swap = setTimeout(() => { setIndex((i) => (i + 1) % QUOTES.length); setVisible(true); }, FADE_MS);
    }, SHOW_MS);
    return () => { clearInterval(timer); if (swap) clearTimeout(swap); };
  }, [paused]);

  const q = QUOTES[index];
  return (
    <section
      aria-label="A thought for the day"
      className="border-b border-accent/40 bg-espresso"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <figure
        className={`mx-auto flex min-h-[7rem] max-w-3xl flex-col items-center justify-center px-6 py-6 text-center transition-opacity motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        <blockquote className="text-lg italic text-muted-foreground sm:text-xl">“{q.text}”</blockquote>
        <figcaption className="mt-2 text-sm font-semibold text-primary">— {q.author}</figcaption>
      </figure>
    </section>
  );
}
