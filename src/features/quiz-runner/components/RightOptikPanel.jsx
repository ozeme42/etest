import React from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil, Eye, ArrowLeft, Save } from 'lucide-react';
import { isSectionOpenEnded, isQuestionOE, checkIsOE, unwrapUserAnswer } from './quizFormatHelpers';
import { triggerHaptic } from '../../../services/feedbackService';

export default function RightOptikPanel({
  qCount,
  answers,
  openEndedText,
  isOpenEnded,
  resolvedQuestions,
  bankQ,
  test = {},
  onOptionSelect,
  onTextChange,
  onNextSection,
  onSubmit,
  onSaveEvaluation,
  activeSecIdx,
  totalSections,
  isReviewMode = false,
  isTeacherMode = false,
  teacherScores = {},
  onScoreChange,
  teacherNotes = {},
  onNoteChange
}) {
  const isLastSec = activeSecIdx === totalSections - 1;
  const isMobile = useMediaQuery('(max-width: 768px)');

const answeredCount = Array.from({ length: qCount }).filter((_, idx) => {
    const qNo = idx + 1;
    const ans = answers[qNo];
    const uAns = typeof ans === 'object' ? ans?.userAnswer : ans;
    const txt = openEndedText[qNo];
    return (uAns !== undefined && uAns !== null && uAns !== '') || Boolean(txt);
  }).length;

  const progressPct = qCount > 0 ? Math.round((answeredCount / qCount) * 100) : 0;

  return (
    <div style={{ width: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* ── OPTIK HEADER WITH PROGRESS BAR (ULTRA-COMPACT ON MOBILE) ── */}
      <div style={{
        padding: isMobile ? '0.3rem 0.6rem' : '0.85rem 1.15rem',
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.25rem' : '0.45rem',
        flexShrink: 0,
        boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', flexShrink: 0 }}>
              {isReviewMode ? '🔍' : isOpenEnded ? '✍️' : '📋'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden' }}>
              <span style={{ margin: 0, fontSize: isMobile ? '0.78rem' : '0.95rem', fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {isMobile ? (isReviewMode ? 'Cevaplar' : isOpenEnded ? 'Yazılı Cevap' : 'Optik Form') : (isReviewMode ? 'Sınav İnceleme & Cevaplar' : isOpenEnded ? 'Açık Uçlu Cevap Paneli' : 'Optik Cevap Kağıdı')}
              </span>
              <span style={{ fontSize: isMobile ? '0.68rem' : '0.75rem', color: '#64748b', fontWeight: 800, whiteSpace: 'nowrap' }}>
                • {qCount} Soru
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <span style={{
              padding: isMobile ? '0.12rem 0.45rem' : '0.2rem 0.6rem',
              borderRadius: '999px',
              background: progressPct === 100 ? '#f0fdf4' : '#eff6ff',
              border: `1px solid ${progressPct === 100 ? '#86efac' : '#bfdbfe'}`,
              color: progressPct === 100 ? '#15803d' : '#2563eb',
              fontSize: isMobile ? '0.68rem' : '0.72rem',
              fontWeight: 900
            }}>
              {answeredCount}/{qCount} Kodlandı
            </span>
          </div>
        </div>

        {/* Section Progress Bar */}
        <div style={{ width: '100%', height: isMobile ? '3px' : '5px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progressPct}%`,
            background: progressPct === 100 ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #6366f1, #4f46e5)',
            borderRadius: '999px',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>
      </div>

      {/* ── QUESTION ITEMS LIST ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: isMobile ? '0.35rem 0.5rem' : '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.35rem' : '0.65rem'
      }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = (resolvedQuestions && resolvedQuestions[idx]) || {};

          const userAnsObj = Array.isArray(answers)
            ? (answers[qNo] ?? answers[idx])
            : (answers?.[qNo] ?? answers?.[String(qNo)]);
          const rawUserAns = unwrapUserAnswer(userAnsObj);
          const numericUserAns = typeof rawUserAns === 'number' ? rawUserAns : null;
          const hasUserAns = numericUserAns !== null && !isNaN(numericUserAns);
          const rawTextVal = openEndedText?.[qNo] ?? openEndedText?.[String(qNo)] ?? (typeof userAnsObj === 'object' ? (userAnsObj?.userAnswerText ?? userAnsObj?.user_answer_text ?? userAnsObj?.textAns) : undefined);
          const textVal = (rawTextVal !== undefined && rawTextVal !== null) ? String(rawTextVal) : '';
          const hasUserText = textVal.trim() !== '';
          const isAnswered = hasUserAns || hasUserText;
          const isQOE = isQuestionOE(qObj, bankQ || test, test, userAnsObj);

          let isCorrect = null;
          if (isReviewMode && isAnswered) {
            if (isQOE) {
              isCorrect = null;
            } else if (hasUserAns) {
              const testCtx = resolveTestContext(test, null, bankQ);
              const evalResult = checkIsAnswerCorrect(numericUserAns, qObj, testCtx, qNo);
              if (evalResult !== null) {
                isCorrect = evalResult;
              } else if (userAnsObj && userAnsObj.isCorrect !== undefined && userAnsObj.isCorrect !== null) {
                isCorrect = userAnsObj.isCorrect;
              }
            } else if (hasUserText) {
              isCorrect = null;
            }
          } else if (!isQOE && isAnswered && userAnsObj && userAnsObj.isCorrect !== undefined && userAnsObj.isCorrect !== null) {
            isCorrect = userAnsObj.isCorrect;
          }

          const teacherSc = teacherScores?.[qNo];
          const hasTeacherGraded = teacherSc !== undefined && teacherSc !== null && teacherSc !== 'pending' && teacherSc !== 'unevaluated';
          const currentTeacherScore = hasTeacherGraded
            ? teacherSc
            : (isQOE ? undefined : (!isAnswered ? 'empty' : (isCorrect === true ? 10 : (isCorrect === false ? 0 : undefined))));

          return (
            <div
              key={qNo}
              style={{
                background: '#ffffff',
                padding: isMobile ? '0.35rem 0.55rem' : '0.75rem 0.85rem',
                borderRadius: isMobile ? '0.6rem' : '0.85rem',
                border: isReviewMode
                  ? (isQOE
                      ? (hasTeacherGraded
                          ? (currentTeacherScore === 10 ? '1.5px solid #86efac' : currentTeacherScore === 5 ? '1.5px solid #fde68a' : currentTeacherScore === 'empty' ? '1.5px solid #e2e8f0' : currentTeacherScore === 0 ? '1.5px solid #fca5a5' : '1.5px solid #ddd6fe')
                          : '1.5px solid #ddd6fe')
                      : (currentTeacherScore === 10 || isCorrect === true ? '1.5px solid #86efac' : currentTeacherScore === 5 ? '1.5px solid #fde68a' : currentTeacherScore === 'empty' ? '1.5px solid #e2e8f0' : (currentTeacherScore === 0 || isCorrect === false) ? '1.5px solid #fca5a5' : '1.5px solid #e2e8f0'))
                  : isAnswered ? '1.5px solid #c7d2fe' : '1.5px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: isMobile ? '0.3rem' : '0.55rem',
                boxShadow: isAnswered ? '0 2px 8px rgba(99,102,241,0.05)' : '0 1px 3px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease'
              }}
            >
              {/* Question Item Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{
                    padding: isMobile ? '0.12rem 0.45rem' : '0.2rem 0.55rem',
                    borderRadius: '0.4rem',
                    background: isAnswered ? '#4f46e5' : '#f1f5f9',
                    color: isAnswered ? '#ffffff' : '#334155',
                    fontWeight: 900,
                    fontSize: isMobile ? '0.7rem' : '0.78rem',
                    letterSpacing: '0.02em'
                  }}>
                    SORU {qNo}
                  </span>
                  {isQOE && (
                    <span style={{ fontSize: '0.68rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.45rem', borderRadius: '0.4rem', fontWeight: 800 }}>
                      ✍️ Yazılı
                    </span>
                  )}
                </div>

                <div>
                  {isReviewMode ? (
                    isQOE ? (
                      hasTeacherGraded ? (
                        currentTeacherScore === 10 ? (
                          <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU (10P)</span>
                        ) : currentTeacherScore === 5 ? (
                          <span style={{ fontSize: '0.68rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>½ YARIM (5P)</span>
                        ) : currentTeacherScore === 'empty' ? (
                          <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>○ BOŞ (0P)</span>
                        ) : currentTeacherScore === 0 ? (
                          <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ (0P)</span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>{currentTeacherScore} Puan</span>
                        )
                      ) : isTeacherMode ? (
                        <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✍️ Puan Ver</span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>⏳ Değerlendirmede</span>
                      )
                    ) : (
                      !isAnswered ? (
                        <span style={{ fontSize: '0.68rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>○ BOŞ</span>
                      ) : isCorrect === true ? (
                        <span style={{ fontSize: '0.68rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✓ DOĞRU</span>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 900 }}>✗ YANLIŞ</span>
                      )
                    )
                  ) : (
                    isAnswered ? (
                      <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                        {isQOE ? 'Yanıtlandı' : `Şık ${String.fromCharCode(65 + (numericUserAns ?? 0))}`}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>
                        ○ Boş
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Input Area: Open-Ended or Optical Bubbles */}
              {isQOE ? (
                <textarea
                  value={textVal}
                  onChange={(e) => !isReviewMode && onTextChange(qNo, e.target.value)}
                  readOnly={isReviewMode}
                  placeholder={isReviewMode ? "Öğrenci bu soruya yanıt yazmadı" : `Soru ${qNo} için açık uçlu cevabınızı buraya yazınız...`}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: isMobile ? '0.5rem 0.65rem' : '0.65rem 0.8rem',
                    borderRadius: '0.6rem',
                    background: '#ffffff',
                    border: textVal ? '1.5px solid #10b981' : '1.5px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              ) : (
                <div style={{ display: 'flex', gap: isMobile ? '0.35rem' : '0.5rem' }}>
                  {(() => {
                    const targetObj = bankQ || {};
                    const isExplicitFive = Boolean(
                      Number(targetObj?.optionCount) === 5 ||
                      Number(targetObj?.optionsCount) === 5 ||
                      Number(targetObj?.book?.optionCount) === 5 ||
                      String(targetObj?.optionCount || targetObj?.optionsCount || targetObj?.book?.optionCount || '').includes('5') ||
                      targetObj?.examType === 'TYT' || targetObj?.examType === 'AYT' || targetObj?.examType === 'YKS' ||
                      targetObj?.book?.publisher === 'TYT' || targetObj?.book?.publisher === 'AYT' || targetObj?.book?.publisher === 'YKS' ||
                      Boolean(String(targetObj?.grade || targetObj?.book?.grade || '').match(/^(9|10|11|12)/)) ||
                      Boolean(String(targetObj?.title || targetObj?.book?.title || '').match(/tyt|ayt|yks|9\s*sınıf|10\s*sınıf|11\s*sınıf|12\s*sınıf|lise/i))
                    );
                    const isFourOptions = !isExplicitFive;
                    const optList = isFourOptions ? ['A', 'B', 'C', 'D'] : ['A', 'B', 'C', 'D', 'E'];

                    return optList.map((opt, optIdx) => {
                      const isSelected = hasUserAns && numericUserAns === optIdx;

                      let correctAns = null;

                      // 1. Direct question-level correct answer (highest priority)
                      if (qObj.correctAnswerLetter) {
                        const lt = String(qObj.correctAnswerLetter).trim().toUpperCase();
                        if (/^[A-E]$/.test(lt)) correctAns = lt.charCodeAt(0) - 65;
                      } else if (qObj.correctAnswer !== undefined && qObj.correctAnswer !== null) {
                        correctAns = qObj.correctAnswer;
                      } else if (qObj.correct_answer !== undefined && qObj.correct_answer !== null) {
                        correctAns = qObj.correct_answer;
                      }

                      if (correctAns === null && Array.isArray(qObj.options) && qObj.options.length > 0) {
                        const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect === true || o.is_correct === true)));
                        if (cIdx !== -1) correctAns = cIdx;
                      }

                      // 2. Section-level candidate key sources
                      if (correctAns === null) {
                        const keySources = [
                          bankQ?.answerKey,
                          bankQ?.answer_key,
                          bankQ?.opticAnswers,
                          bankQ?.contentPayload?.answerKey,
                          bankQ?.contentPayload?.answer_key,
                          bankQ?.htmlPayload?.answerKey,
                          bankQ?.pdfPayload?.answerKey,
                          bankQ?.raw_data?.answerKey,
                          bankQ?.raw_data?.answer_key,
                          bankQ?.bankQ?.answerKey,
                          bankQ?.bankQ?.answer_key,
                          bankQ?.bankQ?.opticAnswers,
                          bankQ?.bankQ?.pdfPayload?.answerKey
                        ];

                        for (const ks of keySources) {
                          if (!ks) continue;
                          let val = null;
                          if (Array.isArray(ks)) {
                            val = ks[qNo - 1] ?? ks[idx];
                          } else if (typeof ks === 'object') {
                            val = ks[qNo] ?? ks[String(qNo)] ?? ks[idx] ?? ks[String(idx)];
                          } else if (typeof ks === 'string' && ks.trim().length > 0) {
                            const clean = ks.replace(/[^A-Ea-e0-4]/g, '');
                            val = clean[qNo - 1] ?? clean[idx];
                          }
                          if (val !== undefined && val !== null && val !== '') {
                            if (typeof val === 'number') correctAns = val;
                            else if (typeof val === 'string') {
                              const s = val.trim().toUpperCase();
                              if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                              else if (!isNaN(Number(s))) correctAns = Number(s);
                            }
                            if (correctAns !== null) break;
                          }
                        }
                      }

                      // 3. User answer object fallback
                      if (correctAns === null) {
                        const rawSubCorr = userAnsObj?.correctAnswerLetter || userAnsObj?.correctAnswer;
                        if (rawSubCorr !== undefined && rawSubCorr !== null && rawSubCorr !== '') {
                          if (typeof rawSubCorr === 'number') correctAns = rawSubCorr;
                          else if (typeof rawSubCorr === 'string') {
                            const s = rawSubCorr.trim().toUpperCase();
                            if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                            else if (!isNaN(Number(s))) correctAns = Number(s);
                          }
                        }
                      }

                      // 4. Global test-level answerKey (with proper section offset)
                      if (correctAns === null && test?.answerKey) {
                        const ak = test.answerKey;
                        const secStart = secOffsets[activeSecIdx] || 0;
                        let val = null;
                        if (Array.isArray(ak)) {
                          val = ak[secStart + (qNo - 1)] ?? (sections.length === 1 ? ak[qNo - 1] : null);
                        } else if (typeof ak === 'object') {
                          val = ak[secStart + qNo] ?? ak[String(secStart + qNo)];
                        }
                        if (val !== undefined && val !== null && val !== '') {
                          if (typeof val === 'number') correctAns = val;
                          else if (typeof val === 'string') {
                            const s = val.trim().toUpperCase();
                            if (/^[A-E]$/.test(s)) correctAns = s.charCodeAt(0) - 65;
                            else if (!isNaN(Number(s))) correctAns = Number(s);
                          }
                        }
                      }

                      if (correctAns === null && Array.isArray(qObj.options)) {
                        const cIdx = qObj.options.findIndex(o => (typeof o === 'object' && o !== null && (o.isCorrect || o.is_correct)));
                        if (cIdx !== -1) correctAns = cIdx;
                      }

                      const numericCorrectAns = (typeof correctAns === 'string' && /^[A-Ea-e]$/.test(correctAns.trim()))
                        ? correctAns.trim().toUpperCase().charCodeAt(0) - 65
                        : (correctAns !== undefined && correctAns !== null && !isNaN(Number(correctAns)) && String(correctAns).trim() !== '' ? Number(correctAns) : correctAns);

                      const isCorrectOpt = (isReviewMode && isCorrect === true && isSelected)
                        ? true
                        : (numericCorrectAns !== undefined && numericCorrectAns !== null && numericCorrectAns === optIdx);

                      let bg = '#ffffff';
                      let border = '1.5px solid #cbd5e1';
                      let color = '#334155';
                      let shadow = 'none';

                      if (isReviewMode) {
                        if (isSelected && isCorrectOpt) {
                          bg = 'linear-gradient(135deg, #10b981, #059669)'; border = 'none'; color = 'white'; shadow = '0 3px 10px rgba(16,185,129,0.35)';
                        } else if (isSelected && !isCorrectOpt) {
                          bg = 'linear-gradient(135deg, #ef4444, #dc2626)'; border = 'none'; color = 'white'; shadow = '0 3px 10px rgba(239,68,68,0.35)';
                        } else if (isCorrectOpt) {
                          if (hasUserAns) {
                            bg = '#f0fdf4'; border = '2px solid #16a34a'; color = '#15803d'; shadow = '0 2px 6px rgba(22,163,74,0.15)';
                          } else {
                            bg = '#f0f9ff'; border = '1.5px dashed #0284c7'; color = '#0369a1'; shadow = 'none';
                          }
                        }
                      } else if (isSelected) {
                        bg = 'linear-gradient(135deg, #10b981, #059669)';
                        border = 'none';
                        color = 'white';
                        shadow = '0 4px 12px rgba(16,185,129,0.4)';
                      }

                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            if (!isReviewMode) {
                              triggerHaptic('light');
                              onOptionSelect(qNo, optIdx);
                            }
                          }}
                          disabled={isReviewMode}
                          style={{
                            flex: 1,
                            height: isMobile ? '30px' : '38px',
                            borderRadius: isMobile ? '0.45rem' : '0.6rem',
                            border,
                            background: bg,
                            color,
                            fontWeight: 900,
                            fontSize: isMobile ? '0.8rem' : '0.9rem',
                            cursor: isReviewMode ? 'default' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: shadow,
                          }}
                          className={!isReviewMode ? "hover:scale-105 active:scale-95" : ""}
                          title={isReviewMode && isCorrectOpt && !hasUserAns ? `Cevap Anahtarı: ${opt}` : undefined}
                        >
                          {isReviewMode && isSelected && isCorrectOpt ? `${opt} ✓` : isReviewMode && isSelected && !isCorrectOpt ? `${opt} ✗` : isReviewMode && isCorrectOpt ? (hasUserAns ? `${opt} ✓` : `${opt} 🔑`) : opt}
                        </button>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Öğretmen Puanlama Butonları (Sadece Öğretmen Modunda) */}
              {isTeacherMode && (
                <div style={{ marginTop: '0.45rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isQOE ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 4 }}>
                    {(() => {
                      const isT10 = Number(currentTeacherScore) === 10;
                      const isT0 = currentTeacherScore !== undefined && currentTeacherScore !== null && currentTeacherScore !== 'empty' && Number(currentTeacherScore) === 0;
                      const isTEmpty = currentTeacherScore === 'empty';
                      const isT5 = Number(currentTeacherScore) === 5;

                      return (
                        <>
                          <button
                            type="button"
                            onClick={() => onScoreChange && onScoreChange(qNo, 10)}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: 6,
                              border: isT10 ? '2px solid #15803d' : '1px solid #cbd5e1',
                              background: isT10 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#ffffff',
                              color: isT10 ? '#ffffff' : '#15803d',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              boxShadow: isT10 ? '0 2px 8px rgba(22,163,74,0.45)' : 'none',
                              transform: isT10 ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✓ Doğru (D) {isT10 ? '✓' : ''}
                          </button>
                          <button
                            type="button"
                            onClick={() => onScoreChange && onScoreChange(qNo, 0)}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: 6,
                              border: isT0 ? '2px solid #991b1b' : '1px solid #cbd5e1',
                              background: isT0 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#ffffff',
                              color: isT0 ? '#ffffff' : '#b91c1c',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              boxShadow: isT0 ? '0 2px 8px rgba(220,38,38,0.5)' : 'none',
                              transform: isT0 ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ✗ Yanlış (Y) {isT0 ? '✓' : ''}
                          </button>
                          <button
                            type="button"
                            onClick={() => onScoreChange && onScoreChange(qNo, 'empty')}
                            style={{
                              padding: '0.45rem 0.2rem',
                              borderRadius: 6,
                              border: isTEmpty ? '2px solid #334155' : '1px solid #cbd5e1',
                              background: isTEmpty ? 'linear-gradient(135deg, #475569, #334155)' : '#f8fafc',
                              color: isTEmpty ? '#ffffff' : '#64748b',
                              fontWeight: 900,
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 2,
                              boxShadow: isTEmpty ? '0 2px 8px rgba(71,85,105,0.45)' : 'none',
                              transform: isTEmpty ? 'scale(1.02)' : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            ○ Boş (B) {isTEmpty ? '✓' : ''}
                          </button>
                          {isQOE && (
                            <button
                              type="button"
                              onClick={() => onScoreChange && onScoreChange(qNo, 5)}
                              style={{
                                padding: '0.45rem 0.2rem',
                                borderRadius: 6,
                                border: isT5 ? '2px solid #b45309' : '1px solid #cbd5e1',
                                background: isT5 ? 'linear-gradient(135deg, #d97706, #b45309)' : '#ffffff',
                                color: isT5 ? '#ffffff' : '#d97706',
                                fontWeight: 900,
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 2,
                                boxShadow: isT5 ? '0 2px 8px rgba(217,119,6,0.45)' : 'none',
                                transform: isT5 ? 'scale(1.02)' : 'none',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              ½ Yarım (5P) {isT5 ? '✓' : ''}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <input
                    type="text"
                    placeholder={`Soru ${qNo} için öğretmen notu...`}
                    value={teacherNotes?.[qNo] || ''}
                    onChange={(e) => onNoteChange && onNoteChange(qNo, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.3rem 0.5rem',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.74rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Öğrenci için Öğretmen Notu (Salt Okunur) */}
              {!isTeacherMode && isReviewMode && teacherNotes?.[qNo] && (
                <div style={{ marginTop: '0.45rem', padding: '0.45rem 0.65rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.45rem', fontSize: '0.74rem', color: '#1e40af' }}>
                  <strong style={{ color: '#1d4ed8' }}>💬 Öğretmen Notu: </strong> {teacherNotes[qNo]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── FOOTER ACTIONS AT THE BOTTOM OF OPTIK PANEL ── */}
      <div style={{
        padding: isMobile ? '0.35rem 0.6rem' : '0.85rem 1.15rem',
        background: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        flexShrink: 0,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.02)'
      }}>
        {totalSections > 1 && !isLastSec && (
          <button
            onClick={onNextSection}
            style={{
              width: '100%',
              padding: isMobile ? '0.45rem 0.8rem' : '0.75rem 1.25rem',
              borderRadius: isMobile ? '0.5rem' : '0.75rem',
              background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            Sonraki Bölüm <ChevronRight size={isMobile ? 14 : 18} />
          </button>
        )}

        {(totalSections === 1 || isLastSec) && (
          <button
            onClick={isReviewMode ? (isTeacherMode ? (onSaveEvaluation || onSubmit) : onSubmit) : onSubmit}
            style={{
              width: '100%',
              padding: isMobile ? '0.45rem 0.8rem' : '0.75rem 1.25rem',
              borderRadius: isMobile ? '0.5rem' : '0.75rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: isMobile ? '0.78rem' : '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(16,185,129,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            <CheckCircle2 size={isMobile ? 14 : 18} />
            {isReviewMode ? (isTeacherMode ? '💾 Değerlendirmeyi Kaydet & Sonucu Gör' : '📊 Sınav Sonuç Raporunu Gör') : 'Sınavı Bitir ve Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MULTI RESULT MODAL COMPONENT ─────────────────────────────────────────────
