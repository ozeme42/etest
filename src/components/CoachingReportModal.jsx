import React, { useRef } from 'react';
import { 
  X, Printer, Share2, Award, Target, CheckCircle2, 
  Calendar, BookOpen, Clock, FileText, User, Sparkles
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
  submissions = []
}) {
  const reportRef = useRef(null);

  if (!isOpen) return null;

  // Calculate metrics
  const totalTasks = weeklyProgram.reduce((acc, day) => acc + (day.items?.length || 0), 0);
  const doneTasks = weeklyProgram.reduce((acc, day) => acc + (day.items?.filter(i => i.done)?.length || 0), 0);
  const completionPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Question counts from counterGoals or submissions
  const questionGoal = counterGoals.find(g => g.title?.toLowerCase().includes('soru') && g.period === 'Haftalık') 
    || counterGoals.find(g => g.title?.toLowerCase().includes('soru'))
    || { target: 350, current: 0 };

  const latestExam = mockExams && mockExams.length > 0 ? mockExams[mockExams.length - 1] : null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `📊 *E-Test Haftalık Koçluk Takip Raporu*\n` +
      `👤 *Öğrenci:* ${studentName}\n` +
      `🎯 *Hedef:* ${targetExam} ${targetSchool ? `(${targetSchool})` : ''}\n` +
      `📈 *Haftalık Program Başarısı:* %${completionPct} (${doneTasks}/${totalTasks} Görev)\n` +
      `✍️ *Haftalık Soru Çözümü:* ${questionGoal.current || doneTasks * 20} / ${questionGoal.target || 350} Soru\n` +
      (latestExam ? `📝 *Son Deneme Neti:* ${latestExam.totalNet || latestExam.net || '-'} Net (${latestExam.examName || 'Deneme'})\n` : '') +
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
      
      {/* Print CSS Styles injected dynamically */}
      <style>{`
        @media print {
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
            padding: 20px !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border: 1px solid #cbd5e1 !important;
          }
          .print-bg-light {
            background-color: #f8fafc !important;
          }
          .print-text-dark {
            color: #0f172a !important;
          }
        }
      `}</style>

      <div 
        style={{
          background: '#0f172a',
          color: '#f8fafc',
          border: '1.5px solid rgba(165, 180, 252, 0.3)',
          borderRadius: '1.5rem',
          maxWidth: '860px',
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
                Yazdırılabilir ve veliyle paylaşılabilir resmi takip belgesi
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
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: '#0b1120' }}>
          <div 
            id="printable-coaching-report"
            ref={reportRef}
            style={{
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '1rem',
              padding: '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              fontFamily: "'Inter', system-ui, sans-serif"
            }}
          >
            {/* Document Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '1.5rem' }}>✨</span>
                  <h1 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 900, color: '#1e1b4b', letterSpacing: '-0.02em' }}>
                    E-TEST PREMIUM EĞİTİM & KOÇLUK
                  </h1>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748b', marginTop: 3 }}>
                  Öğrenci Haftalık Gelişim & Takip Karnesi
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569' }}>
                  Tarih: {new Date().toLocaleDateString('tr-TR')}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#4f46e5', background: '#e0e7ff', padding: '2px 8px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>
                  HAFTALIK RAPOR
                </div>
              </div>
            </div>

            {/* Student Info Card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>ÖĞRENCİ</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0f172a', marginTop: 2 }}>{studentName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SINIF / ALAN</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{gradeClass}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>HEDEF SINAV</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#4f46e5', marginTop: 2 }}>{targetExam}</div>
              </div>
              {targetSchool && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>HEDEF OKUL</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: 2 }}>{targetSchool}</div>
                </div>
              )}
            </div>

            {/* Core Metrics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.75rem', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>PROGRAM BAŞARISI</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#15803d', marginTop: 4 }}>%{completionPct}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#166534', marginTop: 2 }}>{doneTasks}/{totalTasks} Görev</div>
              </div>

              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '0.75rem', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1e40af', textTransform: 'uppercase' }}>HAFTALIK SORU</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#2563eb', marginTop: 4 }}>{questionGoal.current || doneTasks * 20}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1e40af', marginTop: 2 }}>Hedef: {questionGoal.target || 350}</div>
              </div>

              <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '0.75rem', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b21a8', textTransform: 'uppercase' }}>SON DENEME NETİ</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7e22ce', marginTop: 4 }}>{latestExam?.totalNet || latestExam?.net || '-'}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b21a8', marginTop: 2 }}>{latestExam?.examName || 'Deneme'}</div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '0.85rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#92400e', textTransform: 'uppercase' }}>HEDEF NET / PUAN</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#b45309', marginTop: 4 }}>{targetNet || targetScore || '85 Net'}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#92400e', marginTop: 2 }}>LGS / YKS</div>
              </div>
            </div>

            {/* Weekly Timetable Summary Table */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.6rem 0', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.35rem' }}>
                📅 Haftalık Ders & Çalışma Programı
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left', width: '90px' }}>Gün</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'left' }}>Planlanan Çalışmalar / Konular</th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', width: '100px' }}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyProgram.map((dayObj) => {
                    const items = dayObj.items || [];
                    const isAllDone = items.length > 0 && items.every(i => i.done);
                    const hasItems = items.length > 0;

                    return (
                      <tr key={dayObj.day} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', fontWeight: 800, color: '#0f172a' }}>
                          {dayObj.day}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', color: '#334155' }}>
                          {hasItems ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {items.map((it, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ color: it.done ? '#16a34a' : '#94a3b8' }}>{it.done ? '✓' : '•'}</span>
                                  <span style={{ textDecoration: it.done ? 'line-through' : 'none', color: it.done ? '#64748b' : '#0f172a', fontWeight: 600 }}>
                                    {it.subject} {it.topic ? `(${it.topic})` : ''} {it.hours ? `— ${it.hours}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Serbest Çalışma / Dinlenme</span>
                          )}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 10px', textAlign: 'center', fontWeight: 800 }}>
                          {hasItems ? (
                            <span style={{ color: isAllDone ? '#15803d' : '#d97706' }}>
                              {items.filter(i => i.done).length}/{items.length} Tamam
                            </span>
                          ) : (
                            <span style={{ color: '#64748b' }}>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Teacher / Coach Note */}
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e1b4b', marginBottom: 4 }}>
                ✍️ KOÇLUK DEĞERLENDİRME & ÖĞRETMEN NOTU:
              </div>
              <div style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5, minHeight: '40px', fontStyle: teacherNote ? 'normal' : 'italic' }}>
                {teacherNote || 'Öğrencinin haftalık planına uyumu ve soru çözüm hedefleri titizlikle takip edilmektedir. Soru sayısını ve deneme analizlerini istikrarlı şekilde sürdürmesi tavsiye edilir.'}
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>Öğretmen / Eğitim Koçu İmza</div>
                <div style={{ height: '45px' }} />
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>E-Test Koçluk Birimi</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155' }}>Veli Görüşü & İmza</div>
                <div style={{ height: '45px' }} />
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Görüldü / Onay</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
