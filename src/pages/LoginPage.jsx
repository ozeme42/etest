import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, Users, Settings, Mail, Lock, User,
  Sparkles, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurriculum } from '../context/CurriculumContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, currentUser, logout, fastDemoLogin } = useAuth();
  const { data: curData } = useCurriculum();

  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gradeId, setGradeId] = useState('g1');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!name || !email || !password) {
          setErrorMessage('Lütfen tüm alanları doldurun.');
          setIsLoading(false);
          return;
        }
        const res = await register({ name, email, password, role: selectedRole, gradeId });
        if (res.pendingApproval) {
          setSuccessMessage(res.message || '⏳ Öğretmen kaydınız alındı! Yönetici onayı sonrası giriş yapabilirsiniz.');
          setIsRegister(false);
          setPassword('');
        } else if (res.success) {
          if (selectedRole === 'student') navigate('/student');
          else if (selectedRole === 'teacher') navigate('/teacher');
          else navigate('/admin');
        } else {
          setErrorMessage(res.error || 'Kayıt başarısız oldu.');
        }
      } else {
        if (!email || !password) {
          setErrorMessage('Lütfen e-posta ve şifrenizi girin.');
          setIsLoading(false);
          return;
        }
        const res = await login(email, password);
        if (res.success) {
          if (res.user?.role === 'student') navigate('/student');
          else if (res.user?.role === 'teacher') navigate('/teacher');
          else navigate('/admin');
        } else {
          setErrorMessage(res.error || 'Giriş bilgileri hatalı. Lütfen kontrol ediniz.');
        }
      }
    } catch (err) {
      setErrorMessage('Bir hata oluştu. Lütfen tekrar deneyiniz.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      minHeight: '100dvh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.25rem',
      boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 50%, #0f172a 100%)',
      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      color: '#f8fafc',
      position: 'relative',
      overflowX: 'hidden'
    }}>

      {/* Decorative Glow Orbs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '10%',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: 320,
        height: 320,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
        filter: 'blur(40px)'
      }} />

      {/* Main Glass Card */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '1.75rem',
        padding: '2rem 1.75rem',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.15)',
        boxSizing: 'border-box',
        position: 'relative',
        zIndex: 10
      }}>

        {/* Logo & Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '1.15rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 0.85rem auto',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
            border: '1.5px solid rgba(255, 255, 255, 0.3)'
          }}>
            <Sparkles size={28} color="#ffffff" />
          </div>
          <h1 style={{
            fontSize: '1.55rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: 0,
            letterSpacing: '-0.02em'
          }}>
            E-Test Platform Portal
          </h1>
          <p style={{
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'rgba(203, 213, 225, 0.8)',
            margin: '0.35rem 0 0 0'
          }}>
            {isRegister ? 'Yeni Hesap Oluşturun' : 'Giriş Yap ve Eğitime Başla'}
          </p>
        </div>

        {/* Logged in notification */}
        {currentUser && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            borderRadius: '1rem',
            background: 'rgba(99, 102, 241, 0.18)',
            border: '1px solid rgba(129, 140, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#6366f1',
                color: '#fff',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                flexShrink: 0
              }}>
                {currentUser.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' }}>
                  {currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Admin'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => navigate(currentUser.role === 'student' ? '/student' : currentUser.role === 'teacher' ? '/teacher' : '/admin')}
                style={{
                  background: '#6366f1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.65rem',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Panele Git ➔
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login', { replace: true });
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '0.65rem',
                  padding: '0.4rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Çıkış
              </button>
            </div>
          </div>
        )}

        {/* Tabs (Giriş Yap / Kayıt Ol) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          background: 'rgba(15, 23, 42, 0.65)',
          padding: '0.3rem',
          borderRadius: '1rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '1.35rem'
        }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMessage(''); setSuccessMessage(''); }}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: !isRegister ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: !isRegister ? '#ffffff' : '#94a3b8',
              boxShadow: !isRegister ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMessage(''); setSuccessMessage(''); setSelectedRole('student'); }}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '0.75rem',
              fontSize: '0.85rem',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
              background: isRegister ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'transparent',
              color: isRegister ? '#ffffff' : '#94a3b8',
              boxShadow: isRegister ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Role Picker (for Registration) */}
        {isRegister && (
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Kayıt Türü Seçin
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { id: 'student', label: 'Öğrenci', icon: GraduationCap, desc: 'Sınav çöz, takip et' },
                { id: 'teacher', label: 'Öğretmen', icon: Users, desc: 'Yönetici onayı gerektirir' }
              ].map(r => {
                const active = selectedRole === r.id;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    style={{
                      padding: '0.75rem 0.65rem',
                      borderRadius: '1rem',
                      border: active ? '1.5px solid #818cf8' : '1.5px solid rgba(255, 255, 255, 0.1)',
                      background: active ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                      color: active ? '#ffffff' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: active ? '0 4px 14px rgba(99, 102, 241, 0.25)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Icon size={22} color={active ? '#a5b4fc' : '#64748b'} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 900 }}>{r.label}</span>
                    <span style={{ fontSize: '0.62rem', opacity: 0.75, textAlign: 'center' }}>{r.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div style={{
            marginBottom: '1.15rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.85rem',
            background: 'rgba(16, 185, 129, 0.18)',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            color: '#6ee7b7',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <CheckCircle2 size={16} color="#34d399" style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            marginBottom: '1.15rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.85rem',
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(248, 113, 113, 0.35)',
            color: '#fca5a5',
            fontSize: '0.8rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

          {/* Name Field (Register) */}
          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                Ad Soyad
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.8rem 1rem 0.8rem 2.75rem',
                    borderRadius: '1rem',
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              E-Posta Adresi
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.8rem 1rem 0.8rem 2.75rem',
                  borderRadius: '1rem',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Şifre
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, pointerEvents: 'none' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '0.8rem 2.75rem 0.8rem 2.75rem',
                  borderRadius: '1rem',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Grade Selector (Student Register only) */}
          {isRegister && selectedRole === 'student' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                Sınıf Seçiniz
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <GraduationCap size={18} color="#94a3b8" style={{ position: 'absolute', left: 14, pointerEvents: 'none', zIndex: 2 }} />
                <select
                  value={gradeId}
                  onChange={e => setGradeId(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '0.8rem 1rem 0.8rem 2.75rem',
                    borderRadius: '1rem',
                    background: 'rgba(15, 23, 42, 0.9)',
                    border: '1.5px solid rgba(255, 255, 255, 0.12)',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  required
                >
                  <option value="" style={{ background: '#0f172a', color: '#fff' }}>Sınıf Seçiniz</option>
                  {(curData?.grades || []).map(g => (
                    <option key={g.id} value={g.id} style={{ background: '#0f172a', color: '#fff' }}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.9rem',
              borderRadius: '1.1rem',
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
              color: '#ffffff',
              fontSize: '0.92rem',
              fontWeight: 900,
              border: 'none',
              cursor: isLoading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s ease',
              marginTop: '0.5rem',
              opacity: isLoading ? 0.75 : 1
            }}
          >
            <span>
              {isLoading ? 'İşleniyor...' : (isRegister ? (selectedRole === 'teacher' ? 'Öğretmen Kaydı Gönder' : 'Kayıt Ol') : 'Giriş Yap')}
            </span>
            {!isLoading && <ArrowRight size={18} />}
          </button>

          {/* Quick Demo Login for Guests / Incognito */}
          {!isRegister && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#a5b4fc',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.65rem'
              }}>
                <Sparkles size={13} color="#818cf8" />
                <span>Tek Tıkla Hızlı Giriş (Misafir / Test)</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await fastDemoLogin('student');
                      navigate('/student');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{
                    padding: '0.55rem 0.4rem',
                    borderRadius: '0.85rem',
                    background: 'rgba(99, 102, 241, 0.18)',
                    border: '1px solid rgba(129, 140, 248, 0.3)',
                    color: '#e0e7ff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.18)'}
                >
                  <span style={{ fontSize: '1rem' }}>🎓</span>
                  <span>Öğrenci</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await fastDemoLogin('teacher');
                      navigate('/teacher');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{
                    padding: '0.55rem 0.4rem',
                    borderRadius: '0.85rem',
                    background: 'rgba(168, 85, 247, 0.18)',
                    border: '1px solid rgba(192, 132, 252, 0.3)',
                    color: '#f3e8ff',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.35)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(168, 85, 247, 0.18)'}
                >
                  <span style={{ fontSize: '1rem' }}>👩‍🏫</span>
                  <span>Öğretmen</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    try {
                      await fastDemoLogin('admin');
                      navigate('/admin');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  style={{
                    padding: '0.55rem 0.4rem',
                    borderRadius: '0.85rem',
                    background: 'rgba(236, 72, 153, 0.18)',
                    border: '1px solid rgba(244, 114, 182, 0.3)',
                    color: '#fce7f3',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.35)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.18)'}
                >
                  <span style={{ fontSize: '1rem' }}>⚙️</span>
                  <span>Admin</span>
                </button>
              </div>
            </div>
          )}
        </form>

      </div>
    </div>
  );
}

