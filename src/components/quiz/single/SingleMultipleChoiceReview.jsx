import React, { useState } from 'react';
import { useMediaQuery } from '../../../hooks/useMediaQuery';
import MultipleChoiceReview from '../review/MultipleChoiceReview';
import OpticalBubblePanel from '../panels/OpticalBubblePanel';
import QuizPanelLayout from '../runner/QuizPanelLayout';
import {
  ArrowLeft, Award, CheckCircle2, XCircle, HelpCircle, ChevronLeft,
  ChevronRight, Trophy, Zap, Clock, ShieldCheck, Filter, LayoutList, Square
} from 'lucide-react';

export default function SingleMultipleChoiceReview({
  submission = {},
  test = {},
  questions = [],
  onClose
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeQIdx, setActiveQIdx] = useState(0);
  const [viewMode, setViewMode] = useState('single');

  const answers = submission.answers || submission.formattedAnswers || [];

  const answersMap = {};
  if (Array.isArray(answers)) {
    answers.forEach((a, idx) => {
      if (!a) return;
      const qNo = a.questionNoInSection || a.questionNo || (idx + 1);
      const raw = a.userAnswer;
      answersMap[qNo] = (typeof raw === 'object' && raw !== null) ? raw.userAnswer : raw;
    });
  }

  const normalizeAns = (val) => {
    if (val === null || val === undefined || val === '' || val === 'empty') return null;
    if (typeof val === 'number') return val;
    const str = String(val).trim().toUpperCase();
    if (/^[A-E]$/.test(str)) return str.charCodeAt(0) - 65;
    const num = Number(str);
    return (!isNaN(num) && num >= 0 && num <= 4) ? num : str;
  };

  const resolveCorrectForQ = (qNo, idx, ansObj, q, testObj) => {
    const isValidVal = (v) => v !== undefined && v !== null && (typeof v === 'string' ? v.trim() !== '' && v.trim() !== 'empty' : true);

    if (isValidVal(ansObj?.correctAnswer)) return ansObj.correctAnswer;
    if (isValidVal(ansObj?.correctAnswerLetter)) return ansObj.correctAnswerLetter;
    if (isValidVal(q?.correctAnswer)) return q.correctAnswer;
    if (isValidVal(q?.correct_answer)) return q.correct_answer;
    if (isValidVal(q?.bankQ?.correctAnswer)) return q.bankQ.correctAnswer;
    if (isValidVal(q?.bankQ?.correct_answer)) return q.bankQ.correct_answer;
    if (isValidVal(q?.correctAnswerLetter)) return q.correctAnswerLetter;
    if (isValidVal(q?.correctOption)) return q.correctOption;
    if (isValidVal(q?.answer)) return q.answer;
    if (isValidVal(testObj?.correctAnswer)) return testObj.correctAnswer;
    if (isValidVal(testObj?.correct_answer)) return testObj.correct_answer;
    if (isValidVal(testObj?.bankQ?.correctAnswer)) return testObj.bankQ.correctAnswer;

    for (const exp of [q?.explanation, q?.bankQ?.explanation, testObj?.explanation, testObj?.bankQ?.explanation]) {
      if (typeof exp === 'string' && exp.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(exp);
          if (isValidVal(parsed.correctAnswer)) return parsed.correctAnswer;
          if (isValidVal(parsed.correct_answer)) return parsed.correct_answer;
        } catch {}
      }
    }

    const ak = testObj?.answerKey || testObj?.answers || testObj?.correctAnswers;
    if (ak) {
      if (typeof ak === 'object' && !Array.isArray(ak)) {
        const val = ak[qNo] ?? ak[String(qNo)] ?? ak[idx] ?? ak[String(idx)];
        if (isValidVal(val)) return val;
      } else if (Array.isArray(ak)) {
        const val = ak[idx] ?? ak[qNo];
        if (isValidVal(val)) return val;
      } else if (typeof ak === 'string') {
        const clean = ak.replace(/[^A-Ea-e]/g, '').toUpperCase();
        if (clean[idx]) return clean[idx];
      }
    }
    return null;
  };

  const totalQuestions = questions.length || answers.length || submission.totalQuestions || 1;

  const isCorrectMap = {};
  const correctAnswersArray = [];
  let correctCount = 0;
  let wrongCount = 0;

  for (let idx = 0; idx < totalQuestions; idx++) {
    const qNo = idx + 1;
    const q = (Array.isArray(questions) ? questions[idx] : null) || {};
    const ansObj = (Array.isArray(answers) ? answers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo) : null) || answers[idx] || {};
    const uAns = answersMap[qNo] ?? ansObj.userAnswer;
    const cAns = resolveCorrectForQ(qNo, idx, ansObj, q, test);
    const normU = normalizeAns(uAns);
    const normC = normalizeAns(cAns);

    const isBlank = normU === null;
    let isCorr = null;

    if (!isBlank) {
      if (normC !== null && normC !== undefined) {
        isCorr = (normU === normC);
      } else if (ansObj.isCorrect !== undefined && ansObj.isCorrect !== null) {
        isCorr = Boolean(ansObj.isCorrect);
      } else {
        isCorr = true;
      }
    }

    if (isCorr === true) correctCount++;
    else if (isCorr === false) wrongCount++;

    isCorrectMap[qNo] = isCorr;
    correctAnswersArray.push(normC);
  }

  if (correctCount === 0 && wrongCount === 0 && (submission.correctCount || submission.wrongCount)) {
    correctCount = Number(submission.correctCount || 0);
    wrongCount = Number(submission.wrongCount || 0);
  }

  const blankCount = Math.max(0, totalQuestions - correctCount - wrongCount);
  const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : (submission.score || 0);
  const rawNet = Math.max(0, correctCount - wrongCount * 0.25);
  const netScore = Number.isInteger(rawNet) ? rawNet : rawNet.toFixed(2);

  const getScoreBadge = (pct) => {
    if (pct >= 85) return { label: 'Mükemmel 🌟', bg: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff' };
    if (pct >= 70) return { label: 'Çok İyi 🎯', bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#ffffff' };
    if (pct >= 50) return { label: 'Başarılı 👍', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff' };
    return { label: 'Geliştirilmeli 📈', bg: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff' };
  };

  const badge = getScoreBadge(score);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
      {/* ── TOP HEADER ── */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1.5px solid #e2e8f0',
        padding: isMobile ? '0.75rem 1rem' : '1rem 1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.85rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem',
              borderRadius: '0.75rem',
              border: '1.5px solid #cbd5e1',
              background: '#f8fafc',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, color: '#0f172a' }}>
                {test.title || submission.testTitle || 'Sınav Çözüm İnceleme'}
              </h3>
              <span style={{ fontSize: '0.72rem', fontWeight: 900, padding: '2px 8px', borderRadius: 99, background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>
              Cevap Anahtarı ve Detaylı Soru Çözümleri
            </span>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(79,70,229,0.06))',
            border: '1.5px solid rgba(99,102,241,0.3)',
            borderRadius: '0.85rem',
            padding: '0.35rem 0.85rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 800, textTransform: 'uppercase' }}>NET PUAN</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#4f46e5' }}>{netScore}</div>
          </div>

          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1.5px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '0.85rem',
            padding: '0.35rem 0.85rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>DOĞRU</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#059669' }}>{correctCount}</div>
          </div>

          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '0.85rem',
            padding: '0.35rem 0.85rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 800, textTransform: 'uppercase' }}>YANLIŞ</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#dc2626' }}>{wrongCount}</div>
          </div>

          <div style={{
            background: '#f1f5f9',
            border: '1.5px solid #cbd5e1',
            borderRadius: '0.85rem',
            padding: '0.35rem 0.85rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>BOŞ</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#475569' }}>{blankCount}</div>
          </div>
        </div>
      </div>

      {/* Main Review Layout */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <QuizPanelLayout
          panelTitle="Cevap Durumu"
          panelSubtitle="Soru bazlı doğruluk listesi"
          icon="📊"
          defaultPosition="right"
          defaultSize={320}
          defaultOpenOnMobile={false}
          documentContent={
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
              {/* Question Navigator */}
              <div style={{
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: isMobile ? '0.45rem 0.75rem' : '0.65rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  overflowX: 'auto',
                  padding: '0.15rem 0',
                  flex: 1,
                  justifyContent: isMobile ? 'flex-start' : 'center'
                }}>
                  {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNo) => {
                    const isCurrent = activeQIdx === qNo - 1;
                    const isCorr = isCorrectMap[qNo];

                    let bBg = '#f1f5f9';
                    let bBorder = '1.5px solid #cbd5e1';
                    let bColor = '#64748b';

                    if (isCorr === true) {
                      bBg = '#dcfce7';
                      bBorder = '1.5px solid #16a34a';
                      bColor = '#15803d';
                    } else if (isCorr === false) {
                      bBg = '#fee2e2';
                      bBorder = '1.5px solid #dc2626';
                      bColor = '#b91c1c';
                    }

                    if (isCurrent) {
                      bBorder = '2.5px solid #6366f1';
                    }

                    return (
                      <button
                        key={qNo}
                        type="button"
                        onClick={() => {
                          setActiveQIdx(qNo - 1);
                          if (viewMode === 'list') {
                            document.getElementById(`review-q-${qNo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }}
                        style={{
                          width: isMobile ? '30px' : '34px',
                          height: isMobile ? '30px' : '34px',
                          borderRadius: '0.65rem',
                          border: bBorder,
                          background: bBg,
                          color: bColor,
                          fontWeight: 900,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: isCurrent ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                        title={`Soru ${qNo}'e Geç`}
                      >
                        {isCorr === true ? '✓' : isCorr === false ? '✗' : qNo}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => setViewMode(prev => prev === 'single' ? 'list' : 'single')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.65rem',
                      borderRadius: '0.6rem',
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      color: '#0f172a',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      cursor: 'pointer'
                    }}
                  >
                    {viewMode === 'single' ? <LayoutList size={14} color="#6366f1" /> : <Square size={14} color="#6366f1" />}
                    <span>{isMobile ? '' : (viewMode === 'single' ? 'Tüm Liste' : 'Tek Soru')}</span>
                  </button>
                </div>
              </div>

              {/* Main Review Area */}
              <div style={{ padding: isMobile ? '0.85rem 0.75rem' : '1.5rem 2rem', overflowY: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {viewMode === 'single' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    {(() => {
                      const curQ = questions[activeQIdx] || {};
                      const qNo = activeQIdx + 1;
                      const curAnsObj = (Array.isArray(answers) ? answers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo) : null) || answers[activeQIdx] || {};
                      const curUAns = answersMap[qNo] ?? curAnsObj.userAnswer;
                      const curCAns = resolveCorrectForQ(qNo, activeQIdx, curAnsObj, curQ, test);

                      return (
                        <MultipleChoiceReview
                          key={curQ.id || activeQIdx}
                          question={curQ}
                          qNo={qNo}
                          totalQuestions={totalQuestions}
                          imageUrls={curQ.images || curQ.imageUrls || (curQ.imageUrl ? [curQ.imageUrl] : [])}
                          userAnswer={curUAns}
                          correctAnswer={curCAns}
                          isCorrect={isCorrectMap[qNo]}
                          isMobile={isMobile}
                        />
                      );
                    })()}

                    {/* Stepper Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '1.15rem',
                      padding: isMobile ? '0.75rem 1rem' : '0.9rem 1.5rem',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                    }}>
                      <button
                        type="button"
                        disabled={activeQIdx === 0}
                        onClick={() => setActiveQIdx(prev => Math.max(0, prev - 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: isMobile ? '0.55rem 0.95rem' : '0.65rem 1.35rem',
                          borderRadius: '0.85rem',
                          border: '1.5px solid #cbd5e1',
                          background: activeQIdx === 0 ? '#f1f5f9' : '#ffffff',
                          color: activeQIdx === 0 ? '#94a3b8' : '#0f172a',
                          fontSize: isMobile ? '0.82rem' : '0.88rem',
                          fontWeight: 800,
                          cursor: activeQIdx === 0 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx === 0 ? 0.45 : 1
                        }}
                      >
                        <ChevronLeft size={17} />
                        <span>Önceki Soru</span>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 900, color: '#6366f1' }}>
                          {activeQIdx + 1} / {totalQuestions}
                        </span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700 }}>
                          Soru İnceleme
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={activeQIdx >= totalQuestions - 1}
                        onClick={() => setActiveQIdx(prev => Math.min(totalQuestions - 1, prev + 1))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: isMobile ? '0.55rem 1rem' : '0.65rem 1.45rem',
                          borderRadius: '0.85rem',
                          border: 'none',
                          background: activeQIdx >= totalQuestions - 1 ? '#f1f5f9' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                          color: activeQIdx >= totalQuestions - 1 ? '#94a3b8' : '#ffffff',
                          fontSize: isMobile ? '0.82rem' : '0.88rem',
                          fontWeight: 900,
                          cursor: activeQIdx >= totalQuestions - 1 ? 'not-allowed' : 'pointer',
                          opacity: activeQIdx >= totalQuestions - 1 ? 0.45 : 1,
                          boxShadow: activeQIdx >= totalQuestions - 1 ? 'none' : '0 4px 14px rgba(79,70,229,0.35)'
                        }}
                      >
                        <span>Sonraki Soru</span>
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </div>
                ) : (
                  questions.map((q, idx) => {
                    const qNo = idx + 1;
                    const ansObj = (Array.isArray(answers) ? answers.find(a => Number(a?.questionNo) === qNo || Number(a?.questionNoInSection) === qNo) : null) || answers[idx] || {};
                    const uAns = answersMap[qNo] ?? ansObj.userAnswer;
                    const cAns = resolveCorrectForQ(qNo, idx, ansObj, q, test);

                    return (
                      <div key={idx} id={`review-q-${qNo}`}>
                        <MultipleChoiceReview
                          question={q}
                          qNo={qNo}
                          totalQuestions={totalQuestions}
                          imageUrls={q.images || q.imageUrls || (q.imageUrl ? [q.imageUrl] : [])}
                          userAnswer={uAns}
                          correctAnswer={cAns}
                          isCorrect={isCorrectMap[qNo]}
                          isMobile={isMobile}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          }
          answerContent={
            <OpticalBubblePanel
              qCount={totalQuestions}
              answers={answersMap}
              correctAnswers={correctAnswersArray}
              isReviewMode={true}
              onSelectOption={(qNo) => {
                setActiveQIdx(qNo - 1);
              }}
              resolvedQuestions={questions}
            />
          }
        />
      </div>
    </div>
  );
}
