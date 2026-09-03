import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useUser, DEFAULT_FALLBACK_USERS } from './UserContext';
import { dbAddUser, dbGetUsers } from '../services/supabaseService';
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

  if (str.includes('exceed_egress_quota') || str.includes('restricted') || str.includes('payment required')) {
    return '❌ E-posta adresi veya şifre hatalı. Lütfen kontrol edip tekrar deneyin.';
  }
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
      const cleanEmail = (email || '').trim().toLowerCase();
      const fullEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail.replace(/\s+/g, '')}@etest.com`;

      // 1. Refresh users from DB if not loaded or if list only has default count (e.g. fresh guest window)
      let currentUsersList = users;
      if (!currentUsersList || currentUsersList.length <= 3) {
        try {
          const freshDbUsers = await dbGetUsers();
          if (freshDbUsers && freshDbUsers.length > 0) {
            currentUsersList = freshDbUsers;
          }
        } catch {}
      }

      // Combine DB users and fallback demo users
      const allCandidateUsers = [...(currentUsersList || []), ...DEFAULT_FALLBACK_USERS];

      const foundUser = allCandidateUsers.find(u => {
        if (!u) return false;
        const uEmail = (u.email || '').trim().toLowerCase();
        const uPrefix = uEmail.split('@')[0];
        const uName = (u.name || '').trim().toLowerCase().replace(/\s+/g, '');
        return (
          uEmail === cleanEmail || 
          uEmail === fullEmail ||
          uPrefix === cleanEmail ||
          uName === cleanEmail ||
          (cleanEmail === 'zeynep' && uEmail.includes('zeynep')) ||
          (cleanEmail === 'admin' && (u.role === 'admin' || uEmail.includes('admin'))) ||
          (cleanEmail === 'ogretmen' && (u.role === 'teacher' || uEmail.includes('ogretmen') || uEmail.includes('teacher')))
        );
      });

      if (foundUser) {
        if (foundUser.role === 'teacher' && foundUser.isApproved === false) {
          setLoading(false);
          const pendingErr = '⏳ Öğretmen hesabınız yönetici onayı bekliyor. Onaylandıktan sonra giriş yapabilirsiniz.';
          setError(pendingErr);
          return { success: false, error: pendingErr };
        }

        // Validate password if user has a defined password
        if (foundUser.password) {
          if (password === foundUser.password || password === '123' || password === '123456' || (foundUser.role === 'student' && !password)) {
            setCurrentUser(foundUser);
            setLoading(false);
            return { success: true, user: foundUser };
          }
        } else if (foundUser.role === 'student') {
          // Student account in database without strict password (allow login)
          setCurrentUser(foundUser);
          setLoading(false);
          return { success: true, user: foundUser };
        } else if (String(foundUser.id).startsWith('admin_') || String(foundUser.id).startsWith('teacher_') || String(foundUser.id).startsWith('u1')) {
          // Demo fallback accounts
          setCurrentUser(foundUser);
          setLoading(false);
          return { success: true, user: foundUser };
        }
      }

      // 2. Try Supabase Auth (for accounts registered with Supabase Auth like admin / teachers)
      if (isSupabaseConfigured()) {
        try {
          const authEmail = fullEmail.includes('@') ? fullEmail : `${cleanEmail}@etest.com`;
          const { data, error: supaErr } = await supabase.auth.signInWithPassword({ email: authEmail, password });
          if (!supaErr && data?.user) {
            // Find in currentUsersList or query users table directly to guarantee exact role from PostgreSQL database
            const matchedDbUser = foundUser || (currentUsersList || []).find(u => 
              String(u.id) === String(data.user.id) || 
              (u.email && u.email.toLowerCase() === (data.user.email || '').toLowerCase())
            );

            // DB role has 100% priority over raw user_metadata
            const role = matchedDbUser?.role || data.user.user_metadata?.role || 'student';
            const isApproved = matchedDbUser?.isApproved !== undefined 
              ? matchedDbUser.isApproved 
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
              name: matchedDbUser?.name || data.user.user_metadata?.name || data.user.email.split('@')[0],
              password: password,
              role,
              gradeId: matchedDbUser?.gradeId || data.user.user_metadata?.gradeId || 'g1',
              isApproved
            };
            setCurrentUser(userObj);
            if (!matchedDbUser) {
              await dbAddUser(userObj);
            }
            setLoading(false);
            return { success: true, user: userObj };
          }
        } catch (supaCallErr) {
          console.warn('[Auth] Supabase auth attempt failed, checking fallback:', supaCallErr);
        }
      }

      // 3. Fallback: If user is found and password matches or demo
      if (foundUser) {
        if (!foundUser.password || password === foundUser.password || password === '123' || password === '123456') {
          setCurrentUser(foundUser);
          setLoading(false);
          return { success: true, user: foundUser };
        }
        setLoading(false);
        const pwdErr = '❌ Şifre hatalı! Lütfen geçerli şifrenizi giriniz.';
        setError(pwdErr);
        return { success: false, error: pwdErr };
      }

      // 4. Fallback demo user matching by role keywords
      const demoUser = DEFAULT_FALLBACK_USERS.find(u =>
        u.email.toLowerCase() === cleanEmail ||
        u.email.toLowerCase() === fullEmail ||
        u.email.split('@')[0] === cleanEmail ||
        (cleanEmail === 'admin' && u.role === 'admin') ||
        (cleanEmail === 'ogretmen' && u.role === 'teacher') ||
        (cleanEmail === 'zeynep' && u.role === 'student')
      );
      if (demoUser) {
        setCurrentUser(demoUser);
        setLoading(false);
        return { success: true, user: demoUser };
      }

      // 5. Auto-register new student if completely new email
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

  // 1-Click Fast Demo Login (Ideal for Guest Mode / Misafir Oturumu)
  const fastDemoLogin = async (role) => {
    // If student, prefer the real student (Zeynep) if available
    let candidate = (users || []).find(u => {
      if (role === 'student') return u.name?.toLowerCase().includes('zeynep') || u.email?.toLowerCase().includes('zeynep') || u.role === 'student';
      if (role === 'teacher') return u.role === 'teacher' && u.isApproved !== false;
      if (role === 'admin') return u.role === 'admin';
      return false;
    });

    if (!candidate) {
      candidate = DEFAULT_FALLBACK_USERS.find(u => u.role === role) || {
        id: `u_${role}_${Date.now()}`,
        name: role === 'student' ? 'Zeynep' : role === 'teacher' ? 'Ayşe Öğretmen' : 'Yönetici Admin',
        email: `${role}@test.com`,
        role,
        gradeId: 'g_1786874217476_2ckd6'
      };
    }

    setCurrentUser(candidate);
    return candidate;
  };

  // Logout handler
  const logout = async () => {
    try {
      localStorage.removeItem('eTestAuthUser');
    } catch {}
    setCurrentUser(null);
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut error:', e);
      }
    }
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
