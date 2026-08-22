import React, { useRef } from 'react';
import { Printer, X, Award, BarChart2 } from 'lucide-react';

export default function StudentPerformanceReportModal({
  isOpen = false,
  onClose,
  student = {},
  submissions = []
}) {
  const reportRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const totalSubmissions = submissions.length;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalBlank = 0;
  let totalQuestions = 0;

  const subjectStats = {};

  submissions.forEach(sub => {
    const c = Number(sub.correctCount || 0);
    const w = Number(sub.wrongCount || 0);
    const b = Number(sub.blankCount || 0);
    const t = Number(sub.totalQuestions || (c + w + b) || 0);
    
    totalCorrect += c;
    totalWrong += w;
    totalBlank += b;
    totalQuestions += t;

    const subj = sub.subject || sub.test?.subject || 'Genel';
    if (!subjectStats[subj]) {
      subjectStats[subj] = { subject: subj, correct: 0, wrong: 0, blank: 0, total: 0, count: 0 };
    }
    subjectStats[subj].correct += c;
    subjectStats[subj].wrong += w;
    subjectStats[subj].blank += b;
    subjectStats[subj].total += t;
    subjectStats[subj].count += 1;
  });

  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const netScore = Math.max(0, totalCorrect - (totalWrong * 0.25)).toFixed(2);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '1.25rem',
        maxWidth: '850px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div className="no-print" style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Award size={20} color="#4f46e5" />
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
              Öğrenci Gelişim & Performans Karnesi
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.6rem',
                padding: '0.45rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)'
              }}
            >
              <Printer size={15} /> Yazdır / PDF İndir
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '0.6rem',
                padding: '0.45rem',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div ref={reportRef} style={{ padding: '2rem', overflowY: 'auto', color: '#0f172a', fontFamily: 'inherit' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '2px solid #4f46e5',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div>
              <h1 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem', fontWeight: 900, color: '#1e1b4b' }}>
                🎓 E-Test Eğitim & Gelişim Karnesi
              </h1>
              <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                Akademik Takip ve Bireysel Başarı Değerlendirme Raporu
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a' }}>
                {student.name || student.username || 'Öğrenci'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                {student.grade ? `${student.grade}. Sınıf` : 'Öğrenci Portalı'} • {new Date().toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.75rem'
          }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>BAŞARI ORANI</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#4f46e5', marginTop: '0.2rem' }}>%{overallAccuracy}</div>
              <div style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: 700 }}>Genel Ortalama</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>NET PUAN</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0284c7', marginTop: '0.2rem' }}>{netScore}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>Toplam Net</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>DOĞRU / YANLIŞ</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#15803d', marginTop: '0.35rem' }}>
                {totalCorrect} <span style={{ color: '#b91c1c', fontSize: '1rem' }}>D / {totalWrong} Y</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>({totalBlank} Boş)</div>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>ÇÖZÜLEN SINAVLAR</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#7c3aed', marginTop: '0.2rem' }}>{totalSubmissions}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>{totalQuestions} Soru</div>
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <BarChart2 size={16} color="#4f46e5" /> Ders Bazlı Performans Dağılımı
            </h4>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Ders Adı</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900, textAlign: 'center' }}>Sınav Sayısı</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900, textAlign: 'center' }}>Toplam Soru</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900, textAlign: 'center' }}>Doğru</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900, textAlign: 'center' }}>Yanlış</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900, textAlign: 'center' }}>Net</th>
                  <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900, textAlign: 'center' }}>Başarı %</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(subjectStats).map((st, idx) => {
                  const subAcc = st.total > 0 ? Math.round((st.correct / st.total) * 100) : 0;
                  const subNet = Math.max(0, st.correct - (st.wrong * 0.25)).toFixed(2);

                  return (
                    <tr key={st.subject || idx} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800, color: '#0f172a' }}>{st.subject}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>{st.count}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 700 }}>{st.total}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 900, color: '#15803d' }}>{st.correct}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 900, color: '#b91c1c' }}>{st.wrong}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center', fontWeight: 900, color: '#0284c7' }}>{subNet}</td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                        <span style={{
                          padding: '0.2rem 0.55rem',
                          borderRadius: '999px',
                          fontWeight: 900,
                          fontSize: '0.75rem',
                          background: subAcc >= 70 ? '#f0fdf4' : subAcc >= 50 ? '#fffbeb' : '#fef2f2',
                          color: subAcc >= 70 ? '#15803d' : subAcc >= 50 ? '#d97706' : '#b91c1c',
                          border: `1px solid ${subAcc >= 70 ? '#86efac' : subAcc >= 50 ? '#fde68a' : '#fca5a5'}`
                        }}>
                          %{subAcc}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{
            background: '#faf5ff',
            border: '1.5px solid #ddd6fe',
            borderRadius: '1rem',
            padding: '1.25rem',
            marginTop: '1.5rem'
          }}>
            <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '0.88rem', fontWeight: 900, color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              💬 Öğretmen & Koçluk Değerlendirmesi
            </h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
              Öğrencimiz hedeflenen çalışma programını başarıyla takip etmektedir. Yanlış yapılan soruların telafi testleri ile düzenli pekiştirilmesi durumunda başarı yüzdesinin daha da yükseleceği öngörülmektedir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
