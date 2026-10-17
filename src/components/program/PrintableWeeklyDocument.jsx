import React from 'react';
import { resolveBookTestInfo } from '../ProgramCenter';

const DAYS_META = [
  { key: 'Pzt', name: 'Pazartesi' },
  { key: 'Sal', name: 'Salı' },
  { key: 'Çrş', name: 'Çarşamba' },
  { key: 'Prş', name: 'Perşembe' },
  { key: 'Cum', name: 'Cuma' },
  { key: 'Cts', name: 'Cumartesi' },
  { key: 'Paz', name: 'Pazar' }
];

export default function PrintableWeeklyDocument({
  studentName = 'Öğrenci',
  weekRange = '',
  fullProcessedWeekMap = {},
  weekInfo = {},
  catchUpTasks = [],
  books = [],
  bookTests = [],
  totalItems = 0,
  doneItems = 0,
  pct = 0,
  printMode = 'standard' // 'standard' | 'overdue'
}) {
  const p1Keys = ['Pzt', 'Sal', 'Çrş', 'Prş'];
  const p2Keys = ['Cum', 'Cts', 'Paz'];

  const renderPrintDayCard = (dayKey) => {
    const dayData = fullProcessedWeekMap[dayKey] || { items: [] };
    const dateMeta = weekInfo?.dayDateMap?.[dayKey] || {};
    const dayMeta = DAYS_META.find(d => d.key === dayKey) || { key: dayKey, name: dayKey };
    const dayTasks = dayData.items || [];
    const dayDoneTasks = dayTasks.filter(item => item.done).length;
    const blankRowCount = dayTasks.length === 0 ? 3 : 2;

    return (
      <div key={dayKey} className="print-wk-day-card">
        <div className="print-wk-day-title-bar">
          <div className="print-wk-day-date">
            📅 {dayMeta.name} {dateMeta.dateLabel ? `— ${dateMeta.dateLabel}` : ''}
          </div>
          <div className="print-wk-day-meta">
            {dayTasks.length > 0 ? (
              <span>{dayTasks.length} Görev • {dayDoneTasks} Tamamlandı</span>
            ) : 'Planlanan Görev Yok'}
          </div>
        </div>

        <div className="print-wk-tasks-table">
          {dayTasks.map((item, idx) => {
            const bookInfo = resolveBookTestInfo(item, books, bookTests);
            const isDone = Boolean(item.done);

            return (
              <div
                key={item.id || idx}
                className={`print-wk-task-row ${isDone ? 'is-done' : ''}`}
              >
                <div className="print-wk-col-check">
                  <span className={`print-wk-check-box ${isDone ? 'checked' : ''}`}>
                    {isDone ? '✓' : ''}
                  </span>
                </div>

                <div className="print-wk-col-info">
                  <div className="print-wk-subject">
                    {bookInfo?.isBookTest ? (
                      <>
                        <span>📚 {bookInfo.subject}</span>
                        {bookInfo.publisher && (
                          <span style={{ color: '#4f46e5', marginLeft: 4 }}>
                            ({bookInfo.publisher})
                          </span>
                        )}
                        {bookInfo.bookTitle && (
                          <span style={{ fontSize: '7.2pt', color: '#334155', fontWeight: 700, marginLeft: 4 }}>
                            • 📖 {bookInfo.bookTitle}
                          </span>
                        )}
                      </>
                    ) : (
                      item.bookName || item.subject || 'Çalışma Görevi'
                    )}
                  </div>

                  {bookInfo?.isBookTest ? (
                    <div className="print-wk-topic" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                      {bookInfo.unit && <span>📂 {bookInfo.unit}</span>}
                      {bookInfo.testName && <span>🎯 {bookInfo.testName}</span>}
                    </div>
                  ) : (
                    item.topic && <div className="print-wk-topic">{item.topic}</div>
                  )}
                </div>

                <div className="print-wk-col-details">
                  {item.taskType && (
                    <span className="print-wk-pill">
                      {item.taskType === 'soru' ? 'Soru Çözümü' : item.taskType === 'okuma' ? 'Kitap Okuma' : item.taskType === 'deneme' ? 'Deneme' : item.taskType}
                    </span>
                  )}
                  {(bookInfo?.questionCount || item.questionCount || item.targetQuestionCount) && (
                    <span className="print-wk-pill print-wk-pill-q">
                      ✏️ {String(bookInfo?.questionCount || item.questionCount || item.targetQuestionCount).includes('soru')
                        ? (bookInfo?.questionCount || item.questionCount || item.targetQuestionCount)
                        : `${bookInfo?.questionCount || item.questionCount || item.targetQuestionCount} soru`}
                    </span>
                  )}
                  {(item.startTime || item.time) && (
                    <span className="print-wk-pill">
                      🕐 {item.startTime ? `${item.startTime}${item.endTime ? ` → ${item.endTime}` : ''}` : item.time}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Manuel elle not alma & tik atma boşluk satırları */}
          {Array.from({ length: blankRowCount }).map((_, bIdx) => (
            <div key={`blank_${dayKey}_${bIdx}`} className="print-wk-task-row print-wk-blank-row">
              <div className="print-wk-col-check">
                <span className="print-wk-check-box" />
              </div>
              <div className="print-wk-col-info">
                <span className="print-wk-blank-line" />
              </div>
              <div className="print-wk-col-details">
                <span className="print-wk-blank-pill">______ soru / süre</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .print-weekly-program-doc {
          display: none;
        }

        @media print {
          @page {
            size: ${printMode === 'overdue' ? 'A4 portrait' : 'A4 portrait'};
            margin: 7mm 8mm 7mm 8mm;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body, #root, #root *, div, section, main, article, header, nav {
            background-color: #ffffff !important;
            background-image: none !important;
            color: #0f172a !important;
            box-shadow: none !important;
            text-shadow: none !important;
            backdrop-filter: none !important;
            font-family: 'Inter', -apple-system, sans-serif !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            font-size: 8.2pt !important;
          }
          nav, header, footer, .no-print, button, select, input, .weekly-screen-view {
            display: none !important;
          }
          .print-weekly-program-doc {
            display: ${printMode === 'overdue' ? 'none !important' : 'block !important'};
            width: 100% !important;
          }
          .print-overdue-only-doc {
            display: ${printMode === 'overdue' ? 'block !important' : 'none !important'};
            width: 100% !important;
          }
          .print-wk-page {
            width: 100% !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          .print-wk-page-1 {
            page-break-after: always !important;
            break-after: page !important;
          }
          .print-wk-page-2 {
            page-break-before: always !important;
            break-before: page !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .print-wk-header {
            display: flex !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 4px !important;
            margin-bottom: 6px !important;
          }
          .print-wk-brand {
            font-size: 10pt !important;
            font-weight: 900 !important;
            color: #0f172a !important;
            letter-spacing: -0.02em !important;
          }
          .print-wk-title {
            font-size: 8.8pt !important;
            font-weight: 800 !important;
            color: #4338ca !important;
            margin-top: 1px !important;
          }
          .print-wk-header-right {
            text-align: right !important;
            font-size: 7.5pt !important;
            color: #334155 !important;
            line-height: 1.25 !important;
          }
          .print-wk-stat {
            font-weight: 800 !important;
            color: #15803d !important;
          }
          .print-wk-page-badge {
            display: inline-block !important;
            margin-top: 2px !important;
            padding: 1px 5px !important;
            border-radius: 3px !important;
            background: #e0e7ff !important;
            color: #3730a3 !important;
            font-weight: 800 !important;
            font-size: 7pt !important;
          }
          .print-wk-days-stack {
            display: flex !important;
            flex-direction: column !important;
            gap: 5px !important;
            width: 100% !important;
          }
          .print-wk-day-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1.2px solid #cbd5e1 !important;
            border-left: 4.5px solid #4f46e5 !important;
            border-radius: 4px !important;
            background: #ffffff !important;
            padding: 3.5px 6px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .print-wk-day-title-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding-bottom: 2px !important;
            margin-bottom: 3px !important;
          }
          .print-wk-day-date {
            font-size: 8.5pt !important;
            font-weight: 900 !important;
            color: #0f172a !important;
          }
          .print-wk-day-meta {
            font-size: 7.2pt !important;
            font-weight: 700 !important;
            color: #64748b !important;
          }
          .print-wk-tasks-table {
            display: flex !important;
            flex-direction: column !important;
            gap: 2.5px !important;
          }
          .print-wk-task-row {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            padding: 2px 4px !important;
            border-radius: 3px !important;
            background: #f8fafc !important;
            border: 1px solid #e2e8f0 !important;
            line-height: 1.2 !important;
            min-height: 22px !important;
            box-sizing: border-box !important;
          }
          .print-wk-task-row.is-done {
            background: #f0fdf4 !important;
            border-color: #bbf7d0 !important;
          }
          .print-wk-task-row.is-overdue {
            background: #fff8f8 !important;
            border-color: #fca5a5 !important;
          }
          .print-wk-task-row.print-wk-blank-row {
            background: #ffffff !important;
            border: 1px dashed #cbd5e1 !important;
          }
          .print-wk-col-check {
            flex-shrink: 0 !important;
            display: flex !important;
            align-items: center !important;
          }
          .print-wk-check-box {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 12px !important;
            height: 12px !important;
            border: 1.5px solid #64748b !important;
            border-radius: 2.5px !important;
            font-size: 7pt !important;
            font-weight: 900 !important;
            color: #15803d !important;
            line-height: 1 !important;
            background: #ffffff !important;
          }
          .print-wk-check-box.checked {
            border-color: #16a34a !important;
            background: #dcfce7 !important;
          }
          .print-wk-col-info {
            flex: 1 !important;
            min-width: 0 !important;
          }
          .print-wk-subject {
            font-size: 7.6pt !important;
            font-weight: 800 !important;
            color: #0f172a !important;
          }
          .print-wk-topic {
            font-size: 7pt !important;
            color: #334155 !important;
            font-weight: 600 !important;
            margin-top: 1px !important;
          }
          .print-wk-blank-line {
            display: block !important;
            width: 100% !important;
            border-bottom: 1.2px dotted #94a3b8 !important;
            height: 10px !important;
          }
          .print-wk-col-details {
            display: flex !important;
            align-items: center !important;
            gap: 3px !important;
            flex-shrink: 0 !important;
            font-size: 6.8pt !important;
          }
          .print-wk-pill {
            background: #e2e8f0 !important;
            color: #334155 !important;
            padding: 1px 4px !important;
            border-radius: 3px !important;
            font-weight: 700 !important;
          }
          .print-wk-pill-q {
            background: #e0f2fe !important;
            color: #0369a1 !important;
            font-weight: 800 !important;
          }
          .print-wk-pill-overdue {
            background: #fee2e2 !important;
            color: #b91c1c !important;
            font-weight: 800 !important;
          }
          .print-wk-overdue-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            border: 1.2px solid #fca5a5 !important;
            border-left: 4.5px solid #dc2626 !important;
            border-radius: 4px !important;
            background: #fffafa !important;
            padding: 4px 7px !important;
            margin-top: 6px !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .print-wk-overdue-title-bar {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-bottom: 1px solid #fecaca !important;
            padding-bottom: 2px !important;
            margin-bottom: 3px !important;
          }
          .print-wk-overdue-title {
            font-size: 8.2pt !important;
            font-weight: 900 !important;
            color: #991b1b !important;
          }
          .print-wk-overdue-meta {
            font-size: 7pt !important;
            font-weight: 800 !important;
            color: #dc2626 !important;
          }
          .print-wk-blank-pill {
            display: inline-block !important;
            font-size: 6.8pt !important;
            color: #94a3b8 !important;
            border-bottom: 1px dotted #cbd5e1 !important;
            padding: 0 4px 1px 4px !important;
          }
          .print-wk-page-footer-note {
            margin-top: 4px !important;
            font-size: 6.8pt !important;
            color: #64748b !important;
            text-align: right !important;
            font-style: italic !important;
          }
          .print-wk-bottom-section {
            margin-top: 8px !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-wk-notes-area {
            border: 1px dashed #cbd5e1 !important;
            border-radius: 4px !important;
            padding: 5px 8px !important;
            margin-bottom: 8px !important;
            background: #fafafa !important;
          }
          .print-wk-notes-title {
            font-size: 7.2pt !important;
            font-weight: 800 !important;
            color: #475569 !important;
            margin-bottom: 4px !important;
          }
          .print-wk-notes-line {
            border-bottom: 1px dotted #cbd5e1 !important;
            height: 16px !important;
            width: 100% !important;
          }
          .print-wk-footer {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
            border-top: 1.5px solid #cbd5e1 !important;
            padding-top: 6px !important;
            margin-top: 10px !important;
            font-size: 7.2pt !important;
            color: #475569 !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ── FULL-DETAIL PRINTABLE WEEKLY PROGRAM (A4 2-PAGE DOCUMENT) ── */}
      <div className="print-weekly-program-doc">
        {/* SAYFA 1: PAZARTESİ - PERŞEMBE (4 GÜN) */}
        <div className="print-wk-page print-wk-page-1">
          <div className="print-wk-header">
            <div>
              <div className="print-wk-brand">E-TEST EĞİTİM & KOÇLUK PLATFORMU</div>
              <div className="print-wk-title">
                Haftalık Ders Çalışma Programı • {weekRange}
              </div>
            </div>
            <div className="print-wk-header-right">
              <div>Öğrenci: <strong>{studentName}</strong></div>
              <div className="print-wk-stat">
                Haftalık Hedef: {doneItems} / {totalItems} Görev (%{pct})
              </div>
              {catchUpTasks.length > 0 && (
                <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '7.4pt' }}>
                  ⚠️ Telafi Görevleri: {catchUpTasks.length} Görev (Sayfa 2'de)
                </div>
              )}
              <div style={{ color: '#64748b' }}>
                Yazdırma Tarihi: {new Date().toLocaleDateString('tr-TR')}
              </div>
              <div className="print-wk-page-badge">📄 Sayfa 1 / 2 • Pazartesi – Perşembe (4 Gün)</div>
            </div>
          </div>

          <div className="print-wk-days-stack">
            {p1Keys.map(renderPrintDayCard)}
          </div>

          <div className="print-wk-page-footer-note">
            * Devamı ve Hafta Sonu Programı Sayfa 2'dedir (Cuma, Cumartesi, Pazar)
          </div>
        </div>

        {/* SAYFA 2: CUMA - PAZAR (3 GÜN + TELAFİ + NOTLAR) */}
        <div className="print-wk-page print-wk-page-2">
          <div className="print-wk-header print-wk-header-p2">
            <div>
              <div className="print-wk-brand">E-TEST EĞİTİM & KOÇLUK PLATFORMU</div>
              <div className="print-wk-title">
                Haftalık Ders Çalışma Programı (Hafta Sonu & Kapanış) • {weekRange}
              </div>
            </div>
            <div className="print-wk-header-right">
              <div>Öğrenci: <strong>{studentName}</strong></div>
              {catchUpTasks.length > 0 && (
                <div style={{ color: '#dc2626', fontWeight: 800, fontSize: '7.4pt' }}>
                  ⚠️ Telafi Görevleri: {catchUpTasks.length} Görev
                </div>
              )}
              <div style={{ color: '#64748b' }}>
                Tarih: {new Date().toLocaleDateString('tr-TR')}
              </div>
              <div className="print-wk-page-badge">📄 Sayfa 2 / 2 • Cuma – Pazar (3 Gün)</div>
            </div>
          </div>

          <div className="print-wk-days-stack">
            {p2Keys.map(renderPrintDayCard)}
          </div>

          {/* Telafi Listesi */}
          {catchUpTasks.length > 0 && (
            <div className="print-wk-overdue-card">
              <div className="print-wk-overdue-title-bar">
                <div className="print-wk-overdue-title">
                  ⚠️ Telafi Edilecek Görevler (Eksik Kalanlar)
                </div>
                <div className="print-wk-overdue-meta">
                  Toplam {catchUpTasks.length} Telafi Görevi Bulunuyor
                </div>
              </div>
              <div className="print-wk-tasks-table">
                {catchUpTasks.slice(0, 5).map((item, idx) => {
                  const bookInfo = resolveBookTestInfo(item, books, bookTests);
                  return (
                    <div key={item.id || `catchup_${idx}`} className="print-wk-task-row is-overdue print-wk-overdue-row">
                      <div className="print-wk-col-check">
                        <span className="print-wk-check-box" />
                      </div>
                      <div className="print-wk-col-info">
                        <div className="print-wk-subject">
                          {bookInfo?.isBookTest ? (
                            <>
                              <span>📚 {bookInfo.subject}</span>
                              {bookInfo.bookTitle && (
                                <span style={{ fontSize: '7.2pt', color: '#334155', fontWeight: 700, marginLeft: 4 }}>
                                  • 📖 {bookInfo.bookTitle}
                                </span>
                              )}
                            </>
                          ) : (
                            item.bookName || item.subject || 'Telafi Görevi'
                          )}
                        </div>
                        {bookInfo?.isBookTest ? (
                          <div className="print-wk-topic" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 1 }}>
                            {bookInfo.unit && <span>📂 {bookInfo.unit}</span>}
                            {bookInfo.testName && <span>🎯 {bookInfo.testName}</span>}
                          </div>
                        ) : (
                          item.topic && <div className="print-wk-topic">{item.topic}</div>
                        )}
                      </div>
                      <div className="print-wk-col-details">
                        {item.pastDayName && (
                          <span className="print-wk-pill print-wk-pill-overdue">
                            {item.pastDayName} gününden
                          </span>
                        )}
                        {(bookInfo?.questionCount || item.questionCount || item.targetQuestionCount) && (
                          <span className="print-wk-pill print-wk-pill-q">
                            ✏️ {String(bookInfo?.questionCount || item.questionCount || item.targetQuestionCount).includes('soru')
                              ? (bookInfo?.questionCount || item.questionCount || item.targetQuestionCount)
                              : `${bookInfo?.questionCount || item.questionCount || item.targetQuestionCount} soru`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="print-wk-bottom-section">
            <div className="print-wk-notes-area">
              <div className="print-wk-notes-title">📝 Haftalık Notlar & Koç / Veli Değerlendirmesi:</div>
              <div className="print-wk-notes-line" />
              <div className="print-wk-notes-line" />
            </div>

            <div className="print-wk-footer">
              <div>Öğrenci İmzası: ___________________</div>
              <div>Koç / Öğretmen İmzası: ___________________</div>
              <div>Veli İmzası: ___________________</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
