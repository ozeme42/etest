import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useCurriculum } from '../context/CurriculumContext';
import { useTrackedBooks } from '../context/TrackedBookContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2, Search, ArrowLeft, Eye, Edit3
} from 'lucide-react';

function detectSubject(title = '', existingSubject = '') {
  if (existingSubject && !['genel', 'diğer', 'all', ''].includes(String(existingSubject).toLowerCase().trim())) {
    return existingSubject;
  }
  const t = (String(title) + ' ' + String(existingSubject || '')).toLowerCase();
  if (t.includes('matematik') || t.includes('mat')) return 'Matematik';
  if (t.includes('fen')) return 'Fen Bilimleri';
  if (t.includes('türkçe') || t.includes('turkce') || t.includes('türk')) return 'Türkçe';
  if (t.includes('sosyal') || t.includes('inkılap') || t.includes('tarih')) return 'Sosyal Bilgiler';
  if (t.includes('ingilizce') || t.includes('english') || t.includes('ing')) return 'İngilizce';
  if (t.includes('din') || t.includes('ahlak') || t.includes('ilmihal')) return 'Din Kültürü';
  if (t.includes('deneme') || t.includes('lgs') || t.includes('tarama')) return 'Genel Deneme';
  return 'Genel Ödevler';
}

function getOpenEndedCategory(sub, hw, allBankQuestions = []) {
  const candidates = [sub, hw].filter(Boolean);

  if (Array.isArray(hw?.sections)) {
    hw.sections.forEach(s => {
      if (s && typeof s === 'object') {
        candidates.push(s);
        if (s.bankQ) candidates.push(s.bankQ);
      }
    });
  }

  const refIds = new Set([
    ...(Array.isArray(hw?.questionIds) ? hw.questionIds : []),
    ...(Array.isArray(hw?.tests) ? hw.tests : []),
    ...(Array.isArray(hw?.selectedQuestions) ? hw.selectedQuestions : []),
    ...(Array.isArray(hw?.sections) ? hw.sections.map(s => typeof s === 'object' ? (s.id || s.questionId || s.bankQ?.id) : s) : []),
    ...(Array.isArray(sub?.questionIds) ? sub.questionIds : []),
    ...(Array.isArray(sub?.tests) ? sub.tests : []),
    ...(Array.isArray(sub?.answers) ? sub.answers.map(a => a?.questionId) : []),
    sub?.testId, sub?.homeworkId, sub?.hwId, sub?.questionId, hw?.questionId, hw?.testId
  ].filter(Boolean).map(String));

  refIds.forEach(id => {
    const cleanId = id.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
    const foundList = (allBankQuestions || []).filter(q =>
      String(q.id) === id ||
      String(q.id).replace(/^q_?/, '') === cleanId ||
      String(q.questionId) === id ||
      String(q.testId) === id
    );
    foundList.forEach(found => {
      if (!candidates.includes(found)) candidates.push(found);
    });
  });

  const targetTitle = (sub?.testTitle || sub?.title || hw?.title || '').trim().toLowerCase();
  if (targetTitle) {
    const titleMatches = (allBankQuestions || []).filter(q =>
      (q.title && q.title.trim().toLowerCase() === targetTitle) ||
      (q.name && q.name.trim().toLowerCase() === targetTitle)
    );
    titleMatches.forEach(tm => {
      if (!candidates.includes(tm)) candidates.push(tm);
    });
  }

  if (Array.isArray(sub?.answers)) {
    sub.answers.forEach(a => {
      if (a && typeof a === 'object') candidates.push(a);
    });
  }

  // 1. PDF Kontrolü
  const isPdf = candidates.some(o => {
    if (!o) return false;
    if (o.pdfPayload || o.pdfUrl) return true;
    const ct = String(o.contentType || o.formatType || o.sourceFormat || o.type || o.documentType || '').toLowerCase();
    if (ct.includes('pdf')) return true;
    if (typeof o.contentPayload === 'string' && (o.contentPayload.includes('.pdf') || o.contentPayload.startsWith('data:application/pdf') || o.contentPayload.startsWith('%PDF'))) return true;
    return false;
  });

  const titles = candidates.map(o => String(o.title || o.testTitle || o.name || '')).join(' ').toLowerCase();
  if (isPdf || titles.includes('.pdf') || titles.includes('pdf sınav') || titles.includes('pdf ödev') || titles.includes('pdf kitapçık') || titles.includes('pdf testi') || titles.includes('(pdf)')) {
    return 'pdf';
  }

  // 2. HTML Kontrolü
  const isHtml = candidates.some(o => {
    if (!o) return false;
    if (o.htmlPayload || o.htmlUrl) return true;
    const ct = String(o.contentType || o.formatType || o.sourceFormat || o.type || o.documentType || '').toLowerCase();
    if (ct.includes('html')) return true;
    if (typeof o.contentPayload === 'string' && (o.contentPayload.includes('<html') || o.contentPayload.includes('<!DOCTYPE') || o.contentPayload.startsWith('data:text/html'))) return true;
    return false;
  });

  if (isHtml || titles.includes('.html') || titles.includes('html sınav') || titles.includes('html ödev') || titles.includes('web testi') || titles.includes('html testi') || titles.includes('(html)')) {
    return 'html';
  }

  // 3. Görsel Kontrolü
  const isImage = candidates.some(o => {
    if (!o) return false;
    if (o.imageUrl && o.imageUrl !== '[STORED_IN_INDEXEDDB]') return true;
    if (Array.isArray(o.imageUrls) && o.imageUrls.length > 0) return true;
    const ct = String(o.contentType || o.formatType || o.sourceFormat || o.type || o.questionType || '').toLowerCase();
    if (ct.includes('gorsel') || ct.includes('image')) return true;
    return false;
  });

  if (isImage || titles.includes('görsel') || titles.includes('resimli') || titles.includes('görselli') || titles.includes('fotoğraf')) {
    return 'image';
  }

  return 'text';
}

const CATEGORY_META = {
  text: { label: 'Yazılı / Metin', icon: '📝', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  image: { label: 'Görselli Soru', icon: '🖼️', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  pdf: { label: 'PDF Sınavı', icon: '📄', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  html: { label: 'HTML Sınavı', icon: '🌐', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' }
};

export default function EvaluationManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions } = useEvaluation();
  const { questions: allBankQuestions } = useQuestionBank();

  const [formatTab, setFormatTab] = useState('all');
  const [statusTab, setStatusTab] = useState('all');
  const [search, setSearch] = useState('');

  const openEndedSubmissions = useMemo(() => {
    const activeHws = (homeworks || []).filter(hw => hw && hw.id);
    const map = new Map();

    const isBookTaskOrBookTest = (item) => {
      if (!item) return false;
      if (item.bookId || item.bookTestId || item.isBookTask || item.isBookTest) return true;
      const sId = String(item.id || '');
      const tId = String(item.testId || '');
      const hwId = String(item.homeworkId || item.hwId || '');
      if (sId.startsWith('bt_') || sId.startsWith('book_') || sId.startsWith('tbt_')) return true;
      if (tId.startsWith('bt_') || tId.startsWith('book_') || tId.startsWith('tbt_')) return true;
      if (hwId.startsWith('bt_') || hwId.startsWith('book_') || hwId.startsWith('tbt_')) return true;
      return false;
    };

    activeHws.forEach(hw => {
      if (isBookTaskOrBookTest(hw)) return;

      (hw.submissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        if (isBookTaskOrBookTest(sub)) return;

        const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
        map.set(subKey, {
          ...sub,
          id: subKey,
          homeworkId: hw.id,
          hwId: hw.id,
          testId: hw.id,
          testTitle: hw.title,
          subject: hw.subject,
          totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
          submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
        });
      });

      (allSubmissions || []).forEach(sub => {
        if (!sub || !sub.studentId) return;
        if (isBookTaskOrBookTest(sub)) return;

        const targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.id || '');
        const normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');
        
        const matchesHw = String(hw.id) === targetId ||
          String(hw.id) === normTargetId ||
          String(hw.id) === String(sub.hwId) ||
          String(hw.id) === String(sub.homeworkId) ||
          (hw.submissions && hw.submissions.some(s => String(s.id) === String(sub.id)));

        if (matchesHw) {
          const subKey = String(sub.id || `hw_sub_${hw.id}_${sub.studentId}`);
          const existing = map.get(subKey);
          if (!existing || (sub.isEvaluatedByTeacher && !existing.isEvaluatedByTeacher) || new Date(sub.submittedAt || 0) > new Date(existing.submittedAt || 0)) {
            map.set(subKey, {
              ...sub,
              id: subKey,
              homeworkId: hw.id,
              hwId: hw.id,
              testId: hw.id,
              testTitle: hw.title,
              subject: hw.subject,
              totalQuestions: hw.totalQuestions || hw.questionCount || sub.totalQuestions,
              submittedAt: sub.completedAt || sub.submittedAt || hw.createdAt || new Date().toISOString()
            });
          }
        }
      });
    });

    (allSubmissions || []).forEach(sub => {
      if (!sub || !sub.studentId) return;
      if (isBookTaskOrBookTest(sub)) return;

      const subKey = String(sub.id || `sub_${Date.now()}`);
      if (!map.has(subKey)) {
        map.set(subKey, sub);
      }
    });

    return Array.from(map.values());
  }, [allSubmissions, homeworks]);

  const enrichedSubmissions = useMemo(() => {
    return openEndedSubmissions.map(sub => {
      let studentName = sub.studentName;
      const sId = String(sub.studentId || sub.userId || sub.user_id || '');
      if (!studentName || studentName === 'Öğrenci' || !studentName.trim()) {
        const matchedUser = (users || []).find(u => String(u.id) === sId || String(u.studentId) === sId);
        if (matchedUser && matchedUser.name) {
          studentName = matchedUser.name;
        } else if (sId) {
          studentName = `Öğrenci (#${sId.slice(-4)})`;
        } else {
          studentName = 'Öğrenci';
        }
      }

      let targetId = String(sub.homeworkId || sub.hwId || sub.testId || sub.questionId || sub.id || '');
      let normTargetId = targetId.replace(/^q_?|^hw_?|^test_?|^sub_?/, '');

      let matchedHw = (homeworks || []).find(h =>
        String(h.id) === targetId ||
        String(h.id) === normTargetId ||
        String(h.testId) === targetId ||
        (h.submissions && h.submissions.some(s => String(s.id) === String(sub.id)))
      );

      let title = sub.testTitle || sub.homeworkTitle || sub.title;
      if (!title || ['sınav', 'test', 'ödev'].includes(String(title).trim().toLowerCase())) {
        if (matchedHw?.title) title = matchedHw.title;
        else title = 'Açık Uçlu Ödev';
      }

      let subject = detectSubject(title, sub.subject || matchedHw?.subject);

      let score = sub.score;
      if (score !== undefined && score !== null) {
        score = Math.max(0, Math.min(100, Math.round(Number(score))));
      }

      const isAlreadyEvaluated = sub.status === 'evaluated' || sub.status === 'graded' || sub.isEvaluatedByTeacher === true;
      const isPending = !isAlreadyEvaluated;
      const category = getOpenEndedCategory(sub, matchedHw, allBankQuestions);

      return {
        ...sub,
        studentName,
        testTitle: title,
        subject,
        score,
        isPending,
        isAlreadyEvaluated,
        category,
        matchedHw
      };
    }).sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
  }, [openEndedSubmissions, users, homeworks, allBankQuestions]);

  const filteredSubmissions = useMemo(() => {
    return enrichedSubmissions.filter(sub => {
      if (formatTab !== 'all' && sub.category !== formatTab) return false;
      if (statusTab === 'pending' && !sub.isPending) return false;
      if (statusTab === 'completed' && sub.isPending) return false;

      const q = search.toLowerCase().trim();
      if (q) {
        const sName = String(sub.studentName || '').toLowerCase();
        const tTitle = String(sub.testTitle || '').toLowerCase();
        if (!sName.includes(q) && !tTitle.includes(q)) return false;
      }
      return true;
    });
  }, [enrichedSubmissions, formatTab, statusTab, search]);

  const counts = useMemo(() => {
    return {
      all: enrichedSubmissions.length,
      text: enrichedSubmissions.filter(s => s.category === 'text').length,
      image: enrichedSubmissions.filter(s => s.category === 'image').length,
      pdf: enrichedSubmissions.filter(s => s.category === 'pdf').length,
      html: enrichedSubmissions.filter(s => s.category === 'html').length,
      pending: enrichedSubmissions.filter(s => s.isPending).length,
      completed: enrichedSubmissions.filter(s => !s.isPending).length
    };
  }, [enrichedSubmissions]);

  const handleOpenReview = (sub) => {
    const targetTestId = sub.testId || sub.homeworkId || sub.hwId || sub.questionId || sub.id;
    const studentId = sub.studentId || sub.userId || '';
    navigate(`/quiz-review/${targetTestId}?studentId=${studentId}&teacher=true`, {
      state: { from: '/evaluation', fromTeacher: true, isTeacher: true, submissionId: sub.id }
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a', padding: '1.5rem 2rem 5rem 2rem', boxSizing: 'border-box', fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1.25rem', padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate(currentUser?.role === 'admin' ? '/admin' : '/teacher');
            }}
            style={{
              background: '#f1f5f9', border: '1px solid #cbd5e1',
              borderRadius: '0.65rem', padding: '0.5rem 0.95rem',
              color: '#334155', fontWeight: 800, fontSize: '0.84rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4
            }}
          >
            <ArrowLeft size={16} /> Panel
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✍️</span> Açık Uçlu Sınav & Ödev Değerlendirme
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Öğrenci sınav kağıtlarını ve ödev yanıtlarını standart inceleme ekranında doğrudan puanlayın
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {counts.pending > 0 && (
            <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '0.4rem 0.85rem', borderRadius: 99, fontWeight: 900, fontSize: '0.8rem' }}>
              ⏳ {counts.pending} Ödev Notlama Bekliyor
            </span>
          )}
        </div>
      </div>

      {/* ── 4 KATEGORİ SEKMELERİ ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          onClick={() => setFormatTab('all')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'all' ? '2px solid #4f46e5' : '1.5px solid #e2e8f0',
            background: formatTab === 'all' ? '#ffffff' : '#ffffff',
            boxShadow: formatTab === 'all' ? '0 4px 12px rgba(79, 70, 229, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📋</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'all' ? '#4f46e5' : '#334155' }}>Tüm Ödevler</span>
          </div>
          <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('text')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'text' ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
            background: formatTab === 'text' ? '#eff6ff' : '#ffffff',
            boxShadow: formatTab === 'text' ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📝</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'text' ? '#2563eb' : '#334155' }}>Yazılı / Metin</span>
          </div>
          <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.text}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('image')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'image' ? '2px solid #7c3aed' : '1.5px solid #e2e8f0',
            background: formatTab === 'image' ? '#faf5ff' : '#ffffff',
            boxShadow: formatTab === 'image' ? '0 4px 12px rgba(124, 58, 237, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>🖼️</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'image' ? '#7c3aed' : '#334155' }}>Görselli Sorular</span>
          </div>
          <span style={{ background: '#f3e8ff', color: '#6d28d9', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.image}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('pdf')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'pdf' ? '2px solid #dc2626' : '1.5px solid #e2e8f0',
            background: formatTab === 'pdf' ? '#fef2f2' : '#ffffff',
            boxShadow: formatTab === 'pdf' ? '0 4px 12px rgba(220, 38, 38, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'pdf' ? '#dc2626' : '#334155' }}>PDF Sınavları</span>
          </div>
          <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.pdf}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFormatTab('html')}
          style={{
            padding: '0.85rem 1rem', borderRadius: '1rem',
            border: formatTab === 'html' ? '2px solid #059669' : '1.5px solid #e2e8f0',
            background: formatTab === 'html' ? '#ecfdf5' : '#ffffff',
            boxShadow: formatTab === 'html' ? '0 4px 12px rgba(5, 150, 105, 0.12)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.2rem' }}>🌐</span>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: formatTab === 'html' ? '#059669' : '#334155' }}>HTML Sınavları</span>
          </div>
          <span style={{ background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: 99, fontWeight: 900, fontSize: '0.75rem' }}>
            {counts.html}
          </span>
        </button>
      </div>

      {/* Durum & Arama Filtresi */}
      <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '1rem', padding: '0.85rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setStatusTab('all')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'all' ? '#334155' : '#f8fafc',
              color: statusTab === 'all' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            Tümü
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'pending' ? '#d97706' : '#f8fafc',
              color: statusTab === 'pending' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            ⏳ Bekleyenler ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('completed')}
            style={{
              padding: '0.4rem 0.85rem', borderRadius: '0.5rem',
              border: '1px solid #cbd5e1',
              background: statusTab === 'completed' ? '#059669' : '#f8fafc',
              color: statusTab === 'completed' ? '#ffffff' : '#475569',
              fontWeight: 800, fontSize: '0.78rem', cursor: 'pointer'
            }}
          >
            ✅ Tamamlananlar ({counts.completed})
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Öğrenci veya ödev ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.45rem 0.75rem 0.45rem 2rem',
              borderRadius: '0.5rem', background: '#f8fafc',
              border: '1px solid #cbd5e1', color: '#0f172a', fontSize: '0.82rem',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div style={{ background: '#ffffff', border: '1.5px dashed #cbd5e1', borderRadius: '1.25rem', padding: '4rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
          <CheckCircle2 size={42} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
          <h3 style={{ margin: 0, fontWeight: 900, color: '#0f172a' }}>
            {statusTab === 'pending' ? 'Tebrikler! Değerlendirme Bekleyen Açık Uçlu Ödev Yok' : 'Bu Kategoride Ödev Bulunamadı'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
            {statusTab === 'pending' ? 'Tüm açık uçlu ödev teslimleri başarıyla sonuçlandırılmıştır.' : 'Seçili filtre ve kategoriye uygun açık uçlu ödev kaydı bulunmuyor.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredSubmissions.map(sub => {
            const cardMeta = CATEGORY_META[sub.category] || CATEGORY_META.text;

            return (
              <div
                key={sub.id}
                style={{
                  background: '#ffffff',
                  border: `1.5px solid ${sub.isPending ? '#fde68a' : '#e2e8f0'}`,
                  borderRadius: '1rem',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#0f172a' }}>
                    🎓 {sub.studentName}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{
                      background: cardMeta.bg, color: cardMeta.color,
                      border: `1px solid ${cardMeta.border}`,
                      padding: '2px 7px', borderRadius: 6, fontWeight: 800, fontSize: '0.7rem'
                    }}>
                      {cardMeta.icon} {cardMeta.label}
                    </span>
                    <span style={{
                      background: sub.isPending ? '#fef3c7' : '#ecfdf5',
                      color: sub.isPending ? '#b45309' : '#047857',
                      border: `1px solid ${sub.isPending ? '#fde68a' : '#a7f3d0'}`,
                      padding: '2px 8px', borderRadius: 99, fontWeight: 800, fontSize: '0.72rem'
                    }}>
                      {sub.isPending ? '⏳ Bekliyor' : `%${sub.score || 0}`}
                    </span>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', lineHeight: 1.4 }}>
                  {sub.testTitle}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: 'auto' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                    📚 {sub.subject}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenReview(sub)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      background: sub.isPending ? 'linear-gradient(135deg, #d97706, #f59e0b)' : 'linear-gradient(135deg, #059669, #10b981)',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0.45rem 0.95rem',
                      color: 'white',
                      fontWeight: 900,
                      fontSize: '0.8rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} /> {sub.isPending ? 'Puanla & Değerlendir' : 'İncele'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
