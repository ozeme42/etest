import { useState, useMemo } from 'react';
import { useEvaluation } from '../context/EvaluationContext';
import { useQuestionBank } from '../context/QuestionBankContext';
import { useUser } from '../context/UserContext';
import { useHomework } from '../context/HomeworkContext';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle, XCircle, Clock3, Eye, Save, ArrowLeft,
  ClipboardList, Users, BookOpen, Star, ChevronRight,
  AlertCircle, Search, Filter, Layers
} from 'lucide-react';
import QuizRunner from './QuizRunner';

export default function EvaluationManager() {
  const { currentUser } = useAuth();
  const { users } = useUser();
  const { homeworks } = useHomework();
  const { submissions: allSubmissions, evaluateAnswer, finalizeSubmission } = useEvaluation();
  const { questions } = useQuestionBank();

  const [activeSubmissionId, setActiveSubmissionId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [search, setSearch] = useState('');

  const submissions = useMemo(() => allSubmissions || [], [allSubmissions]);

  const pendingSubmissions = useMemo(() =>
    submissions.filter(sub =>
      sub.status === 'pending_evaluation' ||
      sub.status === 'submitted' ||
      (Array.isArray(sub.answers) && sub.answers.some(ans => ans.type === 'acik_uclu' || ans.isCorrect === null || ans.isCorrect === undefined))
    ), [submissions]);

  const completedSubmissions = useMemo(() => {
    const pendingIds = new Set(pendingSubmissions.map(p => p.id));
    return submissions.filter(sub => !pendingIds.has(sub.id));
  }, [submissions, pendingSubmissions]);

  const activeSubmission = submissions.find(s => s.id === activeSubmissionId);

  const handleFinalize = () => {
    finalizeSubmission(activeSubmissionId);
    setActiveSubmissionId(null);
  };

  const displayList = (activeTab === 'pending' ? pendingSubmissions : completedSubmissions)
    .filter(sub =>
      !search ||
      sub.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      sub.testTitle?.toLowerCase().includes(search.toLowerCase())
    );

  // Stats
  const totalPending = pendingSubmissions.length;
  const totalCompleted = completedSubmissions.length;
  const avgScore = completedSubmissions.length > 0
    ? Math.round(completedSubmissions.reduce((acc, s) => acc + (s.score || 0), 0) / completedSubmissions.length)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)',
      fontFamily: "'Inter', system-ui, sans-serif",
      color: '#f8fafc',
      position: 'relative',
    }}>

      {/* Background decorative blobs */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-5%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-5%', width: 600, height: 600,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0
      }} />

      {/* ── TOP HEADER ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15,23,42,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(99,102,241,0.2)',
        padding: '0 2rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 64, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 42, height: 42, borderRadius: '14px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.5)'
          }}>
            <ClipboardList size={22} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#818cf8', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              E-Test LMS
            </div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
              Değerlendirme Merkezi
            </h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {totalPending > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: '50px', padding: '0.35rem 1rem',
            }}>
              <AlertCircle size={14} color="#f87171" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#fca5a5' }}>
                {totalPending} Bekleyen
              </span>
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: '50px', padding: '0.35rem 1rem',
          }}>
            <CheckCircle size={14} color="#34d399" />
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#6ee7b7' }}>
              {totalCompleted} Tamamlandı
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { icon: <Clock3 size={22} />, label: 'Bekleyen Kağıt', value: totalPending, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
            { icon: <CheckCircle size={22} />, label: 'Sonuçlandırılan', value: totalCompleted, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
            { icon: <Star size={22} />, label: 'Ortalama Puan', value: `${avgScore}`, color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' },
          ].map((stat, idx) => (
            <div key={idx} style={{
              background: stat.bg, border: `1px solid ${stat.border}`,
              borderRadius: '1.25rem', padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: '12px',
                background: stat.bg, border: `1px solid ${stat.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.color, flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: stat.color, lineHeight: 1.1 }}>
                  {stat.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TAB BAR ── */}
        <div style={{
          background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1.25rem',
          padding: '0.375rem', display: 'flex', gap: '0.25rem', marginBottom: '1.5rem',
        }}>
          {[
            { key: 'pending', label: `⏳ Bekleyenler`, count: totalPending, activeColor: '#f59e0b' },
            { key: 'completed', label: `✅ Tamamlananlar`, count: totalCompleted, activeColor: '#10b981' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '0.65rem 1rem', borderRadius: '0.875rem',
                border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.88rem',
                transition: 'all 0.2s',
                background: activeTab === tab.key
                  ? 'rgba(99,102,241,0.25)'
                  : 'transparent',
                color: activeTab === tab.key ? '#c7d2fe' : '#64748b',
                boxShadow: activeTab === tab.key ? '0 0 0 1px rgba(99,102,241,0.4)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '0.7rem', fontWeight: 900, padding: '0.1rem 0.5rem',
                borderRadius: '50px',
                background: activeTab === tab.key ? 'rgba(99,102,241,0.4)' : 'rgba(100,116,139,0.2)',
                color: activeTab === tab.key ? '#a5b4fc' : '#64748b',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ── SEARCH BAR ── */}
        <div style={{
          position: 'relative', marginBottom: '1.25rem',
        }}>
          <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Öğrenci adı veya test ismine göre ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem',
              background: 'rgba(30,41,59,0.7)', backdropFilter: 'blur(10px)',
              border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.875rem',
              color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* ── SUBMISSIONS LIST ── */}
        {displayList.length === 0 ? (
          <div style={{
            background: 'rgba(30,41,59,0.5)', border: '1px dashed rgba(99,102,241,0.2)',
            borderRadius: '1.25rem', padding: '4rem 2rem', textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
              {activeTab === 'pending' ? '🎉' : '📋'}
            </div>
            <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: '1rem', margin: 0 }}>
              {activeTab === 'pending'
                ? 'Harika! Değerlendirme bekleyen kağıt bulunmuyor.'
                : 'Henüz sonuçlandırılan sınav yok.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {displayList.map(sub => {
              const isPending = pendingSubmissions.some(p => p.id === sub.id);
              const initial = sub.studentName?.charAt(0)?.toUpperCase() || 'Ö';
              // generate a deterministic hue from studentName
              const hue = (sub.studentName || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

              return (
                <div
                  key={sub.id}
                  onClick={() => setActiveSubmissionId(sub.id)}
                  style={{
                    background: 'rgba(30,41,59,0.75)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '1.25rem', padding: '1rem 1.25rem',
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                    backdropFilter: 'blur(10px)',
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
                    e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
                    e.currentTarget.style.background = 'rgba(30,41,59,0.75)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Left accent bar */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                    borderRadius: '1.25rem 0 0 1.25rem',
                    background: isPending
                      ? 'linear-gradient(180deg, #f59e0b, #d97706)'
                      : 'linear-gradient(180deg, #10b981, #059669)',
                  }} />

                  {/* Avatar */}
                  <div style={{
                    width: 46, height: 46, borderRadius: '14px',
                    background: `linear-gradient(135deg, hsl(${hue},70%,45%), hsl(${(hue + 40) % 360},70%,55%))`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 900, fontSize: '1.1rem', color: 'white',
                    flexShrink: 0, boxShadow: `0 4px 12px hsla(${hue},60%,40%,0.4)`,
                  }}>
                    {initial}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9', marginBottom: '0.2rem' }}>
                      {sub.studentName || 'Öğrenci'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <BookOpen size={12} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sub.testTitle || 
                         questions?.find(q => q.id === sub.testId || q.id === sub.questionId)?.title || 
                         questions?.find(q => q.id === sub.testId || q.id === sub.questionId)?.questionText || 
                         homeworks?.find(h => h.id === sub.testId)?.title || 
                         'Değerlendirme Dosyası'}
                      </span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                    {!isPending && sub.score !== undefined && (
                      <div style={{
                        background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                        borderRadius: '0.6rem', padding: '0.3rem 0.75rem',
                        fontWeight: 900, fontSize: '0.85rem', color: '#34d399',
                      }}>
                        {sub.score} puan
                      </div>
                    )}
                    {isPending && (
                      <div style={{
                        background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
                        borderRadius: '0.6rem', padding: '0.3rem 0.75rem',
                        fontWeight: 800, fontSize: '0.78rem', color: '#fbbf24',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}>
                        <Clock3 size={12} /> Bekliyor
                      </div>
                    )}
                    <a
                      href={`/review/${sub.id}`}
                      onClick={e => e.stopPropagation()}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: '0.6rem', padding: '0.3rem 0.75rem',
                        fontWeight: 800, fontSize: '0.78rem', color: '#a5b4fc',
                        textDecoration: 'none', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
                    >
                      <Eye size={12} /> Sayfa
                    </a>
                    <div style={{
                      width: 32, height: 32, borderRadius: '10px',
                      background: 'rgba(99,102,241,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
                    }}>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FULL SCREEN EVALUATION MODAL ── */}
      {activeSubmission && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* Modal Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 1.5rem', height: 60, flexShrink: 0,
            background: 'rgba(15,23,42,0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(99,102,241,0.25)',
          }}>
            {/* Left: back + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => setActiveSubmissionId(null)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(99,102,241,0.3)',
                  borderRadius: '0.6rem', padding: '0.45rem 0.9rem',
                  color: '#c7d2fe', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,41,59,0.8)'; }}
              >
                <ArrowLeft size={15} /> Listeye Dön
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '10px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '0.9rem', color: 'white',
                }}>
                  {activeSubmission.studentName?.charAt(0)?.toUpperCase() || 'Ö'}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2 }}>
                    {activeSubmission.studentName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                    {activeSubmission.testTitle}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: badge + save button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: '50px', padding: '0.3rem 0.8rem',
                fontSize: '0.72rem', fontWeight: 800, color: '#818cf8',
              }}>
                <Layers size={12} /> 📌 Değerlendirme Modu
              </div>
              <button
                type="button"
                onClick={handleFinalize}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', borderRadius: '0.75rem',
                  padding: '0.55rem 1.25rem',
                  color: 'white', fontWeight: 900, fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.45)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.45)'; }}
              >
                <Save size={15} /> Değerlendirmeyi Kaydet &amp; Bildir
              </button>
            </div>
          </div>

          {/* Fullscreen QuizRunner */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <QuizRunner reviewSubmission={activeSubmission} isReviewMode={true} />
          </div>
        </div>
      )}
    </div>
  );
}
