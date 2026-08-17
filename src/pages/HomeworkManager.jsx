import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Edit2, BarChart2, ArrowRight, ArrowLeft, CheckSquare, Sparkles, BookOpen, Layers, Check, Search, Filter,
  GraduationCap, Calendar, AlertCircle, Eye, Send, Trophy, FileText, Image, FileJson,
  Trash2, Zap, Target, ClipboardList, CheckCheck, RefreshCw, Clock, Plus, X, Globe, Users, CheckCircle,
  HelpCircle, UserCheck, ShieldAlert
} from 'lucide-react';
import { useCurriculum } from '../context/CurriculumContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useHomework } from '../context/HomeworkContext';
import { useUser } from '../context/UserContext';
import { useEvaluation } from '../context/EvaluationContext';
import { useAuth } from '../context/AuthContext';
import { idbGetPayload } from '../services/indexedDbService';

const subjectThemes = {
  'Matematik': { bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
  'Fen Bilimleri': { bg: 'linear-gradient(135deg,#10b981,#047857)', color: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
  'Türkçe': { bg: 'linear-gradient(135deg,#ec4899,#be185d)', color: '#f472b6', border: 'rgba(244, 114, 182, 0.4)' },
  'Sosyal Bilgiler': { bg: 'linear-gradient(135deg,#f59e0b,#b45309)', color: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' },
  'İngilizce': { bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#c084fc', border: 'rgba(192, 132, 252, 0.4)' },
  'Diger': { bg: 'linear-gradient(135deg,#64748b,#334155)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.4)' }
};
const getTheme = (subject) => subjectThemes[subject] || { bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#818cf8', border: 'rgba(129, 140, 248, 0.4)' };

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 99999,
      background: 'linear-gradient(135deg,#059669,#10b981)',
      color: '#fff', padding: '0.85rem 1.4rem', borderRadius: '1rem',
      fontWeight: 800, fontSize: '0.85rem',
      boxShadow: '0 12px 36px rgba(5,150,105,0.5)',
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      border: '1.5px solid rgba(255,255,255,0.2)',
      backdropFilter: 'blur(12px)',
      animation: 'hwToastIn 0.35s ease'
    }}>
      <Sparkles size={16} /> {msg}
    </div>
  );
}

function GlassProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 800 }}>
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tamamlanma</span>
        <span style={{ color: color || '#818cf8', fontWeight: 900 }}>%{pct} ({value}/{max})</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 99, height: 6, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`,
          background: pct === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : (color || 'linear-gradient(90deg,#6366f1,#818cf8)'),
          height: '100%', borderRadius: 99,
          transition: 'width 0.5s ease'
        }} />
      </div>
    </div>
  );
}

export default function HomeworkManager() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const { data: curData } = useCurriculum();
  const { questions: allQuestions } = useQuestionBank();
  const { homeworks: allHomeworks, addHomework, updateHomework, deleteHomework, deleteAllHomeworks } = useHomework();
  const { users } = useUser();
  const { submissions, deleteSubmissionsByTestId, deleteAllSubmissions } = useEvaluation();

  const students = useMemo(() => (users || []).filter(u => u.role === 'student' && (currentUser?.role === 'admin' || u.teacherId === currentUser?.id)), [users, currentUser]);
  const homeworks = useMemo(() => currentUser?.role === 'admin' ? (allHomeworks || []) : (allHomeworks || []).filter(hw => hw.assignedBy === currentUser?.id), [allHomeworks, currentUser]);
  const questions = useMemo(() => currentUser?.role === 'admin' ? (allQuestions || []) : (allQuestions || []).filter(q => q.createdBy === currentUser?.id), [allQuestions, currentUser]);

  const [viewMode, setViewMode] = useState('list');
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('active');
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [activeHomework, setActiveHomework] = useState(null);
  const [statsStudentFilter, setStatsStudentFilter] = useState('all');
  const [editingHwId, setEditingHwId] = useState(null);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [timePerQuestion, setTimePerQuestion] = useState(2);
  const [targetMode, setTargetMode] = useState('grade');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [selectedQuestionIds, setSelectedQuestionIds] = useState([]);
  const [selGrade, setSelGrade] = useState('all');
  const [selSubject, setSelSubject] = useState('all');
  const [selUnit, setSelUnit] = useState('all');
  const [selTopic, setSelTopic] = useState('all');
  const [selQuestionType, setSelQuestionType] = useState('all');
  const [selContentType, setSelContentType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('separate');
  const [selectedHwListIds, setSelectedHwListIds] = useState([]);

  useEffect(() => {
    if (location.state?.autoSelectQuestionId) {
      const qId = location.state.autoSelectQuestionId;
      setSelectedQuestionIds([qId]);
      const matchingQ = questions.find(q => q.id === qId);
      if (matchingQ && !title) setTitle(matchingQ.title || matchingQ.questionText || 'Soru Bankası Ödevi');
      setViewMode('create'); setStep(1);
    }
  }, [location.state, questions]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (selGrade !== 'all') {
        const gS = curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id);
        const gU = curData.units.filter(u => gS.includes(u.subjectId)).map(u => u.id);
        const gT = curData.topics.filter(t => gU.includes(t.unitId)).map(t => t.id);
        if (!gT.includes(q.topicId) && !gU.some(id => q.topicId === 'unit_' + id + '_all') && !gS.some(id => q.topicId === 'sub_' + id + '_all') && q.topicId !== 'grade_' + selGrade + '_all') return false;
      }
      if (selSubject !== 'all') {
        const sU = curData.units.filter(u => u.subjectId === selSubject).map(u => u.id);
        const sT = curData.topics.filter(t => sU.includes(t.unitId)).map(t => t.id);
        if (!sT.includes(q.topicId) && !sU.some(id => q.topicId === 'unit_' + id + '_all') && q.topicId !== 'sub_' + selSubject + '_all') return false;
      }
      if (selUnit !== 'all') {
        const uT = curData.topics.filter(t => t.unitId === selUnit).map(t => t.id);
        if (!uT.includes(q.topicId) && q.topicId !== 'unit_' + selUnit + '_all' && q.topicId !== selUnit) return false;
      }
      if (selTopic !== 'all' && q.topicId !== selTopic) return false;
      if (selQuestionType === 'coktan_secmeli' && q.type !== 'coktan_secmeli') return false;
      if (selQuestionType === 'acik_uclu' && q.type !== 'acik_uclu') return false;
      if (selQuestionType === 'bundle' && !q.isBundle) return false;
      if (selContentType !== 'all') {
        const ct = (q.contentType || '').toLowerCase();
        if (selContentType === 'pdf' && !ct.includes('pdf')) return false;
        if (selContentType === 'html' && !ct.includes('html')) return false;
        if (selContentType === 'text' && !ct.includes('text') && !ct.includes('metin')) return false;
        if (selContentType === 'gorsel' && !ct.includes('gorsel') && !ct.includes('image')) return false;
        if (selContentType === 'json' && !ct.includes('json') && !q.questionsList) return false;
      }
      if (searchQuery.trim()) {
        const sq = searchQuery.toLowerCase().trim();
        if (!(q.title || q.name || '').toLowerCase().includes(sq) && !(q.questionText || '').toLowerCase().includes(sq)) return false;
      }
      return true;
    });
  }, [questions, selGrade, selSubject, selUnit, selTopic, selQuestionType, selContentType, searchQuery, curData]);

  const resetForm = () => {
    setTitle(''); setDueDate(''); setTimePerQuestion(2);
    setTargetMode('grade'); setSelectedTargets([]); setStudentGradeFilter('all');
    setSelGrade('all'); setSelSubject('all'); setSelUnit('all'); setSelTopic('all');
    setSelQuestionType('all'); setSelContentType('all'); setSearchQuery('');
    setSelectedQuestionIds([]); setAssignmentMode('separate'); setEditingHwId(null); setStep(1); setViewMode('list');
  };

  const openEditPage = (hw) => {
    setEditingHwId(hw.id); setTitle(hw.title || '');
    setDueDate(hw.dueDate ? hw.dueDate.split('T')[0] : '');
    setTimePerQuestion(hw.timePerQuestion || 2);
    setTargetMode(hw.targetType || 'grade'); setSelectedTargets(hw.targetIds || []);
    setSelectedQuestionIds(hw.questionIds || []);
    setStep(1); setViewMode('create');
  };

  const setDueDatePreset = (days) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split('T')[0]);
  };

  const toggleQ = (id) => setSelectedQuestionIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSelectAllFiltered = () => {
    const fIds = filteredQuestions.map(q => q.id);
    const allSel = fIds.every(id => selectedQuestionIds.includes(id));
    if (allSel) setSelectedQuestionIds(prev => prev.filter(id => !fIds.includes(id)));
    else setSelectedQuestionIds(prev => Array.from(new Set([...prev, ...fIds])));
  };

  const isStudentInGrade = (s, gObjOrId) => {
    if (!s || !gObjOrId) return false;
    const gId = typeof gObjOrId === 'object' ? gObjOrId.id : gObjOrId;
    const gName = typeof gObjOrId === 'object' ? gObjOrId.name : curData?.grades?.find(g => String(g.id) === String(gId) || g.name === gId)?.name;
    const matches = [s.gradeId, s.classId, s.grade, s.className];
    return matches.some(m => m && (String(m) === String(gId) || (gName && String(m).toLowerCase() === String(gName).toLowerCase())));
  };

  const filteredStudents = students.filter(s => studentGradeFilter === 'all' || isStudentInGrade(s, studentGradeFilter));

  const handleSelectAllTargets = () => {
    if (targetMode === 'grade') {
      const all = curData.grades.map(g => g.id);
      setSelectedTargets(selectedTargets.length === all.length ? [] : all);
    } else {
      const all = filteredStudents.map(s => s.id);
      setSelectedTargets(selectedTargets.length === all.length ? [] : all);
    }
  };

  const getHomeworkStats = (hw) => {
    const ids = (hw.targetType === 'grade' || hw.targetType === 'class')
      ? students.filter(s => (hw.targetIds || []).some(tid => isStudentInGrade(s, tid))).map(s => s.id)
      : (hw.targetIds || []);
    const total = ids.length;
    const completed = ids.filter(stId => !!(
      (hw.submissions || []).find(s => s.studentId === stId) ||
      submissions.find(s => (s.hwId === hw.id || s.testId === hw.id) && s.studentId === stId)
    )).length;
    return { total, completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0, targetStudentIds: ids };
  };

  const getTargetLabel = (hw) => {
    if (hw.targetType === 'grade' || hw.targetType === 'class') {
      const names = (curData?.grades || []).filter(g => (hw.targetIds || []).includes(g.id) || (hw.targetIds || []).includes(g.name)).map(g => g.name);
      if (names.length > 0) return names.join(', ');
      
      const hasRawId = Array.isArray(hw.targetIds) && hw.targetIds.some(id => id.startsWith('g_') || id.startsWith('c_'));
      if (hasRawId) return 'Silinmiş Sınıf';
      
      if (Array.isArray(hw.targetIds) && hw.targetIds.length > 0) return hw.targetIds.join(', ');
      return 'Tüm Sınıflar';
    }
    return (hw.targetIds?.length || 0) + ' Öğrenci';
  };

  const globalAnalytics = useMemo(() => {
    const now = new Date(new Date().setHours(0,0,0,0));
    let active = 0, expired = 0, rateSum = 0;
    homeworks.forEach(hw => {
      if (new Date(hw.dueDate) < now) expired++; else active++;
      rateSum += getHomeworkStats(hw).rate;
    });
    return { total: homeworks.length, active, expired, avgRate: homeworks.length ? Math.round(rateSum / homeworks.length) : 0 };
  }, [homeworks, students, submissions]);

  const canStep2 = !!(title.trim() && dueDate);
  const canSubmit = !!(title.trim() && dueDate && selectedTargets.length > 0 && selectedQuestionIds.length > 0);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('⚠️ Lütfen Ödev Başlığını giriniz!');
      setStep(1);
      return;
    }
    if (!dueDate) {
      showToast('⚠️ Lütfen Son Teslim Tarihini seçiniz!');
      setStep(1);
      return;
    }
    if (selectedTargets.length === 0) {
      showToast('⚠️ Lütfen ödev atanacak En Az 1 Sınıf veya Öğrenci seçiniz!');
      setStep(2);
      return;
    }
    if (selectedQuestionIds.length === 0) {
      showToast('⚠️ Lütfen ödeve eklenecek En Az 1 Soru seçiniz!');
      setStep(3);
      return;
    }

    const selectedQs = questions.filter(q => selectedQuestionIds.includes(q.id));
    const physicalExam = selectedQs.find(q => q.contentType === 'physicalExam');
    const isPhysical = !!physicalExam;
    const totalQCount = isPhysical ? physicalExam.totalQuestions : selectedQs.reduce((acc, q) => acc + (q.questionCount || q.totalQuestions || q.qCount || (Array.isArray(q.answerKey) ? q.answerKey.length : 1)), 0);
    const firstQ = selectedQs[0] || {};
    const firstSub = firstQ.subject || firstQ.subjectName || 'Genel';

    const sectionsWithPayloads = await Promise.all(selectedQs.map(async (q, idx) => {
      let pdfPayload = q.pdfPayload;
      let contentPayload = q.contentPayload;

      const needsIdb = (p) => !p || p === '[STORED_IN_INDEXEDDB]' || p === '[LOCALSTORAGE_CACHE]';
      if (needsIdb(pdfPayload) || needsIdb(contentPayload)) {
        const idVariants = [
          q.id,
          String(q.id).replace(/^q_?/, ''),
          String(q.id).replace(/^q_?/, 'q_'),
          String(q.id).replace(/^q_?/, 'q'),
        ];
        for (const idv of idVariants) {
          try {
            const val = await idbGetPayload(idv);
            if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
              if (needsIdb(pdfPayload) && (q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || (typeof val === 'string' && val.startsWith('data:application/pdf')))) {
                pdfPayload = val;
              } else if (needsIdb(contentPayload)) {
                contentPayload = val;
              }
              break;
            }
          } catch (e) {}
        }
      }

      return {
        id: q.id,
        questionId: q.id,
        title: q.title || q.name || `${idx + 1}. Bölüm`,
        contentType: q.contentType || q.type || q.formatType || q.sourceFormat,
        formatType: q.formatType || q.sourceFormat,
        sourceFormat: q.sourceFormat,
        questionCount: q.questionCount || q.totalQuestions || q.qCount || (Array.isArray(q.answerKey) ? q.answerKey.length : 1),
        questionType: q.questionType || q.type,
        answerKey: q.answerKey,
        pdfPayload: needsIdb(pdfPayload) ? undefined : pdfPayload,
        contentPayload: needsIdb(contentPayload) ? undefined : contentPayload,
        pdfUrl: q.pdfUrl,
        imageUrls: q.imageUrls,
      };
    }));

    if (selectedQuestionIds.length > 1 && assignmentMode === 'separate' && !editingHwId) {
      for (let i = 0; i < selectedQs.length; i++) {
        const q = selectedQs[i];
        let pdfPayload = q.pdfPayload;
        let contentPayload = q.contentPayload;
        const needsIdb = (p) => !p || p === '[STORED_IN_INDEXEDDB]' || p === '[LOCALSTORAGE_CACHE]';
        if (needsIdb(pdfPayload) || needsIdb(contentPayload)) {
          const idVariants = [
            q.id,
            String(q.id).replace(/^q_?/, ''),
            String(q.id).replace(/^q_?/, 'q_'),
            String(q.id).replace(/^q_?/, 'q'),
          ];
          for (const idv of idVariants) {
            try {
              const val = await idbGetPayload(idv);
              if (val && val !== '[STORED_IN_INDEXEDDB]' && val !== '[LOCALSTORAGE_CACHE]') {
                if (needsIdb(pdfPayload) && (q.contentType === 'pdf' || q.formatType === 'pdf' || q.sourceFormat === 'pdf' || (typeof val === 'string' && val.startsWith('data:application/pdf')))) {
                  pdfPayload = val;
                } else if (needsIdb(contentPayload)) {
                  contentPayload = val;
                }
                break;
              }
            } catch (e) {}
          }
        }

        const qCount = q.questionCount || q.totalQuestions || q.qCount || (Array.isArray(q.answerKey) ? q.answerKey.length : 1);
        const subHwData = {
          title: q.title || q.name || `${title} (${i + 1}. Test)`,
          dueDate,
          timePerQuestion: parseInt(timePerQuestion, 10),
          totalQuestions: qCount,
          subject: q.subject || q.subjectName || firstSub,
          targetType: targetMode,
          targetIds: selectedTargets,
          questionIds: [q.id],
          assignedBy: currentUser?.id,
          type: q.contentType === 'physicalExam' ? 'physicalExam' : 'test',
          contentType: q.contentType || q.type || 'test',
          contentPayload: needsIdb(contentPayload) ? undefined : contentPayload,
          pdfPayload: needsIdb(pdfPayload) ? undefined : pdfPayload,
          htmlPayload: q.htmlPayload,
          pdfUrl: q.pdfUrl,
          imageUrls: q.imageUrls,
          questionType: q.questionType || q.type,
          isOpenEnded: q.isOpenEnded || q.type === 'acik_uclu' || q.contentType === 'acik_uclu' || q.contentType === 'gorsel_klasik' || q.type === 'gorsel_klasik',
          answerKey: q.answerKey,
          subjects: q.subjects,
          penaltyRatio: q.penaltyRatio,
          examType: q.examType
        };
        addHomework(subHwData);
      }
      showToast(`🎉 ${selectedQs.length} adet ödev ayrı ayrı başarıyla yayınlandı!`);
      resetForm();
      return;
    }

    const hwData = {
      title, dueDate, timePerQuestion: parseInt(timePerQuestion, 10),
      totalQuestions: totalQCount, subject: firstSub,
      targetType: targetMode, targetIds: selectedTargets,
      questionIds: selectedQuestionIds, assignedBy: currentUser?.id,
      type: isPhysical ? 'physicalExam' : 'test',
      contentType: isPhysical ? 'physicalExam' : (firstQ.contentType || firstQ.type || 'test'),
      contentPayload: firstQ.contentPayload,
      pdfPayload: firstQ.pdfPayload,
      htmlPayload: firstQ.htmlPayload,
      questionType: firstQ.questionType || firstQ.type,
      isOpenEnded: firstQ.isOpenEnded || firstQ.type === 'acik_uclu' || firstQ.contentType === 'acik_uclu' || firstQ.contentType === 'gorsel_klasik' || firstQ.type === 'gorsel_klasik',
      answerKey: isPhysical ? physicalExam.answerKey : undefined,
      subjects: isPhysical ? physicalExam.subjects : undefined,
      penaltyRatio: isPhysical ? physicalExam.penaltyRatio : undefined,
      examType: isPhysical ? physicalExam.examType : undefined,
      sections: sectionsWithPayloads
    };
    if (editingHwId) { updateHomework(editingHwId, hwData); showToast('🎉 Ödev güncellendi!'); }
    else { addHomework(hwData); showToast('🎉 Ödev başarıyla yayınlandı!'); }
    resetForm();
  };

  const getQIcon = (ct) => {
    if (!ct) return <FileText size={13} color="#94a3b8" />;
    const c = ct.toLowerCase();
    if (c.includes('pdf')) return <FileText size={13} color="#f87171" />;
    if (c.includes('html')) return <Globe size={13} color="#60a5fa" />;
    if (c.includes('gorsel') || c.includes('image')) return <Image size={13} color="#34d399" />;
    if (c.includes('json')) return <FileJson size={13} color="#c084fc" />;
    return <FileText size={13} color="#94a3b8" />;
  };

  const pageContainerStyle = {
    minHeight: '100vh',
    width: '100%',
    maxWidth: '100%',
    margin: 0,
    padding: '1.25rem 1.5rem 5rem 1.5rem',
    background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.22) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(236, 72, 153, 0.18) 0%, transparent 45%), radial-gradient(ellipse at 50% 85%, rgba(14, 165, 233, 0.18) 0%, transparent 50%), linear-gradient(180deg, #070a12 0%, #0d1224 35%, #13112c 70%, #070a12 100%)',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    color: '#f8fafc',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem'
  };

  const glassCardStyle = {
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
    border: '1.5px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '1.5rem',
    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35)',
    backdropFilter: 'blur(20px)',
    padding: '1.5rem',
    boxSizing: 'border-box'
  };

  if (viewMode === 'list') {
    const now = new Date(new Date().setHours(0,0,0,0));
    const filteredHw = homeworks.filter(hw => {
      const past = new Date(hw.dueDate) < now;
      if (activeTab === 'active') return !past;
      if (activeTab === 'expired') return past;
      return true;
    });

    const isAllHwSelected = filteredHw.length > 0 && selectedHwListIds.length === filteredHw.length;

    const handleToggleSelectAllHw = () => {
      if (isAllHwSelected) {
        setSelectedHwListIds([]);
      } else {
        setSelectedHwListIds(filteredHw.map(h => h.id));
      }
    };

    const handleToggleHwSelect = (id, e) => {
      if (e) e.stopPropagation();
      setSelectedHwListIds(prev => 
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    };

    const handleDeleteSelectedHw = () => {
      if (selectedHwListIds.length === 0) return;
      const count = selectedHwListIds.length;
      if (!window.confirm(`Seçilen ${count} adet ödevi ve bunlara ait tüm öğrenci yanıtlarını silmek istediğinize emin misiniz?`)) return;

      selectedHwListIds.forEach(id => {
        deleteHomework(id);
        deleteSubmissionsByTestId(id);
      });
      setSelectedHwListIds([]);
      showToast(`🗑️ ${count} adet ödev başarıyla silindi!`);
    };

    return (
      <div style={pageContainerStyle}>
        <Toast msg={toast} />

        {/* ══════════ STICKY TOP CONTROL HEADER ══════════ */}
        <header style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
          border: '1.5px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '1.5rem',
          padding: '1.25rem 1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                if (window.history.length > 1) navigate(-1);
                else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
              }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                borderRadius: '0.75rem',
                padding: '0.55rem 0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <ArrowLeft size={16} /> Geri Dön
            </button>

            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.25rem 0.75rem', borderRadius: 99, background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(165,180,252,0.35)', color: '#c7d2fe', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                <Sparkles size={13} /> LMS Ödev & Görev Masası
              </div>
              <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#ffffff', lineHeight: 1.2 }}>
                Ödev & Test Yönetim Merkezi 📝
              </h1>
              <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)' }}>
                Sınıf veya bireysel öğrenci ödevlendirme, katılım takip raporları ve canlı sınav değerlendirmesi.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentUser?.role === 'admin' && (
              <button
                onClick={() => {
                  if (window.confirm('Tüm ödevleri silmek istediğinize emin misiniz?')) {
                    if (typeof deleteAllHomeworks === 'function') deleteAllHomeworks();
                    if (typeof deleteAllSubmissions === 'function') deleteAllSubmissions();
                  }
                }}
                style={{
                  padding: '0.55rem 1rem', borderRadius: '0.75rem',
                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
                  color: '#f87171', fontWeight: 800, fontSize: '0.78rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Trash2 size={14} /> Tümünü Sil
              </button>
            )}
            <button
              onClick={() => { resetForm(); setViewMode('create'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(99,102,241,0.45)'
              }}
            >
              <Sparkles size={16} /> + Yeni Ödev Sihirbazı
            </button>
          </div>
        </header>

        {/* ══════════ 4 LIVE KPI HERO METRIC CARDS ══════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
          <div
            onClick={() => { resetForm(); setViewMode('create'); }}
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(79, 70, 229, 0.35) 100%)',
              border: '1.5px solid rgba(165, 180, 252, 0.4)',
              borderRadius: '1.25rem', padding: '1rem 1.25rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              cursor: 'pointer', boxShadow: '0 8px 24px rgba(99,102,241,0.25)', backdropFilter: 'blur(16px)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(99, 102, 241, 0.3)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Yeni Görev</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>+ Oluştur</span>
              <span style={{ fontSize: '0.72rem', color: '#c7d2fe', fontWeight: 700 }}>Sihirbazı Başlat</span>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
            border: '1.5px solid rgba(52, 211, 153, 0.35)',
            borderRadius: '1.25rem', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Aktif Ödevler</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>{globalAnalytics.active} Ödev</span>
              <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>Süresi devam eden</span>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '1.25rem', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Trophy size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Ortalama Katılım</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>%{globalAnalytics.avgRate}</span>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700 }}>Öğrenci teslim oranı</span>
            </div>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '1.25rem', padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(16px)'
          }}>
            <div style={{ width: 48, height: 48, borderRadius: '0.85rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Süresi Bitenler</span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>{globalAnalytics.expired} Ödev</span>
              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 700 }}>Teslim süresi doldu</span>
            </div>
          </div>
        </div>

        {/* ══════════ HOMEWORK LIST CONTAINER ══════════ */}
        <div style={glassCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 900, fontSize: '1.05rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ClipboardList size={20} color="#818cf8" /> Ödev Havuzu & Takip Tablosu
              </div>

              {filteredHw.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAllHw}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                    border: isAllHwSelected ? '1.5px solid #818cf8' : '1.5px solid rgba(255,255,255,0.18)',
                    background: isAllHwSelected ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
                    color: '#ffffff', fontWeight: 800, fontSize: '0.75rem',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <CheckCheck size={14} />
                  {isAllHwSelected ? 'Tüm Seçimi Kaldır' : `Tümünü Seç (${filteredHw.length})`}
                </button>
              )}

              {selectedHwListIds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#c7d2fe', background: 'rgba(99,102,241,0.25)', padding: '0.3rem 0.65rem', borderRadius: '0.5rem', border: '1px solid rgba(165,180,252,0.35)' }}>
                    {selectedHwListIds.length} Seçildi
                  </span>
                  <button
                    type="button"
                    onClick={handleDeleteSelectedHw}
                    style={{
                      padding: '0.38rem 0.85rem', borderRadius: '0.6rem', border: 'none',
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff',
                      fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      boxShadow: '0 2px 8px rgba(220,38,38,0.35)'
                    }}
                  >
                    <Trash2 size={13} /> Seçilenleri Sil ({selectedHwListIds.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHwListIds([])}
                    style={{
                      padding: '0.35rem 0.6rem', borderRadius: '0.6rem',
                      border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.7)', fontWeight: 800, fontSize: '0.72rem', cursor: 'pointer'
                    }}
                  >
                    İptal
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.3rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              {[
                { key: 'all', label: 'Tümü (' + globalAnalytics.total + ')' },
                { key: 'active', label: 'Aktif (' + globalAnalytics.active + ')' },
                { key: 'expired', label: 'Biten (' + globalAnalytics.expired + ')' }
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => { setActiveTab(t.key); setSelectedHwListIds([]); }}
                  style={{
                    padding: '0.4rem 0.85rem', borderRadius: '0.55rem', border: 'none',
                    fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', whiteSpace: 'nowrap',
                    background: activeTab === t.key ? (t.key === 'expired' ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#4f46e5,#6366f1)') : 'transparent',
                    color: '#ffffff',
                    boxShadow: activeTab === t.key ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHw.length === 0 ? (
            <div style={{ padding: '3.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <BookOpen size={48} style={{ opacity: 0.25 }} />
              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '1.05rem' }}>Bu kategoride ödev bulunamadı.</div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>Yeni Ödev Sihirbazı aracılığıyla ilk ödevinizi tanımlayın!</div>
              <button
                onClick={() => { resetForm(); setViewMode('create'); }}
                style={{
                  marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '0.65rem 1.35rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
                  cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
                }}
              >
                <Plus size={15} /> Yeni Ödev Oluştur
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', minWidth: 780 }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                    <th style={{ width: 44, padding: '0.85rem 0.5rem 0.85rem 1rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllHwSelected}
                        onChange={handleToggleSelectAllHw}
                        style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                        title="Tümünü Seç / Kaldır"
                      />
                    </th>
                    {['Ödev / Başlık', 'Hedef Kitle', 'Son Tarih', 'İlerleme & Katılım', 'İşlemler'].map((h, i) => (
                      <th key={h} style={{ padding: '0.85rem 1rem', textAlign: i === 4 ? 'right' : 'left', fontWeight: 900, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredHw.map(hw => {
                    const stats = getHomeworkStats(hw);
                    const isPast = new Date(hw.dueDate) < now;
                    const theme = getTheme(hw.subject);
                    const isSelected = selectedHwListIds.includes(hw.id);

                    return (
                      <tr 
                        key={hw.id}
                        style={{ 
                          borderBottom: '1px solid rgba(255,255,255,0.06)', 
                          transition: 'background 0.15s',
                          background: isSelected ? 'rgba(99,102,241,0.15)' : 'transparent'
                        }}
                      >
                        <td style={{ width: 44, padding: '0.9rem 0.5rem 0.9rem 1rem', textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleToggleHwSelect(hw.id, e)}
                            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#6366f1' }}
                          />
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: `1px solid ${theme.border}` }}>
                              <BookOpen size={16} color="#fff" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: '#ffffff', fontSize: '0.88rem', lineHeight: 1.3 }}>{hw.title}</div>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
                                <span style={{ color: theme.color, fontWeight: 800 }}>{hw.subject || 'Ders'}</span> · {hw.totalQuestions} Soru · {hw.timePerQuestion} dk/soru
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem' }}>
                          <span style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: 99, whiteSpace: 'nowrap' }}>
                            {getTargetLabel(hw)}
                          </span>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 800, color: isPast ? '#f87171' : '#ffffff', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                            <Calendar size={13} color={isPast ? '#f87171' : '#818cf8'} /> {new Date(hw.dueDate).toLocaleDateString('tr-TR')}
                          </div>
                          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: isPast ? '#f87171' : '#34d399', marginTop: 2 }}>
                            {isPast ? '⚠️ Süresi Doldu' : '✅ Devam Ediyor'}
                          </div>
                        </td>
                        <td style={{ padding: '0.9rem 1rem', minWidth: 160 }}>
                          <GlassProgressBar value={stats.completed} max={stats.total} color={theme.color} />
                        </td>
                        <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button
                              onClick={() => { setActiveHomework(hw); setStatsStudentFilter('all'); setShowStatsModal(true); }}
                              style={{
                                padding: '0.4rem 0.85rem', borderRadius: '0.6rem',
                                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                                color: '#fff', border: 'none', fontWeight: 800, fontSize: '0.75rem',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                boxShadow: '0 2px 8px rgba(99,102,241,0.3)'
                              }}
                            >
                              <BarChart2 size={13} /> Rapor
                            </button>
                            <button
                              onClick={() => openEditPage(hw)}
                              style={{
                                padding: '0.4rem', borderRadius: '0.6rem',
                                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                                cursor: 'pointer', display: 'flex', color: 'rgba(255,255,255,0.8)'
                              }}
                              title="Düzenle"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Bu ödevi silmek istediğinize emin misiniz?')) {
                                  deleteHomework(hw.id);
                                  deleteSubmissionsByTestId(hw.id);
                                }
                              }}
                              style={{
                                padding: '0.4rem', borderRadius: '0.6rem',
                                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                                cursor: 'pointer', display: 'flex', color: '#f87171'
                              }}
                              title="Sil"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ══════════ REPORT / STATS MODAL ══════════ */}
        {showStatsModal && activeHomework && (() => {
          const stats = getHomeworkStats(activeHomework);
          const isPast = new Date(activeHomework.dueDate) < now;
          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,10,18,0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 27, 75, 0.98) 100%)',
                borderRadius: '1.5rem', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto',
                padding: '1.75rem', border: '1.5px solid rgba(255,255,255,0.18)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '1.15rem', color: '#ffffff' }}>{activeHomework.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                      Son Tarih: {new Date(activeHomework.dueDate).toLocaleDateString('tr-TR')} · {isPast ? '⚠️ Süresi Doldu' : '✅ Devam Ediyor'}
                    </div>
                  </div>
                  <button onClick={() => setShowStatsModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.7)' }}>
                    <X size={16} />
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8' }}>{stats.total}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#38bdf8', textTransform: 'uppercase', marginTop: 2 }}>Atanan Öğrenci</div>
                  </div>
                  <div style={{ background: 'rgba(52, 211, 153, 0.12)', border: '1px solid rgba(52, 211, 153, 0.3)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#34d399' }}>{stats.completed}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#34d399', textTransform: 'uppercase', marginTop: 2 }}>Tamamlayan</div>
                  </div>
                  <div style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '0.85rem', padding: '0.85rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fbbf24' }}>%{stats.rate}</div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#fbbf24', textTransform: 'uppercase', marginTop: 2 }}>Katılım Oranı</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '0.35rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {[
                    { key: 'all', label: 'Tümü (' + stats.total + ')' },
                    { key: 'completed', label: 'Çözenler (' + stats.completed + ')' },
                    { key: 'pending', label: 'Bekleyenler (' + (stats.total - stats.completed) + ')' },
                  ].map(f => (
                    <button
                      key={f.key}
                      onClick={() => setStatsStudentFilter(f.key)}
                      style={{
                        flex: 1, padding: '0.4rem 0.5rem', borderRadius: '0.55rem', border: 'none',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                        background: statsStudentFilter === f.key ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                        color: '#ffffff'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '38vh', overflowY: 'auto' }}>
                  {stats.targetStudentIds.filter(stId => {
                    const sub = submissions.find(s => (s.hwId === activeHomework.id || s.testId === activeHomework.id) && s.studentId === stId) || (activeHomework.submissions || []).find(s => s.studentId === stId);
                    if (statsStudentFilter === 'completed') return !!sub;
                    if (statsStudentFilter === 'pending') return !sub;
                    return true;
                  }).map(stId => {
                    const student = students.find(s => s.id === stId);
                    if (!student) return null;
                    const submission = (activeHomework.submissions || []).find(s => s.studentId === stId) || submissions.find(s => (s.hwId === activeHomework.id || s.testId === activeHomework.id) && s.studentId === stId);
                    const handleReview = () => {
                      setShowStatsModal(false);
                      if (activeHomework.type === 'physicalExam') navigate('/physical-exam/' + activeHomework.id + '?studentId=' + stId);
                      else if (submission?.id) navigate('/review/' + submission.id);
                      else navigate('/quiz/' + activeHomework.id + '?studentId=' + stId);
                    };

                    return (
                      <div key={stId} onClick={submission ? handleReview : undefined} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.65rem 0.9rem', borderRadius: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: submission ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.03)',
                        cursor: submission ? 'pointer' : 'default'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(255,255,255,0.2)' }}>
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff' }}>{student.name}</div>
                            {submission && <div style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 700 }}>İncelemek için tıkla</div>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          {submission ? (
                            <span style={{ background: 'rgba(5, 150, 105, 0.25)', color: '#34d399', fontWeight: 900, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                              {submission.score} {activeHomework.type === 'physicalExam' ? 'Net' : 'Puan'}
                            </span>
                          ) : (
                            <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', fontWeight: 800, fontSize: '0.72rem', padding: '0.25rem 0.6rem', borderRadius: '0.45rem', border: '1px solid rgba(251, 191, 36, 0.35)' }}>
                              Bekliyor
                            </span>
                          )}
                          {submission ? (
                            <button onClick={e => { e.stopPropagation(); handleReview(); }} style={{ background: 'rgba(99,102,241,0.2)', border: 'none', borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: '#c7d2fe', display: 'flex' }}>
                              <Eye size={14} />
                            </button>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); showToast(student.name + ' adlı öğrenciye hatırlatma bildirimi gönderildi!'); }} style={{ background: 'rgba(251,191,36,0.2)', border: 'none', borderRadius: '0.45rem', padding: '0.35rem', cursor: 'pointer', color: '#fbbf24', display: 'flex' }} title="Hatırlatma Gönder">
                              <Send size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // ══════════ VIEW MODE: CREATE / EDIT WIZARD ══════════
  const STEPS_DEF = [
    { id: 1, label: 'Temel Bilgiler', icon: ClipboardList, desc: 'Başlık, tarih, süre' },
    { id: 2, label: 'Hedef Kitle', icon: Users, desc: 'Sınıf veya öğrenci seçimi' },
    { id: 3, label: 'Soru Bankası & Test', icon: CheckSquare, desc: selectedQuestionIds.length + ' soru seçildi' },
  ];
  const selUnits = curData.units.filter(u => selSubject !== 'all' ? u.subjectId === selSubject : (selGrade !== 'all' ? curData.subjects.filter(s => s.gradeId === selGrade).map(s => s.id).includes(u.subjectId) : true));
  const selTopics = curData.topics.filter(t => selUnit !== 'all' ? t.unitId === selUnit : selUnits.map(u => u.id).includes(t.unitId));

  return (
    <div style={pageContainerStyle}>
      <Toast msg={toast} />

      {/* ── STICKY WIZARD HEADER ── */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.75rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)'
      }}>
        <button
          onClick={resetForm}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1.5px solid rgba(255,255,255,0.18)',
            borderRadius: '0.75rem',
            padding: '0.55rem 0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 800,
            color: '#ffffff'
          }}
        >
          <ArrowLeft size={15} /> Geri Dön
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#ffffff' }}>
            {editingHwId ? 'Ödevi Düzenle' : 'Yeni Ödev Sihirbazı ✨'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
            Adım {step}/3 · {STEPS_DEF[step-1]?.desc}
          </div>
        </div>

        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0.6rem 1.35rem', borderRadius: '0.75rem',
            background: 'linear-gradient(135deg,#059669,#10b981)',
            border: 'none', color: 'white', fontWeight: 900, fontSize: '0.82rem',
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.4)'
          }}
        >
          <CheckCheck size={16} /> Ödevi Yayınla
        </button>
      </header>

      {/* ── WIZARD STEP NAVIGATION BAR ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.92) 0%, rgba(30, 27, 75, 0.92) 100%)',
        border: '1.5px solid rgba(255, 255, 255, 0.14)',
        borderRadius: '1.25rem', padding: '0.5rem',
        display: 'flex', gap: '0.5rem', flexWrap: 'wrap'
      }}>
        {STEPS_DEF.map(s => {
          const isAct = step === s.id;
          const isDone = step > s.id;
          const canGo = s.id <= step || (s.id === 2 && canStep2) || (s.id === 3 && canStep2 && selectedTargets.length > 0);
          const SIcon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => canGo && setStep(s.id)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem', borderRadius: '0.85rem',
                border: isAct ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.08)',
                cursor: canGo ? 'pointer' : 'not-allowed',
                background: isAct ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : isDone ? 'rgba(5,150,105,0.2)' : 'rgba(255,255,255,0.04)',
                color: '#ffffff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                boxShadow: isAct ? '0 4px 14px rgba(99,102,241,0.4)' : 'none',
                opacity: canGo ? 1 : 0.5
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {isDone ? <CheckCircle size={15} color="#34d399" /> : <SIcon size={15} color={isAct ? '#fff' : '#818cf8'} />}
                <span style={{ fontWeight: 900, fontSize: '0.82rem' }}>{s.label}</span>
              </div>
              <span style={{ fontSize: '0.68rem', color: isAct ? '#c7d2fe' : 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{s.desc}</span>
            </button>
          );
        })}
      </div>

      {/* ── STEP 1: TEMEL BİLGİLER ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ClipboardList size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#ffffff' }}>Ödev Temel Bilgileri</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Ödev başlığı, son teslim tarihi ve soru başı süre ayarlarını belirleyin</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 4 }}>Ödev Başlığı *</label>
                <input
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.88rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box' }}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Örneğin: Hafta Sonu Matematik Üslü İfadeler Tarama Testi..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 6 }}>Son Teslim Tarihi *</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {[{ l: 'Yarın', d: 1 }, { l: '3 Gün', d: 3 }, { l: '1 Hafta', d: 7 }, { l: '2 Hafta', d: 14 }, { l: '1 Ay', d: 30 }].map(p => (
                    <button
                      key={p.l}
                      type="button"
                      onClick={() => setDueDatePreset(p.d)}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                        color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                      }}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
                <input
                  type="date"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.88rem', fontWeight: 600, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  onClick={e => e.target.showPicker && e.target.showPicker()}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: 6 }}>Soru Başı Süre (Dakika)</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  {[1, 2, 3, 5, 10].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimePerQuestion(t)}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: timePerQuestion === t ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.15)',
                        background: timePerQuestion === t ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
                        color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                      }}
                    >
                      {t} dk
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  style={{ width: 120, padding: '0.6rem 0.85rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.88rem', fontWeight: 800, outline: 'none' }}
                  value={timePerQuestion}
                  onChange={e => setTimePerQuestion(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { if (canStep2) setStep(2); else showToast('Lütfen başlık ve tarihi doldurun.'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.65rem 1.4rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
              }}
            >
              Hedef Kitleye Geç <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: HEDEF KİTLE ── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'linear-gradient(135deg,#059669,#10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Target size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '1rem', color: '#ffffff' }}>Ödev Hedef Kitlesi</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>Sınıf bazlı toplu atama veya tek tek bireysel öğrenci seçimi yapın</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', borderRadius: '0.85rem', padding: '0.35rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                {[{ k: 'grade', l: `Sınıf Bazlı (${curData.grades.length})` }, { k: 'student', l: `Bireysel Öğrenci (${filteredStudents.length})` }].map(m => (
                  <button
                    key={m.k}
                    onClick={() => { setTargetMode(m.k); setSelectedTargets([]); }}
                    style={{
                      flex: 1, padding: '0.6rem', borderRadius: '0.7rem', border: 'none',
                      fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                      background: targetMode === m.k ? 'linear-gradient(135deg,#059669,#10b981)' : 'transparent',
                      color: '#ffffff', boxShadow: targetMode === m.k ? '0 4px 12px rgba(16,185,129,0.35)' : 'none'
                    }}
                  >
                    {m.l}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399' }}>
                  {selectedTargets.length} hedef seçildi
                </span>
                <button
                  onClick={handleSelectAllTargets}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                    color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <CheckCheck size={13} /> Tümünü Seç / Kaldır
                </button>
              </div>

              {targetMode === 'grade' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  {curData.grades.map(g => {
                    const isSel = selectedTargets.includes(g.id);
                    return (
                      <div
                        key={g.id}
                        onClick={() => setSelectedTargets(prev => isSel ? prev.filter(x => x !== g.id) : [...prev, g.id])}
                        style={{
                          padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                          border: isSel ? '2px solid #34d399' : '1.5px solid rgba(255,255,255,0.1)',
                          background: isSel ? 'rgba(5, 150, 105, 0.25)' : 'rgba(255,255,255,0.04)',
                          display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: isSel ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <GraduationCap size={18} color="#ffffff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: '0.88rem', color: '#ffffff' }}>{g.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)' }}>
                            {students.filter(s => isStudentInGrade(s, g)).length} Öğrenci
                          </div>
                        </div>
                        {isSel && <CheckCircle size={18} color="#34d399" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setStudentGradeFilter('all')}
                      style={{
                        padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                        border: studentGradeFilter === 'all' ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.15)',
                        background: studentGradeFilter === 'all' ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
                        color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                      }}
                    >
                      Tüm Sınıflar
                    </button>
                    {curData.grades.map(g => (
                      <button
                        key={g.id}
                        onClick={() => setStudentGradeFilter(g.id)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                          border: studentGradeFilter === g.id ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.15)',
                          background: studentGradeFilter === g.id ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'rgba(255,255,255,0.06)',
                          color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem'
                        }}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', maxHeight: 320, overflowY: 'auto' }}>
                    {filteredStudents.map(s => {
                      const isSel = selectedTargets.includes(s.id);
                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedTargets(prev => isSel ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                          style={{
                            padding: '0.65rem 0.85rem', borderRadius: '0.85rem', cursor: 'pointer',
                            border: isSel ? '2px solid #34d399' : '1.5px solid rgba(255,255,255,0.1)',
                            background: isSel ? 'rgba(5, 150, 105, 0.25)' : 'rgba(255,255,255,0.04)',
                            display: 'flex', alignItems: 'center', gap: '0.6rem'
                          }}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: isSel ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.1)', color: '#ffffff', fontWeight: 900, fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {s.name.charAt(0)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)' }}>
                              {curData.grades.find(g => isStudentInGrade(s, g))?.name || s.grade || s.gradeId || 'Sınıf Belirtilmemiş'}
                            </div>
                          </div>
                          {isSel && <CheckCircle size={15} color="#34d399" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setStep(1)}
              style={{
                padding: '0.65rem 1.25rem', borderRadius: '0.75rem',
                border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem',
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <ArrowLeft size={15} /> Geri
            </button>
            <button
              onClick={() => { if (selectedTargets.length > 0) setStep(3); else showToast('Lütfen en az bir hedef seçin.'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0.65rem 1.4rem', borderRadius: '0.75rem',
                background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)'
              }}
            >
              Sorulara Geç <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SORU BANKASI & TEST SEÇİMİ ── */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* FILTER CRITERIA */}
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <Filter size={18} color="#818cf8" />
              <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#ffffff' }}>Soru Bankası Filtreleme</span>
              <span style={{ marginLeft: 'auto', background: 'rgba(99,102,241,0.25)', color: '#c7d2fe', fontWeight: 900, fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 99, border: '1px solid rgba(165,180,252,0.35)', whiteSpace: 'nowrap' }}>
                {filteredQuestions.length} soru bulundu
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.78rem', outline: 'none' }}
                value={selGrade}
                onChange={e => { setSelGrade(e.target.value); setSelSubject('all'); setSelUnit('all'); setSelTopic('all'); }}
              >
                <option value="all">Tüm Sınıflar</option>
                {curData.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.78rem', outline: 'none' }}
                value={selSubject}
                onChange={e => { setSelSubject(e.target.value); setSelUnit('all'); setSelTopic('all'); }}
              >
                <option value="all">Tüm Dersler</option>
                {curData.subjects.filter(s => selGrade === 'all' || s.gradeId === selGrade).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.78rem', outline: 'none' }}
                value={selUnit}
                onChange={e => { setSelUnit(e.target.value); setSelTopic('all'); }}
              >
                <option value="all">Tüm Üniteler</option>
                {selUnits.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.78rem', outline: 'none' }}
                value={selTopic}
                onChange={e => setSelTopic(e.target.value)}
              >
                <option value="all">Tüm Konular</option>
                {selTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.78rem', outline: 'none' }}
                value={selQuestionType}
                onChange={e => setSelQuestionType(e.target.value)}
              >
                <option value="all">Tüm Türler</option>
                <option value="coktan_secmeli">Çoktan Seçmeli</option>
                <option value="acik_uclu">Açık Uçlu</option>
                <option value="bundle">Soru Seti</option>
              </select>

              <select
                style={{ width: '100%', padding: '0.55rem', borderRadius: '0.65rem', border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(15,23,42,0.95)', color: '#ffffff', fontSize: '0.78rem', outline: 'none' }}
                value={selContentType}
                onChange={e => setSelContentType(e.target.value)}
              >
                <option value="all">Tüm Formatlar</option>
                <option value="pdf">PDF</option>
                <option value="html">HTML</option>
                <option value="text">Metin</option>
                <option value="gorsel">Görsel</option>
                <option value="json">JSON</option>
              </select>
            </div>

            <div style={{ position: 'relative', marginTop: '0.65rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
              <input
                style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.4rem', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.07)', color: '#ffffff', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Soru metni veya başlıkla ara..."
              />
            </div>
          </div>

          {/* QUESTIONS CHECKLIST */}
          <div style={glassCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255,255,255,0.08)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontWeight: 900, fontSize: '0.95rem', color: '#ffffff' }}>
                Soru Bankası Listesi
                <span style={{ background: 'rgba(52, 211, 153, 0.25)', color: '#34d399', fontSize: '0.75rem', fontWeight: 900, padding: '0.2rem 0.6rem', borderRadius: 99, marginLeft: '0.5rem', border: '1px solid rgba(52, 211, 153, 0.4)' }}>
                  {selectedQuestionIds.length} soru seçildi
                </span>
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={handleSelectAllFiltered}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                    border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                    color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                    display: 'flex', alignItems: 'center', gap: 4
                  }}
                >
                  <CheckCheck size={13} /> Tümünü Seç / Kaldır
                </button>
                {selectedQuestionIds.length > 0 && (
                  <button
                    onClick={() => setSelectedQuestionIds([])}
                    style={{
                      padding: '0.35rem 0.75rem', borderRadius: '0.6rem',
                      border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.15)',
                      color: '#f87171', cursor: 'pointer', fontWeight: 800, fontSize: '0.75rem',
                      display: 'flex', alignItems: 'center', gap: 4
                    }}
                  >
                    <RefreshCw size={13} /> Sıfırla
                  </button>
                )}
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Search size={40} style={{ opacity: 0.25 }} />
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#ffffff' }}>Bu filtreye uygun soru bulunamadı.</div>
              </div>
            ) : (
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.75rem', paddingRight: 4 }}>
                {filteredQuestions.map(q => {
                  const isSel = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => toggleQ(q.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem', borderRadius: '0.85rem',
                        border: isSel ? '1.5px solid rgba(165,180,252,0.6)' : '1px solid rgba(255,255,255,0.08)',
                        background: isSel ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                        cursor: 'pointer', transition: 'all 0.1s'
                      }}
                    >
                      <div style={{
                        width: 22, height: 22, borderRadius: '0.45rem', flexShrink: 0,
                        border: isSel ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        background: isSel ? 'linear-gradient(135deg,#4f46e5,#6366f1)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSel && <Check size={14} color="#fff" strokeWidth={3} />}
                      </div>
                      <div style={{ width: 34, height: 34, borderRadius: '0.6rem', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {getQIcon(q.contentType)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title || q.name || 'Başlıksız Soru'}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: 2, display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {q.isBundle && <span style={{ background: 'rgba(192, 132, 252, 0.2)', color: '#c084fc', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: '1px solid rgba(192, 132, 252, 0.35)' }}>{(q.questionCount || q.questionsList?.length || 1)} Soru Seti</span>}
                          {q.type === 'acik_uclu' && <span style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '0.35rem', border: '1px solid rgba(251, 191, 36, 0.35)' }}>Açık Uçlu</span>}
                          {q.contentType && <span>Format: {q.contentType}</span>}
                        </div>
                      </div>
                      {isSel && (
                        <span style={{ background: '#4f46e5', color: '#fff', fontWeight: 900, fontSize: '0.65rem', padding: '0.15rem 0.55rem', borderRadius: 99, flexShrink: 0, boxShadow: '0 2px 8px rgba(79,70,229,0.5)' }}>
                          SEÇİLDİ
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* TOPLU ATAMA BİÇİMİ (IF > 1 TEST) */}
          {selectedQuestionIds.length > 1 && !editingHwId && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '2px solid rgba(165, 180, 252, 0.5)',
              borderRadius: '1.5rem', padding: '1.5rem',
              boxShadow: '0 12px 36px rgba(99,102,241,0.2)',
              display: 'flex', flexDirection: 'column', gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Layers size={22} color="#818cf8" />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1rem', color: '#ffffff' }}>
                    Toplu Ödev Atama Biçimi ({selectedQuestionIds.length} Test Seçildi)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>
                    Seçtiğiniz testlerin öğrencilere nasıl atanacağını belirleyin:
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.85rem' }}>
                <div
                  onClick={() => setAssignmentMode('separate')}
                  style={{
                    padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                    border: assignmentMode === 'separate' ? '2px solid #818cf8' : '1.5px solid rgba(255,255,255,0.1)',
                    background: assignmentMode === 'separate' ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="radio"
                    name="assignmentMode"
                    checked={assignmentMode === 'separate'}
                    onChange={() => setAssignmentMode('separate')}
                    style={{ marginTop: '0.2rem', accentColor: '#6366f1', cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#ffffff' }}>
                      📑 Ayrı Ayrı Tekil Ödevler Olarak Ata (Önerilen)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      Her test bağımsız birer ödev olarak oluşturulur. Öğrenci her testi kendi ekranında tek tek çözer ({selectedQuestionIds.length} adet bağımsız ödev).
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => setAssignmentMode('combined')}
                  style={{
                    padding: '1rem', borderRadius: '1rem', cursor: 'pointer',
                    border: assignmentMode === 'combined' ? '2px solid #c084fc' : '1.5px solid rgba(255,255,255,0.1)',
                    background: assignmentMode === 'combined' ? 'rgba(192, 132, 252, 0.25)' : 'rgba(255,255,255,0.04)',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="radio"
                    name="assignmentMode"
                    checked={assignmentMode === 'combined'}
                    onChange={() => setAssignmentMode('combined')}
                    style={{ marginTop: '0.2rem', accentColor: '#c084fc', cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <div>
                    <div style={{ fontWeight: 900, fontSize: '0.9rem', color: '#ffffff' }}>
                      📚 Birleşik / Bölümlü Tek Ödev Olarak Ata
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.65)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                      Tüm testler tek bir ödev çatısı altında toplanır (Bölüm 1, Bölüm 2... şeklinde tek seferde çözülür).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOTTOM SUMMARY & PUBLISH BAR */}
          <div style={{ ...glassCardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: '0.95rem', color: '#ffffff' }}>
                {selectedQuestionIds.length > 0 ? `${selectedQuestionIds.length} Soru / Test Seçildi` : 'Henüz soru seçilmedi'}
              </div>
              {selectedQuestionIds.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
                  Tahmini süre: ~{selectedQuestionIds.length * timePerQuestion} dakika
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                onClick={() => setStep(2)}
                style={{
                  padding: '0.65rem 1.25rem', borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)',
                  color: '#ffffff', cursor: 'pointer', fontWeight: 800, fontSize: '0.82rem',
                  display: 'flex', alignItems: 'center', gap: 4
                }}
              >
                <ArrowLeft size={15} /> Geri
              </button>
              <button
                onClick={handleSave}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '0.65rem 1.5rem', borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg,#059669,#10b981)',
                  border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem',
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(16,185,129,0.45)'
                }}
              >
                <Sparkles size={16} />{' '}
                {editingHwId
                  ? 'Ödevi Güncelle'
                  : selectedQuestionIds.length > 1 && assignmentMode === 'separate'
                  ? `${selectedQuestionIds.length} Ödevi Ayrı Ayrı Yayınla!`
                  : 'Ödevi Yayınla!'}
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
