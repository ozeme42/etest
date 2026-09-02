import React from 'react';
import { Gauge, RotateCcw, Sparkles, Play, Clock } from 'lucide-react';
import { formatSecToMinSec } from '../constants/studyRoomConstants';

export default function StudySpeedAnalytics({
  themeObj,
  isMobile,
  overallAvgSecPerQ,
  totalTrackedQuestions,
  fastestSubject,
  slowestSubject,
  trackedSubjectsList,
  activeTrackedCount,
  selectedSubject,
  handleSelectSubject,
  handleSwitchMasterMode,
  clearSubjectStats,
  loadDemoSubjectStats
}) {
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
      {/* Başlık ve Eylemler */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        borderBottom: `1px solid ${themeObj.border}`,
        paddingBottom: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0
          }}>
            <Gauge size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: themeObj.text }}>
              Ders Bazlı Soru Başı Hız Analizi
            </h3>
            <div style={{ fontSize: '0.7rem', color: themeObj.subText, fontWeight: 600 }}>
              Çözülen sorulara harcanan ortalama süreler ve hız seviyeleri
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeTrackedCount > 0 ? (
            <button
              onClick={() => {
                if (window.confirm('Tüm ders hız istatistiklerini sıfırlamak istediğinize emin misiniz?')) {
                  clearSubjectStats();
                }
              }}
              style={{
                background: themeObj.innerBg,
                border: `1px solid ${themeObj.border}`,
                color: themeObj.subText,
                padding: '0.3rem 0.6rem',
                borderRadius: 8,
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <RotateCcw size={11} />
              <span>Sıfırla</span>
            </button>
          ) : (
            <button
              onClick={loadDemoSubjectStats}
              style={{
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                color: '#6366f1',
                padding: '0.3rem 0.7rem',
                borderRadius: 8,
                fontSize: '0.72rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <Sparkles size={12} />
              <span>Demo Veri</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Kartları (3 Sütun) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 8
      }}>
        {/* 1. Genel Ortalama */}
        <div style={{
          background: themeObj.innerBg,
          borderRadius: 14,
          padding: '0.65rem 0.75rem',
          border: `1px solid ${themeObj.border}`
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: themeObj.subText }}>⚡ Genel Ortalama</div>
          <div style={{ fontSize: isMobile ? '0.88rem' : '1.05rem', fontWeight: 900, color: '#6366f1', marginTop: 2 }}>
            {totalTrackedQuestions > 0 ? `${formatSecToMinSec(overallAvgSecPerQ)}/s` : 'Veri Yok'}
          </div>
          <div style={{ fontSize: '0.62rem', color: themeObj.subText, marginTop: 1 }}>
            {totalTrackedQuestions > 0 ? `${totalTrackedQuestions} Soru` : 'Henüz soru yok'}
          </div>
        </div>

        {/* 2. En Hızlı Ders */}
        <div style={{
          background: themeObj.innerBg,
          borderRadius: 14,
          padding: '0.65rem 0.75rem',
          border: `1px solid ${themeObj.border}`
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: themeObj.subText }}>🏎️ En Hızlı</div>
          <div style={{ fontSize: isMobile ? '0.85rem' : '0.98rem', fontWeight: 900, color: '#10b981', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fastestSubject ? `${fastestSubject.icon} ${fastestSubject.name.split(' ')[0]}` : '-'}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#10b981', fontWeight: 800, marginTop: 1 }}>
            {fastestSubject ? `${formatSecToMinSec(fastestSubject.avgSec)}/s` : '-'}
          </div>
        </div>

        {/* 3. En Detaylı Ders */}
        <div style={{
          background: themeObj.innerBg,
          borderRadius: 14,
          padding: '0.65rem 0.75rem',
          border: `1px solid ${themeObj.border}`
        }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: themeObj.subText }}>⏳ En Detaylı</div>
          <div style={{ fontSize: isMobile ? '0.85rem' : '0.98rem', fontWeight: 900, color: '#f59e0b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {slowestSubject ? `${slowestSubject.icon} ${slowestSubject.name.split(' ')[0]}` : '-'}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#f59e0b', fontWeight: 800, marginTop: 1 }}>
            {slowestSubject ? `${formatSecToMinSec(slowestSubject.avgSec)}/s` : '-'}
          </div>
        </div>
      </div>

      {/* Ders Listesi */}
      {activeTrackedCount > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {trackedSubjectsList
            .filter(subj => subj.hasData)
            .sort((a, b) => a.avgSec - b.avgSec)
            .map(subj => {
              const isSelected = selectedSubject === subj.id;
              return (
                <div
                  key={subj.id}
                  onClick={() => handleSelectSubject(subj.id)}
                  style={{
                    background: isSelected ? (themeObj.isDark ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff') : themeObj.innerBg,
                    border: `1.5px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                    borderRadius: 12,
                    padding: '0.6rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{subj.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 900, color: themeObj.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {subj.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: themeObj.subText, fontWeight: 600 }}>
                        {subj.totalQuestions} Soru · {Math.round(subj.totalSeconds / 60)} dk
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 900, color: subj.evaluation.color }}>
                        {formatSecToMinSec(subj.avgSec)}
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, opacity: 0.8 }}> / s</span>
                      </div>
                      <div style={{
                        fontSize: '0.6rem',
                        fontWeight: 800,
                        color: subj.evaluation.color,
                        background: subj.evaluation.bg,
                        padding: '1px 5px',
                        borderRadius: 6,
                        display: 'inline-block'
                      }}>
                        {subj.evaluation.label}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectSubject(subj.id);
                        handleSwitchMasterMode('question');
                      }}
                      style={{
                        background: isSelected ? themeObj.accent : themeObj.cardBg,
                        border: `1px solid ${isSelected ? themeObj.accent : themeObj.border}`,
                        color: isSelected ? '#ffffff' : themeObj.text,
                        borderRadius: 8,
                        padding: '0.3rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      <Play size={10} fill={isSelected ? 'white' : 'currentColor'} />
                      <span>Çalış</span>
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div style={{
          background: themeObj.innerBg,
          borderRadius: 16,
          padding: '1.5rem 1rem',
          border: `1.5px dashed ${themeObj.border}`,
          textAlign: 'center',
          color: themeObj.subText
        }}>
          <Clock size={26} color={themeObj.accent} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: themeObj.text }}>Henüz Kayıtlı Soru Seansı Yok</div>
          <div style={{ fontSize: '0.72rem', marginTop: 3, maxWidth: 360, margin: '3px auto 10px' }}>
            Soru Çözümü modundan dersinizi seçip soru çözdükçe ortalama süreniz burada otomatik analiz edilecektir.
          </div>
          <button
            onClick={loadDemoSubjectStats}
            style={{
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#6366f1',
              padding: '0.4rem 0.9rem',
              borderRadius: 10,
              fontSize: '0.76rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            ✨ Demo Verileri Gör
          </button>
        </div>
      )}
    </div>
  );
}
