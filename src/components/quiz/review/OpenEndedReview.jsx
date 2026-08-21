import React, { memo } from 'react';
import { Award, CheckCircle, Clock, Edit3, Eye, MessageSquare, XCircle } from 'lucide-react';

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
  studentAnswerText = '',
  teacherScore = undefined,
  teacherNote = '',
  onSetTeacherScore,
  onSetTeacherNote,
  isTeacherMode = false,
  imageUrls = [],
  onOpenLightbox,
  isMobile = false
}) {
  const hasTeacherGraded = teacherScore !== undefined && teacherScore !== null && teacherScore !== 'pending';
  const numScore = hasTeacherGraded && teacherScore !== 'empty' ? Number(teacherScore) : null;
  const rawText = String(studentAnswerText || '').trim();
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
        ) : isTeacherMode ? (
          <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Award size={13} /> Puan Ver
          </span>
        ) : (
          <span style={{ fontSize: '0.78rem', color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.2rem 0.65rem', borderRadius: '999px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={13} /> ⏳ Öğretmen Değerlendirmesinde
          </span>
        )}
      </div>

      {/* Images */}
      {Array.isArray(imageUrls) && imageUrls.map((url, idx) => (
        <StandardImageFrame
          key={idx}
          src={url}
          alt={`Soru ${qNo} Görsel ${idx + 1}`}
          onOpenFullscreen={() => onOpenLightbox && onOpenLightbox(url)}
        />
      ))}

      {/* Question Text */}
      {qText && !qText.startsWith('Soru ') && (
        <div style={{
          fontSize: '0.95rem',
          lineHeight: 1.6,
          color: '#1e293b',
          fontWeight: 600
        }}>
          {qText}
        </div>
      )}

      {/* Student's Written Response Display */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '0.85rem',
        border: '1.5px solid #e2e8f0',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem'
      }}>
        <div style={{
          fontSize: '0.82rem',
          fontWeight: 900,
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Edit3 size={14} color="#6366f1" />
          📝 Öğrenci Yanıtı:
        </div>

        {rawText ? (
          <div style={{
            fontSize: '0.92rem',
            lineHeight: 1.6,
            color: '#0f172a',
            whiteSpace: 'pre-wrap',
            background: '#ffffff',
            padding: '0.75rem 0.85rem',
            borderRadius: '0.65rem',
            border: '1px solid #e2e8f0'
          }}>
            {rawText}
          </div>
        ) : (
          <div style={{
            fontSize: '0.88rem',
            color: '#94a3b8',
            fontStyle: 'italic',
            padding: '0.5rem 0'
          }}>
            Öğrenci bu soruya yanıt yazmadı.
          </div>
        )}
      </div>

      {/* Teacher Grading Controls (Visible in Teacher / Admin Evaluation Mode) */}
      {isTeacherMode && (
        <div style={{
          background: '#fcfaff',
          borderRadius: '0.85rem',
          border: '1.5px solid #e9d5ff',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Award size={15} /> Öğretmen Değerlendirmesi & Puanı:
            </span>
            {hasTeacherGraded && (
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '0.15rem 0.5rem', borderRadius: '0.4rem' }}>
                Kaydedildi: {teacherScore === 'empty' ? 'Boş' : `${teacherScore}P`}
              </span>
            )}
          </div>

          {/* Quick Score Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => onSetTeacherScore && onSetTeacherScore(10)}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '0.45rem 0.65rem',
                borderRadius: '0.65rem',
                border: teacherScore === 10 ? '2px solid #16a34a' : '1px solid #86efac',
                background: teacherScore === 10 ? '#dcfce7' : '#f0fdf4',
                color: '#15803d',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <CheckCircle size={14} /> Tam Doğru (10P)
            </button>

            <button
              type="button"
              onClick={() => onSetTeacherScore && onSetTeacherScore(5)}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '0.45rem 0.65rem',
                borderRadius: '0.65rem',
                border: teacherScore === 5 ? '2px solid #d97706' : '1px solid #fde68a',
                background: teacherScore === 5 ? '#fef3c7' : '#fffbeb',
                color: '#b45309',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              ½ Yarım Puan (5P)
            </button>

            <button
              type="button"
              onClick={() => onSetTeacherScore && onSetTeacherScore(0)}
              style={{
                flex: 1,
                minWidth: '80px',
                padding: '0.45rem 0.65rem',
                borderRadius: '0.65rem',
                border: teacherScore === 0 ? '2px solid #dc2626' : '1px solid #fca5a5',
                background: teacherScore === 0 ? '#fee2e2' : '#fef2f2',
                color: '#b91c1c',
                fontWeight: 900,
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <XCircle size={14} /> Yanlış (0P)
            </button>

            <button
              type="button"
              onClick={() => onSetTeacherScore && onSetTeacherScore('empty')}
              style={{
                padding: '0.45rem 0.75rem',
                borderRadius: '0.65rem',
                border: teacherScore === 'empty' ? '2px solid #64748b' : '1px solid #cbd5e1',
                background: teacherScore === 'empty' ? '#e2e8f0' : '#f8fafc',
                color: '#475569',
                fontWeight: 800,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              ○ Boş (0P)
            </button>
          </div>

          {/* Teacher Feedback / Note Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MessageSquare size={13} /> Öğrenciye Not / Geri Bildirim:
            </label>
            <input
              type="text"
              value={teacherNote || ''}
              onChange={(e) => onSetTeacherNote && onSetTeacherNote(e.target.value)}
              placeholder="Örn: Formül doğru ancak işlem hatası yapılmış."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                border: '1px solid #d8b4fe',
                background: '#ffffff',
                fontSize: '0.85rem',
                color: '#1e1b4b',
                outline: 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Student View of Teacher Feedback (if evaluated with note) */}
      {!isTeacherMode && teacherNote && (
        <div style={{
          background: '#f5f3ff',
          borderRadius: '0.85rem',
          border: '1px solid #ddd6fe',
          padding: '0.85rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: 4 }}>
            <MessageSquare size={14} /> Öğretmenin Notu:
          </span>
          <p style={{ fontSize: '0.88rem', color: '#4c1d95', margin: 0, lineHeight: 1.5 }}>
            {teacherNote}
          </p>
        </div>
      )}
    </div>
  );
}
