// Interface strings for the kid-facing app. Learning content itself is multi-language
// (managed in the Admin Panel); this only covers navigation labels and prompts.
const STRINGS = {
  en: {
    hello: 'Hello',
    askName: "Hi! I'm Bolt. What's your name?",
    namePlaceholder: 'Type your name',
    askAge: 'How old are you, {name}?',
    askHero: 'Choose your hero!',
    askTheme: 'Pick your magic colors!',
    next: 'Next',
    back: 'Back',
    letsGo: "Let's go!",
    level: 'Level',
    missions: "Today's missions",
    alphabet: 'Alphabet',
    explore: 'Explore',
    stories: 'Stories',
    games: 'Brain Games',
    buddy: 'Talking Buddy',
    quiz: 'Quiz Time',
    videos: 'Cartoons',
    ailab: 'AI Lab',
    rewards: 'My Stickers',
    parents: 'Grown-ups',
    greatJob: 'Great job!',
    tryAgain: 'Try again!',
    listen: 'Listen',
    sayIt: 'Say it',
    step: 'Step {n} of 4',
    timeUp: 'Time for a break! Stretch, drink water and come back later 🌈',
  },
  bn: {
    hello: 'হ্যালো',
    askName: 'হাই! আমি বোল্ট। তোমার নাম কী?',
    namePlaceholder: 'তোমার নাম লেখো',
    askAge: '{name}, তোমার বয়স কত?',
    askHero: 'তোমার হিরো বেছে নাও!',
    askTheme: 'তোমার জাদুর রং বেছে নাও!',
    next: 'পরের ধাপ',
    back: 'পেছনে',
    letsGo: 'চলো শুরু করি!',
    level: 'লেভেল',
    missions: 'আজকের মিশন',
    alphabet: 'বর্ণমালা',
    explore: 'জানো ও শেখো',
    stories: 'গল্প',
    games: 'বুদ্ধির খেলা',
    buddy: 'কথা বলা বন্ধু',
    quiz: 'কুইজ',
    videos: 'কার্টুন',
    ailab: 'এআই ল্যাব',
    rewards: 'আমার স্টিকার',
    parents: 'অভিভাবক',
    greatJob: 'দারুণ!',
    tryAgain: 'আবার চেষ্টা করো!',
    listen: 'শোনো',
    sayIt: 'বলো',
    step: 'ধাপ {n} / ৪',
    timeUp: 'এখন একটু বিরতি! একটু নড়াচড়া করো, পানি খাও, পরে আবার এসো 🌈',
  },
};

export const UI_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
];

export function translator(lang) {
  const table = STRINGS[lang] || STRINGS.en;
  return (key, vars = {}) => (table[key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
