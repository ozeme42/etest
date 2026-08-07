import React, { useState, useEffect, useMemo } from 'react';
import { useQuestionBank } from '../../../context/QuestionBankContext';
import { resolveTestQuestions } from '../../../utils/testResolver';
import { checkIsAnswerCorrect } from '../../../utils/answerEvaluation';
import { idbGetPayload } from '../../../services/indexedDbService';
import PdfViewerWithControls from '../../PdfViewerWithControls';
import ImageLightbox, { StandardImageFrame, isValidImageUrl } from '../common/ImageLightbox';
import { Clock, CheckCircle2, ChevronRight, ChevronLeft, Layers, FileSpreadsheet, Pencil } from 'lucide-react';
import DrawingCanvas from '../common/DrawingCanvas';

// Helper to check open-ended
function checkIsOE(obj) {
  if (!obj) return false;
  return Boolean(
    obj.questionType === 'acik_uclu' ||
    obj.type === 'acik_uclu' ||
    obj.questionType === 'yazili' ||
    obj.type === 'yazili' ||
    obj.contentType === 'yazili' ||
    obj.isOpenEnded === true
  );
}

// Helper to check PDF section (always true if PDF payload/contentType exists, whether MC or Open-Ended)
function isPdfSection(bankQ) {
  if (!bankQ) return false;
  return Boolean(
    bankQ.contentType === 'pdf' ||
    bankQ.sourceFormat === 'pdf' ||
    bankQ.formatType === 'pdf' ||
    bankQ.type === 'pdf' ||
    bankQ.pdfPayload ||
    bankQ.pdfUrl ||
    (typeof bankQ.contentPayload === 'string' && (bankQ.contentPayload.includes('.pdf') || bankQ.contentPayload.startsWith('data:application/pdf')))
  );
}

// Helper to check HTML section (always true if HTML document/payload exists, whether MC or Open-Ended)
function isHtmlSection(bankQ) {
  if (!bankQ) return false;
  
  const hasHtmlContent = Boolean(
    bankQ.contentType === 'html' ||
    bankQ.sourceFormat === 'html' ||
    bankQ.formatType === 'html' ||
    bankQ.htmlPayload ||
    (typeof bankQ.contentPayload === 'string' && (bankQ.contentPayload.includes('<!DOCTYPE') || bankQ.contentPayload.includes('<html') || bankQ.contentPayload.startsWith('data:text/html')))
  );

  if (!hasHtmlContent) return false;

  // If it has a question bank question cards array and is NOT explicitly HTML contentType, render as cards
  if (Array.isArray(bankQ.questionsList) && bankQ.questionsList.length > 0 && bankQ.contentType !== 'html' && bankQ.formatType !== 'html') return false;
  if (Array.isArray(bankQ.questions) && bankQ.questions.length > 0 && bankQ.contentType !== 'html' && bankQ.formatType !== 'html') return false;

  return true;
}

// Helper to check Image section
function isImageSection(bankQ) {
  if (!bankQ) return false;
  return Boolean(
    bankQ.contentType === 'gorsel' ||
    bankQ.contentType === 'image' ||
    bankQ.sourceFormat === 'image' ||
    bankQ.formatType === 'image' ||
    bankQ.type === 'gorsel' ||
    bankQ.questionType === 'gorsel_klasik' ||
    (bankQ.imageUrls && Array.isArray(bankQ.imageUrls) && bankQ.imageUrls.length > 0)
  );
}

// ─── RIGHT OPTIK PANEL ────────────────────────────────────────────────────────
function RightOptikPanel({
  qCount,
  answers,
  openEndedText,
  isOpenEnded,
  resolvedQuestions,
  bankQ,
  onOptionSelect,
  onTextChange,
  onNextSection,
  onSubmit,
  activeSecIdx,
  totalSections,
  isReviewMode = false
}) {
  const isLastSec = activeSecIdx === totalSections - 1;

  return (
    <div style={{ width: '300px', background: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ padding: '0.85rem 1rem', background: '#0f172a', borderBottom: '1px solid #334155', fontWeight: 900, fontSize: '0.85rem', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{isReviewMode ? '🔍 İnceleme & Cevaplar' : '📋 Optik Kodlama & Yanıtlar'}</span>
        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Toplam {qCount} Soru</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {Array.from({ length: qCount }).map((_, idx) => {
          const qNo = idx + 1;
          const qObj = (resolvedQuestions && resolvedQuestions[idx]) || {};
          const isQOE = isOpenEnded || checkIsOE(qObj);

          const userAnsObj = answers[qNo];
          const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
          const textVal = openEndedText[qNo] || '';

          const isCorrect = userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo) : null;

          return (
            <div key={qNo} style={{ background: '#0f172a', padding: '0.65rem 0.75rem', borderRadius: '0.65rem', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.78rem', color: '#f8fafc' }}>
                <span>Soru {qNo} {isQOE ? '(✍️ Yazılı)' : ''}</span>
                {isReviewMode ? (
                  isQOE ? (
                    <span style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 900 }}>⏳ Değerlendirmede</span>
                  ) : userAns !== undefined && userAns !== null ? (
                    isCorrect ? (
                      <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 900 }}>✓ DOĞRU</span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 900 }}>✗ YANLIŞ</span>
                    )
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>— BOŞ</span>
                  )
                ) : (
                  userAns !== undefined || textVal ? (
                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 900 }}>✓ {isQOE ? 'Yazıldı' : 'Kodlandı'}</span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>— Boş</span>
                  )
                )}
              </div>

              {isQOE ? (
                <textarea
                  value={textVal}
                  onChange={(e) => !isReviewMode && onTextChange(qNo, e.target.value)}
                  readOnly={isReviewMode}
                  placeholder={isReviewMode ? "Öğrenci bu soruya yanıt yazmadı" : `Soru ${qNo} açık uçlu / yazılı yanıt...`}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.65rem',
                    borderRadius: '0.5rem',
                    background: '#1e293b',
                    border: textVal ? '1.5px solid #10b981' : '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.82rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              ) : (
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                    const isSelected = userAns === optIdx;
                    const correctAns = qObj.correctAnswer;
                    const isCorrectOpt = correctAns !== undefined && correctAns === optIdx;

                    let bg = '#1e293b';
                    let border = '1px solid #334155';
                    let color = '#cbd5e1';

                    if (isReviewMode) {
                      if (isSelected && isCorrectOpt) {
                        bg = '#059669'; border = 'none'; color = 'white';
                      } else if (isSelected && !isCorrectOpt) {
                        bg = '#dc2626'; border = 'none'; color = 'white';
                      } else if (isCorrectOpt) {
                        bg = 'rgba(16,185,129,0.2)'; border = '1.5px solid #10b981'; color = '#34d399';
                      }
                    } else if (isSelected) {
                      bg = '#059669'; border = 'none'; color = 'white';
                    }

                    return (
                      <button
                        key={opt}
                        onClick={() => !isReviewMode && onOptionSelect(qNo, optIdx)}
                        disabled={isReviewMode}
                        style={{
                          flex: 1,
                          height: '30px',
                          borderRadius: '0.4rem',
                          border,
                          background: bg,
                          color,
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          cursor: isReviewMode ? 'default' : 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER BUTTONS AT THE BOTTOM OF OPTIK PANEL */}
      <div style={{ padding: '0.75rem', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
        {totalSections > 1 && !isLastSec && (
          <button
            onClick={onNextSection}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '0.65rem',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 3px 12px rgba(99,102,241,0.3)'
            }}
          >
            Sonraki Bölüme Geç <ChevronRight size={16} />
          </button>
        )}

        {(totalSections === 1 || isLastSec) && (
          <button
            onClick={onSubmit}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              borderRadius: '0.65rem',
              background: isReviewMode ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 3px 12px rgba(16,185,129,0.3)'
            }}
          >
            <CheckCircle2 size={16} /> {isReviewMode ? 'İncelemeyi Kapat' : 'Sınavı Bitir ve Gönder'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── MULTI RESULT MODAL COMPONENT ─────────────────────────────────────────────
function MultiResultModal({ test, sections, sectionAnswers, onConfirmClose }) {
  let totalMCQuestions = 0;
  let totalMCDoğru = 0;
  let totalMCYanlış = 0;
  let totalMCBoş = 0;

  let totalOEQuestions = 0;
  let totalOECevaplanan = 0;

  const sectionStats = sections.map((sec, idx) => {
    const bankQ = sec.bankQ || {};
    const isSecOE = checkIsOE(bankQ);
    const sa = sectionAnswers[sec.id] || { answers: {}, openEndedText: {} };

    let mcDoğru = 0;
    let mcYanlış = 0;
    let mcBoş = 0;
    let oeCevaplanan = 0;
    let hasAnyOE = isSecOE;

    for (let i = 1; i <= sec.qCount; i++) {
      const qObj = (sec.resolvedQuestions && sec.resolvedQuestions[i - 1]) || {};
      const isQOE = isSecOE || checkIsOE(qObj);

      if (isQOE) {
        hasAnyOE = true;
        totalOEQuestions++;
        const textVal = sa.openEndedText?.[i] || '';
        if (textVal && textVal.trim() !== '') {
          oeCevaplanan++;
          totalOECevaplanan++;
        }
      } else {
        totalMCQuestions++;
        const userAnsObj = sa.answers?.[i];
        const userAns = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;

        if (userAns === undefined || userAns === null) {
          mcBoş++;
          totalMCBoş++;
        } else {
          const isCorrect = checkIsAnswerCorrect(userAns, qObj, bankQ, i);

          if (isCorrect) {
            mcDoğru++;
            totalMCDoğru++;
          } else {
            mcYanlış++;
            totalMCYanlış++;
          }
        }
      }
    }

    const mcNet = Math.max(0, mcDoğru - (mcYanlış * 0.25));

    return {
      title: sec.title || `${idx + 1}. Bölüm`,
      qCount: sec.qCount,
      isOE: hasAnyOE,
      mcDoğru,
      mcYanlış,
      mcBoş,
      mcNet,
      oeCevaplanan
    };
  });

  const totalMCNet = Math.max(0, totalMCDoğru - (totalMCYanlış * 0.25));
  const hasOE = totalOEQuestions > 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(10px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', overflowY: 'auto' }}>
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '1.5rem', width: '100%', maxWidth: '750px', color: '#f8fafc', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', margin: 'auto' }}>
        
        {/* TOP HEADER */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
            🎉
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>Sınav Başarıyla Gönderildi!</h2>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>{test.title || test.name}</p>
        </div>

        {/* TEACHER EVALUATION ALERT BANNER */}
        {hasOE && (
          <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(79,70,229,0.15))', border: '1.5px solid #818cf8', borderRadius: '1rem', padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ fontSize: '1.8rem' }}>⏳</div>
            <div>
              <h4 style={{ margin: '0 0 0.3rem 0', fontWeight: 900, color: '#c084fc', fontSize: '0.95rem' }}>
                Yazılı / Açık Uçlu Cevaplarınız Öğretmen Değerlendirmesine Gönderildi
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                Çoktan seçmeli sorularınızın puan ve net hesaplaması tamamlanmıştır. Açık uçlu ({totalOEQuestions} soru) yanıtlarınız ise öğretmeniniz tarafından incelenip puanlandıktan sonra karnenize yansıyacaktır.
              </p>
            </div>
          </div>
        )}

        {/* OVERALL SUMMARY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>ÇOKTAN SEÇMELİ NET</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#38bdf8', marginTop: '0.2rem' }}>{totalMCNet.toFixed(2)}</div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>DOĞRU / YANLIŞ</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#34d399', marginTop: '0.3rem' }}>
              {totalMCDoğru} <span style={{ fontSize: '0.85rem', color: '#f87171' }}>D / {totalMCYanlış} Y</span>
            </div>
          </div>
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>AÇIK UÇLU YANIT</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#c084fc', marginTop: '0.3rem' }}>
              {totalOECevaplanan} / {totalOEQuestions}
            </div>
          </div>
        </div>

        {/* BÖLÜM BAZLI DETAYLAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ margin: 0, fontWeight: 900, fontSize: '0.95rem', color: '#cbd5e1' }}>📊 Bölüm Bazlı Sonuç Özeti</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {sectionStats.map((secStat, sIdx) => (
              <div key={sIdx} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '0.85rem', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ padding: '0.25rem 0.55rem', background: secStat.isOE ? '#7c3aed' : '#0284c7', borderRadius: '0.4rem', fontSize: '0.72rem', fontWeight: 900, color: 'white' }}>
                    {secStat.isOE ? '✍️ Yazılı Bölüm' : '📝 Test Bölümü'}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f8fafc' }}>{secStat.title}</span>
                </div>

                {secStat.isOE ? (
                  <span style={{ padding: '0.3rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(192,132,252,0.15)', border: '1px solid #c084fc', color: '#c084fc', fontSize: '0.8rem', fontWeight: 900 }}>
                    ⏳ Öğretmen Değerlendirmesinde ({secStat.oeCevaplanan}/{secStat.qCount} Yanıt)
                  </span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.82rem', fontWeight: 800 }}>
                    <span style={{ color: '#34d399' }}>{secStat.mcDoğru} Doğru</span>
                    <span style={{ color: '#f87171' }}>{secStat.mcYanlış} Yanlış</span>
                    <span style={{ color: '#94a3b8' }}>{secStat.mcBoş} Boş</span>
                    <span style={{ padding: '0.2rem 0.6rem', background: '#0369a1', borderRadius: '0.4rem', color: 'white', fontWeight: 900 }}>
                      Net: {secStat.mcNet.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CONFIRM BUTTON */}
        <button
          onClick={onConfirmClose}
          style={{
            marginTop: '0.5rem',
            padding: '0.9rem 1.5rem',
            borderRadius: '0.85rem',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            border: 'none',
            color: 'white',
            fontWeight: 900,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <CheckCircle2 size={20} /> Sonuçları Onayla ve Tamamla
        </button>
      </div>
    </div>
  );
}

// ─── MAIN MULTI-HOMEWORK RUNNER COMPONENT ────────────────────────────────────
export default function MultiHomeworkRunner({ test, questions, onSubmit, isReviewMode = false, userAnswers = null }) {
  const { questions: allBankQuestions } = useQuestionBank();
  const draftKey = useMemo(() => `draft_multi_hw_${test.id || 'test'}`, [test.id]);

  // 1. Build sections cleanly
  const sections = useMemo(() => {
    // If test has explicit sections array
    if (test.sections && Array.isArray(test.sections) && test.sections.length > 0) {
      return test.sections.map((sec, idx) => {
        const bankQ = allBankQuestions?.find(q => String(q.id) === String(sec.questionId || sec.id)) || sec;
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (sec.questions || []);

        if (bankQ?.questionsList && Array.isArray(bankQ.questionsList) && bankQ.questionsList.length > 0) {
          resolvedQuestions = bankQ.questionsList.map((q, qIdx) => ({
            ...q,
            id: q.id || `${bankQ.id}_q${qIdx + 1}`,
            questionText: q.questionText || q.text || q.title || `Soru ${qIdx + 1}`,
            options: (q.options && q.options.length > 0) ? q.options : ['A', 'B', 'C', 'D', 'E'],
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0
          }));
        }

        const qCount = bankQ?.questionCount || sec.questionCount || resolvedQuestions.length || 1;

        if (resolvedQuestions.length < qCount) {
          const filled = [...resolvedQuestions];
          for (let i = filled.length; i < qCount; i++) {
            filled.push({
              id: `${bankQ?.id || sec.id || 'q'}_sub_${i + 1}`,
              questionText: `Soru ${i + 1}`,
              options: ['A', 'B', 'C', 'D', 'E'],
              correctAnswer: 0
            });
          }
          resolvedQuestions = filled;
        }

        return {
          id: sec.id || sec.questionId || `sec_${idx}`,
          title: sec.title || bankQ?.title || bankQ?.name || `${idx + 1}. Bölüm`,
          bankQ: bankQ || sec,
          resolvedQuestions,
          qCount: resolvedQuestions.length
        };
      });
    }

    // If test has tests array
    if (test.tests && Array.isArray(test.tests) && test.tests.length > 0) {
      return test.tests.map((subTest, idx) => {
        const bankQ = allBankQuestions?.find(q => String(q.id) === String(subTest.id || subTest.questionId)) || subTest;
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (subTest.questions || []);
        
        if (bankQ?.questionsList && Array.isArray(bankQ.questionsList) && bankQ.questionsList.length > 0) {
          resolvedQuestions = bankQ.questionsList;
        }

        const qCount = bankQ?.questionCount || subTest.questionCount || resolvedQuestions.length || 1;

        if (resolvedQuestions.length < qCount) {
          const filled = [...resolvedQuestions];
          for (let i = filled.length; i < qCount; i++) {
            filled.push({
              id: `${bankQ?.id || subTest.id || 'q'}_sub_${i + 1}`,
              questionText: `Soru ${i + 1}`,
              options: ['A', 'B', 'C', 'D', 'E'],
              correctAnswer: 0
            });
          }
          resolvedQuestions = filled;
        }

        return {
          id: subTest.id || `test_${idx}`,
          title: subTest.title || subTest.name || bankQ?.title || `${idx + 1}. Bölüm`,
          bankQ: bankQ || subTest,
          resolvedQuestions,
          qCount: resolvedQuestions.length
        };
      });
    }

    // If test has selectedQuestions array
    if (test.selectedQuestions && Array.isArray(test.selectedQuestions) && test.selectedQuestions.length > 0) {
      return test.selectedQuestions.map((sq, idx) => {
        const bankQ = allBankQuestions?.find(q => String(q.id) === String(sq.id || sq.questionId)) || sq;
        let resolvedQuestions = bankQ ? resolveTestQuestions(bankQ, allBankQuestions) : (sq.questions || []);

        if (bankQ?.questionsList && Array.isArray(bankQ.questionsList) && bankQ.questionsList.length > 0) {
          resolvedQuestions = bankQ.questionsList;
        }

        return {
          id: sq.id || `sq_${idx}`,
          title: sq.title || sq.name || bankQ?.title || `${idx + 1}. Bölüm`,
          bankQ: bankQ || sq,
          resolvedQuestions,
          qCount: resolvedQuestions.length || bankQ?.questionCount || 1
        };
      });
    }

    // Fallback: Group questions ONLY by sectionId or sectionTitle if explicitly present
    if (questions && questions.length > 0) {
      const hasExplicitSections = questions.some(q => q.sectionId || q.sectionTitle);
      if (hasExplicitSections) {
        const groups = {};
        questions.forEach((q) => {
          const groupKey = q.sectionId || q.sectionTitle || 'sec_main';
          const groupTitle = q.sectionTitle || '1. Bölüm';

          if (!groups[groupKey]) {
            groups[groupKey] = {
              id: groupKey,
              title: groupTitle,
              bankQ: test,
              resolvedQuestions: [],
              qCount: 0
            };
          }
          groups[groupKey].resolvedQuestions.push(q);
          groups[groupKey].qCount += 1;
        });
        const res = Object.values(groups);
        if (res.length > 0) return res;
      }
    }

    const resolvedQuestions = resolveTestQuestions(test, allBankQuestions);
    const finalQs = resolvedQuestions.length > 0 ? resolvedQuestions : (questions || []);
    return [{
      id: test.id || 'sec_1',
      title: test.title || test.name || '1. Bölüm',
      bankQ: test,
      resolvedQuestions: finalQs,
      qCount: finalQs.length || 1
    }];
  }, [test, questions, allBankQuestions]);

  const [activeSecIdx, setActiveSecIdx] = useState(0);
  const activeSec = sections[activeSecIdx] || sections[0];

  const [sectionAnswers, setSectionAnswers] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_ans`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return Object.fromEntries(sections.map(s => [s.id, { answers: {}, openEndedText: {} }]));
  });

  const [isDrawingOpen, setIsDrawingOpen] = useState(false);

  const totalQuestionsCount = useMemo(() => {
    return sections.reduce((sum, s) => sum + s.qCount, 0);
  }, [sections]);

  const perQuestionMins = Number(test.timePerQuestion || test.time_per_question) || 2;
  const totalSeconds = useMemo(() => totalQuestionsCount * perQuestionMins * 60 || 1200, [totalQuestionsCount, perQuestionMins]);

  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const saved = localStorage.getItem(`${draftKey}_time`);
      if (saved !== null) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 0 && val <= totalSeconds) return val;
      }
    } catch {}
    return totalSeconds;
  });

  useEffect(() => {
    try {
      localStorage.setItem(`${draftKey}_ans`, JSON.stringify(sectionAnswers));
    } catch {}
  }, [sectionAnswers, draftKey]);

  useEffect(() => {
    if (timeLeft <= 0) { handleSubmit(); return; }
    try { localStorage.setItem(`${draftKey}_time`, String(timeLeft)); } catch {}

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [draftKey]);

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = n => String(n).padStart(2, '0');
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  const handleSelectOption = (secId, qNo, optIdx, qObj) => {
    const sec = sections.find(s => s.id === secId) || activeSec;
    const bankQ = sec.bankQ || test;
    const isCorrect = checkIsAnswerCorrect(optIdx, qObj, bankQ, qNo);

    setSectionAnswers(prev => {
      const currentSecState = prev[secId] || { answers: {}, openEndedText: {} };
      return {
        ...prev,
        [secId]: {
          ...currentSecState,
          answers: {
            ...currentSecState.answers,
            [qNo]: { userAnswer: optIdx, isCorrect, questionId: qObj?.id }
          }
        }
      };
    });
  };

  const handleTextChange = (secId, qNo, val) => {
    setSectionAnswers(prev => {
      const currentSecState = prev[secId] || { answers: {}, openEndedText: {} };
      return {
        ...prev,
        [secId]: {
          ...currentSecState,
          openEndedText: {
            ...currentSecState.openEndedText,
            [qNo]: val
          }
        }
      };
    });
  };

  const [showResultModal, setShowResultModal] = useState(false);
  const [submissionAnswers, setSubmissionAnswers] = useState(null);

  const handleSubmit = () => {
    try {
      localStorage.removeItem(`${draftKey}_ans`);
      localStorage.removeItem(`${draftKey}_time`);
    } catch {}

    const formattedAnswers = [];
    let globalNo = 1;

    sections.forEach(sec => {
      const sa = sectionAnswers[sec.id] || {};
      const secQs = sec.resolvedQuestions || [];
      const bankQ = sec.bankQ || test;

      for (let idx = 0; idx < sec.qCount; idx++) {
        const qNo = idx + 1;
        const qObj = secQs[idx] || {};
        const ansObj = sa.answers?.[qNo] || {};
        const userAns = typeof ansObj === 'object' ? ansObj.userAnswer : ansObj;
        const textAns = sa.openEndedText?.[qNo] || null;
        const isCorrect = userAns !== undefined && userAns !== null ? checkIsAnswerCorrect(userAns, qObj, bankQ, qNo) : null;

        formattedAnswers.push({
          questionId: qObj.id || `${sec.id}_${qNo}`,
          questionNo: globalNo++,
          sectionId: sec.id,
          sectionTitle: sec.title,
          userAnswer: userAns !== undefined ? userAns : null,
          userAnswerText: textAns,
          isCorrect,
          correctAnswer: qObj.correctAnswer !== undefined ? qObj.correctAnswer : null
        });
      }
    });

    setSubmissionAnswers(formattedAnswers);
    setShowResultModal(true);
  };

  const handleConfirmCloseResult = () => {
    if (submissionAnswers) {
      onSubmit(submissionAnswers);
    }
  };

  const activeSecState = sectionAnswers[activeSec.id] || { answers: {}, openEndedText: {} };
  const secOE = checkIsOE(activeSec.bankQ);

  const [idbPayload, setIdbPayload] = useState(null);
  const loadedRef = React.useRef(null);

  const extractPayload = (obj) => {
    const candidates = [obj?.contentPayload, obj?.pdfPayload, obj?.pdfUrl, obj?.url, obj?.content];
    return candidates.find(c => c && c !== '[STORED_IN_INDEXEDDB]' && c !== '[LOCALSTORAGE_CACHE]') || null;
  };

  const activeBankQ = activeSec.bankQ || {};
  const isPdf = isPdfSection(activeBankQ) || isPdfSection(test);
  const isHtml = isHtmlSection(activeBankQ) || isHtmlSection(test);
  const isImage = isImageSection(activeBankQ) || isImageSection(test);

  const [lightboxSrc, setLightboxSrc] = useState(null);
  const activePdfPayload = extractPayload(activeBankQ) || extractPayload(test) || idbPayload;
  const [htmlIframeSrc, setHtmlIframeSrc] = useState(null);

  useEffect(() => {
    if (!isPdf) return;
    const targetObj = activeBankQ.id ? activeBankQ : test;
    if (extractPayload(targetObj) || loadedRef.current === targetObj.id) return;
    async function load() {
      const val = await idbGetPayload(targetObj.id);
      if (val && val !== '[STORED_IN_INDEXEDDB]') {
        loadedRef.current = targetObj.id;
        setIdbPayload(val);
      }
    }
    load();
  }, [activeBankQ, test, isPdf]);

  useEffect(() => {
    if (!isHtml) return;
    const payload = activeBankQ.contentPayload || activeBankQ.htmlPayload || test.contentPayload || test.htmlPayload;
    if (payload && payload !== '[STORED_IN_INDEXEDDB]' && payload !== '[LOCALSTORAGE_CACHE]') {
      if (payload.startsWith('http')) { setHtmlIframeSrc(payload); return; }
      if (payload.startsWith('data:text/html') || payload.startsWith('<!DOCTYPE') || payload.startsWith('<html') || payload.includes('<html')) {
        const blob = new Blob([payload.startsWith('data:') ? atob(payload.split(',')[1] || '') : payload], { type: 'text/html' });
        setHtmlIframeSrc(URL.createObjectURL(blob));
        return;
      }
    }

    async function loadHtmlFromIdb() {
      const id = activeBankQ.id || test.id;
      const val = await idbGetPayload(id);
      if (val && val !== '[STORED_IN_INDEXEDDB]') {
        if (val.startsWith('http')) { setHtmlIframeSrc(val); return; }
        const blob = new Blob([val.startsWith('data:') ? atob(val.split(',')[1] || '') : val], { type: 'text/html' });
        setHtmlIframeSrc(URL.createObjectURL(blob));
      }
    }
    loadHtmlFromIdb();
  }, [activeBankQ, test, isHtml]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f172a', color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* ── HEADER BAR ── */}
      <header style={{ padding: '0.75rem 1.5rem', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.35rem 0.65rem', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.75rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={14} /> TOPLU ÖDEV RUNNER
          </span>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: 0, color: '#f8fafc' }}>{test.title || test.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.4rem 0.85rem', borderRadius: '0.65rem', background: timeLeft < 300 ? '#7f1d1d' : '#0f172a', border: `1.5px solid ${timeLeft < 300 ? '#ef4444' : '#334155'}`, color: timeLeft < 300 ? '#fca5a5' : '#e0e7ff', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={16} color={timeLeft < 300 ? '#ef4444' : '#059669'} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setIsDrawingOpen(!isDrawingOpen)}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.75rem', background: isDrawingOpen ? '#eab308' : '#0f172a', border: '1px solid #334155', color: isDrawingOpen ? 'white' : '#e2e8f0', fontWeight: 800, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Pencil size={16} /> {isDrawingOpen ? "Çizimi Kapat" : "Çizim Aracı"}
          </button>

          <button
            onClick={handleSubmit}
            style={{ padding: '0.55rem 1.25rem', borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
          >
            <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
          </button>
        </div>
      </header>

      {/* ── TOP SECTION TABS BAR (PERMANENT) ── */}
      <div style={{ background: '#0f172a', borderBottom: '1px solid #1e293b', padding: '0.65rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexShrink: 0, overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {sections.map((sec, idx) => {
            const isCurrent = idx === activeSecIdx;
            const secAnsState = sectionAnswers[sec.id]?.answers || {};
            const secTxtState = sectionAnswers[sec.id]?.openEndedText || {};
            const ansCount = Object.keys(secAnsState).length + Object.keys(secTxtState).filter(k => secTxtState[k]).length;
            const isCompleted = ansCount === sec.qCount && sec.qCount > 0;

            return (
              <button
                key={sec.id || idx}
                onClick={() => setActiveSecIdx(idx)}
                style={{
                  padding: '0.5rem 1.1rem',
                  borderRadius: '0.75rem',
                  fontWeight: 900,
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: isCurrent ? 'linear-gradient(135deg, #6366f1, #4f46e5)' : isCompleted ? 'rgba(16,185,129,0.15)' : '#1e293b',
                  border: isCurrent ? '2px solid #818cf8' : isCompleted ? '1px solid #10b981' : '1px solid #334155',
                  color: isCurrent ? 'white' : isCompleted ? '#34d399' : '#cbd5e1',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{idx + 1}. Bölüm: {sec.title}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.85, padding: '0.1rem 0.4rem', borderRadius: '0.3rem', background: 'rgba(0,0,0,0.25)' }}>
                  {ansCount}/{sec.qCount}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
            disabled={activeSecIdx === 0}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '0.6rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 800, fontSize: '0.8rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            <ChevronLeft size={16} /> Önceki Bölüm
          </button>
          <button
            onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
            disabled={activeSecIdx === sections.length - 1}
            style={{ padding: '0.4rem 0.9rem', borderRadius: '0.6rem', background: activeSecIdx === sections.length - 1 ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', color: activeSecIdx === sections.length - 1 ? '#64748b' : 'white', fontWeight: 800, fontSize: '0.8rem', cursor: activeSecIdx === sections.length - 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
          >
            Sonraki Bölüm <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        
        {isPdf ? (
          /* PDF VIEWER + OPTIK PANEL ONLY */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflow: 'hidden' }}>
              <PdfViewerWithControls payload={activePdfPayload} title={activeSec.title} height="100%" />
            </div>
            <RightOptikPanel
              qCount={activeSec.qCount}
              answers={activeSecState.answers || {}}
              openEndedText={activeSecState.openEndedText || {}}
              isOpenEnded={secOE}
              resolvedQuestions={activeSec.resolvedQuestions}
              bankQ={activeSec.bankQ || test}
              isReviewMode={isReviewMode}
              onOptionSelect={(qNo, optIdx) => {
                const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
                handleSelectOption(activeSec.id, qNo, optIdx, qObj);
              }}
              onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
              onNextSection={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
              onSubmit={handleSubmit}
              activeSecIdx={activeSecIdx}
              totalSections={sections.length}
            />
          </div>
        ) : isHtml ? (
          /* HTML VIEWER + OPTIK PANEL ONLY */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflow: 'hidden' }}>
              {htmlIframeSrc ? (
                <iframe src={htmlIframeSrc} style={{ width: '100%', height: '100%', border: 'none', background: 'white' }} title={activeSec.title} sandbox="allow-scripts allow-same-origin" />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontWeight: 700 }}>HTML İçerik Yükleniyor...</div>
              )}
            </div>
            <RightOptikPanel
              qCount={activeSec.qCount}
              answers={activeSecState.answers || {}}
              openEndedText={activeSecState.openEndedText || {}}
              isOpenEnded={secOE}
              resolvedQuestions={activeSec.resolvedQuestions}
              bankQ={activeSec.bankQ || test}
              isReviewMode={isReviewMode}
              onOptionSelect={(qNo, optIdx) => {
                const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
                handleSelectOption(activeSec.id, qNo, optIdx, qObj);
              }}
              onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
              onNextSection={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
              onSubmit={handleSubmit}
              activeSecIdx={activeSecIdx}
              totalSections={sections.length}
            />
          </div>
        ) : isImage ? (
          /* IMAGE SET VIEWER (DARK THEME & SINGLE LINE ABCDE BUTTONS) */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
            <ImageLightbox isOpen={Boolean(lightboxSrc)} src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
            
            <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* SECTION BANNER */}
              <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 6px 20px rgba(2,132,199,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                    🖼️
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                      Görsel Soru Seti — Aşağıdaki soruları inceleyip şıkları işaretleyiniz.
                    </p>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
                  Bölüm {activeSecIdx + 1} / {sections.length}
                </div>
              </div>

              {/* QUESTION CARDS IN DARK THEME */}
              {Array.from({ length: activeSec.qCount }).map((_, idx) => {
                const qNo = idx + 1;
                const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[idx]) || {};
                const isQOpenEnded = secOE || checkIsOE(qObj);

                const rawImages = (qObj.imageUrls && qObj.imageUrls.length > 0)
                  ? qObj.imageUrls
                  : (qObj.imageUrl ? [qObj.imageUrl] : (qObj.contentPayload && qObj.contentPayload.startsWith('data:image') ? [qObj.contentPayload] : []));
                const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

                const userAnsObj = activeSecState.answers?.[qNo];
                const selectedOpt = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
                const textVal = activeSecState.openEndedText?.[qNo] || '';

                return (
                  <div key={qNo} style={{ background: '#1e293b', borderRadius: '1.1rem', border: '1px solid #334155', padding: '1.5rem', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* QUESTION HEADER */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ padding: '0.3rem 0.75rem', background: '#38bdf8', color: '#0f172a', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                          SORU {qNo}
                        </span>
                        {isQOpenEnded && (
                          <span style={{ padding: '0.2rem 0.6rem', background: '#fef3c7', color: '#b45309', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                            ✍️ Açık Uçlu / Yazılı
                          </span>
                        )}
                      </div>

                      {selectedOpt !== undefined || textVal ? (
                        <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 900 }}>✓ Cevaplandı</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— Yanıtlanmadı</span>
                      )}
                    </div>

                    {/* QUESTION IMAGES */}
                    {imageUrls.map((url, imgIdx) => (
                      <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${qNo} Görsel`} onOpenFullscreen={() => setLightboxSrc(url)} />
                    ))}

                    {/* SINGLE LINE HORIZONTAL ABCDE BUTTONS */}
                    {!isQOpenEnded ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        {['A', 'B', 'C', 'D', 'E'].map((opt, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          return (
                            <button
                              key={opt}
                              onClick={() => handleSelectOption(activeSec.id, qNo, optIdx, qObj)}
                              style={{
                                flex: 1,
                                height: '42px',
                                borderRadius: '0.65rem',
                                border: isSelected ? 'none' : '1px solid #475569',
                                background: isSelected ? 'linear-gradient(135deg, #059669, #10b981)' : '#0f172a',
                                color: isSelected ? 'white' : '#cbd5e1',
                                fontWeight: 900,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: isSelected ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        value={textVal}
                        onChange={e => handleTextChange(activeSec.id, qNo, e.target.value)}
                        placeholder={`Soru ${qNo} için yanıtınızı buraya yazınız...`}
                        rows={4}
                        style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                      />
                    )}
                  </div>
                );
              })}

              {/* BOTTOM SECTION NAV BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
                  disabled={activeSecIdx === 0}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ChevronLeft size={18} /> Önceki Bölüm
                </button>

                {activeSecIdx < sections.length - 1 ? (
                  <button
                    onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                    style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
                  >
                    Sonraki Bölüm <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                  >
                    <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT OPTIK PANEL */}
            <RightOptikPanel
              qCount={activeSec.qCount}
              answers={activeSecState.answers || {}}
              openEndedText={activeSecState.openEndedText || {}}
              isOpenEnded={secOE}
              resolvedQuestions={activeSec.resolvedQuestions}
              bankQ={activeSec.bankQ || test}
              isReviewMode={isReviewMode}
              onOptionSelect={(qNo, optIdx) => {
                const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
                handleSelectOption(activeSec.id, qNo, optIdx, qObj);
              }}
              onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
              onNextSection={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
              onSubmit={handleSubmit}
              activeSecIdx={activeSecIdx}
              totalSections={sections.length}
            />
          </div>
        ) : (
          /* STANDARD QUESTION CARDS + OPTIK PANEL (DARK THEME) */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, background: '#0f172a', overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* SECTION BANNER */}
              <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3730a3)', borderRadius: '1.25rem', padding: '1.25rem 1.5rem', color: 'white', boxShadow: '0 6px 20px rgba(79,70,229,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '0.85rem', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileSpreadsheet size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>{activeSecIdx + 1}. Bölüm — {activeSec.title}</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
                      Bu bölümdeki {activeSec.qCount} sorunun tamamı aşağıda sıralanmıştır.
                    </p>
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.4rem 0.85rem', borderRadius: '0.65rem', fontSize: '0.82rem', fontWeight: 900 }}>
                  Bölüm {activeSecIdx + 1} / {sections.length}
                </div>
              </div>

              {/* QUESTION CARDS STACKED VERTICALLY (DARK THEME) */}
              {Array.from({ length: activeSec.qCount }).map((_, idx) => {
                const qNo = idx + 1;
                const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[idx]) || {};
                const isQOpenEnded = secOE || checkIsOE(qObj);

                const qText = qObj.questionText || qObj.text || qObj.question || qObj.title || qObj.questionTitle || qObj.name || (qObj.contentPayload && !qObj.contentPayload.startsWith('data:') ? qObj.contentPayload : null) || `Soru ${qNo}`;

                const rawImages = (qObj.imageUrls && qObj.imageUrls.length > 0)
                  ? qObj.imageUrls
                  : (qObj.imageUrl ? [qObj.imageUrl] : (qObj.contentPayload && qObj.contentPayload.startsWith('data:image') ? [qObj.contentPayload] : []));
                const imageUrls = (Array.isArray(rawImages) ? rawImages : [rawImages]).filter(isValidImageUrl);

                const options = (qObj.options && Array.isArray(qObj.options) && qObj.options.length > 0) ? qObj.options : ['A', 'B', 'C', 'D', 'E'];

                const userAnsObj = activeSecState.answers?.[qNo];
                const selectedOpt = typeof userAnsObj === 'object' ? userAnsObj?.userAnswer : userAnsObj;
                const textVal = activeSecState.openEndedText?.[qNo] || '';

                return (
                  <div key={qNo} style={{ background: '#1e293b', borderRadius: '1.1rem', border: '1px solid #334155', padding: '1.5rem', boxShadow: '0 4px 14px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    {/* QUESTION HEADER */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ padding: '0.3rem 0.75rem', background: '#6366f1', color: 'white', borderRadius: '0.5rem', fontWeight: 900, fontSize: '0.85rem' }}>
                          SORU {qNo}
                        </span>
                        {isQOpenEnded && (
                          <span style={{ padding: '0.2rem 0.6rem', background: '#fef3c7', color: '#b45309', borderRadius: '0.4rem', fontWeight: 800, fontSize: '0.75rem' }}>
                            ✍️ Açık Uçlu / Yazılı
                          </span>
                        )}
                      </div>

                      {selectedOpt !== undefined || textVal ? (
                        <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 900 }}>✓ Cevaplandı</span>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>— Yanıtlanmadı</span>
                      )}
                    </div>

                    {/* QUESTION IMAGES */}
                    {imageUrls.map((url, imgIdx) => (
                      <StandardImageFrame key={imgIdx} src={url} alt={`Soru ${qNo} Görsel`} />
                    ))}

                    {/* QUESTION TEXT */}
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.65 }}>
                      {qText}
                    </div>

                    {/* MULTIPLE CHOICE OPTIONS OR WRITTEN INPUT */}
                    {!isQOpenEnded ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
                        {options.map((opt, optIdx) => {
                          const isSelected = selectedOpt === optIdx;
                          const optLetter = String.fromCharCode(65 + optIdx);
                          let optText = '';
                          if (typeof opt === 'string') {
                            optText = opt;
                          } else if (opt && typeof opt === 'object') {
                            optText = opt.text || opt.optionText || opt.label || opt.title || opt.value || opt.content || '';
                          }
                          const showText = Boolean(optText && optText.trim() !== optLetter);

                          return (
                            <button key={optIdx} onClick={() => handleSelectOption(activeSec.id, qNo, optIdx, qObj)} style={{
                              padding: '0.9rem 1.25rem', borderRadius: '0.75rem', textAlign: 'left', cursor: 'pointer', fontWeight: isSelected ? 900 : 700,
                              border: isSelected ? '2px solid #818cf8' : '1.5px solid #334155',
                              background: isSelected ? 'linear-gradient(135deg, #4f46e5, #3730a3)' : '#0f172a',
                              color: isSelected ? 'white' : '#cbd5e1', transition: 'all 0.15s ease',
                              display: 'flex', alignItems: 'center'
                            }}>
                              <span style={{ fontWeight: 900, color: isSelected ? '#a5b4fc' : '#38bdf8', fontSize: '0.95rem', marginRight: '0.75rem', minWidth: '24px' }}>
                                {optLetter})
                              </span>
                              <span style={{ fontSize: '0.95rem', color: isSelected ? 'white' : '#f8fafc', fontWeight: 700 }}>
                                {showText ? optText : `Seçenek ${optLetter}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <label style={{ fontWeight: 800, fontSize: '0.85rem', color: '#a5b4fc' }}>
                          ✍️ Açık Uçlu Yanıtınızı Buraya Yazınız:
                        </label>
                        <textarea
                          value={textVal}
                          onChange={e => handleTextChange(activeSec.id, qNo, e.target.value)}
                          placeholder={`Soru ${qNo} için yanıtınızı buraya yazınız...`}
                          rows={4}
                          style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem', background: '#0f172a', border: '1.5px solid #475569', color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* BOTTOM SECTION NAV BUTTONS */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                  onClick={() => setActiveSecIdx(p => Math.max(0, p - 1))}
                  disabled={activeSecIdx === 0}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '0.85rem', background: activeSecIdx === 0 ? '#1e293b' : '#334155', border: '1px solid #475569', color: activeSecIdx === 0 ? '#64748b' : 'white', fontWeight: 900, fontSize: '0.9rem', cursor: activeSecIdx === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <ChevronLeft size={18} /> Önceki Bölüm
                </button>

                {activeSecIdx < sections.length - 1 ? (
                  <button
                    onClick={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
                    style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
                  >
                    Sonraki Bölüm <ChevronRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    style={{ padding: '0.75rem 1.75rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}
                  >
                    <CheckCircle2 size={18} /> Sınavı Bitir ve Gönder
                  </button>
                )}
              </div>
            </div>

            {/* RIGHT OPTIK PANEL */}
            <RightOptikPanel
              qCount={activeSec.qCount}
              answers={activeSecState.answers || {}}
              openEndedText={activeSecState.openEndedText || {}}
              isOpenEnded={secOE}
              resolvedQuestions={activeSec.resolvedQuestions}
              bankQ={activeSec.bankQ || test}
              isReviewMode={isReviewMode}
              onOptionSelect={(qNo, optIdx) => {
                const qObj = (activeSec.resolvedQuestions && activeSec.resolvedQuestions[qNo - 1]) || {};
                handleSelectOption(activeSec.id, qNo, optIdx, qObj);
              }}
              onTextChange={(qNo, val) => handleTextChange(activeSec.id, qNo, val)}
              onNextSection={() => setActiveSecIdx(p => Math.min(sections.length - 1, p + 1))}
              onSubmit={handleSubmit}
              activeSecIdx={activeSecIdx}
              totalSections={sections.length}
            />
          </div>
        )}
      </div>

      {showResultModal && (
        <MultiResultModal
          test={test}
          sections={sections}
          sectionAnswers={sectionAnswers}
          onConfirmClose={handleConfirmCloseResult}
        />
      )}

      <DrawingCanvas isOpen={isDrawingOpen} onClose={() => setIsDrawingOpen(false)} />
    </div>
  );
}
