// Sayings shown on the home page. Add, remove or reword freely: each item is { text, author }.
// Kept to traditional proverbs and well-attested public-domain authors.
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  // Swahili and Kenyan wisdom
  { text: "Haba na haba hujaza kibaba.", author: "Swahili proverb (Little by little fills the measure)" },
  { text: "Umoja ni nguvu, utengano ni udhaifu.", author: "Swahili proverb (Unity is strength, division is weakness)" },
  { text: "Haraka haraka haina baraka.", author: "Swahili proverb (Hurry, hurry has no blessing)" },
  { text: "Pole pole ndio mwendo.", author: "Swahili proverb (Slowly, slowly is the way to go)" },
  { text: "Subira huvuta heri.", author: "Swahili proverb (Patience draws good fortune)" },
  { text: "Mtaka cha mvunguni sharti ainame.", author: "Swahili proverb (Whoever wants what is under the bed must bend down)" },
  { text: "Kidole kimoja hakivunji chawa.", author: "Swahili proverb (One finger cannot crush a louse)" },
  { text: "Harambee: let us all pull together.", author: "Kenyan motto" },
  { text: "Akiba haiozi.", author: "Swahili proverb (Savings do not rot)" },
  // Food, welcome and good company
  { text: "Small cheer and great welcome makes a merry feast.", author: "William Shakespeare" },
  { text: "Tell me what you eat, and I will tell you what you are.", author: "Jean Anthelme Brillat-Savarin" },
  { text: "There is no love sincerer than the love of food.", author: "George Bernard Shaw" },
  { text: "One cannot think well, love well, sleep well, if one has not dined well.", author: "Virginia Woolf" },
  { text: "Hunger is the best sauce in the world.", author: "Miguel de Cervantes" },
  { text: "Good digestion wait on appetite, and health on both.", author: "William Shakespeare" },
  { text: "A hungry man is an angry man.", author: "Proverb" },
  { text: "The way to a man's heart is through his stomach.", author: "Proverb" },
  // Hustle, service and hard work
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "Diligence is the mother of good luck.", author: "Benjamin Franklin" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "The early bird catches the worm.", author: "Proverb" },
  { text: "Rome was not built in a day.", author: "Proverb" },
  { text: "Where there is a will, there is a way.", author: "Proverb" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
];
