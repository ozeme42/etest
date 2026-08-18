import React, { useRef } from 'react';
import { 
  X, Printer, Share2, Award, Target, CheckCircle2, 
  BookOpen, FileText, Sparkles
} from 'lucide-react';

export default function CoachingReportModal({
  isOpen,
  onClose,
  studentName = 'Öğrenci',
  gradeClass = '8. Sınıf',
  targetExam = 'LGS 2026',
  targetSchool = '',
  targetNet = '',
  targetScore = '',
  weeklyProgram = [],
  mockExams = [],
  counterGoals = [],
  teacherNote = '',
  homeworkSubmissions = []
}) {
  const reportRef = useRef(null);

  if (!isOpen) return null;

  // 1. Seçilen Öğrencinin Çözdüğü Ödevler ve Konu Testleri
  const allHw = Array.isArray(homeworkSubmissions) ? homeworkSubmissions : [];

  const hwTestsCount = allHw.length;
  const hwD = allHw.reduce((a, b) => a + (b.correctCount || 0), 0);
  const hwY = allHw.reduce((a, b) => a + (b.wrongCount || 0), 0);
  const hwB = allHw.reduce((a, b) => a + (b.emptyCount || 0), 0);
  const hwQ = hwD + hwY + hwB;

  // 2. Seçilen Öğrencinin Çözdüğü Deneme Sınavları
  const allTrials = Array.isArray(mockExams) ? mockExams : [];
  const trialCount = allTrials.length;
  const trialD = allTrials.reduce((a, b) => a + (b.totalCorrect || 0), 0);
  const trialY = allTrials.reduce((a, b) => a + (b.totalWrong || 0), 0);
  const trialB = allTrials.reduce((a, b) => a + (b.totalEmpty || 0), 0);
  const trialQ = trialD + trialY + trialB;

  // 3. Genel Toplamlar (Yalnızca Seçilen Öğrencinin Gerçek Çözdükleri)
  const grandD = hwD + trialD;
  const grandY = hwY + trialY;
  const grandB = hwB + trialB;
  const grandTotalQuestions = hwQ + trialQ;
  const grandSuccessRate = grandTotalQuestions > 0 ? Math.round((grandD / grandTotalQuestions) * 100) : 0;
  const grandTotalTests = hwTestsCount + trialCount;

  // 4. Ders Bazlı Soru Karnesi (Ödevler, Konu Testleri & Deneme Sınavları)
  const subjMap = {};
  allHw.forEach(s => {
    const subj = s.subject || s.subjectName || 'Genel';
    if (!subjMap[subj]) subjMap[subj] = { d: 0, y: 0, b: 0, testCount: 0 };
    subjMap[subj].d += (s.correctCount || 0);
    subjMap[subj].y += (s.wrongCount || 0);
    subjMap[subj].b += (s.emptyCount || 0);
    subjMap[subj].testCount += 1;
  });

  allTrials.forEach(m => {
    if (m.scores && typeof m.scores === 'object') {
      Object.entries(m.scores).forEach(([subjName, sc]) => {
        if (sc && (sc.d > 0 || sc.y > 0 || sc.b > 0 || sc.net > 0)) {
          if (!subjMap[subjName]) subjMap[subjName] = { d: 0, y: 0, b: 0, testCount: 0 };
          subjMap[subjName].d += (sc.d || 0);
          subjMap[subjName].y += (sc.y || 0);
          subjMap[subjName].b += (sc.b || 0);
          subjMap[subjName].testCount += 1;
        }
      });
    }
  });

  const subjectList = Object.entries(subjMap).sort((a, b) => (b[1].d + b[1].y + b[1].b) - (a[1].d + a[1].y + a[1].b));

  // 5. En Son Deneme
  const latestExam = allTrials.length > 0 ? allTrials[0] : null;

  // Ultra-reliable isolated Iframe Print Handler
  const handlePrint = () => {
    const reportElement = document.getElementById('printable-coaching-report');
    if (!reportElement) {
      window.print();
      return;
    }

    let iframe = document.getElementById('print-iframe-coaching');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe-coaching';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="tr">
        <head>
          <title>Haftalık Koçluk & Veli Karnesi - ${studentName || 'Öğrenci'}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body {
              font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #0f172a;
              background: #ffffff;
              padding: 0;
              margin: 0;
              font-size: 11.5px;
              line-height: 1.35;
            }
            @page {
              size: A4 portrait;
              margin: 10mm 12mm;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
            }
            th {
              background-color: #f1f5f9 !important;
            }
            .page-avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          </style>
        </head>
        <body>
          <div style="padding: 6px;">
            ${reportElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 250);
  };

  const handleShareWhatsApp = () => {
    const text = `📊 *E-Test Haftalık Koçluk & Veli Karnesi*\n` +
      `👤 *Öğrenci:* ${studentName}\n` +
      `🎯 *Hedef:* ${targetExam} ${targetSchool ? `(${targetSchool})` : ''}\n` +
      `📝 *Çözülen Sınav / Test:* ${grandTotalTests} Adet (${hwTestsCount} Test, ${trialCount} Deneme)\n` +
      `✍️ *Toplam Çözülen Soru:* ${grandTotalQuestions} Soru (%${grandSuccessRate} Başarı · ${grandD} Doğru, ${grandY} Yanlış)\n` +
      (latestExam ? `📝 *Son Deneme:* ${latestExam.totalNet ?? latestExam.net ?? '-'} Net (${latestExam.title || latestExam.examName || 'Deneme'})\n` : '') +
      (teacherNote ? `💡 *Koçluk Notu:* ${teacherNote}\n` : '') +
      `\n✨ _E-Test Premium Eğitim & Koçluk Sistemi_`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }} onClick={onClose}>
      
      {/* Dynamic Print CSS Fallback */}
      <style>{`
        @media print {
          html, body {
            overflow: visible !important;
            height: auto !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-coaching-report, #printable-coaching-report * {
            visibility: visible;
          }
          #printable-coaching-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        style={{
          background: '#0f172a',
          color: '#f8fafc',
          border: '1.5px solid rgba(165, 180, 252, 0.3)',
          borderRadius: '1.5rem',
          maxWidth: '880px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header (Actions) */}
        <div className="no-print" style={{
          padding: '1rem 1.5rem',
          background: '#1e293b',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(165,180,252,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={20} color="#818cf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#ffffff' }}>
                Haftalık Koçluk & Veli Karnesi
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                Öğrencinin çözdüğü tüm test ve denemelerin resmi karne dökümü
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleShareWhatsApp}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.65rem',
                background: '#25D366',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
              }}
            >
              <Share2 size={15} /> WhatsApp'ta Paylaş
            </button>
            <button
              onClick={handlePrint}
              style={{
                padding: '0.5rem 1.15rem',
                borderRadius: '0.65rem',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                color: 'white',
                fontWeight: 900,
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Printer size={15} /> Yazdır / PDF İndir
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#334155',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#cbd5e1'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', flex: 1, background: '#0b1120' }}>
          <div 
            id="printable-coaching-report"
            ref={reportRef}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '1rem',
              padding: '1.75rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              fontFamily: "'Inter', system-ui, sans-serif"
            }}
          >
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.4rem' }}>✨</span>
                  <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
                    E-TEST PREMIUM EĞİTİM & KOÇLUK
                  </h1>
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginTop: 2 }}>
                  Öğrenci Gelişim, Soru & Deneme Takip Karnesi
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                  Tarih: {new Date().toLocaleDateString('tr-TR')}
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#4f46e5', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                  RESMİ TAKİP KARNESİ
                </div>
              </div>
            </div>

            {/* Student Info Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem' }}>
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>ÖĞRENCİ</div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{studentName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SINIF / SEVİYE</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{gradeClass}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>HEDEF SINAV</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#4f46e5', marginTop: 2 }}>{targetExam}</div>
              </div>
              {targetSchool && (
                <div>
                  <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>HEDEF OKUL</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{targetSchool}</div>
                </div>
              )}
            </div>

            {/* Core Metrics Grid (4'lü İstatistik) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginBottom: '1.15rem' }}>
              
              {/* 1. Çözülen Sınav / Test Adedi */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>ÇÖZÜLEN SINAV & TEST</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1e3a8a', marginTop: 2 }}>{grandTotalTests}</div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#3b82f6', marginTop: 2 }}>
                  {hwTestsCount} Test {trialCount > 0 ? `· ${trialCount} Deneme` : ''}
                </div>
              </div>

              {/* 2. Toplam Çözülen Soru */}
              <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#5b21b6', textTransform: 'uppercase' }}>TOPLAM SORU</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#4c1d95', marginTop: 2 }}>{grandTotalQuestions}</div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#7c3aed', marginTop: 2 }}>Gerçek Çözülen Soru</div>
              </div>

              {/* 3. Genel Soru Başarı Oranı */}
              <div style={{ background: grandSuccessRate >= 70 ? '#f0fdf4' : grandSuccessRate >= 50 ? '#fffbeb' : '#fef2f2', border: `1px solid ${grandSuccessRate >= 70 ? '#bbf7d0' : grandSuccessRate >= 50 ? '#fde68a' : '#fecaca'}`, borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: grandSuccessRate >= 70 ? '#166534' : grandSuccessRate >= 50 ? '#92400e' : '#991b1b', textTransform: 'uppercase' }}>BAŞARI ORANI</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: grandSuccessRate >= 70 ? '#15803d' : grandSuccessRate >= 50 ? '#b45309' : '#b91c1c', marginTop: 2 }}>%{grandSuccessRate}</div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#475569', marginTop: 2 }}>✅ {grandD} · ❌ {grandY} {grandB > 0 ? `· ⭕ ${grandB}` : ''}</div>
              </div>

              {/* 4. Son Deneme Neti veya Hedef */}
              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.66rem', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>SON DENEME NETİ</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7e22ce', marginTop: 2 }}>{latestExam?.totalNet ?? latestExam?.net ?? (targetNet || '—')}</div>
                <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#6b21a8', marginTop: 2 }}>{latestExam?.title || latestExam?.examName || 'Hedef: ' + (targetNet || targetScore || '—')}</div>
              </div>

            </div>

            {/* ─── TABLO 1: DERS BAZLI SORU ÇÖZÜMÜ & BAŞARI KARNESİ ─── */}
            {subjectList.length > 0 ? (
              <div className="page-avoid-break" style={{ marginBottom: '1.15rem' }}>
                <h3 style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.45rem 0', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📊</span> Ders Bazlı Soru Çözümü & Başarı Karnesi
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left' }}>Ders Adı</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '85px' }}>Test Sayısı</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '85px' }}>Çözülen Soru</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '75px' }}>Doğru (D)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '75px' }}>Yanlış (Y)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '65px' }}>Boş (B)</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '90px' }}>Başarı (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectList.map(([sName, stat]) => {
                      const sTotal = stat.d + stat.y + stat.b;
                      const sRate = sTotal > 0 ? Math.round((stat.d / sTotal) * 100) : 0;
                      return (
                        <tr key={sName} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 800, color: '#0f172a' }}>
                            {sName}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                            {stat.testCount} Test
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>
                            {sTotal}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                            {stat.d}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: '#b91c1c' }}>
                            {stat.y}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>
                            {stat.b}
                          </td>
                          <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: sRate >= 70 ? '#15803d' : sRate >= 50 ? '#b45309' : '#b91c1c' }}>
                            %{sRate}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.65rem', padding: '0.85rem', textAlign: 'center', color: '#64748b', fontSize: '0.8rem', marginBottom: '1.15rem' }}>
                Öğrenciye ait çözülmüş ödev veya konu testi kaydı bulunmamaktadır.
              </div>
            )}

            {/* ─── TABLO 2: ÇÖZÜLEN DENEME SINAVLARI (VARSA) ─── */}
            {allTrials.length > 0 && (
              <div className="page-avoid-break" style={{ marginBottom: '1.15rem' }}>
                <h3 style={{ fontSize: '0.86rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.45rem 0', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📝</span> Çözülen Deneme Sınavları & Net Sonuçları
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left', width: '90px' }}>Tarih</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left' }}>Deneme Sınavı Adı</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '70px' }}>Doğru</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '70px' }}>Yanlış</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '60px' }}>Boş</th>
                      <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '85px' }}>Toplam Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTrials.map((m, idx) => (
                      <tr key={m.id || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', color: '#64748b', fontWeight: 700 }}>
                          {m.date || '—'}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 800, color: '#0f172a' }}>
                          {m.title || m.examName || 'Deneme Sınavı'}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                          {m.totalCorrect ?? '—'}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 800, color: '#b91c1c' }}>
                          {m.totalWrong ?? '—'}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>
                          {m.totalEmpty ?? '—'}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 900, color: '#7c3aed' }}>
                          {m.totalNet ?? m.net ?? '—'} Net
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Teacher / Coach Note */}
            <div className="page-avoid-break" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '0.75rem 1rem', marginBottom: '1.15rem' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 900, color: '#1e1b4b', marginBottom: 3 }}>
                ✍️ KOÇLUK DEĞERLENDİRME & ÖĞRETMEN NOTU:
              </div>
              <div style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.45, minHeight: '30px', fontStyle: teacherNote ? 'normal' : 'italic' }}>
                {teacherNote || 'Öğrencinin soru çözüm hedefleri ve test başarı oranları sistem üzerinden titizlikle takip edilmektedir. Soru sayısını ve konu eksik analizlerini istikrarlı şekilde sürdürmesi tavsiye edilir.'}
              </div>
            </div>

            {/* Signatures */}
            <div className="page-avoid-break" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', paddingTop: '0.65rem', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Öğretmen / Eğitim Koçu İmza</div>
                <div style={{ height: '32px' }} />
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>E-Test Koçluk Birimi</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#334155' }}>Veli Görüşü & İmza</div>
                <div style={{ height: '32px' }} />
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Görüldü / Onay</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
