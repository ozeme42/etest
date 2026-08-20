import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, Trophy, Target, TrendingUp, BarChart3, 
  Layers, ChevronRight, Check, X, Circle, User, Sparkles,
  BookOpen, Calendar, Printer, Award, FileText, CheckCircle2,
  XCircle, HelpCircle, Flame, Zap, Search, Filter, RefreshCw,
  SlidersHorizontal, ArrowUpRight, ArrowDownRight, Compass,
  ShieldCheck, PieChart as PieIcon, Activity, Key, ChevronDown
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useAuth } from '../context/AuthContext';

const PIE_COLORS = ['#10b981', '#ef4444', '#94a3b8', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4'];

export default function ExamAnalysisPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const { books, bookTests } = useTrackedBooks();
  const { submissions } = useEvaluation();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { data: curData } = useCurriculum();
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'class' | 'students' | 'questions'
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedScoreFilter, setSelectedScoreFilter] = useState('ALL');
  const [selectedFormatFilter, setSelectedFormatFilter] = useState('ALL');

  const students = useMemo(() => (users || []).filter(u => u.role === 'student'), [users]);

  // 1. Build List of All Physical Exams in System
  const allExamsList = useMemo(() => {
    let filteredBooks = (books || []).filter(b => b.bookType === 'exam');
    if (currentUser?.role === 'teacher' && currentUser?.id) {
      filteredBooks = filteredBooks.filter(b => 
        b.createdBy === currentUser.id || 
        b.teacherId === currentUser.id
      );
    }

    const list = filteredBooks.map(b => {
      const testsForBook = (bookTests || []).filter(t => t.bookId === b.id);
      const builtAnswerKey = {};
      const subjectArray = [];
      testsForBook.forEach(t => {
        const subDef = b.subjects?.find(s => s.id === t.subjectId);
        const subName = subDef ? subDef.name : t.name.replace(' Testi', '');
        builtAnswerKey[subName] = [];
        if (t.answerKey) {
          for (let i = 1; i <= (t.questionCount || 15); i++) {
            builtAnswerKey[subName].push(t.answerKey[i] || '');
          }
        }
        subjectArray.push({ name: subName, count: t.questionCount || 15, testId: t.id });
      });
      return {
        ...b,
        answerKey: builtAnswerKey,
        subjects: subjectArray.length > 0 ? subjectArray : (b.subjects || []),
        totalQuestions: subjectArray.reduce((acc, curr) => acc + (curr.count || 0), 0) || b.totalQuestions || 30
      };
    });

    // Also include physical exam homeworks that might not be in books
    (homeworks || []).forEach(hw => {
      if ((hw.type === 'physicalExam' || hw.isPhysicalExam) && !list.some(x => String(x.id) === String(hw.id) || String(x.id) === String(hw.bookId))) {
        list.push({
          ...hw,
          id: hw.id,
          title: hw.title,
          subjects: hw.subjects || [],
          totalQuestions: hw.totalQuestions || 30,
          publisher: hw.examType || 'LGS'
        });
      }
    });

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [books, bookTests, homeworks, currentUser]);

  const isAllExams = !examId || examId === 'all';

  // 2. Resolve Target Exam (or All-Exams Combined Virtual Exam)
  const resolvedExam = useMemo(() => {
    if (isAllExams) {
      const subNameMap = {};
      const combinedSubjects = [];
      allExamsList.forEach(e => {
        (e.subjects || []).forEach(s => {
          if (!subNameMap[s.name]) {
            subNameMap[s.name] = { name: s.name, count: s.count || 15 };
            combinedSubjects.push(subNameMap[s.name]);
          }
        });
      });

      if (combinedSubjects.length === 0) {
        combinedSubjects.push(
          { name: 'Türkçe', count: 20 },
          { name: 'Matematik', count: 20 },
          { name: 'Fen Bilimleri', count: 20 },
          { name: 'Sosyal Bilgiler', count: 10 }
        );
      }

      return {
        id: 'all',
        title: '🌟 Tüm Denemelerin Toplam Analizi & Karneler',
        targetClass: 'Tüm Sınavlar ve Sınıflar',
        subjects: combinedSubjects,
        totalQuestions: combinedSubjects.reduce((acc, s) => acc + (s.count || 0), 0),
        penaltyRatio: 3,
        isAllExams: true
      };
    }

    let b = (books || []).find(x => String(x.id) === String(examId));
    const hw = (homeworks || []).find(h => String(h.id) === String(examId) || String(h.bookId) === String(examId));

    if (!b && hw?.bookId) {
      b = (books || []).find(x => String(x.id) === String(hw.bookId));
    }

    const builtAnswerKey = { ...(hw?.answerKey || {}), ...(b?.answerKey || {}) };
    const subjectMap = {};

    if (hw?.subjects && Array.isArray(hw.subjects)) {
      hw.subjects.forEach(s => {
        if (s && s.name) {
          subjectMap[s.name] = {
            name: s.name,
            count: Number(s.count || 15),
            testId: s.testId || s.id,
            answerKey: builtAnswerKey[s.name] || s.answerKey || []
          };
        }
      });
    }

    if (b?.subjects && Array.isArray(b.subjects)) {
      b.subjects.forEach(s => {
        if (s && s.name && !subjectMap[s.name]) {
          subjectMap[s.name] = {
            name: s.name,
            count: Number(s.count || 15),
            testId: s.testId || s.id,
            answerKey: builtAnswerKey[s.name] || s.answerKey || []
          };
        }
      });
    }

    if (b) {
      const testsForBook = (bookTests || []).filter(t => String(t.bookId) === String(b.id));
      testsForBook.forEach(t => {
        const subDef = b.subjects?.find(s => String(s.id) === String(t.subjectId));
        const subName = subDef ? subDef.name : t.name.replace(' Testi', '');

        const aKeyList = [];
        if (t.answerKey) {
          if (Array.isArray(t.answerKey)) {
            aKeyList.push(...t.answerKey);
          } else if (typeof t.answerKey === 'object') {
            for (let i = 1; i <= (t.questionCount || 15); i++) {
              aKeyList.push(t.answerKey[i] || t.answerKey[String(i)] || '');
            }
          }
        }
        if (aKeyList.length > 0) builtAnswerKey[subName] = aKeyList;

        subjectMap[subName] = {
          name: subName,
          count: Number(t.questionCount || aKeyList.length || subjectMap[subName]?.count || 15),
          testId: t.id,
          answerKey: builtAnswerKey[subName] || aKeyList
        };
      });
    }

    const finalSubjects = Object.values(subjectMap);

    if (b || hw) {
      const target = b || hw;
      return {
        ...target,
        id: b?.id || hw?.id || examId,
        title: target.title || 'Fiziki Deneme',
        answerKey: builtAnswerKey,
        subjects: finalSubjects.length > 0 ? finalSubjects : (target.subjects || []),
        totalQuestions: finalSubjects.length > 0
          ? finalSubjects.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0)
          : (target.totalQuestions || 30),
        penaltyRatio: target.penaltyRatio !== undefined ? target.penaltyRatio : 3,
        isAllExams: false
      };
    }

    return null;
  }, [books, bookTests, homeworks, examId, isAllExams, allExamsList]);

  // 3. Aggregate Submissions for Target Scope
  const examSubmissions = useMemo(() => {
    const list = [];
    const relatedHwIds = new Set();

    if (!isAllExams) {
      const relatedHws = (homeworks || []).filter(h => 
        String(h.id) === String(examId) ||
        String(h.bookId) === String(examId) || 
        String(h.testId) === String(examId) ||
        (resolvedExam?.title && h.title === resolvedExam.title) ||
        (resolvedExam?.id && String(h.bookId) === String(resolvedExam.id))
      );
      relatedHws.forEach(h => relatedHwIds.add(String(h.id)));
      if (examId) relatedHwIds.add(String(examId));
      if (resolvedExam?.id) relatedHwIds.add(String(resolvedExam.id));

      relatedHws.forEach(hw => {
        const hwSubList = Array.isArray(hw.submissions)
          ? hw.submissions
          : (hw.submissions && typeof hw.submissions === 'object' ? Object.values(hw.submissions) : []);

        hwSubList.forEach(subData => {
          if (subData && (subData.studentId || subData.completed || subData.score !== undefined)) {
            const stdId = String(subData.studentId || subData.id);
            list.push({
              id: `hw_sub_${hw.id}_${stdId}`,
              hwId: hw.id,
              testId: hw.id,
              examTitle: hw.title || 'Fiziki Deneme',
              examDate: hw.createdAt || hw.dueDate || new Date().toISOString(),
              studentId: stdId,
              score: subData.score ?? subData.subjectStats?.totalNet ?? 0,
              correctCount: subData.correctCount ?? subData.subjectStats?.totalCorrect ?? 0,
              wrongCount: subData.wrongCount ?? subData.subjectStats?.totalWrong ?? 0,
              blankCount: subData.blankCount ?? subData.subjectStats?.totalBlank ?? subData.emptyCount ?? 0,
              totalQuestions: hw.totalQuestions || resolvedExam?.totalQuestions || 30,
              subjectStats: subData.subjectStats || {},
              studentAnswers: subData.studentAnswers || {},
              mistakeReasons: subData.mistakeReasons || {},
              answers: subData.answers || []
            });
          }
        });
      });

      (submissions || []).forEach(s => {
        const match = 
          relatedHwIds.has(String(s.hwId)) || 
          relatedHwIds.has(String(s.testId)) || 
          String(s.bookId) === String(examId) ||
          (resolvedExam?.id && String(s.bookId) === String(resolvedExam.id)) ||
          (resolvedExam?.title && s.testTitle === resolvedExam.title);

        if (match) {
          const stdId = String(s.studentId);
          const existing = list.find(x => String(x.studentId) === stdId);
          if (existing) {
            if (s.studentAnswers && Object.keys(s.studentAnswers).length > 0) {
              existing.studentAnswers = { ...existing.studentAnswers, ...s.studentAnswers };
            }
            if (s.subjectStats) existing.subjectStats = s.subjectStats;
            if (s.mistakeReasons) existing.mistakeReasons = s.mistakeReasons;
            if (s.score !== undefined && existing.score === 0) existing.score = s.score;
          } else {
            list.push({ ...s, examTitle: s.testTitle || resolvedExam?.title || 'Fiziki Deneme' });
          }
        }
      });
    } else {
      // ── ALL EXAMS SCOPE ──
      (homeworks || []).forEach(hw => {
        if (hw.type === 'physicalExam' || hw.isPhysicalExam || (hw.subjects && hw.subjects.length > 1)) {
          const hwSubList = Array.isArray(hw.submissions)
            ? hw.submissions
            : (hw.submissions && typeof hw.submissions === 'object' ? Object.values(hw.submissions) : []);

          hwSubList.forEach(subData => {
            if (subData && (subData.studentId || subData.completed || subData.score !== undefined)) {
              const stdId = String(subData.studentId || subData.id);
              list.push({
                id: `hw_sub_${hw.id}_${stdId}`,
                hwId: hw.id,
                testId: hw.id,
                examTitle: hw.title || 'Fiziki Deneme',
                examDate: hw.createdAt || hw.dueDate || new Date().toISOString(),
                studentId: stdId,
                score: subData.score ?? subData.subjectStats?.totalNet ?? 0,
                correctCount: subData.correctCount ?? subData.subjectStats?.totalCorrect ?? 0,
                wrongCount: subData.wrongCount ?? subData.subjectStats?.totalWrong ?? 0,
                blankCount: subData.blankCount ?? subData.subjectStats?.totalBlank ?? subData.emptyCount ?? 0,
                totalQuestions: hw.totalQuestions || 90,
                subjectStats: subData.subjectStats || {},
                studentAnswers: subData.studentAnswers || {},
                mistakeReasons: subData.mistakeReasons || {},
                answers: subData.answers || []
              });
            }
          });
        }
      });

      (submissions || []).forEach(s => {
        if (s.type === 'physicalExam' || s.isPhysicalExam || s.testTitle?.includes('Deneme') || s.testTitle?.includes('LGS') || s.testTitle?.includes('TYT')) {
          const stdId = String(s.studentId);
          const matchExisting = list.find(x => String(x.studentId) === stdId && (String(x.hwId) === String(s.hwId) || String(x.testId) === String(s.testId)));
          if (!matchExisting) {
            list.push({
              ...s,
              examTitle: s.testTitle || 'Fiziki Deneme',
              examDate: s.submittedAt || s.createdAt || new Date().toISOString()
            });
          }
        }
      });
    }

    return list;
  }, [submissions, homeworks, examId, resolvedExam, isAllExams]);

  // 4. Calculate Comprehensive Multi-Exam / Single-Exam Statistics
  const { 
    totalParticipants, overallAvgScore, maxScore, minScore, totalExamsCompleted,
    studentStats, subjectChartData, classChartData, examComparisonChartData,
    mistakeReasonsChartData, scoreDistributionData, questionAnalysisMap 
  } = useMemo(() => {
    const participantIds = Array.from(new Set(examSubmissions.map(s => String(s.studentId))));
    const tParticipants = participantIds.length;
    const tExamsCompleted = examSubmissions.length;
    
    // Per-Student aggregation
    const stats = participantIds.map(studentId => {
      const sSubmissions = examSubmissions.filter(s => String(s.studentId) === String(studentId));
      const student = students.find(u => String(u.id) === String(studentId));
      
      const rawClassId = student?.classId || student?.gradeId || student?.className;
      const gradeObj = curData?.grades?.find(g => g.id === rawClassId);
      const className = gradeObj ? gradeObj.name : (rawClassId || '8. Sınıf');
      
      const combinedSubjectStats = {};
      const studentMistakeReasons = {};
      const studentExamHistory = [];

      sSubmissions.forEach(sub => {
        studentExamHistory.push({
          examTitle: sub.examTitle || 'Fiziki Deneme',
          examDate: sub.examDate || new Date().toISOString(),
          score: Number(sub.score || 0),
          correct: Number(sub.correctCount || 0),
          wrong: Number(sub.wrongCount || 0),
          blank: Number(sub.blankCount || 0),
          subjectStats: sub.subjectStats || {}
        });

        if (sub.mistakeReasons && typeof sub.mistakeReasons === 'object') {
          Object.assign(studentMistakeReasons, sub.mistakeReasons);
        }

        // Direct sub.subjectStats
        let rawStats = sub.subjectStats;
        if (rawStats && rawStats.subjectStats) rawStats = rawStats.subjectStats;

        if (Array.isArray(rawStats) && rawStats.length > 0) {
          rawStats.forEach(sObj => {
            if (sObj && (sObj.name || sObj.subjectName || sObj.title)) {
              const name = sObj.name || sObj.subjectName || sObj.title;
              if (!combinedSubjectStats[name]) {
                combinedSubjectStats[name] = { name, correct: 0, wrong: 0, blank: 0, net: 0, count: sObj.count || 15 };
              }
              combinedSubjectStats[name].correct += Number(sObj.correct || 0);
              combinedSubjectStats[name].wrong += Number(sObj.wrong || 0);
              combinedSubjectStats[name].blank += Number(sObj.blank || sObj.empty || 0);
              combinedSubjectStats[name].net += Number(sObj.net !== undefined ? sObj.net : (sObj.score || 0));
            }
          });
        } else if (rawStats && typeof rawStats === 'object' && Object.keys(rawStats).length > 0) {
          Object.entries(rawStats).forEach(([sName, sObj]) => {
            if (sObj && typeof sObj === 'object') {
              if (!combinedSubjectStats[sName]) {
                combinedSubjectStats[sName] = { name: sName, correct: 0, wrong: 0, blank: 0, net: 0, count: sObj.count || 15 };
              }
              combinedSubjectStats[sName].correct += Number(sObj.correct || 0);
              combinedSubjectStats[sName].wrong += Number(sObj.wrong || 0);
              combinedSubjectStats[sName].blank += Number(sObj.blank || sObj.empty || 0);
              combinedSubjectStats[sName].net += Number(sObj.net !== undefined ? sObj.net : (sObj.score || 0));
            }
          });
        }
      });

      // Calculate averages across taken exams
      const examCount = sSubmissions.length || 1;
      const totalScoreSum = sSubmissions.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
      const totalCorrectSum = sSubmissions.reduce((sum, s) => sum + (Number(s.correctCount) || 0), 0);
      const totalWrongSum = sSubmissions.reduce((sum, s) => sum + (Number(s.wrongCount) || 0), 0);
      const totalEmptySum = sSubmissions.reduce((sum, s) => sum + (Number(s.blankCount || s.emptyCount) || 0), 0);
      
      const maxStudentScore = sSubmissions.length ? Math.max(...sSubmissions.map(s => Number(s.score || 0))) : 0;
      const avgScore = totalScoreSum / examCount;

      // Normalize combinedSubjectStats by examCount
      const normalizedSubStats = {};
      Object.entries(combinedSubjectStats).forEach(([k, v]) => {
        normalizedSubStats[k] = {
          name: v.name,
          correct: Number((v.correct / examCount).toFixed(1)),
          wrong: Number((v.wrong / examCount).toFixed(1)),
          blank: Number((v.blank / examCount).toFixed(1)),
          net: Number((v.net / examCount).toFixed(2)),
          count: v.count
        };
      });

      return {
        studentId,
        studentName: student ? `${student.name} ${student.surname || ''}` : (sSubmissions[0]?.studentName || 'Öğrenci'),
        classId: className,
        examCount,
        avgScore: Number(avgScore.toFixed(2)),
        maxScore: Number(maxStudentScore.toFixed(2)),
        totalScore: totalScoreSum,
        totalCorrect: Number((totalCorrectSum / examCount).toFixed(1)),
        totalWrong: Number((totalWrongSum / examCount).toFixed(1)),
        totalEmpty: Number((totalEmptySum / examCount).toFixed(1)),
        combinedSubjectStats: normalizedSubStats,
        mistakeReasons: studentMistakeReasons,
        examHistory: studentExamHistory,
        submissions: sSubmissions
      };
    });
    
    stats.sort((a, b) => b.avgScore - a.avgScore);
    
    const oAvgScore = stats.length ? stats.reduce((sum, s) => sum + s.avgScore, 0) / stats.length : 0;
    const mScore = stats.length ? Math.max(...stats.map(s => s.maxScore || s.avgScore)) : 0;
    const minSc = stats.length ? Math.min(...stats.map(s => s.avgScore)) : 0;
    
    // Subject Averages Breakdown
    const subjMap = {};
    if (resolvedExam?.subjects && Array.isArray(resolvedExam.subjects)) {
      resolvedExam.subjects.forEach(s => {
        subjMap[s.name] = { name: s.name, totalNet: 0, count: 0, totalCorrect: 0, totalWrong: 0, totalBlank: 0, questionCount: s.count || 15 };
      });
    }

    stats.forEach(st => {
      Object.entries(st.combinedSubjectStats).forEach(([subjName, sData]) => {
        let targetKey = Object.keys(subjMap).find(k => k.toLowerCase().trim() === subjName.toLowerCase().trim());
        if (!targetKey) {
          targetKey = subjName;
          subjMap[targetKey] = { name: subjName, totalNet: 0, count: 0, totalCorrect: 0, totalWrong: 0, totalBlank: 0, questionCount: sData.count || 15 };
        }
        subjMap[targetKey].totalNet += Number(sData.net || 0);
        subjMap[targetKey].totalCorrect += Number(sData.correct || 0);
        subjMap[targetKey].totalWrong += Number(sData.wrong || 0);
        subjMap[targetKey].totalBlank += Number(sData.blank || 0);
        subjMap[targetKey].count += 1;
      });
    });

    const subjChartData = Object.values(subjMap).map(s => {
      const avgNet = s.count ? s.totalNet / s.count : 0;
      return {
        name: s.name,
        'Ortalama Net': Number(avgNet.toFixed(2)),
        'Soru Sayısı': s.questionCount,
        avgCorrect: Number((s.count ? s.totalCorrect / s.count : 0).toFixed(1)),
        avgWrong: Number((s.count ? s.totalWrong / s.count : 0).toFixed(1)),
        avgBlank: Number((s.count ? s.totalBlank / s.count : 0).toFixed(1))
      };
    });

    // Class Averages Breakdown
    const cStatsMap = {};
    stats.forEach(s => {
      const cid = s.classId || '8. Sınıf';
      if (!cStatsMap[cid]) cStatsMap[cid] = { classId: cid, total: 0, count: 0, maxScore: 0 };
      cStatsMap[cid].total += s.avgScore;
      cStatsMap[cid].count += 1;
      if (s.avgScore > cStatsMap[cid].maxScore) cStatsMap[cid].maxScore = s.avgScore;
    });
    const clsChartData = Object.values(cStatsMap).map(c => ({
      name: c.classId,
      'Ortalama Net': Number((c.total / c.count).toFixed(2)),
      'Zirve Net': Number(c.maxScore.toFixed(2)),
      'Öğrenci Sayısı': c.count
    }));

    // Multi-Exam Comparison Breakdown (For all exams view)
    const eMap = {};
    allExamsList.forEach(e => {
      eMap[String(e.id)] = {
        id: e.id,
        name: e.title?.length > 18 ? e.title.substring(0, 16) + '...' : e.title,
        fullName: e.title,
        totalNet: 0,
        count: 0,
        maxNet: 0
      };
    });

    examSubmissions.forEach(sub => {
      const eid = String(sub.hwId || sub.testId || sub.bookId);
      let target = eMap[eid];
      if (!target) {
        const found = allExamsList.find(e => e.title === sub.examTitle || String(e.id) === eid);
        if (found) target = eMap[String(found.id)];
      }
      if (target) {
        const sc = Number(sub.score || 0);
        target.totalNet += sc;
        target.count += 1;
        if (sc > target.maxNet) target.maxNet = sc;
      }
    });

    const examCompChartData = Object.values(eMap)
      .filter(e => e.count > 0)
      .map(e => ({
        name: e.name,
        fullName: e.fullName,
        'Ortalama Net': Number((e.totalNet / e.count).toFixed(2)),
        'Zirve Net': Number(e.maxNet.toFixed(2)),
        'Katılımcı': e.count
      }));

    // Mistake Reasons Breakdown
    const mReasonsMap = {};
    examSubmissions.forEach(sub => {
      if (sub.mistakeReasons && typeof sub.mistakeReasons === 'object') {
        Object.values(sub.mistakeReasons).forEach(reason => {
          if (reason && typeof reason === 'string') {
            mReasonsMap[reason] = (mReasonsMap[reason] || 0) + 1;
          }
        });
      }
    });
    const mReasonsChartData = Object.entries(mReasonsMap).map(([name, count]) => ({
      name,
      'Hata Sayısı': count
    })).sort((a, b) => b['Hata Sayısı'] - a['Hata Sayısı']);

    // Net Score Distribution Buckets
    const buckets = [
      { name: '75+ Net (Zirve)', count: 0, fill: '#10b981' },
      { name: '50 - 75 Net (İyi)', count: 0, fill: '#3b82f6' },
      { name: '25 - 50 Net (Orta)', count: 0, fill: '#f59e0b' },
      { name: '0 - 25 Net (Gelişmeli)', count: 0, fill: '#ef4444' }
    ];
    stats.forEach(s => {
      if (s.avgScore >= 75) buckets[0].count += 1;
      else if (s.avgScore >= 50) buckets[1].count += 1;
      else if (s.avgScore >= 25) buckets[2].count += 1;
      else buckets[3].count += 1;
    });

    // Question item analysis for single exam
    const qMap = {};
    if (!isAllExams && resolvedExam?.subjects && Array.isArray(resolvedExam.subjects)) {
      resolvedExam.subjects.forEach(subj => {
        qMap[subj.name] = {};
        const count = subj.count || (Array.isArray(subj.answerKey) ? subj.answerKey.length : 15);
        const aKey = subj.answerKey || resolvedExam.answerKey?.[subj.name] || [];

        for (let i = 1; i <= count; i++) {
          const correctKey = Array.isArray(aKey) ? (aKey[i - 1] || '') : (aKey[i] || aKey[String(i)] || '');
          qMap[subj.name][i] = {
            qIndex: i,
            correctAnswer: correctKey || '?',
            correct: 0,
            wrong: 0,
            empty: 0,
            chosenOptions: { A: 0, B: 0, C: 0, D: 0, E: 0 }
          };
        }
      });

      examSubmissions.forEach(sub => {
        let stdAnswers = sub.studentAnswers || {};
        if ((!stdAnswers || Object.keys(stdAnswers).length === 0) && Array.isArray(sub.answers) && sub.answers.length > 0) {
          stdAnswers = {};
          let offset = 0;
          (resolvedExam?.subjects || []).forEach(subj => {
            const count = subj.count || 15;
            stdAnswers[subj.name] = sub.answers.slice(offset, offset + count);
            offset += count;
          });
        }

        Object.entries(stdAnswers).forEach(([subjName, answersData]) => {
          let targetSubjName = Object.keys(qMap).find(k => k.toLowerCase().trim() === subjName.toLowerCase().trim());
          if (!targetSubjName) {
            targetSubjName = subjName;
            qMap[targetSubjName] = {};
          }

          if (Array.isArray(answersData)) {
            answersData.forEach((ansVal, idx) => {
              const qNum = idx + 1;
              if (!qMap[targetSubjName][qNum]) {
                const aKey = resolvedExam?.answerKey?.[targetSubjName] || [];
                const correctKey = Array.isArray(aKey) ? (aKey[idx] || '') : (aKey[qNum] || '');
                qMap[targetSubjName][qNum] = {
                  qIndex: qNum,
                  correctAnswer: correctKey || '?',
                  correct: 0,
                  wrong: 0,
                  empty: 0,
                  chosenOptions: { A: 0, B: 0, C: 0, D: 0, E: 0 }
                };
              }
              const qEntry = qMap[targetSubjName][qNum];
              const cleanAns = String(ansVal || '').toUpperCase().trim();
              if (!cleanAns) {
                qEntry.empty += 1;
              } else {
                qEntry.chosenOptions[cleanAns] = (qEntry.chosenOptions[cleanAns] || 0) + 1;
                if (qEntry.correctAnswer && qEntry.correctAnswer !== '?' && cleanAns === qEntry.correctAnswer.toUpperCase()) {
                  qEntry.correct += 1;
                } else {
                  qEntry.wrong += 1;
                }
              }
            });
          }
        });
      });
    }

    return {
      totalParticipants: tParticipants,
      totalExamsCompleted: tExamsCompleted,
      overallAvgScore: oAvgScore,
      maxScore: mScore,
      minScore: minSc,
      studentStats: stats,
      subjectChartData: subjChartData,
      classChartData: clsChartData,
      examComparisonChartData: examCompChartData,
      mistakeReasonsChartData: mReasonsChartData,
      scoreDistributionData: buckets,
      questionAnalysisMap: qMap
    };
  }, [examSubmissions, students, curData, resolvedExam, isAllExams, allExamsList]);

  // 5. Filtered Student Stats (Live Search & Filter Bars)
  const filteredStudentStats = useMemo(() => {
    return studentStats.filter(std => {
      // Name Search
      const matchSearch = !searchQuery || 
        std.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        std.classId.toLowerCase().includes(searchQuery.toLowerCase());

      // Class Filter
      const matchClass = selectedClassFilter === 'ALL' || std.classId === selectedClassFilter;

      // Score Filter
      let matchScore = true;
      if (selectedScoreFilter === 'HIGH') matchScore = std.avgScore >= 65;
      else if (selectedScoreFilter === 'MID') matchScore = std.avgScore >= 35 && std.avgScore < 65;
      else if (selectedScoreFilter === 'LOW') matchScore = std.avgScore < 35;

      return matchSearch && matchClass && matchScore;
    });
  }, [studentStats, searchQuery, selectedClassFilter, selectedScoreFilter]);

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(studentStats.map(s => s.classId).filter(Boolean)));
  }, [studentStats]);

  const tabs = [
    { id: 'overview', label: 'Genel Durum & Grafikler', icon: BarChart3 },
    { id: 'class', label: 'Sınıf Analizi', icon: Layers },
    { id: 'students', label: `Öğrenci Sıralaması & Karneler (${filteredStudentStats.length})`, icon: Trophy },
    { id: 'questions', label: isAllExams ? 'Ders & Hata Dağılımı' : 'Soru Madde & Şık Analizi', icon: Target },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      boxSizing: 'border-box',
      margin: 0,
      padding: '1.25rem 1.5rem 5rem 1.5rem',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
    }}>
      
      {/* ── TOP HERO HEADER & EXAM SWITCHER ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.25rem',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 280 }}>
          <button 
            onClick={() => navigate('/physical-exam')}
            style={{
              padding: '0.7rem',
              borderRadius: '1rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border-input)',
              color: 'var(--color-text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            title="Fiziki Deneme Havuzuna Dön"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                {resolvedExam ? resolvedExam.title : 'Fiziki Deneme Sınavı Analizi'}
              </h1>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, background: isAllExams ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(37,99,235,0.12)', color: isAllExams ? '#ffffff' : '#60a5fa', padding: '0.2rem 0.65rem', borderRadius: '1rem', border: isAllExams ? 'none' : '1px solid #3b82f6' }}>
                {isAllExams ? `${allExamsList.length} Deneme Toplamı` : `${resolvedExam?.targetClass || 'LGS'} • ${resolvedExam?.totalQuestions || 30} Soru`}
              </span>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.86rem', fontWeight: 600 }}>
              {isAllExams 
                ? 'Tüm denemelerin sınıf net ortalamaları, öğrenci karne sıralamaları ve gelişim grafikleri 📊' 
                : 'Sınava katılan öğrencilerin ders bazlı netleri, optik form cevap dağılımı ve soru zorluk analizi 📊'}
            </p>
          </div>
        </div>

        {/* Action Controls & Exam Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
          {/* Quick Exam Dropdown Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Sınav:</span>
            <select
              value={isAllExams ? 'all' : examId}
              onChange={(e) => {
                if (e.target.value === 'all') navigate('/exam-analysis/all');
                else navigate(`/exam-analysis/${e.target.value}`);
              }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '0.75rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: 'pointer',
                outline: 'none',
                maxWidth: 240
              }}
            >
              <option value="all">🌟 Tüm Denemeler (Genel Toplam)</option>
              {allExamsList.map(e => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => window.print()}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '0.75rem',
              background: 'rgba(2,132,199,0.12)',
              border: '1.5px solid #0284c7',
              color: '#38bdf8',
              fontWeight: 800,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} /> Yazdır / PDF
          </button>
        </div>

      </div>

      {/* ── 4-5 LIVE KPI HERO CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        
        {/* Card 1: Katılımcı */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(37,99,235,0.12)', color: '#818cf8', border: '1px solid #3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>{totalParticipants}</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '0.2rem' }}>Toplam Katılımcı</div>
          </div>
        </div>

        {/* Card 2: Genel Ortalama */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>{overallAvgScore.toFixed(1)} Net</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '0.2rem' }}>Sınıf Net Ortalaması</div>
          </div>
        </div>

        {/* Card 3: Zirve Net */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(245,158,11,0.12)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Trophy size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24', lineHeight: 1.1 }}>{maxScore.toFixed(1)} Net</div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '0.2rem' }}>En Yüksek Net (Zirve)</div>
          </div>
        </div>

        {/* Card 4: Kapsam / Çözülen Deneme */}
        <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.15rem', padding: '1.15rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '1rem', background: 'rgba(219,39,119,0.12)', color: '#f472b6', border: '1px solid rgba(219,39,119,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.1 }}>
              {isAllExams ? `${totalExamsCompleted} Çözüm` : `${resolvedExam?.subjects?.length || 2} Ders`}
            </div>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '0.2rem' }}>
              {isAllExams ? 'Toplam Çözülen Sınav' : 'Sınav Kapsamı'}
            </div>
          </div>
        </div>

      </div>

      {/* ── SEARCH & MULTI-FILTER BAR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.15rem',
        padding: '0.85rem 1.15rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Öğrenci adı, soyadı veya sınıf ile ara..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem 0.55rem 2.35rem',
              borderRadius: '0.65rem',
              border: '1.5px solid var(--color-border-input)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              fontSize: '0.82rem',
              fontWeight: 700,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filters Group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* Class Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Sınıf:</span>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">Tüm Sınıflar</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Score Performance Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-muted)' }}>Net:</span>
            <select
              value={selectedScoreFilter}
              onChange={e => setSelectedScoreFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.65rem',
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border-input)',
                color: 'var(--color-text)',
                fontWeight: 800,
                fontSize: '0.78rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="ALL">Tüm Netler</option>
              <option value="HIGH">🔥 Yüksek Başarı (65+ Net)</option>
              <option value="MID">⚡ Orta Başarı (35 - 65 Net)</option>
              <option value="LOW">⚠️ Geliştirilmeli (&lt; 35 Net)</option>
            </select>
          </div>

          {(searchQuery || selectedClassFilter !== 'ALL' || selectedScoreFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchQuery(''); setSelectedClassFilter('ALL'); setSelectedScoreFilter('ALL'); }}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '0.65rem',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: '#ef4444',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <X size={12} /> Temizle
            </button>
          )}

        </div>
      </div>

      {/* ── VIEW TAB SELECTOR ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1rem',
        padding: '0.35rem',
        display: 'inline-flex',
        gap: '0.35rem',
        marginBottom: '1.25rem',
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
                padding: '0.6rem 1.15rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: isActive ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'none',
                color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                fontWeight: 800,
                fontSize: '0.85rem',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* ══ TAB 1: OVERVIEW & COMPARISONS ══ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Multi-Exam Comparison Bar Chart (If multiple exams exist) */}
            {isAllExams && examComparisonChartData.length > 0 && (
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart3 size={22} style={{ color: '#10b981' }} /> Deneme Bazında Sınıf Net Ortalamaları
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                    Her denemenin sınıf neti ve zirve puanı
                  </span>
                </div>
                
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={examComparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                        contentStyle={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 800, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      />
                      <Bar dataKey="Ortalama Net" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={55} />
                      <Bar dataKey="Zirve Net" fill="#fbbf24" radius={[8, 8, 0, 0]} maxBarSize={55} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Subject Net Averages Bar Chart */}
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <BarChart3 size={22} style={{ color: '#818cf8' }} /> Ders Bazında Sınıf Net Ortalamaları
              </h3>
              
              <div style={{ height: '300px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} />
                    <RechartsTooltip 
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                      contentStyle={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 800, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                    />
                    <Bar dataKey="Ortalama Net" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grid: Score Distribution + Mistake Diagnostics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              
              {/* Score Distribution Buckets */}
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <PieIcon size={20} color="#3b82f6" /> Net Başarı Dağılım Aralıkları
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {scoreDistributionData.map((b, idx) => {
                    const pct = totalParticipants > 0 ? (b.count / totalParticipants) * 100 : 0;
                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, color: 'var(--color-text)' }}>
                          <span>{b.name}</span>
                          <span>{b.count} Öğrenci (%{Math.round(pct)})</span>
                        </div>
                        <div style={{ height: 8, background: 'var(--color-surface-hover)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: b.fill, borderRadius: 99 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mistake Reasons Breakdown */}
              <div style={{
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: '1.25rem',
                padding: '1.5rem',
                boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
              }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} color="#f59e0b" /> En Çok Karşılaşılan Hata Sebepleri
                </h3>

                {mistakeReasonsChartData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {mistakeReasonsChartData.slice(0, 5).map((m, idx) => (
                      <div key={idx} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)',
                        borderRadius: '0.75rem', padding: '0.6rem 0.85rem'
                      }}>
                        <span style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--color-text)' }}>{m.name}</span>
                        <span style={{ fontWeight: 900, fontSize: '0.78rem', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '0.15rem 0.5rem', borderRadius: 99 }}>
                          {m['Hata Sayısı']} Soru
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
                    Öğrenciler deneme çözümlerinde henüz hata sebebi belirtmedi.
                  </div>
                )}
              </div>

            </div>

            {/* Subject Breakdown Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
              {subjectChartData.map((subj, sIdx) => (
                <div key={sIdx} style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: '1rem',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--color-text)' }}>{subj.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>~{subj['Soru Sayısı']} Soru</div>
                    <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.35rem', fontSize: '0.72rem', fontWeight: 800 }}>
                      <span style={{ color: '#10b981' }}>{subj.avgCorrect ?? 0} D</span>
                      <span style={{ color: '#ef4444' }}>{subj.avgWrong ?? 0} Y</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{subj.avgBlank ?? 0} B</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8' }}>{subj['Ortalama Net']}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ort. Net</div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ══ TAB 2: CLASS BREAKDOWN ══ */}
        {activeTab === 'class' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '1.25rem',
              padding: '1.5rem',
              boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
            }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={22} style={{ color: '#38bdf8' }} /> Sınıflara Göre Başarı Dağılımı
              </h3>
              
              {classChartData.length > 0 ? (
                <div style={{ height: '320px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-text-muted)', fontWeight: 700 }} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(16,185,129,0.05)' }}
                        contentStyle={{ background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-border)', color: 'var(--color-text)', fontWeight: 800, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      />
                      <Bar dataKey="Ortalama Net" fill="#10b981" radius={[8, 8, 0, 0]} maxBarSize={65} />
                      <Bar dataKey="Zirve Net" fill="#fbbf24" radius={[8, 8, 0, 0]} maxBarSize={65} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Sınıf verisi bulunamadı.</div>
              )}
            </div>

            {/* Class Summary Table */}
            <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.25rem', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Sınıf / Şube</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Katılımcı Sayısı</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#10b981' }}>Ortalama Net</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#fbbf24' }}>Zirve Net</th>
                  </tr>
                </thead>
                <tbody>
                  {classChartData.map((c, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.88rem' }}>{c.name}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 800 }}>{c['Öğrenci Sayısı']} Öğrenci</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 900, color: '#10b981', fontSize: '0.95rem' }}>{c['Ortalama Net']} Net</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 900, color: '#fbbf24', fontSize: '0.95rem' }}>{c['Zirve Net']} Net</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB 3: STUDENT LEADERBOARD & REPORT CARD ══ */}
        {activeTab === 'students' && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            borderRadius: '1.25rem',
            padding: '1.5rem',
            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trophy size={22} style={{ color: '#fbbf24' }} /> Öğrenci Sıralaması &amp; Bireysel Karneler
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#60a5fa', background: 'rgba(37,99,235,0.12)', padding: '0.2rem 0.65rem', borderRadius: '0.5rem', fontWeight: 800, border: '1px solid #3b82f6' }}>
                {filteredStudentStats.length} Öğrenci Listeleniyor
              </span>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-text)' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', width: '60px', color: 'var(--color-text-muted)' }}>Sıra</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Öğrenci</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Sınıf</th>
                    {isAllExams && (
                      <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#818cf8' }}>Deneme</th>
                    )}
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#34d399' }}>Ort. D</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#f87171' }}>Ort. Y</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Ort. B</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#38bdf8' }}>Ortalama Net</th>
                    <th style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: '#fbbf24' }}>Zirve Net</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Karne</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentStats.map((std, idx) => (
                    <tr
                      key={std.studentId}
                      onClick={() => setSelectedStudent(std)}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        background: idx === 0 ? 'rgba(245,158,11,0.08)' : idx % 2 === 0 ? 'var(--color-surface-hover)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.12s'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 900, fontSize: '0.88rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#fb923c' : 'var(--color-text-muted)' }}>
                        {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 800, fontSize: '0.92rem', color: 'var(--color-text)' }}>
                        {std.studentName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                        {std.classId}
                      </td>
                      {isAllExams && (
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 800, fontSize: '0.82rem', color: '#818cf8' }}>
                          {std.examCount} Sınav
                        </td>
                      )}
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: '#34d399' }}>
                        {std.totalCorrect}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: '#f87171' }}>
                        {std.totalWrong}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, color: 'var(--color-text-muted)' }}>
                        {std.totalEmpty}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, fontSize: '1rem', color: '#38bdf8' }}>
                        {std.avgScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 0.75rem', textAlign: 'center', fontWeight: 900, fontSize: '0.92rem', color: '#fbbf24' }}>
                        {std.maxScore.toFixed(2)}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedStudent(std); }}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '0.5rem',
                            background: 'rgba(37,99,235,0.12)',
                            border: '1px solid #3b82f6',
                            color: '#60a5fa',
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

                  {filteredStudentStats.length === 0 && (
                    <tr>
                      <td colSpan={10} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        Arama veya filtre kriterlerinize uygun öğrenci bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB 4: QUESTION MADDE / ITEM ANALYSIS ══ */}
        {activeTab === 'questions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {!isAllExams && Object.keys(questionAnalysisMap).length > 0 ? (
              Object.entries(questionAnalysisMap).map(([subjectName, qData]) => {
                const sortedQuestions = Object.values(qData).sort((a, b) => a.qIndex - b.qIndex);

                return (
                  <div key={subjectName} style={{
                    background: 'var(--color-surface)',
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '1.25rem',
                    padding: '1.5rem',
                    boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                      <Target size={20} style={{ color: '#818cf8' }} /> {subjectName} ({sortedQuestions.length} Soru)
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
                              background: 'var(--color-surface-hover)',
                              border: '1px solid var(--color-border)',
                              flexWrap: 'wrap',
                              gap: '0.65rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: '130px' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', background: isHard ? 'rgba(239,68,68,0.15)' : 'rgba(37,99,235,0.12)', border: `1px solid ${isHard ? '#f87171' : '#3b82f6'}`, color: isHard ? '#f87171' : '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.85rem' }}>
                                {q.qIndex}
                              </div>
                              <div>
                                <span style={{ fontSize: '0.78rem', fontWeight: 900, color: 'var(--color-text)' }}>Soru {q.qIndex}</span>
                                <span style={{ fontSize: '0.68rem', color: '#fbbf24', display: 'block', fontWeight: 800 }}>Cevap: {q.correctAnswer}</span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ flex: 1, minWidth: '160px', height: '10px', background: 'var(--color-border)', borderRadius: '1rem', overflow: 'hidden', display: 'flex' }}>
                              <div style={{ width: `${correctPct}%`, background: '#10b981' }} title={`Doğru: %${Math.round(correctPct)}`} />
                              <div style={{ width: `${wrongPct}%`, background: '#ef4444' }} title={`Yanlış: %${Math.round(wrongPct)}`} />
                              <div style={{ width: `${emptyPct}%`, background: '#94a3b8' }} title={`Boş: %${Math.round(emptyPct)}`} />
                            </div>

                            {/* Stat Badges */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.76rem', fontWeight: 800 }}>
                              <span style={{ color: '#34d399', background: 'rgba(16,185,129,0.12)', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: '1px solid rgba(16,185,129,0.25)' }}>
                                ✓ {q.correct} (%{Math.round(correctPct)})
                              </span>
                              <span style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: '1px solid rgba(239,68,68,0.25)' }}>
                                ✗ {q.wrong} (%{Math.round(wrongPct)})
                              </span>
                              <span style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', border: '1px solid var(--color-border)' }}>
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
            ) : isAllExams ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: '1.25rem', padding: '1.5rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={20} style={{ color: '#818cf8' }} /> Genel Ders Başarı Dağılımı (Tüm Denemeler)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0 0 1.25rem 0' }}>
                    Belirli bir denemenin tek tek soru ve şık dağılım analizini görmek için üstteki <strong>Sınav Seçici</strong>'den ilgili denemeyi seçiniz.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
                    {subjectChartData.map((s, idx) => (
                      <div key={idx} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '1rem', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', color: 'var(--color-text)' }}>{s.name}</span>
                          <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#38bdf8' }}>{s['Ortalama Net']} Net</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.78rem', fontWeight: 800 }}>
                          <span style={{ color: '#10b981' }}>Ort. Doğru: {s.avgCorrect}</span>
                          <span style={{ color: '#ef4444' }}>Ort. Yanlış: {s.avgWrong}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>Ort. Boş: {s.avgBlank}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Bu sınav için henüz soru madde analizi verisi oluşturulmadı.
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL: ÖĞRENCİ BİREYSEL KARNESİ & DENEME GEÇMİŞİ ── */}
      {selectedStudent && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'var(--color-modal-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '96vw', maxWidth: '820px', maxHeight: '90vh', borderRadius: '1.5rem', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', color: 'var(--color-text)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '1.35rem 1.6rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                  <User size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    {selectedStudent.studentName}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
                    {selectedStudent.classId} • {isAllExams ? 'Tüm Denemeler Gelişim Karnesi' : `${resolvedExam?.title} Karnesi`}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '1.5rem 1.6rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#34d399' }}>{selectedStudent.totalCorrect}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase' }}>Ort. Doğru</div>
                </div>
                <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#f87171' }}>{selectedStudent.totalWrong}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase' }}>Ort. Yanlış</div>
                </div>
                <div style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>{selectedStudent.totalEmpty}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ort. Boş</div>
                </div>
                <div style={{ background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.25)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8' }}>{selectedStudent.avgScore.toFixed(2)}</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase' }}>Genel Net</div>
                </div>
              </div>

              {/* Subject Breakdown */}
              {Object.keys(selectedStudent.combinedSubjectStats).length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    Ders Bazlı Net Ortalamaları
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
                    {Object.entries(selectedStudent.combinedSubjectStats).map(([subjName, sObj]) => (
                      <div key={subjName} style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: '0.75rem', padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>{subjName}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 800 }}>
                          <span style={{ color: '#34d399' }}>{sObj.correct || 0}D</span>
                          <span style={{ color: '#f87171' }}>{sObj.wrong || 0}Y</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{sObj.blank || 0}B</span>
                          <span style={{ color: '#38bdf8', fontWeight: 900 }}>{sObj.net?.toFixed(2) || 0} Net</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multi-Exam History List (If All-Exams) */}
              {isAllExams && selectedStudent.examHistory && selectedStudent.examHistory.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    Girdiği Denemeler ({selectedStudent.examHistory.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedStudent.examHistory.map((ex, idx) => (
                      <div key={idx} style={{
                        background: 'var(--color-surface-hover)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '0.75rem',
                        padding: '0.65rem 0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div>
                          <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--color-text)' }}>{ex.examTitle}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>
                            {ex.correct} Doğru • {ex.wrong} Yanlış • {ex.blank} Boş
                          </span>
                        </div>
                        <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#10b981' }}>
                          {ex.score.toFixed(2)} Net
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorded Mistake Reasons */}
              {selectedStudent.mistakeReasons && Object.keys(selectedStudent.mistakeReasons).length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 0.65rem 0', fontSize: '0.95rem', fontWeight: 900, color: 'var(--color-text)' }}>
                    Kaydedilen Hata Nedenleri
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {Object.entries(selectedStudent.mistakeReasons).map(([qKey, reason]) => (
                      <span key={qKey} style={{ fontSize: '0.75rem', fontWeight: 800, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                        {qKey.replace('_', ' Soru ')}: {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div style={{ padding: '1.15rem 1.6rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setSelectedStudent(null)}
                style={{ padding: '0.6rem 1.15rem', borderRadius: '0.6rem', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-input)', color: 'var(--color-text)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
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
