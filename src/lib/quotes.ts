// Sayings shown in the home page hero, one at a time. Add, remove or reword freely:
// each item is { text, author }. Kept to well-attested public-domain authors and traditional proverbs.
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  { text: "Small cheer and great welcome makes a merry feast.", author: "William Shakespeare" },
  { text: "Tell me what you eat, and I will tell you what you are.", author: "Jean Anthelme Brillat-Savarin" },
  { text: "There is no love sincerer than the love of food.", author: "George Bernard Shaw" },
  { text: "One cannot think well, love well, sleep well, if one has not dined well.", author: "Virginia Woolf" },
  { text: "Hunger is the best sauce in the world.", author: "Miguel de Cervantes" },
  { text: "Good digestion wait on appetite, and health on both.", author: "William Shakespeare" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Diligence is the mother of good luck.", author: "Benjamin Franklin" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "The way to a man's heart is through his stomach.", author: "Proverb" },
  { text: "The early bird catches the worm.", author: "Proverb" },
  { text: "Where there is a will, there is a way.", author: "Proverb" },
  { text: "Rome was not built in a day.", author: "Proverb" },
  { text: "Little by little, one travels far.", author: "Proverb" },
];
