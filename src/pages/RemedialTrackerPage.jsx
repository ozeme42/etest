import React from 'react';
import TeacherRemedialTracker from '../components/teacher/TeacherRemedialTracker';
import { useTheme } from '../context/ThemeContext';
import { Scissors, Sparkles, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function RemedialTrackerPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      minHeight: '100vh'
    }}>
      {/* 🧭 SAYFA ÜST BAŞLIK ALANI */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '1rem',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(244,63,94,0.35)'
              }}>
                <Scissors size={18} />
              </div>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Telafi Testleri &amp; %100 Ustalık Takip Paneli
              </h1>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Öğrencilere PDF Soru Kırpıcı veya Hatalar Havuzundan atanan telafi testlerinin çözümlerini, aralıklı tekrar (Leitner) süreçlerini ve %100 ustalık seviyelerini canlı takip edin.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/questions')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '0.6rem 1.15rem',
            borderRadius: '0.9rem',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            border: 'none',
            color: 'white',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(79,70,229,0.3)'
          }}
        >
          <Sparkles size={16} />
          <span>Soru Bankası &amp; PDF Kırpıcı</span>
        </button>
      </div>

      {/* 📊 TELAFİ VE USTALIK TAKİP BİLEŞENİ */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.25rem',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)'
      }}>
        <TeacherRemedialTracker isDark={isDark} />
      </div>
    </div>
  );
}
