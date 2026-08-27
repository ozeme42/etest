import React, { memo, useMemo, useState, useEffect } from 'react';
import { Award, CheckCircle, Clock, Edit3, Eye, MessageSquare, XCircle, Sparkles } from 'lucide-react';
import { idbGetPayload } from '../../../services/indexedDbService';
import ImageLightbox from '../common/ImageLightbox';
import ScreenSnipperAndSolverModal from '../ai/ScreenSnipperAndSolverModal';
import AiUsageBadge from '../ai/AiUsageBadge';

const MISTAKE_REASON_OPTIONS = [
  { label: '⚡ İşlem Hatası', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { label: '⚠️ Dikkat Kaybı', color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
  { label: '📖 Formül / Bilgi', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
  { label: '🧠 Konu Eksiği', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
  { label: '⏱️ Zaman Yetmedi', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' }
];

/**
 * StandardImageFrame Component
 */
const StandardImageFrame = memo(function StandardImageFrame({ src, alt, onOpenFullscreen }) {
  if (!src) return null;
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxHeight: '65vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '0.85rem',
      overflow: 'hidden',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      marginBottom: '0.75rem'
    }}>
      <img
        src={src}
        alt={alt || 'Soru Görseli'}
        style={{
          maxWidth: '100%',
          maxHeight: '65vh',
          objectFit: 'contain',
          display: 'block'
        }}
      />
      {onOpenFullscreen && (
        <button
          type="button"
          onClick={onOpenFullscreen}
          title="Tam Ekran Görüntüle"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '0.35rem',
            borderRadius: '0.5rem',
            background: 'rgba(15,23,42,0.65)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Eye size={14} />
        </button>
      )}
    </div>
  );
});

/**
 * OpenEndedReview Component
 * Dedicated review & teacher evaluation component for Open-Ended questions.
 */
export default function OpenEndedReview({
  question,
  qNo = 1,
  totalQuestions = 1,
  studentAnswerText,
  userAnswerText,
  textAns,
  user_answer_text,
  teacherScore = undefined,
  teacherNote = '',
  onSetTeacherScore,
  onScoreChange,
  onSetTeacherNote,
  onNoteChange,
  isTeacherMode,
  isTeacher,
  isTrulyEvaluated = false,
  imageUrls = [],
  onOpenLightbox,
  isMobile = false
}) {
  const setScore = onSetTeacherScore || onScoreChange;
  const setNote = onSetTeacherNote || onNoteChange;
  const isTeacherActive = isTeacherMode ?? isTeacher ?? false;

  const [activeLightbox, setActiveLightbox] = useState(null);
  const [idbImage, setIdbImage] = useState(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [mistakeReason, setMistakeReason] = useState(() => {
    try {
      const saved = localStorage.getItem(`mistake_oe_${question?.id || qNo}`);
      return saved || '';
    } catch {
      return '';
    }
  });

  const handleSetMistakeReason = (reason) => {
    const next = mistakeReason === reason ? '' : reason;
    setMistakeReason(next);
    try {
      localStorage.setItem(`mistake_oe_${question?.id || qNo}`, next);
    } catch {}
  };

  // Load IndexedDB image if stored locally
  useEffect(() => {
    let isMounted = true;
    async function loadIdb() {
      if (question?.id) {
        const variants = [question.id, `q_${question.id}`, String(question.id).replace(/^q_/, '')];
        for (const k of variants) {
          try {
            const val = await idbGetPayload(k);
            if (val && typeof val === 'string' && (val.startsWith('data:image') || val.startsWith('http') || val.length > 100) && !val.includes('[STORED_IN_INDEXEDDB]') && isMounted) {
              setIdbImage(val);
              return;
            }
          } catch {}
        }
      }
    }
    loadIdb();
    return () => { isMounted = false; };
  }, [question?.id]);

  const rawText = String(
    studentAnswerText ||
    userAnswerText ||
    textAns ||
    user_answer_text ||
    question?.userAnswerText ||
    question?.user_answer_text ||
    question?.studentAnswer ||
    question?.writtenAnswer ||
    question?.textAns ||
    (typeof question?.userAnswer === 'string' && isNaN(Number(question.userAnswer)) && question.userAnswer !== 'empty' && !/^[A-E]$/i.test(question.userAnswer.trim()) ? question.userAnswer : '') ||
    ''
  ).trim();

  // Collect all resolved images with single-source priority to avoid duplicate stacked images
  const resolvedImages = useMemo(() => {
    const isValidImg = (v) => typeof v === 'string' && v && !v.includes('[STORED_IN_INDEXEDDB]') && !v.includes('[LOCALSTORAGE_CACHE]') && (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('blob:') || /\.(png|jpe?g|webp|gif|svg)/i.test(v) || v.length > 100);

    const urls = [];
    const addVal = (val) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(addVal);
      } else if (isValidImg(val)) {
        if (val.includes('\n\n') || val.includes('\n') || val.includes('|')) {
          const parts = val.split(/\n\n|\n|\|/).map(s => s.trim()).filter(isValidImg);
          urls.push(...parts);
        } else {
          urls.push(val.trim());
        }
      }
    };

    // 1. Explicit imageUrls prop passed specifically for this question
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      imageUrls.forEach(addVal);
    }

    // 2. Direct question.imageUrl (specific to this single question)
    if (urls.length === 0 && question?.imageUrl) {
      addVal(question.imageUrl);
    }

    // 3. Question-level images array
    if (urls.length === 0) {
      const qImages = question?.images || question?.imageUrls;
      if (Array.isArray(qImages) && qImages.length > 0) {
        const subIdx = (typeof question?.subIndex === 'number') ? question.subIndex : (qNo - 1);
        if (qImages.length > 1 && subIdx >= 0 && subIdx < qImages.length) {
          addVal(qImages[subIdx]);
        } else {
          qImages.forEach(addVal);
        }
      }
    }

    // 4. Content payload or image payload
    if (urls.length === 0) {
      addVal(question?.imagePayload);
      addVal(question?.contentPayload);
    }

    // 5. IndexedDB fallback only if still empty
    if (urls.length === 0 && idbImage) {
      addVal(idbImage);
    }

    return Array.from(new Set(urls.filter(Boolean)));
  }, [imageUrls, question, qNo, idbImage]);

  const handleOpenImage = (src) => {
    if (onOpenLightbox) {
      onOpenLightbox(src);
    } else {
      setActiveLightbox(src);
    }
  };

  const hasTeacherGraded = Boolean(
    isTrulyEvaluated &&
    teacherScore !== undefined &&
    teacherScore !== null &&
    teacherScore !== 'pending' &&
    teacherScore !== 'unevaluated'
  );
  
  const numScore = hasTeacherGraded && teacherScore !== 'empty' ? Number(teacherScore) : null;
  const isGenericText = (txt) => !txt || typeof txt !== 'string' || txt.trim() === '' || /^(soru\s*\d+|\d+\.\s*bölüm|bölüm\s*\d+|genel test|toplu yazılı test)/i.test(txt.trim());
  const qText = !isGenericText(question?.questionText) ? question.questionText :
                !isGenericText(question?.text) ? question.text :
                !isGenericText(question?.soruMetni) ? question.soruMetni :
                !isGenericText(question?.question) ? question.question :
                (!isGenericText(question?.title) && !question?.title?.includes('Bölüm') && !question?.title?.includes('Paket')) ? question.title :
                (question?.questionText || `Soru ${qNo}`);

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '1.25rem',
      border: hasTeacherGraded
        ? (numScore === 10 ? '1.5px solid #86efac' : numScore === 5 ? '1.5px solid #fde68a' : teacherScore === 'empty' ? '1.5px solid #cbd5e1' : '1.5px solid #fca5a5')
        : '1.5px solid #ddd6fe',
      padding: isMobile ? '1rem' : '1.5rem',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.15rem'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            padding: '0.35rem 0.85rem',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#1d4ed8',
            borderRadius: '0.5rem',
            fontWeight: 900,
            fontSize: '0.9rem'
          }}>
            SORU {qNo} {totalQuestions > 1 && `/ ${totalQuestions}`}
          </span>
          <span style={{
            padding: '0.2rem 0.6rem',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#d97706',
            borderRadius: '0.4rem',
            fontWeight: 800,
            fontSize: '0.75rem'
          }}>
            ✍️ Açık Uçlu / Yazılı
          </span>
          <AiUsageBadge testId={question?.testId || `oe_${qNo}`} questionNo={qNo} />
        </div>

        {/* Status Badge */}
        {hasTeacherGraded ? (
          numScore === 10 ? (
            <span style={{ fontSize: '0.78rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ✓ DOĞRU
            </span>
          ) : numScore === 5 ? (
            <span style={{ fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ½ YARIM
            </span>
          ) : teacherScore === 'empty' ? (
            <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ○ BOŞ
            </span>
          ) : numScore === 0 ? (
            <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ✗ YANLIŞ
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#f5f3ff', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              {numScore} Puan
            </span>
          )
        ) : isTeacherActive ? (
          teacherScore !== undefined && teacherScore !== null ? (
            Number(teacherScore) === 10 ? (
              <span style={{ fontSize: '0.78rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ✓ DOĞRU
              </span>
            ) : Number(teacherScore) === 5 ? (
              <span style={{ fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ½ YARIM
              </span>
            ) : teacherScore === 'empty' ? (
              <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ○ BOŞ
              </span>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ✗ YANLIŞ
              </span>
            )
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Award size={13} /> Puan Ver
            </span>
          )
        ) : (
          rawText ? (
            <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} /> ⏳ Değerlendirme Bekliyor
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 800 }}>
              ○ Yanıtlanmadı / Boş
            </span>
          )
        )}
      </div>

      {/* Question Images */}
      {resolvedImages.map((url, idx) => (
        <StandardImageFrame
          key={idx}
          src={url}
          alt={`Soru ${qNo} Görsel ${idx + 1}`}
          onOpenFullscreen={() => handleOpenImage(url)}
        />
      ))}

      {/* Question Text */}
      {qText && (
        <div style={{
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: '#1e293b',
          fontWeight: 600
        }}>
          {qText}
        </div>
      )}

      {/* Student Response */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '0.85rem',
        border: '1.5px solid #e2e8f0',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.82rem',
          fontWeight: 800,
          color: '#475569'
        }}>
          <Edit3 size={14} color="#6366f1" />
          Öğrenci Yanıtı:
        </div>

        {rawText ? (
          <div style={{
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#0f172a',
            whiteSpace: 'pre-wrap',
            fontWeight: 500,
            background: '#ffffff',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid #cbd5e1'
          }}>
            {rawText}
          </div>
        ) : (
          <div style={{
            fontSize: '0.85rem',
            color: '#94a3b8',
            fontStyle: 'italic',
            padding: '0.5rem 0'
          }}>
            Öğrenci bu soruya yazılı bir yanıt girmedi.
          </div>
        )}
      </div>

      {/* Teacher Scoring Section (Only for Teachers) */}
      {isTeacherActive && (
        <div style={{
          background: '#f8fafc',
          borderRadius: '0.85rem',
          border: '1.5px solid #cbd5e1',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.85rem',
            fontWeight: 900,
            color: '#0f172a'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Award size={15} color="#059669" />
              Öğretmen Puanlaması:
            </span>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 800 }}>
              (Tam: 10 Puan)
            </span>
          </div>

          {(() => {
            const isScore10 = Number(teacherScore) === 10;
            const isScore5 = Number(teacherScore) === 5;
            const isScore0 = teacherScore !== undefined && teacherScore !== null && teacherScore !== 'empty' && Number(teacherScore) === 0;
            const isScoreEmpty = teacherScore === 'empty';

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '0.5rem'
              }}>
                <button
                  type="button"
                  onClick={() => setScore && setScore(10)}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderRadius: '0.65rem',
                    border: isScore10 ? '2.5px solid #15803d' : '1.5px solid #cbd5e1',
                    background: isScore10 ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#ffffff',
                    color: isScore10 ? '#ffffff' : '#15803d',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: isScore10 ? '0 4px 12px rgba(22,163,74,0.45)' : 'none',
                    transform: isScore10 ? 'scale(1.02)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✓ Doğru (10P) {isScore10 ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setScore && setScore(5)}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderRadius: '0.65rem',
                    border: isScore5 ? '2.5px solid #b45309' : '1.5px solid #cbd5e1',
                    background: isScore5 ? 'linear-gradient(135deg, #d97706, #b45309)' : '#ffffff',
                    color: isScore5 ? '#ffffff' : '#b45309',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: isScore5 ? '0 4px 12px rgba(217,119,6,0.45)' : 'none',
                    transform: isScore5 ? 'scale(1.02)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ½ Yarım (5P) {isScore5 ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setScore && setScore(0)}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderRadius: '0.65rem',
                    border: isScore0 ? '2.5px solid #991b1b' : '1.5px solid #cbd5e1',
                    background: isScore0 ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#ffffff',
                    color: isScore0 ? '#ffffff' : '#b91c1c',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: isScore0 ? '0 4px 12px rgba(220,38,38,0.5)' : 'none',
                    transform: isScore0 ? 'scale(1.02)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ✗ Yanlış (0P) {isScore0 ? '✓' : ''}
                </button>
                <button
                  type="button"
                  onClick={() => setScore && setScore('empty')}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderRadius: '0.65rem',
                    border: isScoreEmpty ? '2.5px solid #334155' : '1.5px solid #cbd5e1',
                    background: isScoreEmpty ? 'linear-gradient(135deg, #475569, #334155)' : '#ffffff',
                    color: isScoreEmpty ? '#ffffff' : '#475569',
                    fontWeight: 900,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: isScoreEmpty ? '0 4px 12px rgba(71,85,105,0.45)' : 'none',
                    transform: isScoreEmpty ? 'scale(1.02)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  ○ Boş {isScoreEmpty ? '✓' : ''}
                </button>
              </div>
            );
          })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={13} />
              Öğrenciye Özel Not:
            </label>
            <input
              type="text"
              value={teacherNote || ''}
              onChange={(e) => setNote && setNote(e.target.value)}
              placeholder="Örn: Açıklama çok iyiydi fakat formülde ufak bir hata var..."
              style={{
                padding: '0.55rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
          </div>
        </div>
      )}

      {/* Teacher Note Display (For Students) */}
      {!isTeacherActive && teacherNote && (
        <div style={{
          background: '#f5f3ff',
          borderRadius: '0.85rem',
          border: '1.5px solid #ddd6fe',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem'
        }}>
          <div style={{
            fontSize: '0.8rem',
            fontWeight: 900,
            color: '#6b21a8',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <MessageSquare size={14} />
            Öğretmeninizin Notu:
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#1e1b4b', lineHeight: 1.5 }}>
            {teacherNote}
          </p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          MISTAKE DIAGNOSTIC SELECTOR & AI SOLVE BUTTON (STUDENT MODE)
      ════════════════════════════════════════════ */}
      {!isTeacherActive && (
        <div style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '1px dashed #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#64748b' }}>
              🤔 Hata / Eksik Sebebi:
            </span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {MISTAKE_REASON_OPTIONS.map(r => {
                const isSelected = mistakeReason === r.label || (mistakeReason && String(mistakeReason).includes(r.label.slice(2).trim()));
                return (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => handleSetMistakeReason(r.label)}
                    style={{
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      borderRadius: 6,
                      border: `1.5px solid ${isSelected ? r.color : r.border}`,
                      background: isSelected ? r.color : r.bg,
                      color: isSelected ? '#ffffff' : r.color,
                      cursor: 'pointer',
                      boxShadow: isSelected ? `0 2px 6px ${r.color}33` : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={`Soru ${qNo} için sebebi "${r.label}" olarak kaydet`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ✂️ AI Soru Çözümü & Kırpma Butonu */}
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            style={{
              padding: '0.3rem 0.85rem',
              fontSize: '0.78rem',
              fontWeight: 900,
              borderRadius: 8,
              border: '1.5px solid #a855f7',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(124,58,237,0.1))',
              color: '#7c3aed',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              boxShadow: '0 2px 6px rgba(168,85,247,0.2)',
              transition: 'all 0.15s ease'
            }}
            title={`Soru ${qNo} için yapay zeka çözümü ve analizi`}
          >
            <Sparkles size={14} color="#a855f7" />
            <span>✨ AI Çözüm & Değerlendirme</span>
          </button>
        </div>
      )}

      {/* Lightbox for Images */}
      {activeLightbox && (
        <ImageLightbox
          isOpen={Boolean(activeLightbox)}
          src={activeLightbox}
          onClose={() => setActiveLightbox(null)}
        />
      )}

      {/* ── AI QUESTION SOLVER & SCREEN SNIPPER MODAL ── */}
      {aiModalOpen && (
        <ScreenSnipperAndSolverModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          questionNo={qNo}
          question={question}
          existingImageUrl={imgSrc}
          mistakeReason={mistakeReason || ''}
          onMistakeReasonChange={handleSetMistakeReason}
          studentAnswer={finalText || 'Boş bırakıldı'}
          correctAnswer={question?.correctAnswerText || question?.answer || question?.solution || question?.explanation || 'Açık Uçlu / Yazılı Değerlendirme'}
          subject={question?.subject || 'Genel'}
          topic={question?.topic || ''}
          testId={question?.testId || `oe_${qNo}`}
        />
      )}
    </div>
  );
}
