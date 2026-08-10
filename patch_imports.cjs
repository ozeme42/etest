const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8');

if (!code.includes('useCoaching')) {
  code = code.replace(
    /import \{ useEvaluation \} from '\.\.\/context\/EvaluationContext';/,
    `import { useEvaluation } from '../context/EvaluationContext';\nimport { useCoaching } from '../context/CoachingContext';`
  );
}

if (!code.includes('TrendingUp')) {
  code = code.replace(
    /import \{ BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X \} from 'lucide-react';/,
    `import { BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, TrendingUp } from 'lucide-react';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';`
  );
}

if (!code.includes('getMockExamsForStudent')) {
  code = code.replace(
    /const \{ submissions = \[\] \} = useEvaluation\(\);/,
    `const { submissions = [] } = useEvaluation();\n  const { getMockExamsForStudent, addMockExam } = useCoaching();`
  );
}

fs.writeFileSync('src/pages/StudentExamsPage.jsx', code);
console.log('Imports and context patched successfully.');
