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
  'Genel Deneme Sınavları': { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', icon: Trophy },
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
    const baseSubs = (submissions || []).filter(s => s.studentId === selectedStudent.id);

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
          subjectKey = 'Genel Deneme Sınavları';
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
          else if (tTitle.includes('deneme')) subjectKey = 'Genel Deneme Sınavları';
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

  // Statistics calculation
  const stats = useMemo(() => {
    const total = studentSubmissions.length;
    if (total === 0) return { total: 0, avgScore: 0, maxScore: 0, completedCount: 0 };
    
    let sumScore = 0;
    let max = 0;
    let completedCount = 0;

    studentSubmissions.forEach(s => {
      const sc = s.score || 0;
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
        başarı: s.score || 0,
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
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '1.75rem', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/student')}
              style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.6rem 0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, color: '#334155', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}
            >
              <ArrowLeft size={18} /> Öğrenci Paneli
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ListTree color="#4f46e5" size={28} /> Sınav & Test Sonuçlarım
              </h1>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                Zaman içindeki başarı trendinizi ve Excel tablosu detayında tüm sınav karnelerinizi inceleyin.
              </p>
            </div>
          </div>

          {/* Student Selector Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.35rem 0.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 5px rgba(0,0,0,0.03)' }}>
            {studentMembers.map(s => {
              const active = selectedStudent?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: active ? '#4f46e5' : 'transparent',
                    color: active ? 'white' : '#64748b',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <GraduationCap size={16} />
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ANALYTICS STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.15rem', marginBottom: '1.75rem' }}>
          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{stats.total}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginTop: '0.35rem' }}>Çözülen Toplam Test</div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>%{stats.avgScore}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginTop: '0.35rem' }}>Ortalama Başarı Oranı</div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#b45309', lineHeight: 1 }}>%{stats.maxScore}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginTop: '0.35rem' }}>En Yüksek Puan</div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '1.25rem', padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#334155', lineHeight: 1 }}>{stats.completedCount}</div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b', marginTop: '0.35rem' }}>Değerlendirilen Sınav</div>
            </div>
          </div>
        </div>

        {/* PERFORMANCE & TREND CHARTS SECTION */}
        <div style={{ background: 'white', borderRadius: '1.5rem', border: '1.5px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '1.75rem' }}>
          
          {/* Chart Section Header & Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', pb: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={22} color="#4f46e5" /> Performans Trendi ve Konu Analizi
              </h2>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Dersler ve konular genelinde gelişim grafiğinizi inceleyin.
              </p>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '0.85rem' }}>
              <button
                onClick={() => setChartTab('trend')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  background: chartTab === 'trend' ? '#4f46e5' : 'transparent',
                  color: chartTab === 'trend' ? 'white' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <TrendingUp size={15} /> 📈 Zaman Trendi
              </button>

              <button
                onClick={() => setChartTab('subjectBar')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  background: chartTab === 'subjectBar' ? '#4f46e5' : 'transparent',
                  color: chartTab === 'subjectBar' ? 'white' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <BarChart3 size={15} /> 📊 Ders Karşılaştırması
              </button>

              <button
                onClick={() => setChartTab('topicBreakdown')}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  background: chartTab === 'topicBreakdown' ? '#4f46e5' : 'transparent',
                  color: chartTab === 'topicBreakdown' ? 'white' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Target size={15} /> 🎯 Konu Bazlı Analiz
              </button>
            </div>
          </div>

          {/* TAB 1: ZAMAN İÇİNDEKİ BAŞARI TRENDİ (CHRONOLOGICAL AREA CHART) */}
          {chartTab === 'trend' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                  Zaman İçindeki Puan Değişimi (% Başarı):
                </span>
                
                <select
                  value={chartSubjectFilter}
                  onChange={e => setChartSubjectFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}
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
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '0.78rem', fontWeight: 700 }} />
                      <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.78rem', fontWeight: 700 }} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Target Goal (%70)', fill: '#10b981', fontSize: 12, fontWeight: 800 }} />
                      <Area type="monotone" dataKey="başarı" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#scoreColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
                  Bu derse ait henüz sınav kaydı bulunmuyor.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DERS BAZLI BAŞARI KARŞILAŞTIRMASI (BAR CHART) */}
          {chartTab === 'subjectBar' && (
            <div>
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                Derslere Göre Ortalama Başarı Oranı (%):
              </div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectBarData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ders" stroke="#64748b" style={{ fontSize: '0.8rem', fontWeight: 800 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.78rem', fontWeight: 700 }} />
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
              <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 800, color: '#334155' }}>
                Konu Bazlı Soru Sayıları ve Doğruluk Başarısı:
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.8rem' }}>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 900 }}>KONU / SINAV BAŞLIĞI</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 900 }}>DERS</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 900 }}>ÇÖZÜLEN SORU</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 900 }}>DOĞRULUK ORANI</th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 900 }}>DURUM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicAnalysisData.map((t, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: '#0f172a' }}>{t.topic}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#64748b' }}>{t.subject}</td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800 }}>{t.totalQ} Soru</td>
                        <td style={{ padding: '0.85rem 1rem', width: '220px' }}>
                          <div style={{ display: 'flex', items: 'center', gap: '0.6rem' }}>
                            <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${t.accuracy}%`, background: t.accuracy >= 85 ? '#4f46e5' : t.accuracy >= 70 ? '#10b981' : '#ef4444', borderRadius: '4px' }} />
                            </div>
                            <span style={{ fontWeight: 900, fontSize: '0.85rem', color: '#334155' }}>%{t.accuracy}</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ background: t.statusBg, color: t.statusColor, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.78rem' }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {topicAnalysisData.length === 0 && (
                      <tr>
                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
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
        <div style={{ background: 'white', padding: '1.15rem 1.35rem', borderRadius: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          
          {/* Live Search Input */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Sınav adı veya ders ara..."
              style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.5rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 600, outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            {/* Subject Filter */}
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#334155', background: 'white', cursor: 'pointer' }}
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
              style={{ padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#334155', background: 'white', cursor: 'pointer' }}
            >
              <option value="all">Tüm Sınav Türleri</option>
              <option value="homework">📝 Ödev Sınavları</option>
              <option value="individual">⚡ Bireysel Sınavlar</option>
              <option value="book">📕 Kitap Testleri</option>
            </select>

            {/* View Switcher: Table vs Cards */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '0.85rem' }}>
              <button
                onClick={() => setViewMode('table')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  background: viewMode === 'table' ? '#4f46e5' : 'transparent',
                  color: viewMode === 'table' ? 'white' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Table size={15} /> 📊 Excel Tablosu
              </button>

              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.65rem',
                  border: 'none',
                  background: viewMode === 'cards' ? '#4f46e5' : 'transparent',
                  color: viewMode === 'cards' ? 'white' : '#64748b',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <List size={15} /> 📑 Kart Görünümü
              </button>
            </div>

          </div>

        </div>

        {/* RESULTS MODE 1: EXCEL SINGLE-ROW TABLE VIEW */}
        {viewMode === 'table' && (
          <div style={{ background: 'white', borderRadius: '1.25rem', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', fontSize: '0.82rem', color: '#334155' }}>
                  <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>SINAV / ÖDEV BAŞLIĞI</th>
                  <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>DERS</th>
                  <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>TARİH</th>
                  <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>TÜR</th>
                  <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>SONUÇ DETAYI</th>
                  <th style={{ padding: '1rem 1.15rem', fontWeight: 900 }}>BAŞARI PUANI</th>
                  <th style={{ padding: '1rem 1.15rem', textAlign: 'right', fontWeight: 900 }}>EYLEM</th>
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
                    <tr key={sub.id || idx} style={{ borderBottom: '1px solid #e2e8f0', background: isZebra ? '#f8fafc' : 'white', transition: 'background 0.15s' }}>
                      
                      {/* Title */}
                      <td style={{ padding: '0.9rem 1.15rem' }}>
                        <div style={{ fontWeight: 900, color: '#0f172a', fontSize: '0.95rem' }}>
                          {sub.testTitle || 'Ödev / Sınav Değerlendirmesi'}
                        </div>
                      </td>

                      {/* Subject */}
                      <td style={{ padding: '0.9rem 1.15rem' }}>
                        <span style={{ background: theme.bg, color: theme.color, border: `1px solid ${theme.border}`, fontSize: '0.78rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <SubjectIcon size={13} /> {sub.subjectKey}
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.9rem 1.15rem', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', whitespace: 'nowrap' }}>
                        {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                      </td>

                      {/* Type */}
                      <td style={{ padding: '0.9rem 1.15rem', whitespace: 'nowrap' }}>
                        <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                          {sub.type === 'physicalExam' ? '🏛️ Fiziki Deneme' : sub.isHomework ? '📝 Ödev' : sub.bookTestId ? '📕 Kitap' : '⚡ Bireysel'}
                        </span>
                      </td>

                      {/* Result Details Pill Badges */}
                      <td style={{ padding: '0.9rem 1.15rem', whitespace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #86efac', fontSize: '0.78rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '0.45rem' }}>
                            ✓ {sub.correctCount}
                          </span>
                          <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5', fontSize: '0.78rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '0.45rem' }}>
                            ❌ {sub.wrongCount}
                          </span>
                          <span style={{ background: '#ffffff', color: '#475569', border: '1px solid #cbd5e1', fontSize: '0.78rem', fontWeight: 900, padding: '0.2rem 0.55rem', borderRadius: '0.45rem' }}>
                            ⚪ {sub.blankCount}
                          </span>
                        </div>
                      </td>

                      {/* Score Badge */}
                      <td style={{ padding: '0.9rem 1.15rem', whitespace: 'nowrap' }}>
                        {isPending ? (
                          <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.78rem', fontWeight: 900, padding: '0.25rem 0.65rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Clock3 size={13} /> Değerlendirmede
                          </span>
                        ) : sub.type === 'physicalExam' ? (
                          <span style={{ background: '#e0e7ff', color: '#4338ca', border: '1.5px solid #c7d2fe', fontSize: '0.88rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            {score} Net
                          </span>
                        ) : (
                          <span style={{ background: '#ecfdf5', color: '#047857', border: '1.5px solid #a7f3d0', fontSize: '0.9rem', fontWeight: 900, padding: '0.25rem 0.75rem', borderRadius: '0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                            %{score}
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: '0.9rem 1.15rem', textAlign: 'right', whitespace: 'nowrap' }}>
                        <button
                          onClick={() => {
                            if (sub.type === 'physicalExam') {
                              navigate(`/physical-exam/${sub.hwId || sub.testId}?studentId=${selectedStudent.id}`);
                            } else {
                              navigate(`/review/${sub.id}`);
                            }
                          }}
                          style={{
                            background: '#4f46e5',
                            color: 'white',
                            border: 'none',
                            padding: '0.45rem 0.9rem',
                            borderRadius: '0.65rem',
                            fontWeight: 900,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 6px rgba(79,70,229,0.25)'
                          }}
                        >
                          <Eye size={14} /> {sub.type === 'physicalExam' ? 'Karne & Optik Önizle' : 'Soruları İncele'}
                        </button>
                      </td>

                    </tr>
                  );
                })}

                {filteredSubmissions.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b', background: 'white' }}>
                      <ListTree size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                      <h4 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#334155' }}>Bu Filtrelerde Sonuç Bulunmuyor</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>Filtreleri veya arama kelimenizi değiştirebilirsiniz.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* RESULTS MODE 2: CARDS GRID VIEW */}
        {viewMode === 'cards' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.25rem' }}>
            {filteredSubmissions.map((sub, idx) => {
              const isPending = sub.status === 'pending_evaluation';
              const score = sub.score || 0;
              const theme = subjectThemes[sub.subjectKey] || subjectThemes['Diğer'];
              const SubjectIcon = theme.icon;

              return (
                <div
                  key={sub.id || idx}
                  style={{
                    background: 'white',
                    borderRadius: '1.25rem',
                    padding: '1.35rem',
                    border: '1.5px solid #e2e8f0',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: theme.color }} />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ background: theme.bg, color: theme.color, border: `1px solid ${theme.border}`, fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <SubjectIcon size={14} /> {sub.subjectKey}
                      </span>

                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', color: '#475569', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '0.5rem' }}>
                        {sub.isHomework ? '📝 Ödev Sınavı' : sub.bookTestId ? '📕 Kitap Testi' : '⚡ Bireysel Sınav'}
                      </span>
                    </div>

                    <h3 style={{ margin: '0.35rem 0', fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.35 }}>
                      {sub.testTitle || 'Ödev / Sınav Değerlendirmesi'}
                    </h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginTop: '0.5rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={14} /> {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('tr-TR') : 'Bugün'}
                      </span>
                      {sub.totalQuestions > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Layers size={14} /> {sub.totalQuestions} Soru
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '1px solid #f1f5f9', marginTop: '0.35rem' }}>
                    <div>
                      {isPending ? (
                        <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.75rem', fontWeight: 900, padding: '0.3rem 0.65rem', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock3 size={13} /> Değerlendirme Bekliyor
                        </span>
                      ) : sub.type === 'physicalExam' ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4338ca' }}>{score} Net</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6366f1' }}>Toplam Net</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#059669' }}>%{score}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>Başarı Puanı</span>
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
                      style={{
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        padding: '0.55rem 1.15rem',
                        borderRadius: '0.75rem',
                        fontWeight: 900,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 4px 10px rgba(79,70,229,0.25)',
                        marginLeft: 'auto'
                      }}
                    >
                      <Eye size={16} /> {sub.type === 'physicalExam' ? 'Karne & Önizle' : 'Soruları İncele'}
                    </button>
                  </div>

                </div>
              );
            })}

            {filteredSubmissions.length === 0 && (
              <div style={{ gridColumn: '1 / -1', background: 'white', padding: '4rem 2rem', borderRadius: '1.25rem', border: '1.5px solid #e2e8f0', textAlign: 'center' }}>
                <ListTree size={56} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: '#1e293b' }}>Aramanıza Uygun Sonuç Bulunamadı</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Filtreleri değiştirmeyi veya arama kelimenizi güncellemeyi deneyebilirsiniz.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
