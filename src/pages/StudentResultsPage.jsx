import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ListTree, Search, Filter, Calendar, Award, CheckCircle2,
  Clock3, Eye, ArrowLeft, GraduationCap, Ruler, TestTube2,
  BookCopy, Globe, MessageSquare, Sparkles, BookOpen, Layers, Trophy,
  TrendingUp, BarChart3, Target, BookMarked, HelpCircle, XCircle,
  Table, List
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, ReferenceLine, Cell
} from 'recharts';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';

const subjectThemes = {
  'Matematik': { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: Ruler },
  'Fen Bilimleri': { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: TestTube2 },
  'Türkçe': { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: BookCopy },
  'Sosyal Bilgiler': { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', icon: Globe },
  'İngilizce': { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', icon: MessageSquare },
  'Genel Testler': { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: Trophy },
  'Diğer': { bg: '#f8fafc', color: '#475569', border: '#e2e8f0', icon: BookOpen }
};

export default function StudentResultsPage() {
  const navigate = useNavigate();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { data: curData } = useCurriculum();

  const studentMembers = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const [selectedStudent, setSelectedStudent] = useState(studentMembers[0] || null);

  // View Mode: 'table' (Excel single row table) | 'cards' (Cards grid)
  const [viewMode, setViewMode] = useState('table');

  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'homework', 'individual', 'book'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'pending'

  // Chart Tab Controls
  const [chartTab, setChartTab] = useState('trend'); // 'trend', 'subjectBar', 'topicBreakdown'
  const [chartSubjectFilter, setChartSubjectFilter] = useState('all');

  // Build a lookup map of all tests from CurriculumContext
  const allCurTestsMap = useMemo(() => {
    const map = new Map();
    if (!curData) return map;

    (curData.tests || []).forEach(t => {
      if (t.id) map.set(t.id, { title: t.title || t.name, subject: t.subjectName || t.subject });
    });

    (curData.grades || []).forEach(g => {
      (g.subjects || []).forEach(s => {
        (s.units || []).forEach(u => {
          (u.topics || []).forEach(top => {
            (top.tests || []).forEach(t => {
              if (t.id) map.set(t.id, { title: t.title || t.name, subject: s.name, topic: top.name });
            });
          });
        });
      });
    });
    return map;
  }, [curData]);

  // Student completed submissions with counts and properly resolved titles
  const studentSubmissions = useMemo(() => {
    if (!selectedStudent) return [];

    // 1. Gather all submissions from EvaluationContext
    const baseSubs = (submissions || [])
      .filter(s => s.studentId === selectedStudent.id)
      .filter(s => {
        const targetId = s.hwId || s.testId;
        if (!targetId) return true;
        return (homeworks || []).some(h => String(h.id) === String(targetId)) ||
               s.isTrial || s.isExam || s.sourceType === 'manual';
      });

    // 2. Also incorporate completed homeworks from HomeworkContext if not already in EvaluationContext
    const hwSubs = [];
    (homeworks || []).forEach(hw => {
      (hw.submissions || []).forEach(sub => {
        if (sub.studentId === selectedStudent.id) {
          const alreadyExists = baseSubs.some(s => 
            (s.hwId === hw.id || s.testId === hw.id || s.id === hw.id)
          );
          if (!alreadyExists) {
            hwSubs.push({
              id: `hw_sub_${hw.id}_${selectedStudent.id}`,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              studentId: selectedStudent.id,
              score: sub.score,
              submittedAt: sub.completedAt || sub.submittedAt || new Date().toISOString(),
              isHomework: true,
              type: hw.type || 'homework',
              totalQuestions: hw.totalQuestions || sub.totalQuestions || 0,
              correctCount: sub.correctCount,
              wrongCount: sub.wrongCount,
              blankCount: sub.blankCount,
              subjectStats: sub.subjectStats,
              studentAnswers: sub.studentAnswers
            });
          }
        }
      });
    });

    const allCombined = [...baseSubs, ...hwSubs];

    return allCombined
      .map(s => {
        let correctCount = s.correctCount !== undefined ? s.correctCount : 0;
        let wrongCount = s.wrongCount !== undefined ? s.wrongCount : 0;
        let blankCount = s.blankCount !== undefined ? s.blankCount : 0;

        if (s.answers && s.answers.length > 0) {
          correctCount = 0;
          wrongCount = 0;
          blankCount = 0;
          s.answers.forEach(ans => {
            if (ans.isCorrect === true) correctCount++;
            else if (ans.isCorrect === false) {
              const isB = ans.userAnswer === null || ans.userAnswer === undefined || ans.userAnswer === '';
              if (isB) blankCount++;
              else wrongCount++;
            }
          });
        }

        // Match homework
        const matchedHw = (homeworks || []).find(h => 
          h.id === s.hwId || 
          h.id === s.testId || 
          (s.id && h.id === s.id) ||
          (Array.isArray(h.questionIds) && h.questionIds.includes(s.testId))
        );

        // Match curriculum test
        const matchedTest = allCurTestsMap.get(s.testId) || allCurTestsMap.get(s.hwId);

        // Resolve Real Title: NEVER show plain generic "Test Sınavı" if actual homework or test title exists!
        let resolvedTitle = s.testTitle;
        const isGeneric = !resolvedTitle || 
          resolvedTitle.trim().toLowerCase() === 'test sınavı' || 
          resolvedTitle.trim().toLowerCase() === 'test sinavi' || 
          resolvedTitle.trim().toLowerCase() === 'test' ||
          resolvedTitle.trim().toLowerCase() === 'test sinavi';

        if (matchedHw?.title) {
          resolvedTitle = matchedHw.title;
        } else if (matchedTest?.title) {
          resolvedTitle = matchedTest.title;
        } else if (isGeneric) {
          if (s.title) resolvedTitle = s.title;
          else if (matchedHw?.subject) resolvedTitle = `${matchedHw.subject} Ödevi`;
          else if (s.type === 'physicalExam') resolvedTitle = 'Fiziki Deneme Sınavı';
          else resolvedTitle = 'Ödev Sınavı';
        }

        // Resolve Subject Key
        let subjectKey = 'Diğer';
        if (s.type === 'physicalExam' || matchedHw?.type === 'physicalExam') {
          subjectKey = 'Genel Testler';
        } else if (matchedHw?.subject && subjectThemes[matchedHw.subject]) {
          subjectKey = matchedHw.subject;
        } else if (matchedTest?.subject && subjectThemes[matchedTest.subject]) {
          subjectKey = matchedTest.subject;
        } else {
          const tTitle = (resolvedTitle || '').toLowerCase();
          if (tTitle.includes('mat')) subjectKey = 'Matematik';
          else if (tTitle.includes('fen')) subjectKey = 'Fen Bilimleri';
          else if (tTitle.includes('türk') || tTitle.includes('turk')) subjectKey = 'Türkçe';
          else if (tTitle.includes('sosyal') || tTitle.includes('inkılap') || tTitle.includes('inkilap')) subjectKey = 'Sosyal Bilgiler';
          else if (tTitle.includes('ing') || tTitle.includes('english')) subjectKey = 'İngilizce';
          else if (tTitle.includes('deneme')) subjectKey = 'Genel Testler';
        }

        return {
          ...s,
          testTitle: resolvedTitle,
          subjectKey,
          correctCount,
          wrongCount,
          blankCount,
          totalQuestions: s.totalQuestions || (s.answers?.length) || (correctCount + wrongCount + blankCount) || (matchedHw?.totalQuestions) || 0
        };
      })
      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [submissions, homeworks, allCurTestsMap, selectedStudent]);

  // Helper to calculate true success percentage
  const getTrueSuccess = (s) => {
    if (s.score !== undefined && s.score !== null && s.score <= 100) return s.score;
    if (s.totalQuestions > 0) return Math.round(((s.correctCount || 0) / s.totalQuestions) * 100);
    if (s.score !== undefined && s.score !== null) return Math.min(100, s.score);
    return 0;
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = studentSubmissions.length;
    if (total === 0) return { total: 0, avgScore: 0, maxScore: 0, completedCount: 0 };
    
    let sumScore = 0;
    let max = 0;
    let completedCount = 0;

    studentSubmissions.forEach(s => {
      const sc = getTrueSuccess(s);
      sumScore += sc;
      if (sc > max) max = sc;
      if (s.status !== 'pending_evaluation') completedCount++;
    });

    return {
      total,
      avgScore: Math.round(sumScore / total),
      maxScore: max,
      completedCount
    };
  }, [studentSubmissions]);

  // Trend Chart Data (Chronological progression of scores)
  const trendChartData = useMemo(() => {
    let sorted = [...studentSubmissions].sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
    
    if (chartSubjectFilter !== 'all') {
      sorted = sorted.filter(s => {
        const tTitle = (s.testTitle || '').toLowerCase();
        return tTitle.includes(chartSubjectFilter.toLowerCase());
      });
    }

    return sorted.map((s, idx) => {
      const dateStr = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : `Sınav ${idx + 1}`;
      return {
        name: dateStr,
        title: s.testTitle || 'Ödev Sınavı',
        başarı: getTrueSuccess(s),
        doğru: s.correctCount,
        yanlış: s.wrongCount,
        boş: s.blankCount,
        toplam: s.totalQuestions
      };
    });
  }, [studentSubmissions, chartSubjectFilter]);

  // Subject Comparison Bar Chart Data
  const subjectBarData = useMemo(() => {
    const subjectsMap = {
      'Matematik': { totalScore: 0, count: 0, color: '#2563eb' },
      'Fen Bilimleri': { totalScore: 0, count: 0, color: '#0d9488' },
      'Türkçe': { totalScore: 0, count: 0, color: '#ea580c' },
      'Sosyal Bilgiler': { totalScore: 0, count: 0, color: '#9333ea' },
      'İngilizce': { totalScore: 0, count: 0, color: '#e11d48' },
      'Genel Deneme': { totalScore: 0, count: 0, color: '#4f46e5' }
    };

    studentSubmissions.forEach(s => {
      let key = 'Genel Deneme';
      const tTitle = (s.testTitle || '').toLowerCase();
      if (tTitle.includes('mat')) key = 'Matematik';
      else if (tTitle.includes('fen')) key = 'Fen Bilimleri';
      else if (tTitle.includes('türk') || tTitle.includes('turk')) key = 'Türkçe';
      else if (tTitle.includes('sosyal')) key = 'Sosyal Bilgiler';
      else if (tTitle.includes('ing')) key = 'İngilizce';

      if (subjectsMap[key]) {
        subjectsMap[key].totalScore += (s.score || 0);
        subjectsMap[key].count += 1;
      }
    });

    return Object.entries(subjectsMap).map(([subj, val]) => ({
      ders: subj,
      ortBaşarı: val.count > 0 ? Math.round(val.totalScore / val.count) : 0,
      sınavSayısı: val.count,
      color: val.color
    }));
  }, [studentSubmissions]);

  // Topic Analysis Breakdown
  const topicAnalysisData = useMemo(() => {
    const topicMap = {};

    studentSubmissions.forEach(s => {
      let subj = 'Genel';
      const tTitle = (s.testTitle || 'Genel').toLowerCase();
      if (tTitle.includes('mat')) subj = 'Matematik';
      else if (tTitle.includes('fen')) subj = 'Fen Bilimleri';
      else if (tTitle.includes('türk') || tTitle.includes('turk')) subj = 'Türkçe';
      else if (tTitle.includes('sosyal')) subj = 'Sosyal Bilgiler';
      else if (tTitle.includes('ing')) subj = 'İngilizce';

      const topicName = s.testTitle ? s.testTitle.replace(/^json\s*[-:_]\s*/i, '').trim() : 'Genel Test';

      if (!topicMap[topicName]) {
        topicMap[topicName] = { topic: topicName, subject: subj, totalQ: 0, correctQ: 0, wrongQ: 0, blankQ: 0 };
      }

      topicMap[topicName].totalQ += s.totalQuestions;
      topicMap[topicName].correctQ += s.correctCount;
      topicMap[topicName].wrongQ += s.wrongCount;
      topicMap[topicName].blankQ += s.blankCount;
    });

    return Object.values(topicMap).map(t => {
      const accuracy = t.totalQ > 0 ? Math.round((t.correctQ / t.totalQ) * 100) : 0;
      let status = '🟢 Başarılı';
      let statusBg = '#dcfce7';
      let statusColor = '#166534';
      if (accuracy >= 85) {
        status = '🏆 Üstün Başarı';
        statusBg = '#e0e7ff';
        statusColor = '#4338ca';
      } else if (accuracy < 65) {
        status = '⚠️ Geliştirilmeli';
        statusBg = '#fef2f2';
        statusColor = '#991b1b';
      }

      return { ...t, accuracy, status, statusBg, statusColor };
    }).sort((a, b) => b.totalQ - a.totalQ);
  }, [studentSubmissions]);

  // Filtered Submissions List for Table
  const filteredSubmissions = useMemo(() => {
    return studentSubmissions.filter(s => {
      const titleMatch = (s.testTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      let subjectMatch = true;
      if (subjectFilter !== 'all') {
        const titleLower = ((s.testTitle || '') + ' ' + (s.subjectKey || '')).toLowerCase();
        subjectMatch = titleLower.includes(subjectFilter.toLowerCase());
      }

      let typeMatch = true;
      if (typeFilter === 'homework') typeMatch = !!s.isHomework;
      else if (typeFilter === 'individual') typeMatch = !s.isHomework && !s.bookTestId;
      else if (typeFilter === 'book') typeMatch = !!s.bookTestId;

      let statusMatch = true;
      if (statusFilter === 'completed') statusMatch = s.status !== 'pending_evaluation';
      else if (statusFilter === 'pending') statusMatch = s.status === 'pending_evaluation';

      return titleMatch && subjectMatch && typeMatch && statusMatch;
    });
  }, [studentSubmissions, searchQuery, subjectFilter, typeFilter, statusFilter]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#0f172a', color: 'white', padding: '0.85rem 1.15rem', borderRadius: '0.85rem', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
          <div style={{ fontWeight: 900, fontSize: '0.95rem', marginBottom: '0.35rem', color: '#38bdf8' }}>{data.title || label}</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4ade80' }}>🎯 Başarı Oranı: %{data.başarı}</div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.78rem', color: '#94a3b8' }}>
            <span>✓ {data.doğru} Doğru</span>
            <span>❌ {data.yanlış} Yanlış</span>
            <span>⚪ {data.boş} Boş</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2.5 sm:p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto w-full">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 mb-5 sm:mb-6">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5">
            <button
              onClick={() => navigate('/student')}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 cursor-pointer flex items-center gap-1.5 font-extrabold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors shrink-0 text-xs sm:text-sm"
            >
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Öğrenci Paneli</span><span className="sm:hidden">Geri</span>
            </button>
            <div>
              <h1 className="m-0 text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2">
                <ListTree className="text-indigo-600 shrink-0 w-6 h-6 sm:w-7 sm:h-7" /> Sınav & Test Sonuçlarım
              </h1>
              <p className="m-0 text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
                Zaman içindeki başarı trendinizi ve tüm sınav karnelerinizi inceleyin.
              </p>
            </div>
          </div>

          {/* Student Selector Switcher */}
          <div className="flex items-center gap-1.5 bg-white p-1 sm:p-1.5 rounded-2xl border border-slate-200 shadow-xs overflow-x-auto max-w-full">
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className={`px-3 py-1.5 rounded-xl border-none font-extrabold text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    active ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <GraduationCap size={15} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ANALYTICS STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 mb-5 sm:mb-6">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-black text-slate-900 leading-none">{stats.total}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate">Çözülen Test</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-black text-emerald-600 leading-none">%{stats.avgScore}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate">Ortalama Başarı</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-black text-amber-600 leading-none">%{stats.maxScore}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate">En Yüksek Başarı</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs flex items-center gap-2.5 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-xl sm:text-2xl font-black text-slate-800 leading-none">{stats.completedCount}</div>
              <div className="text-[10px] sm:text-xs font-bold text-slate-500 mt-1 truncate">Değerlendirilen</div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE & TREND CHARTS SECTION */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-3.5 sm:p-5 md:p-6 shadow-xs mb-5 sm:mb-6">
          
          {/* Chart Section Header & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100 mb-3 sm:mb-4">
            <div>
              <h2 className="m-0 text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <TrendingUp className="text-indigo-600 w-5 h-5" /> Performans Trendi ve Analizi
              </h2>
              <p className="m-0 text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
                Dersler ve konular genelinde gelişim grafiğinizi inceleyin.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full">
              <button
                onClick={() => setChartTab('trend')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border-none font-black text-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chartTab === 'trend' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-200'
                }`}
              >
                <TrendingUp size={14} /> <span>Zaman Trendi</span>
              </button>

              <button
                onClick={() => setChartTab('subjectBar')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border-none font-black text-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chartTab === 'subjectBar' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BarChart3 size={14} /> <span>Dersler</span>
              </button>

              <button
                onClick={() => setChartTab('topicBreakdown')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg border-none font-black text-xs cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all ${
                  chartTab === 'topicBreakdown' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Target size={14} /> <span>Konu Analizi</span>
              </button>
            </div>
          </div>

          {/* TAB 1: ZAMAN İÇİNDEKİ BAŞARI TRENDİ (CHRONOLOGICAL AREA CHART) */}
          {chartTab === 'trend' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  Zaman İçindeki Başarı Değişimi:
                </span>
                
                <select
                  value={chartSubjectFilter}
                  onChange={e => setChartSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 bg-white w-full sm:w-auto outline-none"
                >
                  <option value="all">Tüm Dersler Trendi</option>
                  <option value="matematik">Matematik Trendi</option>
                  <option value="fen">Fen Bilimleri Trendi</option>
                  <option value="türkçe">Türkçe Trendi</option>
                  <option value="sosyal">Sosyal Bilgiler Trendi</option>
                  <option value="ingilizce">İngilizce Trendi</option>
                </select>
              </div>

              {trendChartData.length > 0 ? (
                <div className="w-full h-[220px] sm:h-[290px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '0.72rem', fontWeight: 700 }} />
                      <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.72rem', fontWeight: 700 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Hedef (%70)', fill: '#10b981', fontSize: 11, fontWeight: 800 }} />
                      <Area type="monotone" dataKey="başarı" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-10 text-center text-slate-400 font-bold text-xs sm:text-sm">
                  Bu derse ait henüz sınav kaydı bulunmuyor.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DERS BAZLI BAŞARI KARŞILAŞTIRMASI (BAR CHART) */}
          {chartTab === 'subjectBar' && (
            <div>
              <div className="mb-3 text-xs sm:text-sm font-bold text-slate-700">
                Derslere Göre Ortalama Başarı Oranı (%):
              </div>
              <div className="w-full h-[220px] sm:h-[290px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectBarData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ders" stroke="#64748b" style={{ fontSize: '0.72rem', fontWeight: 800 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.72rem', fontWeight: 700 }} />
                    <Tooltip formatter={(value) => [`%${value}`, 'Ortalama Başarı']} />
                    <Bar dataKey="ortBaşarı" radius={[8, 8, 0, 0]}>
                      {subjectBarData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* TAB 3: KONU VE HATA ANALİZİ TABLOSU */}
          {chartTab === 'topicBreakdown' && (
            <div>
              <div className="mb-3 text-xs sm:text-sm font-bold text-slate-700">
                Konu Bazlı Soru Sayıları ve Doğruluk Başarısı:
              </div>
              
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="min-w-[550px] w-full border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200 text-slate-600 text-[11px]">
                      <th className="p-2 sm:p-3 font-black">KONU / SINAV BAŞLIĞI</th>
                      <th className="p-2 sm:p-3 font-black">DERS</th>
                      <th className="p-2 sm:p-3 font-black">ÇÖZÜLEN</th>
                      <th className="p-2 sm:p-3 font-black">DOĞRULUK</th>
                      <th className="p-2 sm:p-3 font-black">DURUM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicAnalysisData.map((t, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="p-2.5 sm:p-3 font-black text-slate-900">{t.topic}</td>
                        <td className="p-2.5 sm:p-3 font-bold text-slate-600">{t.subject}</td>
                        <td className="p-2.5 sm:p-3 font-bold text-slate-800">{t.totalQ} Soru</td>
                        <td className="p-2.5 sm:p-3 w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${t.accuracy}%`,
                                  background: t.accuracy >= 85 ? '#4f46e5' : t.accuracy >= 70 ? '#10b981' : '#ef4444'
                                }}
                              />
                            </div>
                            <span className="font-black text-xs text-slate-700">%{t.accuracy}</span>
                          </div>
                        </td>
                        <td className="p-2.5 sm:p-3">
                          <span
                            className="px-2 py-0.5 rounded-lg font-black text-[10px] sm:text-xs inline-block whitespace-nowrap"
                            style={{ background: t.statusBg, color: t.statusColor }}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {topicAnalysisData.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400 font-bold">
                          Henüz konu analizi verisi oluşturulamadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* SEARCH, FILTERS & VIEW MODE SWITCHER BAR */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-5 flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between">
          
          {/* Live Search Input */}
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Sınav adı veya ders ara..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 bg-white cursor-pointer outline-none"
            >
              <option value="all">Tüm Dersler</option>
              <option value="matematik">Matematik</option>
              <option value="fen">Fen Bilimleri</option>
              <option value="türkçe">Türkçe</option>
              <option value="sosyal">Sosyal Bilgiler</option>
              <option value="ingilizce">İngilizce</option>
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-700 bg-white cursor-pointer outline-none"
            >
              <option value="all">Tüm Türler</option>
              <option value="homework">📝 Ödev Sınavları</option>
              <option value="individual">⚡ Bireysel Sınavlar</option>
              <option value="book">📕 Kitap Testleri</option>
            </select>

            {/* View Switcher: Table vs Cards */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg border-none font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                  viewMode === 'table' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Table size={14} /> <span className="hidden xs:inline">Tablo</span>
              </button>

              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg border-none font-extrabold text-xs cursor-pointer flex items-center gap-1.5 transition-all ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-transparent text-slate-600 hover:bg-slate-200'
                }`}
              >
                <List size={14} /> <span className="hidden xs:inline">Kartlar</span>
              </button>
            </div>

          </div>

        </div>

        {/* RESULTS MODE 1: EXCEL SINGLE-ROW TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="min-w-[700px] w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b-2 border-slate-200 text-[11px] sm:text-xs text-slate-700">
                    <th className="p-3 sm:p-3.5 font-black">SINAV / ÖDEV BAŞLIĞI</th>
                    <th className="p-3 sm:p-3.5 font-black">DERS</th>
                    <th className="p-3 sm:p-3.5 font-black">TARİH</th>
                    <th className="p-3 sm:p-3.5 font-black">TÜR</th>
                    <th className="p-3 sm:p-3.5 font-black">SONUÇ DETAYI</th>
                    <th className="p-3 sm:p-3.5 font-black">BAŞARI / NET</th>
                    <th className="p-3 sm:p-3.5 text-right font-black">EYLEM</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((sub, idx) => {
                    const isPending = sub.status === 'pending_evaluation';
                    const score = sub.score || 0;
                    const theme = subjectThemes[sub.subjectKey] || subjectThemes['Diğer'];
                    const SubjectIcon = theme.icon;
                    const isZebra = idx % 2 === 1;

                    return (
                      <tr
                        key={sub.id || idx}
                        className={`border-b border-slate-200 transition-colors ${
                          isZebra ? 'bg-slate-50/60' : 'bg-white'
                        } hover:bg-indigo-50/30`}
                      >
                        
                        {/* Title */}
                        <td className="p-3 sm:p-3.5">
                          <div className="font-black text-slate-900 text-xs sm:text-sm">
                            {sub.testTitle || 'Ödev / Sınav Değerlendirmesi'}
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="p-3 sm:p-3.5 whitespace-nowrap">
                          <span
                            className="text-xs font-extrabold px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5"
                            style={{ background: theme.bg, color: theme.color, border: `1px solid ${theme.border}` }}
                          >
                            <SubjectIcon size={13} /> {sub.subjectKey}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="p-3 sm:p-3.5 text-xs font-bold text-slate-500 whitespace-nowrap">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                        </td>

                        {/* Type */}
                        <td className="p-3 sm:p-3.5 whitespace-nowrap">
                          <span className="text-[11px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md">
                            {sub.type === 'physicalExam' ? '🏛️ Fiziki Deneme' : sub.isHomework ? '📝 Ödev' : sub.bookTestId ? '📕 Kitap' : '⚡ Bireysel'}
                          </span>
                        </td>

                        {/* Result Details Pill Badges */}
                        <td className="p-3 sm:p-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-black px-1.5 py-0.5 rounded">
                              ✓ {sub.correctCount}
                            </span>
                            <span className="bg-rose-50 text-rose-800 border border-rose-300 font-black px-1.5 py-0.5 rounded">
                              ❌ {sub.wrongCount}
                            </span>
                            <span className="bg-slate-100 text-slate-700 border border-slate-300 font-black px-1.5 py-0.5 rounded">
                              ⚪ {sub.blankCount}
                            </span>
                          </div>
                        </td>

                        {/* Score Badge */}
                        <td className="p-3 sm:p-3.5 whitespace-nowrap">
                          {isPending ? (
                            <span className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-black px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                              <Clock3 size={12} /> Bekliyor
                            </span>
                          ) : sub.type === 'physicalExam' ? (
                            <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg inline-flex items-center">
                              {score} Net
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-lg inline-flex items-center">
                              %{score}
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="p-3 sm:p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (sub.type === 'physicalExam') {
                                navigate(`/physical-exam/${sub.hwId || sub.testId}?studentId=${selectedStudent.id}`);
                              } else {
                                navigate(`/review/${sub.id}`);
                              }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white border-none px-3 py-1.5 rounded-xl font-extrabold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
                          >
                            <Eye size={13} /> {sub.type === 'physicalExam' ? 'Karne & Optik' : 'İncele'}
                          </button>
                        </td>

                      </tr>
                    );
                  })}

                  {filteredSubmissions.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-500 bg-white">
                        <ListTree size={40} className="text-slate-300 mx-auto mb-2" />
                        <h4 className="m-0 font-black text-slate-700 text-sm">Bu Filtrelerde Sonuç Bulunmuyor</h4>
                        <p className="m-0 text-xs text-slate-400 mt-1">Filtreleri veya arama kelimenizi değiştirebilirsiniz.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RESULTS MODE 2: CARDS GRID VIEW */}
        {viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filteredSubmissions.map((sub, idx) => {
              const isPending = sub.status === 'pending_evaluation';
              const score = sub.score || 0;
              const theme = subjectThemes[sub.subjectKey] || subjectThemes['Diğer'];
              const SubjectIcon = theme.icon;

              return (
                <div
                  key={sub.id || idx}
                  className="bg-white rounded-2xl p-4 sm:p-4.5 border border-slate-200 shadow-xs flex flex-col justify-between gap-3 relative overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="absolute top-0 left-0 right-0 h-1" style={{ background: theme.color }} />

                  <div>
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <span
                        className="text-xs font-extrabold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                        style={{ background: theme.bg, color: theme.color, border: `1px solid ${theme.border}` }}
                      >
                        <SubjectIcon size={13} /> {sub.subjectKey}
                      </span>

                      <span className="text-[11px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-md">
                        {sub.isHomework ? '📝 Ödev Sınavı' : sub.bookTestId ? '📕 Kitap Testi' : '⚡ Bireysel Sınav'}
                      </span>
                    </div>

                    <h3 className="m-0 text-sm sm:text-base font-black text-slate-900 leading-snug line-clamp-2">
                      {sub.testTitle || 'Ödev / Sınav Değerlendirmesi'}
                    </h3>

                    <div className="flex items-center gap-3 text-xs font-bold text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                      </span>
                      {sub.totalQuestions > 0 && (
                        <span className="flex items-center gap-1">
                          <Layers size={13} /> {sub.totalQuestions} Soru
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <div>
                      {isPending ? (
                        <span className="bg-amber-50 text-amber-800 border border-amber-300 text-xs font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                          <Clock3 size={13} /> Bekliyor
                        </span>
                      ) : sub.type === 'physicalExam' ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-indigo-700">{score} Net</span>
                          <span className="text-[10px] font-extrabold text-indigo-500">Toplam Net</span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-black text-emerald-600">%{score}</span>
                          <span className="text-[10px] font-extrabold text-emerald-500">Başarı Oranı</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        if (sub.type === 'physicalExam') {
                          navigate(`/physical-exam/${sub.hwId || sub.testId}?studentId=${selectedStudent.id}`);
                        } else {
                          navigate(`/review/${sub.id}`);
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white border-none px-3.5 py-1.5 rounded-xl font-black text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Eye size={14} /> {sub.type === 'physicalExam' ? 'Karne & Önizle' : 'Soruları İncele'}
                    </button>
                  </div>

                </div>
              );
            })}

            {filteredSubmissions.length === 0 && (
              <div className="col-span-full bg-white p-8 sm:p-12 rounded-2xl border border-slate-200 text-center">
                <ListTree size={48} className="text-slate-300 mx-auto mb-2" />
                <h3 className="m-0 font-black text-slate-800 text-sm sm:text-base">Aramanıza Uygun Sonuç Bulunamadı</h3>
                <p className="m-0 text-xs text-slate-500 mt-1">Filtreleri değiştirmeyi veya arama kelimenizi güncellemeyi deneyebilirsiniz.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
