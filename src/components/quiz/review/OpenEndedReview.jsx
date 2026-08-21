import React, { memo, useMemo, useState } from 'react';
import { Award, CheckCircle, Clock, Edit3, Eye, MessageSquare, XCircle } from 'lucide-react';
import ImageLightbox from '../common/ImageLightbox';

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

  const rawText = String(
    studentAnswerText ||
    userAnswerText ||
    textAns ||
    user_answer_text ||
    question?.userAnswerText ||
    question?.user_answer_text ||
    ''
  ).trim();

  const resolvedImages = useMemo(() => {
    const urls = [];
    if (Array.isArray(imageUrls) && imageUrls.length > 0) urls.push(...imageUrls);
    if (Array.isArray(question?.imageUrls) && question.imageUrls.length > 0) urls.push(...question.imageUrls);
    if (question?.imageUrl && typeof question.imageUrl === 'string' && question.imageUrl !== '[STORED_IN_INDEXEDDB]') urls.push(question.imageUrl);
    if (question?.contentPayload && typeof question.contentPayload === 'string' && (question.contentPayload.startsWith('data:image') || question.contentPayload.startsWith('http'))) urls.push(question.contentPayload);
    if (question?.imagePayload && typeof question.imagePayload === 'string' && (question.imagePayload.startsWith('data:image') || question.imagePayload.startsWith('http'))) urls.push(question.imagePayload);
    return Array.from(new Set(urls.filter(Boolean)));
  }, [imageUrls, question]);

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
  const qText = question?.questionText || question?.text || question?.question || question?.title || `Soru ${qNo}`;

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
        </div>

        {/* Status Badge */}
        {hasTeacherGraded ? (
          numScore === 10 ? (
            <span style={{ fontSize: '0.78rem', color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ✓ DOĞRU (10P)
            </span>
          ) : numScore === 5 ? (
            <span style={{ fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ½ YARIM (5P)
            </span>
          ) : teacherScore === 'empty' ? (
            <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ○ BOŞ (0P)
            </span>
          ) : numScore === 0 ? (
            <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
              ✗ YANLIŞ (0P)
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
                ✓ DOĞRU (10P)
              </span>
            ) : Number(teacherScore) === 5 ? (
              <span style={{ fontSize: '0.78rem', color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ½ YARIM (5P)
              </span>
            ) : teacherScore === 'empty' ? (
              <span style={{ fontSize: '0.78rem', color: '#64748b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ○ BOŞ
              </span>
            ) : (
              <span style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900 }}>
                ✗ YANLIŞ (0P)
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem'
          }}>
            <button
              type="button"
              onClick={() => setScore && setScore(10)}
              style={{
                padding: '0.55rem',
                borderRadius: '0.6rem',
                border: teacherScore === 10 ? '2px solid #16a34a' : '1px solid #cbd5e1',
                background: teacherScore === 10 ? '#16a34a' : '#ffffff',
                color: teacherScore === 10 ? '#ffffff' : '#15803d',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ✓ Doğru (10P)
            </button>
            <button
              type="button"
              onClick={() => setScore && setScore(5)}
              style={{
                padding: '0.55rem',
                borderRadius: '0.6rem',
                border: teacherScore === 5 ? '2px solid #d97706' : '1px solid #cbd5e1',
                background: teacherScore === 5 ? '#d97706' : '#ffffff',
                color: teacherScore === 5 ? '#ffffff' : '#b45309',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ½ Yarım (5P)
            </button>
            <button
              type="button"
              onClick={() => setScore && setScore(0)}
              style={{
                padding: '0.55rem',
                borderRadius: '0.6rem',
                border: teacherScore === 0 ? '2px solid #dc2626' : '1px solid #cbd5e1',
                background: teacherScore === 0 ? '#dc2626' : '#ffffff',
                color: teacherScore === 0 ? '#ffffff' : '#b91c1c',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ✗ Yanlış (0P)
            </button>
            <button
              type="button"
              onClick={() => setScore && setScore('empty')}
              style={{
                padding: '0.55rem',
                borderRadius: '0.6rem',
                border: teacherScore === 'empty' ? '2px solid #64748b' : '1px solid #cbd5e1',
                background: teacherScore === 'empty' ? '#64748b' : '#ffffff',
                color: teacherScore === 'empty' ? '#ffffff' : '#475569',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              ○ Boş
            </button>
          </div>

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

      {/* Lightbox for Images */}
      {activeLightbox && (
        <ImageLightbox
          isOpen={Boolean(activeLightbox)}
          src={activeLightbox}
          onClose={() => setActiveLightbox(null)}
        />
      )}
    </div>
  );
}
