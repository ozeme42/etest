const fs = require('fs');
let code = fs.readFileSync('src/pages/StudentExamsPage.jsx', 'utf-8');

// 1. Imports
if (!code.includes('recharts')) {
  code = code.replace(
    /import \{ BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X \} from 'lucide-react';/,
    `import { BookOpen, Map, ArrowRight, BarChart2, Star, Plus, X, ClipboardList, TrendingUp } from 'lucide-react';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';`
  );
}

// 2. State & useCoaching
if (!code.includes('showMockModal')) {
  code = code.replace(
    /const \{ getMockExamsForStudent \} = useCoaching\(\);/,
    `const { mockExams = [], addMockExam } = useCoaching();`
  );

  code = code.replace(
    /const \[isSaving, setIsSaving\] = useState\(false\);/,
    `const [isSaving, setIsSaving] = useState(false);\n  const [chartMetric, setChartMetric] = useState('Toplam Net');\n  const [showMockModal, setShowMockModal] = useState(false);\n  const [newSubjectName, setNewSubjectName] = useState('');\n  const [newManualMock, setNewManualMock] = useState({ title: '', date: new Date().toISOString().split('T')[0], subjects: {} });\n\n  const addSubjectToMock = () => {\n    if (!newSubjectName.trim()) return;\n    setNewManualMock(prev => ({ ...prev, subjects: { ...prev.subjects, [newSubjectName.trim()]: { d: '', y: '', b: '', net: '' } } }));\n    setNewSubjectName('');\n  };\n\n  const updateSubjectScore = (subjName, field, value) => {\n    setNewManualMock(prev => ({ ...prev, subjects: { ...prev.subjects, [subjName]: { ...prev.subjects[subjName], [field]: value } } }));\n  };\n\n  const removeSubjectFromMock = (subjName) => {\n    setNewManualMock(prev => {\n      const copy = { ...prev };\n      delete copy.subjects[subjName];\n      return copy;\n    });\n  };\n\n  const totalMockD = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.d) || 0), 0);\n  const totalMockY = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.y) || 0), 0);\n  const totalMockB = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.b) || 0), 0);\n  const totalMockNet = Object.values(newManualMock.subjects).reduce((sum, s) => sum + (Number(s.net) || 0), 0);\n\n  const handleSaveMock = async (e) => {\n    e.preventDefault();\n    if (!newManualMock.title) return;\n    try {\n      await addMockExam({ studentId, title: newManualMock.title, date: newManualMock.date, totalCorrect: totalMockD, totalWrong: totalMockY, totalBlank: totalMockB, netScore: totalMockNet, subjects: newManualMock.subjects, approvalStatus: 'pending_approval' });\n      setShowMockModal(false);\n      setNewManualMock({ title: '', date: new Date().toISOString().split('T')[0], subjects: {} });\n      window.location.reload();\n    } catch(err) { console.error(err); }\n  };\n\n  const studentMockExams = useMemo(() => mockExams.filter(m => String(m.studentId) === String(studentId)), [mockExams, studentId]);`
  );
}

// 3. allExamsList computation
if (code.includes('const allExamsList = useMemo(() => {')) {
  // Replace the inside of allExamsList useMemo
  // Replace `mockExams.forEach` with `studentMockExams.forEach`
  code = code.replace(/mockExams\.forEach\(/, 'studentMockExams.forEach(');
  code = code.replace(/mockExams, assignedBooks, studentSubmissions/, 'studentMockExams, assignedBooks, studentSubmissions');
  
  // We need to inject the mock logic inside the `studentMockExams.forEach`
  code = code.replace(
    /studentMockExams\.forEach\(mock => \{\s*\/\/\s*Sadece onaylanmış olanlar \(veya koç atamamışsa hepsi\) chart'a yansıyabilir\s*if \(mock\.approvalStatus === 'rejected'\) return;\s*\}/,
    `studentMockExams.forEach(mock => {\n      if (mock.approvalStatus === 'rejected') return;\n      list.push({\n        id: mock.id,\n        title: mock.title,\n        date: mock.date || mock.createdAt?.slice(0, 10),\n        totalCorrect: mock.totalCorrect,\n        totalWrong: mock.totalWrong,\n        totalEmpty: mock.totalBlank || mock.totalEmpty,\n        totalNet: mock.netScore || mock.totalNet,\n        isManualMock: true,\n        scores: mock.subjects || mock.scores || {}\n      });\n    });\n    // Prevent duplicates by nullifying original logic (which is empty anyway in this version if we replace it)`
  );
  
  // Wait, let's just rewrite the entire useMemo logic safely if it's messy.
  // Actually, the git checkout version has NO `mockExams.forEach` inside allExamsList?
  // Wait, let's check what `allExamsList` is in the checkout version.
}

