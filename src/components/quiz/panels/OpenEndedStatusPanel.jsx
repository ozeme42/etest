import React, { memo } from 'react';
import { Edit3, CheckCircle2, Clock, Star, MessageSquare, Award, AlertCircle, HelpCircle, XCircle } from 'lucide-react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';

/**
 * OpenEndedStatusPanel
 * Right-side question list, evaluation, and input panel for Open-Ended (Written) questions in PDF/HTML quiz runners & reviews.
 * Displays student written answers, teacher evaluation scores, feedback notes, and rubric status.
 */
export default memo(function OpenEndedStatusPanel({
  qCount = 1,
  openEndedText = {},
  resolvedQuestions = [],
  activeQNo = 1,
  onSelectQuestion,
  onTextChange,
  isReviewMode = false,
  isTeacher = false,
  teacherScores = {},
  teacherNotes = {},
  submissionAnswers = [],
  isTrulyEvaluated = false,
  onSetTeacherScore,
  onSetTeacherNote
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const totalCount = Math.max(qCount, resolvedQuestions.length, 1);

  // Helper to extract text for question
  const getQuestionText = (qNo, qObj) => {
    let rawText = '';
    if (typeof openEndedText === 'object' && openEndedText !== null) {
      rawText = openEndedText[qNo] ?? openEndedText[String(qNo)] ?? '';
    }
    if (!rawText && Array.isArray(openEndedText)) {
      const match = openEndedText.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo);
      rawText = match?.userAnswerText || match?.textAns || match?.userAnswer || '';
    }
    if (!rawText && Array.isArray(submissionAnswers) && submissionAnswers.length > 0) {
      const match = submissionAnswers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo || String(a?.questionId).endsWith(`_${qNo}`));
      rawText = match?.userAnswerText || match?.textAns || (typeof match?.userAnswer === 'string' && match?.userAnswer !== 'empty' ? match?.userAnswer : '');
    }
    if (!rawText && qObj) {
      rawText = qObj.userAnswerText || qObj.textAns || (typeof qObj.userAnswer === 'string' && qObj.userAnswer !== 'empty' ? qObj.userAnswer : '');
    }
    return String(rawText || '').trim();
  };

  // Helper to extract evaluation info
  const getQuestionEval = (qNo, hasText) => {
    let rawScore = teacherScores?.[qNo] ?? teacherScores?.[String(qNo)];
    let ansMatch = null;
    if (Array.isArray(submissionAnswers)) {
      ansMatch = submissionAnswers.find(a => Number(a?.questionNoInSection) === qNo || Number(a?.questionNo) === qNo || String(a?.questionId).endsWith(`_${qNo}`));
    }

    if ((rawScore === undefined || rawScore === null) && ansMatch) {
      if (ansMatch.score !== undefined && ansMatch.score !== null && ansMatch.score !== '') {
        rawScore = ansMatch.score;
      }
    }

    let rawNote = teacherNotes?.[qNo] ?? teacherNotes?.[String(qNo)] ?? ansMatch?.teacherNote ?? ansMatch?.teacher_note ?? ansMatch?.feedback ?? '';

    const isExplicitEmpty = rawScore === 'empty' || ansMatch?.evalStatus === 'empty' || (!hasText && rawScore === null);
    const hasNumericScore = rawScore !== undefined && rawScore !== null && rawScore !== '' && rawScore !== 'empty' && !isNaN(Number(rawScore));
    const scoreVal = hasNumericScore ? Number(rawScore) : (isTrulyEvaluated && hasText ? 10 : null);
    const isPending = hasText && !hasNumericScore && !isExplicitEmpty && !isTrulyEvaluated;

    return {
      score: scoreVal,
      isExplicitEmpty,
      isPending,
      teacherNote: String(rawNote || '').trim(),
      hasEvaluated: hasNumericScore || isTrulyEvaluated
    };
  };

  const answeredCount = Array.from({ length: totalCount }).filter((_, idx) => {
    const text = getQuestionText(idx + 1, resolvedQuestions[idx]);
    return text.length > 0;
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-surface)' }}>
      {/* Panel Header */}
      <div style={{ padding: isMobile ? '0.65rem 0.85rem' : '0.85rem 1rem', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface-hover)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 900, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ✍️ {isReviewMode ? 'Yazılı Değerlendirme' : 'Yazılı Yanıtlar'}
          </h4>
          <span style={{
            fontSize: '0.74rem',
            fontWeight: 900,
            background: answeredCount === totalCount ? 'rgba(16,185,129,0.15)' : 'rgba(217,119,6,0.15)',
            color: answeredCount === totalCount ? '#10b981' : '#d97706',
            padding: '0.2rem 0.55rem',
            borderRadius: '0.4rem',
            border: `1px solid ${answeredCount === totalCount ? 'rgba(16,185,129,0.3)' : 'rgba(217,119,6,0.3)'}`
          }}>
            {answeredCount} / {totalCount} Yanıtlandı
          </span>
        </div>
      </div>

      {/* Questions List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '0.65rem' : '0.85rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: totalCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = resolvedQuestions[idx] || {};
          const text = getQuestionText(qNo, qObj);
          const hasText = text.length > 0;
          const evalInfo = getQuestionEval(qNo, hasText);

          let cardBorder = '1.5px solid var(--color-border)';
          let cardBg = 'var(--color-surface)';

          if (isReviewMode) {
            if (evalInfo.hasEvaluated) {
              if (evalInfo.score >= 8) {
                cardBorder = '1.5px solid #86efac';
                cardBg = 'rgba(16,185,129,0.03)';
              } else if (evalInfo.score >= 4) {
                cardBorder = '1.5px solid #fde68a';
                cardBg = 'rgba(245,158,11,0.03)';
              } else {
                cardBorder = '1.5px solid #fca5a5';
                cardBg = 'rgba(239,68,68,0.03)';
              }
            } else if (evalInfo.isPending) {
              cardBorder = '1.5px solid #ddd6fe';
              cardBg = 'rgba(124,58,237,0.03)';
            }
          } else if (hasText) {
            cardBorder = '1.5px solid rgba(16,185,129,0.4)';
            cardBg = 'rgba(16,185,129,0.04)';
          }

          return (
            <div
              key={qNo}
              style={{
                borderRadius: '0.85rem',
                border: cardBorder,
                background: cardBg,
                padding: '0.85rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Question Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '0.4rem',
                    background: hasText ? '#2563eb' : 'var(--color-surface-hover)',
                    color: hasText ? '#ffffff' : 'var(--color-text)',
                    border: '1px solid var(--color-border)'
                  }}>
                    SORU {qNo}
                  </span>
                  {qObj.title && !qObj.title.startsWith('Soru') && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 700, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {qObj.title}
                    </span>
                  )}
                </div>

                {/* Status Badges */}
                {isReviewMode ? (
                  evalInfo.hasEvaluated ? (
                    evalInfo.score >= 8 ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.55rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={12} /> ✓ DOĞRU
                      </span>
                    ) : evalInfo.score >= 4 ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.55rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Award size={12} /> ½ YARIM
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.55rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <XCircle size={12} /> ✗ YANLIŞ
                      </span>
                    )
                  ) : evalInfo.isPending ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#7c3aed', background: '#faf5ff', border: '1px solid #ddd6fe', padding: '0.15rem 0.55rem', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={12} /> ⏳ DEĞERLENDİRMEDE
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', background: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', padding: '0.15rem 0.55rem', borderRadius: '999px' }}>
                      ○ BOŞ
                    </span>
                  )
                ) : (
                  hasText ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={13} /> Yanıtlandı
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Clock size={13} /> Bekliyor
                    </span>
                  )
                )}
              </div>

              {/* Textarea or Student Answer Card */}
              {!isReviewMode ? (
                <textarea
                  rows={isMobile ? 2 : 3}
                  value={text}
                  placeholder={`Soru ${qNo} için cevabınızı veya sonucunuzu yazınız...`}
                  onChange={(e) => onTextChange && onTextChange(qNo, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid var(--color-border-input)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: '0.84rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.4,
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{
                    padding: '0.65rem 0.8rem',
                    borderRadius: '0.65rem',
                    background: hasText ? 'var(--color-surface)' : 'var(--color-surface-hover)',
                    border: '1px solid var(--color-border)',
                    color: hasText ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontSize: '0.86rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontStyle: hasText ? 'normal' : 'italic'
                  }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--color-text-secondary)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      ✍️ Öğrenci Yanıtı:
                    </div>
                    {hasText ? text : 'Bu soru yanıtlanmadı (Boş).'}
                  </div>

                  {/* Teacher Feedback Note in Review */}
                  {evalInfo.teacherNote && (
                    <div style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: '0.65rem',
                      background: 'rgba(124, 58, 237, 0.06)',
                      border: '1.5px solid rgba(124, 58, 237, 0.25)',
                      color: '#6d28d9',
                      fontSize: '0.82rem',
                      lineHeight: 1.45
                    }}>
                      <div style={{ fontWeight: 900, fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                        <Star size={12} /> Öğretmen Değerlendirmesi:
                      </div>
                      "{evalInfo.teacherNote}"
                    </div>
                  )}

                  {/* Teacher Grading Controls (if isTeacher is active) */}
                  {isTeacher && (
                    <div style={{ marginTop: '0.35rem', padding: '0.65rem', borderRadius: '0.65rem', background: 'var(--color-surface-hover)', border: '1px dashed var(--color-border)' }}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.4rem' }}>
                        Puan Ver (0 - 10):
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {[
                          { label: '10 (Tam)', val: 10, bg: '#10b981' },
                          { label: '7.5', val: 7.5, bg: '#3b82f6' },
                          { label: '5 (Yarım)', val: 5, bg: '#f59e0b' },
                          { label: '2.5', val: 2.5, bg: '#f97316' },
                          { label: '0 (Sıfır)', val: 0, bg: '#ef4444' },
                          { label: 'Boş', val: 'empty', bg: '#64748b' }
                        ].map((btn) => {
                          const isCur = evalInfo.score === btn.val || (btn.val === 'empty' && evalInfo.isExplicitEmpty);
                          return (
                            <button
                              key={btn.val}
                              type="button"
                              onClick={() => onSetTeacherScore && onSetTeacherScore(qNo, btn.val)}
                              style={{
                                padding: '0.25rem 0.55rem',
                                borderRadius: '0.45rem',
                                border: isCur ? `2px solid ${btn.bg}` : '1px solid var(--color-border-input)',
                                background: isCur ? btn.bg : 'var(--color-surface)',
                                color: isCur ? '#ffffff' : 'var(--color-text)',
                                fontSize: '0.72rem',
                                fontWeight: 900,
                                cursor: 'pointer'
                              }}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>

                      <input
                        type="text"
                        placeholder="Öğretmen notu ekle (isteğe bağlı)..."
                        value={evalInfo.teacherNote}
                        onChange={(e) => onSetTeacherNote && onSetTeacherNote(qNo, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.35rem 0.6rem',
                          borderRadius: '0.45rem',
                          border: '1px solid var(--color-border-input)',
                          background: 'var(--color-surface)',
                          color: 'var(--color-text)',
                          fontSize: '0.78rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  )}

                  {/* Rubric / Ideal Answer if provided */}
                  {(qObj.rubric || qObj.correctAnswerText || qObj.solution) && (
                    <div style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: '0.6rem',
                      background: 'rgba(16, 185, 129, 0.05)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      fontSize: '0.78rem',
                      color: '#065f46',
                      lineHeight: 1.4
                    }}>
                      <div style={{ fontWeight: 900, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.15rem' }}>
                        <Award size={11} /> İdeal Cevap / Rubrik:
                      </div>
                      {qObj.rubric || qObj.correctAnswerText || qObj.solution}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
