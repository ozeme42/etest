import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUser } from './UserContext';
import { dbAddUser } from '../services/supabaseService';
import { safeSetItem } from '../utils/storageUtils';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return { currentUser: null, loading: false, error: null, login: async () => {}, logout: async () => {}, register: async () => {}, fastDemoLogin: async () => {} };
  }
  return context;
}

export function translateAuthError(msg) {
  if (!msg) return 'Bir hata oluştu. Lütfen tekrar deneyin.';
  const str = String(msg).toLowerCase();

  if (str.includes('user already registered') || str.includes('already exists') || str.includes('already registered')) {
    return '⚠️ Bu e-posta adresiyle zaten kayıtlı bir hesap var! Lütfen "Giriş Yap" sekmesinden giriş yapın.';
  }
  if (str.includes('password should be at least')) {
    return '🔒 Şifreniz çok kısa! Şifreniz en az 6 karakterden oluşmalıdır.';
  }
  if (str.includes('invalid login credentials') || str.includes('invalid credentials')) {
    return '❌ E-posta adresi veya şifre hatalı. Lütfen kontrol edip tekrar deneyin.';
  }
  if (str.includes('email format') || str.includes('unable to validate email')) {
    return '📧 Geçersiz e-posta adresi formatı. Lütfen doğru bir e-posta girin.';
  }
  if (str.includes('rate limit')) {
    return '⏳ Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.';
  }
  return `⚠️ ${msg}`;
}

export function AuthProvider({ children }) {
  const { users, addUser } = useUser();

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('eTestAuthUser');
    if (saved) return JSON.parse(saved);
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      safeSetItem('eTestAuthUser', JSON.stringify(currentUser));
    } else {
      try { localStorage.removeItem('eTestAuthUser'); } catch {}
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.id && users && users.length > 0) {
      const match = users.find(u => String(u.id) === String(currentUser.id) || (u.email && u.email.toLowerCase() === (currentUser.email || '').toLowerCase()));
      if (match && (match.gradeId !== currentUser.gradeId || match.name !== currentUser.name || match.teacherId !== currentUser.teacherId || match.role !== currentUser.role)) {
        setCurrentUser(prev => ({ ...prev, ...match }));
      }
    }
  }, [users, currentUser?.id]);

  // Login handler
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const fullEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail.replace(/\s+/g, '')}@etest.com`;

      // 1. Search in local / DB users list first
      const foundUser = users.find(u => 
        u.email.toLowerCase() === cleanEmail || 
        u.email.toLowerCase() === fullEmail ||
        (u.email.split('@')[0] && u.email.split('@')[0].toLowerCase() === cleanEmail)
      );

      if (foundUser) {
        if (foundUser.role === 'teacher' && foundUser.isApproved === false) {
          setLoading(false);
          const pendingErr = '⏳ Öğretmen hesabınız yönetici onayı bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.';
          setError(pendingErr);
          return { success: false, error: pendingErr };
        }

        // Validate password if user has a defined password (e.g. set or updated by Admin or Teacher)
        if (foundUser.password) {
          if (password !== foundUser.password) {
            setLoading(false);
            const pwdErr = '❌ Şifre hatalı! Lütfen geçerli şifrenizi giriniz.';
            setError(pwdErr);
            return { success: false, error: pwdErr };
          }
          setCurrentUser(foundUser);
          setLoading(false);
          return { success: true, user: foundUser };
        }
      }

      // 2. If user is in Supabase Auth (e.g. teacher/admin who signed up directly with Supabase Auth)
      if (isSupabaseConfigured()) {
        const { data, error: supaErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!supaErr && data?.user) {
          const role = data.user.user_metadata?.role || foundUser?.role || 'student';
          const isApproved = foundUser?.isApproved !== undefined 
            ? foundUser.isApproved 
            : (data.user.user_metadata?.isApproved !== undefined ? data.user.user_metadata.isApproved : (role === 'teacher' ? false : true));

          if (role === 'teacher' && !isApproved) {
            await supabase.auth.signOut();
            setLoading(false);
            const pendingErr = '⏳ Öğretmen hesabınız yönetici onayı bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.';
            setError(pendingErr);
            return { success: false, error: pendingErr };
          }

          const userObj = {
            id: data.user.id,
            email: data.user.email,
            name: foundUser?.name || data.user.user_metadata?.name || data.user.email.split('@')[0],
            password: password,
            role,
            gradeId: foundUser?.gradeId || data.user.user_metadata?.gradeId || 'g1',
            isApproved
          };
          setCurrentUser(userObj);
          if (!foundUser) {
            await dbAddUser(userObj);
          }
          setLoading(false);
          return { success: true, user: userObj };
        } else if (supaErr && !foundUser) {
          const friendlyErr = translateAuthError(supaErr.message);
          setLoading(false);
          setError(friendlyErr);
          return { success: false, error: friendlyErr };
        }
      }

      // 3. Fallback: If user found in local DB without explicit password mismatch
      if (foundUser) {
        setCurrentUser(foundUser);
        setLoading(false);
        return { success: true, user: foundUser };
      }

      // 4. Auto-register new student if completely new email
      const newUser = {
        id: `u_${Date.now()}`,
        name: email.split('@')[0],
        email: fullEmail,
        password: password || '123456',
        role: 'student',
        gradeId: 'g1',
        isApproved: true
      };
      await addUser(newUser);
      setCurrentUser(newUser);
      setLoading(false);
      return { success: true, user: newUser };
    } catch (err) {
      const friendlyErr = translateAuthError(err.message);
      setError(friendlyErr);
      setLoading(false);
      return { success: false, error: friendlyErr };
    }
  };

  // Register handler - Direct insertion into Supabase public.users table & auth
  const register = async ({ name, email, password, role = 'student', gradeId = 'g1' }) => {
    setLoading(true);
    setError(null);
    try {
      let supaUserId = `u_${Date.now()}`;
      const isApproved = role === 'teacher' ? false : true;
      
      if (isSupabaseConfigured()) {
        const { data, error: supaErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, role, gradeId, isApproved }
          }
        });

        if (supaErr) {
          const friendlyErr = translateAuthError(supaErr.message);
          console.error('[Supabase Auth] SignUp Error:', supaErr.message);
          setLoading(false);
          setError(friendlyErr);
          return { success: false, error: friendlyErr };
        }

        if (data?.user) {
          supaUserId = data.user.id;
        }
      }

      const newUser = {
        id: supaUserId,
        name,
        email,
        role,
        gradeId,
        isApproved
      };
      
      // Save directly to Supabase DB users table
      await dbAddUser(newUser);
      await addUser(newUser);

      if (role === 'teacher') {
        // Teachers must wait for admin approval
        await logout();
        setLoading(false);
        return {
          success: true,
          pendingApproval: true,
          message: '⏳ Öğretmen kaydınız başarıyla alındı! Yönetici hesabınızı onayladıktan sonra giriş yapabileceksiniz.'
        };
      }

      setCurrentUser(newUser);
      setLoading(false);
      return { success: true, user: newUser };
    } catch (err) {
      const friendlyErr = translateAuthError(err.message);
      setError(friendlyErr);
      setLoading(false);
      return { success: false, error: friendlyErr };
    }
  };

  // 1-Click Fast Demo Login
  const fastDemoLogin = async (role) => {
    const demoUser = users.find(u => u.role === role) || {
      id: `u_${role}_${Date.now()}`,
      name: role === 'student' ? 'Ahmet Yılmaz' : role === 'teacher' ? 'Mehmet Hoca' : 'Sistem Admin',
      email: `${role}@example.com`,
      role,
      gradeId: 'g1'
    };
    setCurrentUser(demoUser);
    await dbAddUser(demoUser);
    return demoUser;
  };

  // Logout handler
  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      error,
      login,
      register,
      logout,
      fastDemoLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
}
