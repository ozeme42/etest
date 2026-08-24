import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, Clock3, FileText, CheckCircle2, AlertCircle,
  Calendar, ArrowRight, ChevronRight, Bell, Sparkles, BookOpen
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function TeacherActionCenter({
  pendingManualApprovals = [],
  pendingEvaluations = [],
  dueHomeworks = [],
  students = []
}) {
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const totalActionItems = pendingManualApprovals.length + pendingEvaluations.length + dueHomeworks.length;

  if (totalActionItems === 0) {
    return (
      <div style={{
        background: isDark ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))' : 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
        border: '1.5px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '1.25rem',
        padding: '0.9rem 1.35rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        boxShadow: '0 4px 14px rgba(16,185,129,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 38, height: 38, borderRadius: '0.75rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: '0.92rem', color: 'var(--color-text)' }}>
              🎉 Harika! Tüm Günlük Görevler ve Onaylar Tamamlandı
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Bekleyen sınav onayı veya süresi dolan acil ödev bulunmuyor. Sınıfınız güncel durumda.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/homeworks')}
          style={{
            padding: '0.45rem 0.95rem',
            borderRadius: '0.65rem',
            border: 'none',
            background: '#10b981',
            color: '#ffffff',
            fontWeight: 800,
            fontSize: '0.78rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <BookOpen size={14} />
          <span>Yeni Ödev Ata</span>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1.5px solid var(--color-border)',
      borderRadius: '1.25rem',
      padding: '1.1rem 1.35rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 34, height: 34, borderRadius: '0.65rem', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontWeight: 900, fontSize: '0.98rem', color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              🚨 Günlük Öğretmen Kokpiti &amp; Yapılacaklar
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontWeight: 900 }}>
                {totalActionItems} Acil Eylem
              </span>
            </h3>
          </div>
        </div>
        <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', fontWeight: 700 }}>
          Öğrenci yanıtlarını onaylayın ve geciken ödevleri takip edin
        </span>
      </div>

      {/* Action Items List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
        
        {/* 1. Pending Manual Approvals */}
        {pendingManualApprovals.length > 0 && (
          <div style={{
            background: isDark ? 'rgba(124, 58, 237, 0.12)' : 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
            border: '1.5px solid rgba(139, 92, 246, 0.35)',
            borderRadius: '1rem',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: '#7c3aed', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock3 size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pendingManualApprovals.length} Manuel Test Onay Bekliyor
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Öğrencilerinizin girdiği optik/fiziksel sonuçlar
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/approvals')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)'
              }}
            >
              <span>Onayla</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* 2. Pending Open-Ended Evaluations */}
        {pendingEvaluations.length > 0 && (
          <div style={{
            background: isDark ? 'rgba(59, 130, 246, 0.12)' : 'linear-gradient(135deg, #eff6ff, #e0e7ff)',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            borderRadius: '1rem',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.65rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
              <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: '#2563eb', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pendingEvaluations.length} Açık Uçlu Soru Puanlama
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Öğretmen değerlendirmesi bekleyen yazılı cevaplar
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/evaluations')}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.6rem',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0
              }}
            >
              <span>Puanla</span>
              <ChevronRight size={13} />
            </button>
          </div>
        )}

        {/* 3. Due / Expiring Homeworks */}
        {dueHomeworks.slice(0, 2).map((hw) => {
          const due = new Date(hw.dueDate);
          const daysLeft = Math.ceil((due - Date.now()) / 86400000);
          const isToday = daysLeft <= 0;
          return (
            <div
              key={hw.id}
              style={{
                background: isDark ? 'rgba(239, 68, 68, 0.12)' : 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                border: '1.5px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '1rem',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.65rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.65rem', background: '#dc2626', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Calendar size={18} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {isToday ? '🔥 Bugün Son Gün!' : `⏰ ${daysLeft} Gün Kaldı`} · {hw.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Teslim Tarihi: {due.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/homeworks')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '0.6rem',
                  border: 'none',
                  background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  flexShrink: 0
                }}
              >
                <span>İncele</span>
                <ChevronRight size={13} />
              </button>
            </div>
          );
        })}

      </div>
    </div>
  );
}
