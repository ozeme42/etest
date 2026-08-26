import React, { useState, useEffect } from 'react';
import {
  Sparkles, Key, Save, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff,
  RefreshCw, Zap, ShieldCheck, ExternalLink, Activity, BookOpen, Clock,
  Check, HelpCircle, BarChart3, Info
} from 'lucide-react';
import { dbGetSystemAiApiKey, dbSaveSystemAiApiKey } from '../../services/supabaseService';
import { getAiUsageSummary } from '../../services/aiUsageLogService';
import { GEMINI_SOLVER_MODELS } from '../../services/aiSolutionService';

export default function AdminAiSettingsTab() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');

  // AI Usage Statistics
  const [usageStats, setUsageStats] = useState(() => getAiUsageSummary());

  useEffect(() => {
    async function loadKey() {
      setLoading(true);
      try {
        const cloudKey = await dbGetSystemAiApiKey();
        if (cloudKey) {
          setApiKey(cloudKey);
          setSavedKey(cloudKey);
        }
      } catch (err) {
        console.warn('[AdminAiSettingsTab] loadKey error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadKey();
    setUsageStats(getAiUsageSummary());
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      alert('Lütfen geçerli bir Google Gemini API anahtarı giriniz.');
      return;
    }
    setSaving(true);
    setSaveSuccess(false);
    try {
      const ok = await dbSaveSystemAiApiKey(apiKey.trim(), { defaultModel: selectedModel });
      if (ok) {
        setSavedKey(apiKey.trim());
        setSaveSuccess(true);
        setTestResult(null);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert('API anahtarı kaydedilirken bir sorun oluştu.');
      }
    } catch (err) {
      alert(`Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClearKey = async () => {
    if (!confirm('Sistem genelindeki API anahtarını silmek istediğinize emin misiniz? Öğrenciler kendi anahtarları olmadan AI soru çözümünü kullanamaz.')) {
      return;
    }
    setSaving(true);
    try {
      await dbSaveSystemAiApiKey('');
      setApiKey('');
      setSavedKey('');
      setTestResult(null);
      alert('API anahtarı sistemden temizlendi.');
    } catch (err) {
      alert(`Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({ success: false, message: 'Lütfen test etmek için önce API anahtarını girin.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Test Gemini API with a simple prompt
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToTest}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Merhaba! Tek kelimelik yanıt ver: OK' }] }]
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const msg = errorData?.error?.message || `HTTP ${res.status}: API anahtarı geçersiz veya yetkisiz.`;
        setTestResult({ success: false, message: msg });
      } else {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Bağlantı Başarılı';
        setTestResult({
          success: true,
          message: `✓ Google Gemini API Bağlantısı Başarılı! (Model Yanıtı: "${text.trim()}")`
        });
      }
    } catch (err) {
      setTestResult({ success: false, message: `Bağlantı hatası: ${err.message}` });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ── HEADER BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(79, 70, 229, 0.08))',
        border: '1.5px solid rgba(168, 85, 247, 0.35)',
        borderRadius: '1.5rem',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 20px -2px rgba(124, 58, 237, 0.4)'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: 'var(--color-text)' }}>
                Yapay Zeka (AI) & API Ayarları
              </h2>
              <span style={{
                background: savedKey ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                color: savedKey ? '#10b981' : '#f59e0b',
                border: `1px solid ${savedKey ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                padding: '0.2rem 0.6rem',
                borderRadius: 99,
                fontSize: '0.72rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {savedKey ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {savedKey ? 'Aktif & Veritabanında Kayıtlı' : 'Yapılandırılmadı'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
              Buraya gireceğiniz Google Gemini API anahtarı veritabanına kaydedilir ve tüm öğretmen/öğrencilerin soru çözümü ve hata koçluğu için ortak kullanılır.
            </p>
          </div>
        </div>

        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-surface)',
            border: '1.5px solid var(--color-border)',
            padding: '0.55rem 1rem',
            borderRadius: '0.85rem',
            color: '#7c3aed',
            fontWeight: 800,
            fontSize: '0.82rem',
            textDecoration: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
        >
          <span>Google AI Studio'dan Ücretsiz Key Al</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* ── API KEY CONFIGURATION CARD ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Key size={18} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>
              Google Gemini API Anahtarı
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
            (Günde 1.500 istek / 0 TL tamamen ücretsiz)
          </span>
        </div>

        {/* Input Box */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            disabled={loading || saving}
            style={{
              width: '100%',
              padding: '0.85rem 3rem 0.85rem 1rem',
              borderRadius: '0.85rem',
              border: `1.5px solid ${savedKey ? '#c084fc' : 'var(--color-border-input)'}`,
              background: 'var(--color-surface-hover)',
              color: 'var(--color-text)',
              fontSize: '0.92rem',
              fontFamily: 'monospace',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Actions Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !apiKey.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.6rem 1.1rem',
                borderRadius: '0.75rem',
                border: '1.5px solid #6366f1',
                background: 'rgba(99, 102, 241, 0.1)',
                color: '#6366f1',
                fontWeight: 800,
                fontSize: '0.82rem',
                cursor: testing || !apiKey.trim() ? 'not-allowed' : 'pointer',
                opacity: !apiKey.trim() ? 0.6 : 1
              }}
            >
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              <span>{testing ? 'Test Ediliyor...' : '⚡ Bağlantıyı Test Et'}</span>
            </button>

            {savedKey && (
              <button
                type="button"
                onClick={handleClearKey}
                disabled={saving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0.6rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid #fca5a5',
                  background: '#fef2f2',
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={14} />
                <span>Anahtarı Kaldır</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveKey}
            disabled={saving || loading || !apiKey.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0.65rem 1.4rem',
              borderRadius: '0.85rem',
              border: 'none',
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: 'white',
              fontWeight: 900,
              fontSize: '0.86rem',
              cursor: saving || !apiKey.trim() ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
              opacity: !apiKey.trim() ? 0.6 : 1
            }}
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            <span>{saving ? 'Kaydediliyor...' : '💾 Veritabanına Kaydet'}</span>
          </button>
        </div>

        {/* Save Success Alert */}
        {saveSuccess && (
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            color: '#15803d',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.84rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span>🎉 API Anahtarı Supabase Veritabanına Başarıyla Kaydedildi! Tüm öğrenciler ve öğretmenler artık yapay zeka soru çözümünü sorunsuz kullanabilir.</span>
          </div>
        )}

        {/* Test Connection Feedback */}
        {testResult && (
          <div style={{
            background: testResult.success ? '#f0fdf4' : '#fef2f2',
            border: `1.5px solid ${testResult.success ? '#86efac' : '#fca5a5'}`,
            color: testResult.success ? '#15803d' : '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '0.75rem',
            fontSize: '0.84rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            {testResult.success ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertCircle size={18} color="#dc2626" />}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>

      {/* ── USAGE ANALYTICS & RECENT AI SOLVE LOGS ── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: '1.5rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#7c3aed" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: 'var(--color-text)' }}>
              Sistem Genel AI Kullanım & Şeffaflık Raporu
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setUsageStats(getAiUsageSummary())}
            title="Yenile"
            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Mini KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Toplam AI Çözüm İsteği</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#7c3aed', marginTop: 4 }}>{usageStats.totalRequests} Adet</div>
          </div>
          <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>İncelenen Farklı Soru</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: 4 }}>{usageStats.uniqueQuestions} Soru</div>
          </div>
          <div style={{ background: 'var(--color-surface-hover)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Ücretsiz Günlük Limit</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0284c7', marginTop: 4 }}>1.500 / Gün</div>
          </div>
        </div>

        {/* Recent Solve Logs Table */}
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 900, color: 'var(--color-text)', marginBottom: '0.5rem' }}>
            Son Çözdürülen Sorular (Canlı Takip)
          </div>

          {usageStats.recentLogs && usageStats.recentLogs.length > 0 ? (
            <div style={{ overflowX: 'auto', borderRadius: '0.85rem', border: '1px solid var(--color-border)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Öğrenci</th>
                    <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Ders / Konu</th>
                    <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Soru No</th>
                    <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Hata Sebebi</th>
                    <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Kullanım</th>
                    <th style={{ padding: '0.65rem 0.85rem', fontWeight: 900 }}>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {usageStats.recentLogs.map((log) => (
                    <tr key={log.id || `${log.testId}_${log.questionNo}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 800 }}>{log.studentName || 'Öğrenci'}</td>
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)' }}>{log.subject} {log.topic ? `• ${log.topic}` : ''}</td>
                      <td style={{ padding: '0.65rem 0.85rem', fontWeight: 900, color: '#7c3aed' }}>Soru {log.questionNo}</td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        {log.mistakeReason ? (
                          <span style={{ background: 'rgba(245,158,11,0.15)', color: '#d97706', padding: '0.15rem 0.45rem', borderRadius: 6, fontWeight: 800, fontSize: '0.72rem' }}>
                            {log.mistakeReason}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{
                          background: (log.count || 1) > 1 ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          color: (log.count || 1) > 1 ? '#dc2626' : '#10b981',
                          padding: '0.15rem 0.45rem',
                          borderRadius: 6,
                          fontWeight: 900,
                          fontSize: '0.72rem'
                        }}>
                          {log.count || 1} kez
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                        {log.lastUsedAt ? new Date(log.lastUsedAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-text-muted)', fontSize: '0.82rem', background: 'var(--color-surface-hover)', borderRadius: '0.85rem' }}>
              Henüz bir yapay zeka çözüm kaydı bulunmuyor. Test sonuç ekranlarından sorular çözdürüldükçe burada canlı listelenecektir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
