import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Check if error is due to a stale chunk / dynamic import mismatch from a new deployment
    const errMsg = String(error?.message || '');
    const isChunkMismatch = 
      errMsg.includes('Failed to fetch dynamically imported module') ||
      errMsg.includes('dynamically imported') ||
      errMsg.includes('Loading chunk') ||
      errMsg.includes('MIME type') ||
      error?.name === 'ChunkLoadError';

    if (isChunkMismatch) {
      const lastReload = sessionStorage.getItem('etest_chunk_reload_ts');
      const now = Date.now();
      if (!lastReload || (now - Number(lastReload)) > 8000) {
        sessionStorage.setItem('etest_chunk_reload_ts', String(now));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'radial-gradient(ellipse at 15% 15%, rgba(99, 102, 241, 0.08) 0%, transparent 45%), radial-gradient(ellipse at 85% 25%, rgba(244, 63, 94, 0.05) 0%, transparent 45%), #f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          fontFamily: "'Inter', system-ui, sans-serif"
        }}>
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '1.5rem',
            padding: '2.5rem 2rem',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.06)',
            color: '#0f172a'
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#fef2f2',
              border: '2px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#dc2626'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Bir Şeyler Ters Gitti
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              Bu sayfa yüklenirken beklenmeyen bir hata oluştu. Sayfayı yenileyerek veya ana sayfaya dönerek devam edebilirsiniz.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
                }}
              >
                <RotateCcw size={16} /> Sayfayı Yenile
              </button>
              <a
                href="/"
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '0.75rem',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 800,
                  fontSize: '0.86rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Home size={16} /> Ana Sayfa
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
