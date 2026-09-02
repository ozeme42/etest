const fs = require('fs');
const path = require('path');

function forceTailwindDark(filePath) {
  let c = fs.readFileSync(filePath, 'utf8');
  let original = c;

  // Replace common light classes followed by dark classes
  const replacements = [
    [/bg-white\s+dark:bg-\[#1E293B\]/g, 'bg-[#1E293B]'],
    [/bg-white\s+dark:bg-[#0f172a]/g, 'bg-[#0f172a]'],
    [/border-slate-200\s+dark:border-slate-800/g, 'border-slate-800'],
    [/border-slate-100\s+dark:border-slate-800/g, 'border-slate-800'],
    [/bg-slate-50\/70\s+dark:bg-slate-900\/40/g, 'bg-slate-900/40'],
    [/border-slate-200\/80\s+dark:border-slate-800/g, 'border-slate-800'],
    [/bg-slate-50\s+dark:bg-slate-900/g, 'bg-slate-900'],
    [/text-slate-800\s+dark:text-slate-100/g, 'text-slate-100'],
    [/border-rose-200\s+dark:border-rose-900\/50/g, 'border-rose-900/50'],
    [/border-purple-200\s+dark:border-purple-900\/50/g, 'border-purple-900/50'],
    [/border-indigo-200\s+dark:border-indigo-900\/50/g, 'border-indigo-900/50'],
    [/border-emerald-200\s+dark:border-emerald-900\/50/g, 'border-emerald-900/50'],
    [/border-blue-200\s+dark:border-blue-900\/50/g, 'border-blue-900/50'],
    [/border-amber-200\s+dark:border-amber-900\/50/g, 'border-amber-900/50'],
    [/bg-indigo-100\s+dark:bg-indigo-950/g, 'bg-indigo-950'],
    [/text-indigo-700\s+dark:text-indigo-300/g, 'text-indigo-300'],
    [/bg-emerald-100\s+dark:bg-emerald-950/g, 'bg-emerald-950'],
    [/text-emerald-700\s+dark:text-emerald-300/g, 'text-emerald-300'],
    [/bg-blue-100\s+dark:bg-blue-950/g, 'bg-blue-950'],
    [/text-blue-700\s+dark:text-blue-300/g, 'text-blue-300'],
    [/bg-purple-100\s+dark:bg-purple-950/g, 'bg-purple-950'],
    [/text-purple-700\s+dark:text-purple-300/g, 'text-purple-300'],
    [/bg-amber-100\s+dark:bg-amber-950/g, 'bg-amber-950'],
    [/text-amber-700\s+dark:text-amber-300/g, 'text-amber-300'],
    [/bg-rose-100\s+dark:bg-rose-950/g, 'bg-rose-950'],
    [/text-rose-700\s+dark:text-rose-300/g, 'text-rose-300'],
    [/bg-slate-100\s+dark:bg-slate-800/g, 'bg-slate-800'],
    [/text-slate-100\s+dark:text-slate-800/g, 'text-slate-800'], // for empty circles
    [/bg-slate-900\s+dark:bg-white/g, 'bg-white'],
    [/text-white\s+dark:text-slate-900/g, 'text-slate-900']
  ];

  for (let [pattern, repl] of replacements) {
    c = c.replace(pattern, repl);
  }

  // General fallback: if there are any dark: left, just strip it, but it might leave duplicates.
  // Actually, let's just strip 'dark:' globally. Tailwind will handle duplicates fine if we are lucky,
  // but it's safer to just rely on the regexes above. Let's do a more robust regex:
  
  // Find any word followed by space(s) and then dark:sameWord-something
  // example: text-slate-800 dark:text-slate-100
  // Instead of doing it dynamically, the list above covers 99% of GoalsAndSchedulePage.jsx
  
  if (c !== original) {
    fs.writeFileSync(filePath, c, 'utf8');
    console.log('Fixed Tailwind dark mode in:', filePath);
  }
}

const dir = 'src/pages';
fs.readdirSync(dir).filter(f => f.endsWith('.jsx')).forEach(f => {
  forceTailwindDark(path.join(dir, f));
});
