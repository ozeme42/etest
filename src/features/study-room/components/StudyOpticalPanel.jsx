import React, { useState, useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  RotateCcw,
  Send,
  AlertCircle,
  Sparkles,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  Edit3
} from 'lucide-react';

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
  rawAnswerKey,
  resolvedAnswerKey
}) {
  const options = ['A', 'B', 'C', 'D', 'E'].slice(0, opticalOptionCount);
  const totalQuestions = Math.max(1, targetGoalCount || (resolvedAnswerKey?.length) || 10);
  const answeredCount = Object.keys(opticalAnswers).length;
  const hasAnswerKey = Boolean(resolvedAnswerKey || rawAnswerKey);

  // Açık uçlu testler için soruya tıklandığında açılan Havuz Modal'ı durumu
  const [activePoolQuestion, setActivePoolQuestion] = useState(null);
  const [customInputText, setCustomInputText] = useState('');

  // ── 💡 AÇIK UÇLU CEVAP HAVUZU OLUŞTURUCU ──
  const openEndedAnswerPool = useMemo(() => {
    if (!isSelectedTaskOpenEnded) return [];
    const sourceKey = rawAnswerKey || resolvedAnswerKey;
    if (!sourceKey) return [];

    const rawItems = [];
    const seenTexts = new Set();
    const addPoolItem = (txt) => {
      if (txt === undefined || txt === null) return;
      const s = String(txt).trim();
      if (s.length >= 1 && !seenTexts.has(s.toLocaleLowerCase('tr-TR'))) {
        seenTexts.add(s.toLocaleLowerCase('tr-TR'));
        rawItems.push(s);
      }
    };

    // 1. __meta veya meta içindeki hazır kelime havuzları
    if (sourceKey && typeof sourceKey === 'object') {
      const meta = sourceKey.__meta || sourceKey.meta;
      if (meta && Array.isArray(meta.wordPool)) meta.wordPool.forEach(addPoolItem);
      if (meta && Array.isArray(meta.pool)) meta.pool.forEach(addPoolItem);
      if (meta && Array.isArray(meta.options)) meta.options.forEach(addPoolItem);
    }

    // 2. Cevap anahtarındaki tüm değerler
    const processVal = (val) => {
      if (val === undefined || val === null) return;
      if (typeof val === 'object' && !Array.isArray(val)) {
        if (val.text) addPoolItem(val.text);
        if (val.answer) addPoolItem(val.answer);
        return;
      }
      const s = String(val).trim();
      if (!s) return;
      if (s.length <= 50) {
        addPoolItem(s);
      } else {
        const parts = s
          .split(/[,;\n•|]+/)
          .map(p => p.replace(/^[a-z0-9][.)\-:]\s*/i, '').trim())
          .filter(p => p.length >= 1 && p.length <= 45);
        if (parts.length > 0) parts.forEach(addPoolItem);
        else addPoolItem(s);
      }
    };

    if (Array.isArray(sourceKey)) {
      sourceKey.forEach(processVal);
    } else if (typeof sourceKey === 'object') {
      Object.entries(sourceKey).forEach(([k, val]) => {
        if (k !== '__meta' && k !== 'meta') {
          processVal(val);
        }
      });
    }

    // 3. Karşıt veya ikili / üçlü mantık kelimeleri
    const fullStr = JSON.stringify(sourceKey).toLowerCase();
    if (fullStr.includes('doğru') || fullStr.includes('yanlış')) {
      addPoolItem('Doğru');
      addPoolItem('Yanlış');
    }
    if (fullStr.includes('artar') || fullStr.includes('azalır')) {
      addPoolItem('Artar');
      addPoolItem('Azalır');
      addPoolItem('Değişmez');
    }
    if (fullStr.includes('evet') || fullStr.includes('hayır')) {
      addPoolItem('Evet');
      addPoolItem('Hayır');
    }

    return rawItems;
  }, [isSelectedTaskOpenEnded, rawAnswerKey, resolvedAnswerKey]);

  // ── 📐 DİKEY SÜTUN DÜZENİ (1, 2, 3... YUKARIDAN AŞAĞIYA DOĞRU) ──
  // Kullanıcı isteği: "optik sırası yukarıdan aşağıya doğru olsun 1 2 3 diye satır değil sütun olarak dizilsin"
  // Mobil: 1 sütun (1..N yukarıdan aşağıya)
  // Masaüstü: Eğer soru sayısı > 6 ise 2 dikey sütun (Örn: 1..10 Sol sütun, 11..20 Sağ sütun)
  const numCols = isMobile ? 1 : (totalQuestions > 6 ? 2 : 1);
  const perCol = Math.ceil(totalQuestions / numCols);

  const columns = [];
  for (let c = 0; c < numCols; c++) {
    const start = c * perCol + 1;
    const end = Math.min((c + 1) * perCol, totalQuestions);
    if (start <= totalQuestions) {
      const qList = [];
      for (let q = start; q <= end; q++) {
        qList.push(q);
      }
      columns.push(qList);
    }
  }

  // Havuz modalı açıldığında input alanını aktif soruya göre hazırla
  const openPoolForQuestion = (qNum) => {
    setActivePoolQuestion(qNum);
    const existing = opticalAnswers[qNum] ?? opticalAnswers[String(qNum)] ?? '';
    setCustomInputText(existing);
  };

  // Çoktan seçmeli tek bir soru satırını çiz
  const renderMultipleChoiceRow = (qNum) => {
    const currentAns = opticalAnswers[qNum] ?? opticalAnswers[String(qNum)] ?? null;
    return (
      <div
        key={qNum}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: currentAns ? (themeObj.isDark ? 'rgba(99, 102, 241, 0.14)' : '#eef2ff') : themeObj.innerBg,
          borderRadius: 12,
          padding: '0.35rem 0.6rem',
          border: `1.5px solid ${currentAns ? themeObj.accent : themeObj.border}`,
          transition: 'all 0.12s ease'
        }}
      >
        <div style={{
          fontSize: '0.78rem',
          fontWeight: 900,
          color: currentAns ? themeObj.accent : themeObj.text,
          minWidth: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 4
        }}>
          <span>{qNum}.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {options.map(opt => {
            const isSelected = currentAns === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => handleSelectOpticalOption(qNum, opt)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: `1.5px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                  background: isSelected ? (themeObj.accentGradient || themeObj.accent) : themeObj.cardBg,
                  color: isSelected ? '#ffffff' : themeObj.text,
                  fontWeight: 900,
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.12s ease',
                  boxShadow: isSelected ? `0 2px 8px ${themeObj.accent}50` : 'none'
                }}
                className="hover:scale-105 active:scale-95"
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Açık uçlu tek bir soru satırını çiz (Optik baloncuk YOK, soru numarasına tıklayınca havuz açılır)
  const renderOpenEndedRow = (qNum) => {
    const currentVal = opticalAnswers[qNum] ?? opticalAnswers[String(qNum)] ?? '';
    return (
      <div
        key={qNum}
        onClick={() => openPoolForQuestion(qNum)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: currentVal ? (themeObj.isDark ? 'rgba(99, 102, 241, 0.14)' : '#eef2ff') : themeObj.innerBg,
          borderRadius: 12,
          padding: '0.42rem 0.65rem',
          border: `1.5px solid ${currentVal ? themeObj.accent : themeObj.border}`,
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        className="hover:scale-[1.01] hover:border-indigo-400 active:scale-[0.99]"
        title={`Soru ${qNum} için havuzdan cevap seç`}
      >
        {/* Soru Numarası (Tıklanınca havuz açan buton tetikleyici) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openPoolForQuestion(qNum);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: currentVal ? themeObj.accent : (themeObj.isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
            color: currentVal ? '#ffffff' : themeObj.text,
            border: 'none',
            borderRadius: 8,
            padding: '0.2rem 0.5rem',
            fontSize: '0.76rem',
            fontWeight: 900,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          <span>{qNum}. Soru</span>
          <Search size={11} style={{ opacity: 0.8 }} />
        </button>

        {/* Seçilen Cevap veya Havuzdan Seç Butonu */}
        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
          {currentVal ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
              <span
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  color: themeObj.accent,
                  background: themeObj.cardBg,
                  border: `1px solid ${themeObj.accent}45`,
                  padding: '0.2rem 0.5rem',
                  borderRadius: 8,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobile ? 120 : 160,
                  display: 'inline-block'
                }}
                title={currentVal}
              >
                ✓ {currentVal}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetOpticalTextAnswer(qNum, '');
                }}
                title="Cevabı Temizle"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: themeObj.subText,
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontSize: '0.76rem',
                  fontWeight: 900,
                  lineHeight: 1
                }}
                className="hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ) : (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: themeObj.subText,
              border: `1px dashed ${themeObj.border}`,
              padding: '0.2rem 0.5rem',
              borderRadius: 8,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4
            }}>
              <span>Havuzdan Seç</span>
              <span style={{ fontSize: '0.75rem' }}>👉</span>
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: themeObj.cardBg,
      border: `1px solid ${themeObj.border}`,
      borderRadius: isMobile ? 20 : 24,
      padding: isMobile ? '1rem' : '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      boxShadow: themeObj.isDark ? '0 10px 30px rgba(0,0,0,0.3)' : '0 10px 30px rgba(0,0,0,0.03)'
    }}>
      {/* ─── BAŞLIK VE DURUM ÇUBUĞU ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        borderBottom: `1px solid ${themeObj.border}`,
        paddingBottom: '0.75rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '1.05rem' }}>{isSelectedTaskOpenEnded ? '📝' : '📋'}</span>
            <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: themeObj.text }}>
              {isSelectedTaskOpenEnded ? 'Açık Uçlu Cevap Formu' : 'Optik Form (Cevap Kağıdı)'}
            </h3>
          </div>
          <div style={{ fontSize: '0.7rem', color: themeObj.subText, fontWeight: 600, marginTop: 2 }}>
            {isSelectedTaskOpenEnded
              ? (openEndedAnswerPool.length > 0
                  ? `💡 Cevap havuzundan seçmek için soru numarasına tıklayın (${openEndedAnswerPool.length} seçenek)`
                  : 'Soru numarasına tıklayarak cevabınızı yazın')
              : (hasAnswerKey
                  ? '✨ Cevap anahtarı mevcut (Anında otomatik değerlendirilir)'
                  : '📌 Serbest giriş (Sonuçlarınıza kaydedilir)')}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            background: answeredCount === totalQuestions ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.12)',
            color: answeredCount === totalQuestions ? '#10b981' : themeObj.accent,
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '0.2rem 0.55rem',
            borderRadius: 99,
            border: `1px solid ${answeredCount === totalQuestions ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
          }}>
            {answeredCount} / {totalQuestions}
          </span>

          {answeredCount > 0 && (
            <button
              type="button"
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

      {/* ─── CEVAP GİRİŞ ALANI (DİKEY SÜTUNLAR 1, 2, 3... YUKARIDAN AŞAĞIYA) ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: numCols === 1 ? '1fr' : 'repeat(2, 1fr)',
        gap: 8,
        maxHeight: isMobile ? 420 : 540,
        overflowY: 'auto',
        paddingRight: 4
      }}>
        {columns.map((colQuestions, colIdx) => (
          <div key={colIdx} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {colQuestions.map(qNum =>
              isSelectedTaskOpenEnded
                ? renderOpenEndedRow(qNum)
                : renderMultipleChoiceRow(qNum)
            )}
          </div>
        ))}
      </div>

      {/* ─── BİTİR & TESLİM ET BUTONU ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        borderTop: `1px solid ${themeObj.border}`,
        paddingTop: '0.75rem'
      }}>
        <div style={{ fontSize: '0.72rem', color: themeObj.subText, fontWeight: 600 }}>
          {answeredCount === 0 ? 'En az 1 soruyu tamamlayın.' : `${answeredCount} cevap hazır.`}
        </div>

        <button
          type="button"
          onClick={handleFinishOpticalQuiz}
          disabled={isSubmittingOptical || answeredCount === 0}
          style={{
            background: answeredCount > 0 ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
            border: 'none',
            color: answeredCount > 0 ? '#ffffff' : themeObj.subText,
            borderRadius: 14,
            padding: '0.65rem 1.25rem',
            fontSize: '0.86rem',
            fontWeight: 900,
            cursor: answeredCount > 0 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            boxShadow: answeredCount > 0 ? `0 6px 18px ${themeObj.accent}40` : 'none',
            transition: 'all 0.15s'
          }}
          className="hover:scale-[1.02] active:scale-95"
        >
          {isSubmittingOptical ? (
            <>
              <div style={{
                width: 15,
                height: 15,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>Testi Bitir & Değerlendir</span>
            </>
          )}
        </button>
      </div>

      {/* ─── 🎯 AÇIK UÇLU CEVAP HAVUZU MODALI (SORU NUMARASINA TIKLAYINCA AÇILIR) ─── */}
      {activePoolQuestion !== null && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
          onClick={() => setActivePoolQuestion(null)}
        >
          <div
            style={{
              background: themeObj.cardBg,
              border: `1.5px solid ${themeObj.border}`,
              borderRadius: 24,
              width: '100%',
              maxWidth: 500,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Başlığı */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1rem 1.25rem',
              borderBottom: `1px solid ${themeObj.border}`,
              background: themeObj.innerBg
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: themeObj.accentGradient || themeObj.accent,
                  color: '#ffffff',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 10,
                  fontSize: '0.84rem',
                  fontWeight: 900
                }}>
                  {activePoolQuestion}. Soru
                </span>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 900, color: themeObj.text }}>
                    Cevap Havuzundan Seçin
                  </h4>
                  <div style={{ fontSize: '0.7rem', color: themeObj.subText, fontWeight: 600 }}>
                    {openEndedAnswerPool.length > 0
                      ? `${openEndedAnswerPool.length} seçenek arasından doğru cevaba dokunun`
                      : 'Havuzda seçenek bulunamadı, cevabınızı yazabilirsiniz'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActivePoolQuestion(null)}
                style={{
                  background: themeObj.cardBg,
                  border: `1px solid ${themeObj.border}`,
                  color: themeObj.subText,
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 800
                }}
                className="hover:text-red-500"
              >
                ✕
              </button>
            </div>

            {/* Modal Gövdesi */}
            <div style={{
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.1rem',
              flex: 1
            }}>
              {/* Havuz Seçenekleri */}
              {openEndedAnswerPool.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 8
                  }}>
                    <span style={{ fontSize: '0.74rem', fontWeight: 900, color: themeObj.subText }}>
                      💡 CEVAP HAVUZU
                    </span>
                    <span style={{ fontSize: '0.68rem', color: themeObj.accent, fontWeight: 700 }}>
                      Seçmek için dokunun
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    maxHeight: 280,
                    overflowY: 'auto',
                    padding: 2
                  }}>
                    {openEndedAnswerPool.map((poolText, pIdx) => {
                      const currentAns = opticalAnswers[activePoolQuestion] ?? opticalAnswers[String(activePoolQuestion)] ?? '';
                      const isSelected = String(currentAns).trim().toLocaleLowerCase('tr-TR') === String(poolText).trim().toLocaleLowerCase('tr-TR');
                      const optLetter = String.fromCharCode(65 + (pIdx % 26));

                      return (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => {
                            handleSetOpticalTextAnswer(activePoolQuestion, poolText);
                            // Otomatik sonraki soruya geç veya tamamlandıysa kapat
                            if (activePoolQuestion < totalQuestions) {
                              openPoolForQuestion(activePoolQuestion + 1);
                            } else {
                              setActivePoolQuestion(null);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 7,
                            padding: '0.55rem 0.85rem',
                            borderRadius: 14,
                            border: `1.5px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                            background: isSelected ? (themeObj.accentGradient || themeObj.accent) : themeObj.innerBg,
                            color: isSelected ? '#ffffff' : themeObj.text,
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            fontFamily: "'Outfit', sans-serif",
                            transition: 'all 0.12s ease',
                            boxShadow: isSelected ? `0 4px 14px ${themeObj.accent}45` : 'none',
                            textAlign: 'left'
                          }}
                          className="hover:scale-[1.02] active:scale-95"
                        >
                          <span style={{
                            background: isSelected ? 'rgba(255,255,255,0.25)' : (themeObj.isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'),
                            color: isSelected ? '#ffffff' : themeObj.accent,
                            borderRadius: 6,
                            padding: '1px 5px',
                            fontSize: '0.68rem',
                            fontWeight: 900
                          }}>
                            {optLetter}
                          </span>
                          <span>{poolText}</span>
                          {isSelected && <span style={{ fontSize: '0.85rem', marginLeft: 2 }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Serbest Yazma Alanı */}
              <div style={{
                borderTop: `1px dashed ${themeObj.border}`,
                paddingTop: '0.85rem'
              }}>
                <div style={{ fontSize: '0.74rem', fontWeight: 800, color: themeObj.subText, marginBottom: 6 }}>
                  ✍️ Veya Kendi Cevabınızı Yazın:
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const val = customInputText.trim();
                    if (val) {
                      handleSetOpticalTextAnswer(activePoolQuestion, val);
                      if (activePoolQuestion < totalQuestions) {
                        openPoolForQuestion(activePoolQuestion + 1);
                      } else {
                        setActivePoolQuestion(null);
                      }
                    }
                  }}
                  style={{ display: 'flex', gap: 6 }}
                >
                  <input
                    type="text"
                    value={customInputText}
                    onChange={(e) => setCustomInputText(e.target.value)}
                    placeholder="Farklı bir cevap girmek için yazın..."
                    style={{
                      flex: 1,
                      background: themeObj.innerBg,
                      border: `1px solid ${themeObj.border}`,
                      color: themeObj.text,
                      borderRadius: 12,
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!customInputText.trim()}
                    style={{
                      background: customInputText.trim() ? themeObj.accent : themeObj.innerBg,
                      color: customInputText.trim() ? '#ffffff' : themeObj.subText,
                      border: `1px solid ${themeObj.border}`,
                      borderRadius: 12,
                      padding: '0 1rem',
                      fontSize: '0.78rem',
                      fontWeight: 900,
                      cursor: customInputText.trim() ? 'pointer' : 'default',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Kaydet
                  </button>
                </form>
              </div>
            </div>

            {/* Modal Alt Çubuğu */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderTop: `1px solid ${themeObj.border}`,
              background: themeObj.innerBg,
              gap: 8,
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                disabled={activePoolQuestion <= 1}
                onClick={() => openPoolForQuestion(Math.max(1, activePoolQuestion - 1))}
                style={{
                  background: themeObj.cardBg,
                  border: `1px solid ${themeObj.border}`,
                  color: activePoolQuestion <= 1 ? themeObj.subText : themeObj.text,
                  opacity: activePoolQuestion <= 1 ? 0.4 : 1,
                  borderRadius: 10,
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: activePoolQuestion <= 1 ? 'default' : 'pointer'
                }}
              >
                ← Önceki Soru
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSetOpticalTextAnswer(activePoolQuestion, '');
                  if (activePoolQuestion < totalQuestions) {
                    openPoolForQuestion(activePoolQuestion + 1);
                  } else {
                    setActivePoolQuestion(null);
                  }
                }}
                style={{
                  background: 'transparent',
                  border: `1px dashed ${themeObj.border}`,
                  color: themeObj.subText,
                  borderRadius: 10,
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                className="hover:text-red-400 hover:border-red-400"
              >
                Boş Bırak
              </button>

              <button
                type="button"
                disabled={activePoolQuestion >= totalQuestions}
                onClick={() => openPoolForQuestion(Math.min(totalQuestions, activePoolQuestion + 1))}
                style={{
                  background: themeObj.cardBg,
                  border: `1px solid ${themeObj.border}`,
                  color: activePoolQuestion >= totalQuestions ? themeObj.subText : themeObj.text,
                  opacity: activePoolQuestion >= totalQuestions ? 0.4 : 1,
                  borderRadius: 10,
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: activePoolQuestion >= totalQuestions ? 'default' : 'pointer'
                }}
              >
                Sonraki Soru →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
