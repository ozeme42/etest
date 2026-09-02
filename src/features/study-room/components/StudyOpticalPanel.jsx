import React from 'react';
import { Check, CheckCircle2, RotateCcw, Send, AlertCircle, Sparkles } from 'lucide-react';

export default function StudyOpticalPanel({
  themeObj,
  isMobile,
  targetGoalCount,
  opticalAnswers,
  handleSelectOpticalOption,
  handleSetOpticalTextAnswer,
  handleClearOpticalAnswers,
  handleFinishOpticalQuiz,
  isSubmittingOptical,
  isSelectedTaskOpenEnded,
  opticalOptionCount = 4,
  resolvedAnswerKey
}) {
  const options = ['A', 'B', 'C', 'D', 'E'].slice(0, opticalOptionCount);
  const totalQuestions = Math.max(1, targetGoalCount || 10);
  const answeredCount = Object.keys(opticalAnswers).length;
  const hasAnswerKey = Boolean(resolvedAnswerKey);

  return (
    <div style={{
      background: themeObj.cardBg,
      border: `1px solid ${themeObj.border}`,
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? '1rem' : '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.03)'
    }}>
      {/* Başlık ve Durum Çubuğu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        borderBottom: `1px solid ${themeObj.border}`,
        paddingBottom: '0.85rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.1rem' }}>📋</span>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
              {isSelectedTaskOpenEnded ? 'Açık Uçlu Cevap Formu' : 'Optik Form (Cevap Kağıdı)'}
            </h3>
          </div>
          <div style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600, marginTop: 2 }}>
            {hasAnswerKey ? '✨ Sistemde Cevap Anahtarı Mevcut (Anında Değerlendirilir)' : '📌 Serbest Giriş (Sonuçlarınıza Kaydedilir)'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: answeredCount === totalQuestions ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
            color: answeredCount === totalQuestions ? '#10b981' : themeObj.accent,
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '0.2rem 0.6rem',
            borderRadius: 99,
            border: `1px solid ${answeredCount === totalQuestions ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
          }}>
            {answeredCount} / {totalQuestions} Cevaplandı
          </span>

          {answeredCount > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Tüm işaretlediğiniz cevapları temizlemek istediğinize emin misiniz?')) {
                  handleClearOpticalAnswers();
                }
              }}
              title="Cevapları Temizle"
              style={{
                background: themeObj.innerBg,
                border: `1px solid ${themeObj.border}`,
                color: themeObj.subText,
                borderRadius: 8,
                padding: '0.25rem 0.5rem',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RotateCcw size={11} />
              <span>Temizle</span>
            </button>
          )}
        </div>
      </div>

      {/* Cevap Giriş Alanı */}
      {isSelectedTaskOpenEnded ? (
        // Açık Uçlu Soru Listesi
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: 10,
          maxHeight: 420,
          overflowY: 'auto',
          paddingRight: 4
        }}>
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
            const val = opticalAnswers[qNum] ?? opticalAnswers[String(qNum)] ?? '';
            return (
              <div
                key={qNum}
                style={{
                  background: themeObj.innerBg,
                  borderRadius: 12,
                  padding: '0.65rem 0.85rem',
                  border: `1px solid ${val ? themeObj.accent : themeObj.border}`
                }}
              >
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: themeObj.text, marginBottom: 4 }}>
                  Soru {qNum}
                </div>
                <input
                  type="text"
                  placeholder="Cevabınızı yazın..."
                  value={val}
                  onChange={e => handleSetOpticalTextAnswer(qNum, e.target.value)}
                  style={{
                    width: '100%',
                    background: themeObj.cardBg,
                    border: `1px solid ${themeObj.border}`,
                    color: themeObj.text,
                    borderRadius: 8,
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.84rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        // Optik Baloncuk Listesi (Çoktan Seçmeli)
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 8,
          maxHeight: 420,
          overflowY: 'auto',
          paddingRight: 4
        }}>
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map(qNum => {
            const currentAns = opticalAnswers[qNum] ?? opticalAnswers[String(qNum)] ?? null;
            return (
              <div
                key={qNum}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: currentAns ? (themeObj.isDark ? 'rgba(99, 102, 241, 0.1)' : '#f5f3ff') : themeObj.innerBg,
                  borderRadius: 12,
                  padding: '0.4rem 0.75rem',
                  border: `1px solid ${currentAns ? themeObj.accent : themeObj.border}`,
                  transition: 'all 0.12s ease'
                }}
              >
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  color: currentAns ? themeObj.accent : themeObj.text,
                  minWidth: 50
                }}>
                  {qNum}. Soru
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {options.map(opt => {
                    const isSelected = currentAns === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => handleSelectOpticalOption(qNum, opt)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: `1.5px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                          background: isSelected ? (themeObj.accentGradient || themeObj.accent) : themeObj.cardBg,
                          color: isSelected ? '#ffffff' : themeObj.text,
                          fontWeight: 900,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.12s ease',
                          boxShadow: isSelected ? `0 2px 8px ${themeObj.accent}50` : 'none'
                        }}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bitir & Teslim Et Butonu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        borderTop: `1px solid ${themeObj.border}`,
        paddingTop: '0.85rem'
      }}>
        <div style={{ fontSize: '0.74rem', color: themeObj.subText, fontWeight: 600 }}>
          {answeredCount === 0 ? 'Lütfen en az 1 soruyu işaretleyin.' : `${answeredCount} cevap kaydedilmeye hazır.`}
        </div>

        <button
          onClick={handleFinishOpticalQuiz}
          disabled={isSubmittingOptical || answeredCount === 0}
          style={{
            background: answeredCount > 0 ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
            border: 'none',
            color: answeredCount > 0 ? '#ffffff' : themeObj.subText,
            borderRadius: 14,
            padding: '0.7rem 1.4rem',
            fontSize: '0.88rem',
            fontWeight: 900,
            cursor: answeredCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: answeredCount > 0 ? `0 6px 18px ${themeObj.accent}40` : 'none',
            transition: 'all 0.15s'
          }}
        >
          {isSubmittingOptical ? (
            <>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Send size={16} />
              <span>Testi Bitir & Değerlendir</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
