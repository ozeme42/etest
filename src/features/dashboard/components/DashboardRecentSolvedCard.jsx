import React from 'react';
import { Plus, ChevronRight, CheckCircle2, Award, Eye } from 'lucide-react';

const SUBJECT_THEMES = {
  matematik: { from: '#3b82f6', to: '#1d4ed8', icon: '📐', glow: 'rgba(59, 130, 246, 0.4)' },
  turkce:    { from: '#f43f5e', to: '#be123c', icon: '📖', glow: 'rgba(244, 63, 94, 0.4)' },
  fen:       { from: '#10b981', to: '#047857', icon: '🧪', glow: 'rgba(16, 185, 129, 0.4)' },
  sosyal:    { from: '#f59e0b', to: '#b45309', icon: '🌍', glow: 'rgba(245, 158, 11, 0.4)' },
  inkilap:   { from: '#ea580c', to: '#c2410c', icon: '🇹🇷', glow: 'rgba(234, 88, 12, 0.4)' },
  ingilizce: { from: '#8b5cf6', to: '#6d28d9', icon: '💬', glow: 'rgba(139, 92, 246, 0.4)' },
  din:       { from: '#06b6d4', to: '#0e7490', icon: '✨', glow: 'rgba(6, 182, 212, 0.4)' },
  okuma:     { from: '#ec4899', to: '#be185d', icon: '📚', glow: 'rgba(236, 72, 153, 0.4)' },
  deneme:    { from: '#f97316', to: '#c2410c', icon: '🎯', glow: 'rgba(249, 115, 22, 0.4)' },
  default:   { from: '#6366f1', to: '#4f46e5', icon: '⚡', glow: 'rgba(99, 102, 241, 0.4)' },
};

function resolveSubjectTheme(subjectStr) {
  if (!subjectStr) return SUBJECT_THEMES.default;
  const s = String(subjectStr).toLowerCase().replace(/ı/g, 'i').replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o');
  if (s.includes('mat')) return SUBJECT_THEMES.matematik;
  if (s.includes('turk')) return SUBJECT_THEMES.turkce;
  if (s.includes('fen')) return SUBJECT_THEMES.fen;
  if (s.includes('sos') || s.includes('tarih')) return SUBJECT_THEMES.sosyal;
  if (s.includes('ink')) return SUBJECT_THEMES.inkilap;
  if (s.includes('ing')) return SUBJECT_THEMES.ingilizce;
  if (s.includes('din')) return SUBJECT_THEMES.din;
  if (s.includes('okuma') || s.includes('kitap')) return SUBJECT_THEMES.okuma;
  if (s.includes('deneme') || s.includes('sinav') || s.includes('genel')) return SUBJECT_THEMES.deneme;
  return SUBJECT_THEMES.default;
}

const DashboardRecentSolvedCard = React.memo(function DashboardRecentSolvedCard({
  isMobile,
  recentSolvedTests = [],
  onOpenManualModal,
  onNavigateResults,
  onReviewTest,
  selectedStudent
}) {
  const displayTests = React.useMemo(() => {
    const list = [];
    const seen = new Set();
    const getExactTime = (item) => {
      if (!item) return 0;
      const candidates = [
        item.submittedAt,
        item.completedAt,
        item.createdAt,
        item.updatedAt,
        item.evaluatedAt,
        item.date,
        item.raw_data?.submittedAt,
        item.raw_data?.completedAt,
        item.raw_data?.createdAt,
        item.raw_data?.date,
        item.timestamp
      ];
      for (const c of candidates) {
        if (!c) continue;
        if (typeof c === 'number' && c > 1000000000) return c > 1e11 ? c : c * 1000;
        if (typeof c === 'string') {
          const parsed = new Date(c).getTime();
          if (!isNaN(parsed) && parsed > 1000000000) return parsed;
        }
      }
      const idStr = String(item.id || item.submissionId || item.supabaseId || item.testId || '');
      const match = idStr.match(/(?:sub_|me_)?(1[6-9]\d{11,12})/);
      if (match) {
        const num = Number(match[1]);
        if (!isNaN(num) && num > 1600000000000) return num;
      }
      return 0;
    };

    const sorted = [...(recentSolvedTests || [])].sort((a, b) => {
      const timeB = getExactTime(b);
      const timeA = getExactTime(a);
      if (timeB !== timeA) return timeB - timeA;
      return 0;
    });

    sorted.forEach(t => {
      const dStr = String(t.date || t.submittedAt || '').slice(0, 10);
      const titleStr = String(t.fullTitle || t.testTitle || t.title || '').trim();
      const isExam = Boolean(t.isPhysicalExam || t.typeKey === 'physicalExam' || /deneme|sınav/i.test(titleStr) || t.subject === 'Genel');
      const isGenTest = /^(test|yeni nesil|ü\.?\s*değ)[-\s]?\d*$/i.test(titleStr) || titleStr === 'Test';
      const scoreKey = `${dStr}_${t.correctCount || 0}_${t.wrongCount || 0}_${t.totalQuestions || 0}`;

      if (t.id && seen.has(`id_${t.id}`)) return;
      if (t.submissionId && seen.has(`id_${t.submissionId}`)) return;
      if (seen.has(`score_${scoreKey}`) && (isGenTest || isExam)) return;

      if (t.id) seen.add(`id_${t.id}`);
      if (t.submissionId) seen.add(`id_${t.submissionId}`);
      if (isExam || t.totalQuestions >= 20 || isGenTest || t.subject === 'Genel') {
        seen.add(`score_${scoreKey}`);
      }
      list.push(t);
    });

    return list.slice(0, 5);
  }, [recentSolvedTests]);

  return (
    <div className="game-card-elevated" style={{
      padding: isMobile ? '1.1rem 0.9rem' : '1.5rem 1.8rem'
    }}>
      {/* Kart Başlığı & Hızlı Aksiyonlar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.15rem',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            color: 'white',
            flexShrink: 0
          }}>
            📝
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h2 style={{ fontSize: isMobile ? '1.05rem' : '1.2rem', fontWeight: 900, color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Savaş &amp; Çözüm Kayıtları
              </h2>
              <span className="game-badge-xp" style={{ fontSize: '0.65rem', padding: '1px 6px', color: '#10b981', borderColor: 'rgba(16,185,129,0.4)' }}>
                ⚔️ Kayıt
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Son çözülen testler, netler ve başarı analizlerin
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={onOpenManualModal}
            className="game-btn-3d game-btn-emerald"
            style={{
              borderRadius: 999,
              padding: isMobile ? '0.35rem 0.75rem' : '0.45rem 0.95rem',
              fontSize: '0.74rem'
            }}
          >
            <Plus size={13} />
            <span>Fiziki Test Gir</span>
          </button>

          <button
            onClick={onNavigateResults}
            className="game-btn-3d"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 999,
              padding: isMobile ? '0.35rem 0.75rem' : '0.45rem 0.95rem',
              fontSize: '0.74rem',
              boxShadow: '0 2px 0 var(--color-border), 0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <span>Tüm Raporlar</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Test Listesi */}
      {displayTests.length === 0 ? (
        <div style={{ padding: '1.5rem 1rem', textAlign: 'center', background: 'var(--color-surface-hover, #f8fafc)', borderRadius: 12, border: '1px dashed var(--color-border-input, #cbd5e1)' }}>
          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>📊</div>
          <div style={{ fontWeight: 800, color: 'var(--color-text, #0f172a)', fontSize: '0.85rem', marginBottom: 2 }}>
            Henüz tamamlanmış bir test bulunmuyor
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #64748b)' }}>
            Kitap testlerinizi veya atanan ödevlerinizi çözdüğünüzde sonuçlarınız burada listelenecektir.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '0.4rem' : '0.55rem' }}>
          {displayTests.map((test, idx) => {
            const totalQ = Number(test.totalQuestions) || ((Number(test.correctCount) || 0) + (Number(test.wrongCount) || 0) + (Number(test.emptyCount) || 0)) || 0;
            const correct = Number(test.correctCount) || 0;
            const wrong = Number(test.wrongCount) || 0;
            const empty = Number(test.emptyCount) || 0;

            const isEvaluated = Boolean(
              test.isEvaluated === true ||
              test.isEvaluatedByTeacher === true ||
              test.evaluatedByTeacher === true ||
              test.status === 'evaluated' ||
              test.status === 'graded' ||
              Boolean(test.teacherFeedback || test.teacherNote) ||
              Boolean(test.teacherScores && Object.keys(test.teacherScores).length > 0) ||
              Boolean(test.evaluatedAt && (test.teacherFeedback || test.teacherNote || test.isEvaluated || test.status === 'evaluated')) ||
              (Array.isArray(test.answers) && test.answers.some(a => a && (a.evaluatedByTeacher || (a.score !== undefined && a.score !== null && a.score !== 'empty' && a.score !== 'pending' && a.score !== ''))))
            );

            const titleLower = String(test.title || test.testTitle || test.fullTitle || test.name || '').toLowerCase();
            const isExplicitMC = Boolean(
              /\bçok\b|\bcok\b|çoktan|coktan/i.test(titleLower) ||
              test.type === 'multiple_choice' ||
              test.type === 'coktan_secmeli' ||
              test.questionType === 'multiple_choice' ||
              test.questionType === 'coktan_secmeli' ||
              test.contentType === 'multiple_choice' ||
              test.contentType === 'coktan_secmeli' ||
              (Array.isArray(test.answers) && test.answers.length > 0 && test.answers.every(a => 
                typeof a === 'number' || (typeof a === 'string' && /^[A-E]$/i.test(a)) ||
                (!a.isOpenEnded && !a.is_open_ended && a.type !== 'open_ended' && a.questionType !== 'acik_uclu' &&
                (!a.userAnswerText || String(a.userAnswerText).trim().length === 0))
              ))
            );

            const hasOEKeywords = !isExplicitMC && (
              titleLower.includes('açık uçlu') ||
              titleLower.includes('acik uclu') ||
              titleLower.includes('klasik') ||
              titleLower.includes('yazılı sınav') ||
              titleLower.includes('klasik yazılı') ||
              titleLower.includes('görsel soru') ||
              titleLower.includes('gorsel soru') ||
              /\baç\b|\bac\b/.test(titleLower) ||
              (/\byazılı\b|\byazili\b/.test(titleLower) && !/\bçok\b|\bcok\b/i.test(titleLower))
            );

            const hasWrittenAnswers = !isExplicitMC && Boolean(
              (test.openEndedText && Object.keys(test.openEndedText).length > 0) ||
              test.writtenAnswer ||
              test.writtenAnswers ||
              (Array.isArray(test.answers) && test.answers.some(a => 
                a?.isOpenEnded || a?.is_open_ended || a?.type === 'acik_uclu' || a?.type === 'gorsel_klasik' || a?.type === 'open_ended' ||
                a?.writtenAnswer || (a?.userAnswerText && String(a.userAnswerText).trim() !== '' && String(a.userAnswerText).trim() !== 'empty') ||
                a?.maxScore !== undefined
              ))
            );

            const isWritten = !isExplicitMC && Boolean(
              test.isOpenEnded ||
              test.type === 'acik_uclu' ||
              test.type === 'yazili' ||
              test.type === 'gorsel_klasik' ||
              test.questionType === 'acik_uclu' ||
              test.questionType === 'yazili' ||
              test.questionType === 'gorsel_klasik' ||
              test.contentType === 'acik_uclu' ||
              test.contentType === 'yazili' ||
              test.contentType === 'gorsel_klasik' ||
              test.isPendingEvaluation ||
              hasWrittenAnswers ||
              (hasOEKeywords && (!test.isPhysicalExam && !test.isExam && test.type !== 'physicalExam' && test.type !== 'optik_form' && test.type !== 'multiple_choice'))
            );

            const isPending = Boolean(
              !isExplicitMC && (
                test.isPendingEvaluation ||
                test.isManualPending ||
                (isWritten && !isEvaluated) ||
                (!isEvaluated && (hasWrittenAnswers || hasOEKeywords) && (!test.isPhysicalExam && !test.isExam && test.type !== 'physicalExam' && test.type !== 'optik_form' && test.type !== 'multiple_choice'))
              )
            );

            const scoreRate = (test.score !== undefined && test.score !== null && !isPending)
              ? Number(test.score)
              : (test.scorePercentage !== undefined && test.scorePercentage !== null && !isPending
                  ? Number(test.scorePercentage)
                  : (totalQ > 0 && !isPending && !isWritten ? Math.round((correct / totalQ) * 100) : null));

            const isDenemeExam = Boolean(
              test.isPhysicalExam ||
              test.isExam ||
              test.typeKey === 'physicalExam' ||
              test.type === 'physicalExam' ||
              test.sourceType === 'physicalExam' ||
              /deneme|sınav/i.test(test.title || '') ||
              /deneme|sınav/i.test(test.testTitle || '') ||
              /deneme|sınav/i.test(test.fullTitle || '') ||
              test.subject === 'Genel' ||
              test.subjectName === 'Genel'
            );

            const sTheme = resolveSubjectTheme(test.subject);

            return (
              <div
                key={test.id || idx}
                onClick={() => onReviewTest && onReviewTest(test)}
                className="game-quest-row"
                style={{
                  background: 'var(--color-surface)',
                  border: '2px solid var(--color-border)',
                  borderRadius: 18,
                  padding: isMobile ? '0.95rem 0.85rem' : '1.15rem 1.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '0.75rem' : '1.15rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  transition: 'all 0.2s ease',
                  flexWrap: isMobile ? 'wrap' : 'nowrap'
                }}
              >
                {/* Sol Taraf: Ders İkonu + Başlık + Detaylar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  {/* Course Avatar Badge */}
                  <div
                    style={{
                      width: isMobile ? 40 : 46,
                      height: isMobile ? 40 : 46,
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${sTheme.from}, ${sTheme.to})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isMobile ? '1.25rem' : '1.45rem',
                      boxShadow: `0 4px 14px ${sTheme.glow}`,
                      color: '#ffffff',
                      flexShrink: 0
                    }}
                  >
                    {sTheme.icon}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    {/* Ders & Tarih Rozetleri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{
                        background: `${sTheme.from}15`,
                        color: sTheme.to,
                        border: `1px solid ${sTheme.from}35`,
                        borderRadius: 6,
                        fontSize: isMobile ? '0.62rem' : '0.68rem',
                        fontWeight: 900,
                        padding: '1px 7px'
                      }}>
                        {test.subject}
                      </span>
                      {!isDenemeExam && Boolean(test.unitTopic && test.unitTopic !== test.title && test.unitTopic !== test.subTitle && (!test.subTitle || !test.unitTopic.toLowerCase().includes(test.subTitle.toLowerCase()))) && (
                        <span style={{
                          background: 'rgba(245, 158, 11, 0.12)',
                          color: '#b45309',
                          border: '1px solid rgba(245, 158, 11, 0.30)',
                          borderRadius: 6,
                          fontSize: isMobile ? '0.62rem' : '0.68rem',
                          fontWeight: 800,
                          padding: '1px 7px',
                          maxWidth: isMobile ? 140 : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          📌 {test.unitTopic}
                        </span>
                      )}
                      {test.date && (
                        <span style={{ fontSize: isMobile ? '0.64rem' : '0.7rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                          • {new Date(test.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>

                    {/* Test Başlığı */}
                    <div style={{
                      fontFamily: '"Outfit", sans-serif',
                      fontWeight: 900,
                      fontSize: isMobile ? '0.96rem' : '1.1rem',
                      color: 'var(--color-text)',
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: isMobile ? 'nowrap' : 'normal'
                    }}>
                      {test.title}
                    </div>

                    {/* Skor & İstatistik Satırı */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: isMobile ? '0.7rem' : '0.76rem', fontWeight: 800, flexWrap: 'wrap' }}>
                      {test.isManualPending ? (
                        <span style={{ color: '#a855f7', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 900 }}>
                          ⏳ Onay Bekleniyor
                        </span>
                      ) : test.isManualRejected ? (
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 900 }}>
                          ❌ Onaylanmadı
                        </span>
                      ) : isPending ? (
                        <span style={{ color: '#7c3aed', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 800 }}>
                          📝 {totalQ || 1} Açık Uçlu Soru • <span style={{ background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', padding: '2px 8px', borderRadius: 6, fontWeight: 900 }}>⏳ Değerlendirmede</span>
                        </span>
                      ) : (
                        <>
                          {(correct > 0 || wrong > 0 || !isWritten) ? (
                            <>
                              <span style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)', padding: '1px 6px', borderRadius: 5 }}>
                                ✓ {correct}D
                              </span>
                              <span style={{ color: '#dc2626', background: 'rgba(220, 38, 38, 0.1)', padding: '1px 6px', borderRadius: 5 }}>
                                ✗ {wrong}Y
                              </span>
                              {empty > 0 && (
                                <span style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', padding: '1px 6px', borderRadius: 5 }}>
                                  ○ {empty}B
                                </span>
                              )}
                            </>
                          ) : (
                            <span style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 800 }}>
                              ✓ Öğretmen Notu Verildi
                            </span>
                          )}
                          <span style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}>
                            • {totalQ} Soru
                          </span>
                          {test.net !== undefined && test.net !== null && (correct > 0 || wrong > 0 || !isWritten) && (
                            <span style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.12)', padding: '1px 7px', borderRadius: 6, fontWeight: 900 }}>
                              🎯 {test.net} Net
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sağ Taraf: Skor Rozeti ve 3D İncele Butonu */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  flexShrink: 0,
                  width: isMobile ? '100%' : 'auto',
                  justifyContent: isMobile ? 'space-between' : 'flex-end',
                  marginTop: isMobile ? 4 : 0
                }}>
                  {isPending ? (
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      color: '#7c3aed',
                      background: 'rgba(124, 58, 237, 0.12)',
                      border: '1.5px solid rgba(124, 58, 237, 0.3)',
                      padding: '4px 10px',
                      borderRadius: 999,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ⏳ Değerlendirmede
                    </span>
                  ) : (
                    scoreRate !== null && !test.isManualPending && (
                      <span style={{
                        fontFamily: '"Outfit", sans-serif',
                        fontSize: isMobile ? '0.92rem' : '1.05rem',
                        fontWeight: 900,
                        color: scoreRate >= 70 ? '#166534' : scoreRate >= 50 ? '#b45309' : '#dc2626',
                        background: scoreRate >= 70 ? '#f0fdf4' : scoreRate >= 50 ? '#fffbeb' : '#fef2f2',
                        border: `1.5px solid ${scoreRate >= 70 ? '#bbf7d0' : scoreRate >= 50 ? '#fde68a' : '#fecaca'}`,
                        padding: isMobile ? '3px 10px' : '4px 12px',
                        borderRadius: 999,
                        boxShadow: scoreRate >= 70 ? '0 2px 8px rgba(34, 197, 94, 0.2)' : 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        %{scoreRate}
                      </span>
                    )
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReviewTest && onReviewTest(test);
                    }}
                    className="game-btn-3d"
                    style={{
                      background: 'var(--color-surface)',
                      border: '1.5px solid var(--color-border)',
                      color: 'var(--color-text)',
                      borderRadius: 12,
                      padding: isMobile ? '0.45rem 0.85rem' : '0.55rem 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <Eye size={14} />
                    <span>İncele</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default DashboardRecentSolvedCard;
