import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Trophy, Target, TrendingUp, BarChart3, 
  Layers, ChevronRight, Check, X, Circle, User, Sparkles,
  BookOpen, Calendar, Printer, Award, FileText, CheckCircle2,
  XCircle, HelpCircle, Flame, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';

export default function ExamAnalysisPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const { books } = useTrackedBooks();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { data: curData } = useCurriculum();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'class' | 'students' | 'questions'
  const [selectedStudent, setSelectedStudent] = useState(null);

  const exam = (books || []).find(b => String(b.id) === String(examId));
  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  // Aggregate submissions from both EvaluationContext and HomeworkContext
  const examSubmissions = useMemo(() => {
    const relatedHws = (homeworks || []).filter(h => 
      String(h.bookId) === String(examId) || 
      String(h.testId) === String(examId) ||
      (exam?.title && h.title === exam.title)
    );
    const relatedHwIds = new Set(relatedHws.map(h => String(h.id)));

    // 1. Submissions from EvaluationContext
    const list = (submissions || []).filter(s => 
      relatedHwIds.has(String(s.hwId)) || 
      relatedHwIds.has(String(s.testId)) || 
      String(s.bookId) === String(examId) ||
      (exam?.title && s.testTitle === exam.title)
    );

    // 2. Submissions directly embedded in homework.submissions
    relatedHws.forEach(hw => {
      if (hw.submissions && typeof hw.submissions === 'object') {
        Object.entries(hw.submissions).forEach(([stdId, subData]) => {
          if (subData && subData.completed) {
            const alreadyExists = list.some(s => String(s.studentId) === String(stdId) && String(s.hwId) === String(hw.id));
            if (!alreadyExists) {
              list.push({
                id: `hw_sub_${hw.id}_${stdId}`,
                hwId: hw.id,
                testId: hw.id,
                studentId: stdId,
                score: subData.score ?? subData.totalNet ?? 0,
                correctCount: subData.correctCount ?? 0,
                wrongCount: subData.wrongCount ?? 0,
                blankCount: subData.blankCount ?? subData.emptyCount ?? 0,
                totalQuestions: hw.totalQuestions || exam?.totalQuestions || 90,
                subjectStats: subData.subjectStats || {},
                studentAnswers: subData.studentAnswers || {},
                answers: subData.answers || []
              });
            }
          }
        });
      }
    });

    return list;
  }, [submissions, homeworks, examId, exam]);

  // Calculate comprehensive statistics
  const { 
    totalParticipants, overallAvgScore, maxScore, minScore,
    studentStats, subjectChartData, classChartData, questionAnalysisMap 
  } = useMemo(() => {
    const participantIds = Array.from(new Set(examSubmissions.map(s => String(s.studentId))));
    const tParticipants = participantIds.length;
    
    const stats = participantIds.map(studentId => {
      const sSubmissions = examSubmissions.filter(s => String(s.studentId) === String(studentId));
      const student = students.find(u => String(u.id) === String(studentId));
      
      const tScore = sSubmissions.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
      const aScore = sSubmissions.length ? tScore / sSubmissions.length : 0;
      
      const tCorrect = sSubmissions.reduce((sum, s) => sum + (Number(s.correctCount) || 0), 0);
      const tWrong = sSubmissions.reduce((sum, s) => sum + (Number(s.wrongCount) || 0), 0);
      const tEmpty = sSubmissions.reduce((sum, s) => sum + (Number(s.blankCount || s.emptyCount) || 0), 0);
      
      const rawClassId = student?.classId || student?.gradeId || student?.className;
      const gradeObj = curData?.grades?.find(g => g.id === rawClassId);
      const className = gradeObj ? gradeObj.name : (rawClassId || '8. Sınıf');
      
      // Combine subject breakdowns from submissions
      const combinedSubjectStats = {};
      sSubmissions.forEach(sub => {
        if (sub.subjectStats) {
          if (sub.subjectStats.subjectStats && typeof sub.subjectStats.subjectStats === 'object') {
            Object.entries(sub.subjectStats.subjectStats).forEach(([subjName, sObj]) => {
              combinedSubjectStats[subjName] = sObj;
            });
          } else if (typeof sub.subjectStats === 'object') {
            Object.entries(sub.subjectStats).forEach(([subjName, sObj]) => {
              if (sObj && typeof sObj === 'object') combinedSubjectStats[subjName] = sObj;
            });
          }
        }
      });

      return {
        studentId,
        studentName: student ? `${student.name} ${student.surname || ''}` : (sSubmissions[0]?.studentName || 'Öğrenci'),
        classId: className,
        avgScore: aScore,
        totalScore: tScore,
        totalCorrect: tCorrect,
        totalWrong: tWrong,
        totalEmpty: tEmpty,
        combinedSubjectStats,
        submissions: sSubmissions
      };
    });
    
    stats.sort((a, b) => b.avgScore - a.avgScore);
    
    const oAvgScore = stats.length ? stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length : 0;
    const mScore = stats.length ? Math.max(...stats.map(s => s.avgScore)) : 0;
    const minSc = stats.length ? Math.min(...stats.map(s => s.avgScore)) : 0;
    
    // Subject Averages Breakdown
    const subjMap = {};
    if (exam?.subjects && Array.isArray(exam.subjects)) {
      exam.subjects.forEach(s => {
        subjMap[s.name] = { name: s.name, totalNet: 0, count: 0, questionCount: s.count || 20 };
      });
    }

    stats.forEach(st => {
      Object.entries(st.combinedSubjectStats).forEach(([subjName, sData]) => {
        if (!subjMap[subjName]) {
          subjMap[subjName] = { name: subjName, totalNet: 0, count: 0, questionCount: 20 };
        }
        subjMap[subjName].totalNet += (sData.net || 0);
        subjMap[subjName].count += 1;
      });
    });

    const subjChartData = Object.values(subjMap).map(s => ({
      name: s.name,
      'Ortalama Net': Number((s.count ? s.totalNet / s.count : 0).toFixed(2)),
      'Soru Sayısı': s.questionCount
    }));

    // Class Averages Breakdown
    const cStatsMap = {};
    stats.forEach(s => {
      const cid = s.classId || '8. Sınıf';
      if (!cStatsMap[cid]) cStatsMap[cid] = { classId: cid, total: 0, count: 0 };
      cStatsMap[cid].total += s.avgScore;
      cStatsMap[cid].count += 1;
    });
    const clsChartData = Object.values(cStatsMap).map(c => ({
      name: c.classId,
      'Ortalama Net / Puan': Number((c.total / c.count).toFixed(2))
    }));

    // Question-by-Question item analysis
    const qMap = {};
    if (exam?.subjects && Array.isArray(exam.subjects)) {
      exam.subjects.forEach(subj => {
        qMap[subj.name] = {};
        const count = subj.count || 20;
        const answerKey = subj.answerKey || [];
        for (let i = 1; i <= count; i++) {
          qMap[subj.name][i] = {
            qIndex: i,
            correctAnswer: answerKey[i - 1] || 'A',
            correct: 0,
            wrong: 0,
            empty: 0,
            chosenOptions: { A: 0, B: 0, C: 0, D: 0, E: 0 }
          };
        }
      });
    }

    examSubmissions.forEach(sub => {
      const stdAnswers = sub.studentAnswers || {};
      Object.entries(stdAnswers).forEach(([subjName, answersObj]) => {
        if (!qMap[subjName]) qMap[subjName] = {};
        if (answersObj && typeof answersObj === 'object') {
          Object.entries(answersObj).forEach(([qNumStr, ansVal]) => {
            const qNum = parseInt(qNumStr, 10);
            if (!qMap[subjName][qNum]) {
              qMap[subjName][qNum] = { qIndex: qNum, correctAnswer: '?', correct: 0, wrong: 0, empty: 0, chosenOptions: {} };
            }
            const qEntry = qMap[subjName][qNum];
            const cleanAns = String(ansVal || '').toUpperCase().trim();
            if (!cleanAns) {
              qEntry.empty += 1;
            } else {
              qEntry.chosenOptions[cleanAns] = (qEntry.chosenOptions[cleanAns] || 0) + 1;
              if (qEntry.correctAnswer && cleanAns === qEntry.correctAnswer) {
                qEntry.correct += 1;
              } else {
                qEntry.wrong += 1;
              }
            }
          });
        }
      });
    });

    return {
      totalParticipants: tParticipants,
      overallAvgScore: oAvgScore,
      maxScore: mScore,
      minScore: minSc,
      studentStats: stats,
      subjectChartData: subjChartData,
      classChartData: clsChartData,
      questionAnalysisMap: qMap
    };
  }, [examSubmissions, students, curData, exam]);

  const tabs = [
    { id: 'overview', label: 'Genel Durum & Netler', icon: BarChart3 },
    { id: 'class', label: 'Sınıf Analizi', icon: Layers },
    { id: 'students', label: 'Öğrenci Sıralaması & Karne', icon: Trophy },
    { id: 'questions', label: 'Soru Madde & Şık Analizi', icon: Target },
  ];

  const PIE_COLORS = ['#10b981', '#ef4444', '#64748b'];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
      margin: 0,
      padding: '1.25rem 1.5rem 5rem 1.5rem',
      backgroundColor: '#f8fafc',
      backgroundImage: `
        radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%),
        radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%),
        #f8fafc
      `,
      backgroundAttachment: 'fixed',
      color: '#0f172a',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      
      {/* ── TOP HERO HEADER ── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/exams')}
            style={{
              padding: '0.7rem',
              borderRadius: '1rem',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Fiziki Deneme Havuzuna Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {exam ? exam.title : 'Fiziki Deneme Sınavı Analizi'}
              </h1>
              <span style={{ fontSize: '0.74rem', fontWeight: 900, background: '#eff6ff', color: '#1d4ed8', padding: '0.2rem 0.65rem', borderRadius: '1rem', border: '1px solid #bfdbfe' }}>
                {exam?.targetClass || '8. Sınıf LGS'} • {exam?.totalQuestions || 90} Soru
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: '#64748b', fontSize: '0.88rem', fontWeight: 600 }}>
              Sınava katılan öğrencilerin ders bazlı netleri, optik form cevap dağılımı ve soru zorluk analizi 📊
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '0.75rem',
              background: '#f0f9ff',
              border: '1.5px solid #bae6fd',
              color: '#0284c7',
              fontWeight: 800,
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={16} /> Raporu Yazdır / PDF
          </button>
        </div>

      </div>

      {/* ── 4 LIVE KPI HERO CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        
        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.15rem', padding: '1.25rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: '#eff6ff', color: '#6366f1', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{totalParticipants}</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '0.2rem' }}>Toplam Katılımcı</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.15rem', padding: '1.25rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{overallAvgScore.toFixed(1)} Net</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '0.2rem' }}>Genel Sınıf Ortalaması</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.15rem', padding: '1.25rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#d97706', lineHeight: 1.1 }}>{maxScore.toFixed(1)} Net</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '0.2rem' }}>En Yüksek Net (Zirve)</div>
          </div>
        </div>

        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.15rem', padding: '1.25rem 1.4rem', display: 'flex', alignItems: 'center', gap: '1.15rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '1rem', background: '#fdf2f8', color: '#db2777', border: '1px solid #fbcfe8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={26} />
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', lineHeight: 1.1 }}>{exam?.subjects?.length || 6} Ders</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginTop: '0.2rem' }}>Sınav Kapsamı</div>
          </div>
        </div>

      </div>

      {/* ── VIEW TAB SELECTOR ── */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '1rem',
        padding: '0.35rem',
        display: 'inline-flex',
        gap: '0.35rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'none',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: 800,
                fontSize: '0.86rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                transition: 'all 0.15s',
                boxShadow: isActive ? '0 4px 14px rgba(99,102,241,0.25)' : 'none'
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* ══ TAB 1: OVERVIEW & SUBJECT NETS ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Subject Net Averages Bar Chart */}
            <div style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '1.25rem',
              padding: '1.75rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={22} style={{ color: '#6366f1' }} /> Ders Bazında Sınıf Net Ortalamaları
              </h3>
              
              <div style={{ height: '320px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                      contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 800, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="Ortalama Net" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Subject Breakdown Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
              {subjectChartData.map((subj, sIdx) => (
                <div key={sIdx} style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '1rem',
                  padding: '1.15rem 1.35rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: '#0f172a' }}>{subj.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.2rem' }}>Toplam {subj['Soru Sayısı']} Soru</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>{subj['Ortalama Net']}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Ort. Net</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ══ TAB 2: CLASS BREAKDOWN ══ */}
        {activeTab === 'class' && (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '1.25rem',
            padding: '1.75rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={22} style={{ color: '#0284c7' }} /> Sınıflara Göre Başarı Dağılımı
            </h3>
            
            {classChartData.length > 0 ? (
              <div style={{ height: '340px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 700 }} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                      contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#0f172a', fontWeight: 800, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="Ortalama Net / Puan" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={70} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Sınıf verisi bulunamadı.</div>
            )}
          </div>
        )}

        {/* ══ TAB 3: STUDENT LEADERBOARD & REPORT CARD ══ */}
        {activeTab === 'students' && (
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={22} style={{ color: '#d97706' }} /> Öğrenci Sıralaması &amp; Bireysel Karneler
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#1e40af', background: '#eff6ff', padding: '0.2rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, border: '1px solid #bfdbfe' }}>
                {studentStats.length} Katılımcı
              </span>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#0f172a' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', width: '60px', color: '#475569' }}>Sıra</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569' }}>Öğrenci</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569' }}>Sınıf</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#16a34a' }}>Doğru</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#dc2626' }}>Yanlış</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#64748b' }}>Boş</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#0284c7' }}>Toplam Net</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#475569' }}>Karne</th>
                  </tr>
                </thead>
                <tbody>
                  {studentStats.map((std, idx) => (
                    <tr
                      key={std.studentId}
                      onClick={() => setSelectedStudent(std)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: idx === 0 ? '#fffbeb' : idx % 2 === 0 ? '#f8fafc' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 900, fontSize: '0.88rem', color: idx === 0 ? '#d97706' : idx === 1 ? '#475569' : idx === 2 ? '#ea580c' : '#94a3b8' }}>
                        #{idx + 1}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>
                        {std.studentName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#64748b' }}>
                        {std.classId}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: '#16a34a' }}>
                        {std.totalCorrect}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: '#dc2626' }}>
                        {std.totalWrong}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: '#64748b' }}>
                        {std.totalEmpty}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#0284c7' }}>
                        {std.avgScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStudent(std); }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.5rem',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            fontWeight: 800,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <FileText size={13} /> Karnesi ↗
                        </button>
                      </td>
                    </tr>
                  ))}

                  {studentStats.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        Bu sınav için henüz öğrenci teslim kaydı bulunmuyor.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB 4: QUESTION BY QUESTION ITEM ANALYSIS ══ */}
        {activeTab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.keys(questionAnalysisMap).length > 0 ? (
              Object.entries(questionAnalysisMap).map(([subjectName, qData]) => {
                const sortedQuestions = Object.values(qData).sort((a, b) => a.qIndex - b.qIndex);

                return (
                  <div key={subjectName} style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                      <Target size={20} style={{ color: '#6366f1' }} /> {subjectName} ({sortedQuestions.length} Soru)
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {sortedQuestions.map(q => {
                        const total = q.correct + q.wrong + q.empty;
                        const correctPct = total > 0 ? (q.correct / total) * 100 : 0;
                        const wrongPct = total > 0 ? (q.wrong / total) * 100 : 0;
                        const emptyPct = total > 0 ? (q.empty / total) * 100 : 0;
                        const isHard = correctPct < 35 && total > 0;

                        return (
                          <div
                            key={q.qIndex}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.65rem 0.95rem',
                              borderRadius: '0.75rem',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              flexWrap: 'wrap',
                              gap: '0.65rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '130px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: isHard ? '#fef2f2' : '#eff6ff', border: `1px solid ${isHard ? '#fecaca' : '#bfdbfe'}`, color: isHard ? '#dc2626' : '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                                {q.qIndex}
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#0f172a' }}>Soru {q.qIndex}</span>
                                <span style={{ fontSize: '0.68rem', color: '#d97706', display: 'block', fontWeight: 800 }}>Cevap: {q.correctAnswer}</span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ flex: 1, minWidth: '160px', height: '10px', background: '#e2e8f0', borderRadius: '1rem', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${correctPct}%`, background: '#10b981' }} title={`Doğru: %${Math.round(correctPct)}`} />
                              <div style={{ width: `${wrongPct}%`, background: '#ef4444' }} title={`Yanlış: %${Math.round(wrongPct)}`} />
                              <div style={{ width: `${emptyPct}%`, background: '#cbd5e1' }} title={`Boş: %${Math.round(emptyPct)}`} />
                            </div>

                            {/* Stat Badges */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', fontWeight: 800 }}>
                              <span style={{ color: '#16a34a', background: '#f0fdf4', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: '1px solid #bbf7d0' }}>
                                ✓ {q.correct} (%{Math.round(correctPct)})
                              </span>
                              <span style={{ color: '#dc2626', background: '#fef2f2', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: '1px solid #fecaca' }}>
                                ✗ {q.wrong} (%{Math.round(wrongPct)})
                              </span>
                              <span style={{ color: '#475569', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: '1px solid #e2e8f0' }}>
                                ○ {q.empty}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                Bu sınav için henüz soru madde analizi verisi oluşturulmadı.
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL: ÖĞRENCİ BİREYSEL KARNESİ & OPTİK CEVAP DAĞILIMI ── */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '780px', maxHeight: '90vh', borderRadius: '1.5rem', background: '#ffffff', border: '1.5px solid #e2e8f0', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', color: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                  <User size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {selectedStudent.studentName}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                    {selectedStudent.classId} • {exam ? exam.title : 'Fiziki Deneme Sınavı'} Karnesi
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem 1.6rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#16a34a' }}>{selectedStudent.totalCorrect}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>Doğru</div>
                </div>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>{selectedStudent.totalWrong}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Yanlış</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#475569' }}>{selectedStudent.totalEmpty}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Boş</div>
                </div>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>{selectedStudent.avgScore.toFixed(2)}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>Toplam Net</div>
                </div>
              </div>

              {/* Subject Breakdown */}
              {Object.keys(selectedStudent.combinedSubjectStats).length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.95rem', fontWeight: 900, color: '#0f172a' }}>
                    Ders Bazlı Net Dağılımı
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                    {Object.entries(selectedStudent.combinedSubjectStats).map(([subjName, sObj]) => (
                      <div key={subjName} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0f172a' }}>{subjName}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 800 }}>
                          <span style={{ color: '#16a34a' }}>{sObj.correct || 0}D</span>
                          <span style={{ color: '#dc2626' }}>{sObj.wrong || 0}Y</span>
                          <span style={{ color: '#64748b' }}>{sObj.blank || 0}B</span>
                          <span style={{ color: '#0284c7', fontWeight: 900 }}>{sObj.net?.toFixed(2) || 0} Net</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Kapat
              </button>
              <button
                onClick={() => window.print()}
                style={{ padding: '0.6rem 1.4rem', borderRadius: '0.6rem', background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: 'none', color: '#ffffff', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Printer size={15} /> Yazdır / PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
