import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap, Users, Settings, Mail, Lock, User,
  Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurriculum } from '../context/CurriculumContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register, fastDemoLogin, currentUser, logout } = useAuth();
  const { data: curData } = useCurriculum();

  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gradeId, setGradeId] = useState('g1');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (isRegister) {
      if (!name || !email || !password) {
        setErrorMessage('Lütfen tüm alanları doldurun.');
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
        return;
      }
      const res = await login(email, password);
      if (res.success) {
        if (res.user.role === 'student') navigate('/student');
        else if (res.user.role === 'teacher') navigate('/teacher');
        else navigate('/admin');
      } else {
        setErrorMessage(res.error || 'Giriş bilgileri hatalı.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100">
      
      {/* GLOWING AURAS */}
      <div className="absolute top-1/4 left-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10">
        
        {/* LOGO HEADER */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30 mb-3">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">E-Test Platform Portal</h1>
          <p className="text-indigo-200/70 text-xs sm:text-sm font-semibold mt-1">Giriş Yap ve Kayıt Ol</p>
        </div>

        {/* LOGGED IN ACTIVE USER NOTICE */}
        {currentUser && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-black text-white">
                {currentUser.name?.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black text-white">{currentUser.name}</p>
                <p className="text-[10px] text-indigo-200 uppercase font-bold">{currentUser.role === 'student' ? 'Öğrenci' : currentUser.role === 'teacher' ? 'Öğretmen' : 'Admin'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(currentUser.role === 'student' ? '/student' : currentUser.role === 'teacher' ? '/teacher' : '/admin')}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500"
              >
                Panele Git ➔
              </button>
              <button 
                onClick={async () => { 
                  await logout(); 
                  navigate('/', { replace: true }); 
                }} 
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 font-bold text-xs hover:bg-rose-500 hover:text-white"
              >
                Çıkış
              </button>
            </div>
          </div>
        )}

        {/* TABS SWITCHER (GİRİŞ YAP / KAYIT OL) */}
        <div className="grid grid-cols-2 p-1.5 bg-black/30 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setErrorMessage(''); setSuccessMessage(''); }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${!isRegister ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setErrorMessage(''); setSuccessMessage(''); setSelectedRole('student'); }}
            className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${isRegister ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* ROLE SELECTION CARDS - ONLY FOR REGISTER MODE (ADMIN REMOVED FROM REGISTER) */}
        {isRegister && (
          <div className="mb-6">
            <label className="block text-[11px] font-black text-indigo-200 uppercase tracking-wider mb-2">Kayıt Türü Seçin</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'student', label: 'Öğrenci Kaydı', icon: GraduationCap, desc: 'Sınav çöz, takip et' },
                { id: 'teacher', label: 'Öğretmen Kaydı', icon: Users, desc: 'Yönetici onayı gerektirir' }
              ].map(r => {
                const active = selectedRole === r.id;
                const Icon = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRole(r.id)}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col items-center text-center gap-1.5 ${
                      active
                        ? 'bg-white/20 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400/30'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${active ? 'text-indigo-300' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-xs font-black">{r.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{r.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUCCESS MESSAGE ALERT */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ERROR MESSAGE ALERT */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-400/30 text-rose-200 text-xs font-bold text-center">
            {errorMessage}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {isRegister && (
            <div>
              <label className="block text-[11px] font-black text-indigo-200 uppercase tracking-wider mb-1">Ad Soyad</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-bold outline-none focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black text-indigo-200 uppercase tracking-wider mb-1">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-bold outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-indigo-200 uppercase tracking-wider mb-1">Şifre</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-sm font-bold outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {isRegister && selectedRole === 'student' && (
            <div>
              <label className="block text-[11px] font-black text-indigo-200 uppercase tracking-wider mb-1">Sınıf Seçiniz</label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 z-10 pointer-events-none" />
                <select
                  value={gradeId}
                  onChange={e => setGradeId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-800 border border-white/15 text-white text-sm font-bold outline-none focus:border-indigo-400 appearance-none cursor-pointer"
                  required
                >
                  <option value="">Sınıf Seçiniz</option>
                  {(curData?.grades || []).map(g => (
                    <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white font-black text-sm shadow-xl shadow-indigo-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>{isRegister ? (selectedRole === 'teacher' ? 'Öğretmen Kaydı Gönder' : 'Kayıt Ol') : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
