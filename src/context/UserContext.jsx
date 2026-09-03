import { isSupabaseConfigured } from '../lib/supabase';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { dbGetUsers, dbAddUser, dbUpdateUser, dbDeleteUser } from '../services/supabaseService';
import { safeSetItem } from '../utils/storageUtils';
import { isCacheValid, touchCache } from '../utils/cacheManager';

const UserContext = createContext();

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    return { users: [], addUser: async () => {}, updateUser: async () => {}, deleteUser: async () => {}, addStudentForTeacher: async () => {} };
  }
  return context;
}

export const DEFAULT_FALLBACK_USERS = [
  { id: 'admin_1', email: 'admin@test.com', name: 'Yönetici Admin', role: 'admin', password: 'admin', isApproved: true },
  { id: 'teacher_1', email: 'ogretmen@test.com', name: 'Ayşe Öğretmen', role: 'teacher', password: '123', isApproved: true },
  { id: 'u1', email: 'zeynep@test.com', name: 'Zeynep', role: 'student', gradeId: 'g1', teacherId: 'teacher_1', password: '123', isApproved: true }
];

// Prevents leaking user passwords in LocalStorage to unauthorized roles (especially students)
function sanitizeUsersForStorage(userList) {
  if (!Array.isArray(userList)) return [];
  let authUser = null;
  try {
    const raw = localStorage.getItem('eTestAuthUser');
    if (raw) authUser = JSON.parse(raw);
  } catch {}

  const currentRole = authUser?.role || 'student';
  const currentId = String(authUser?.id || '');

  return userList.map(u => {
    if (!u) return u;
    // Admins and Teachers can see student helper passwords for password distribution/assistance
    if (currentRole === 'admin' || currentRole === 'teacher') {
      // Never leak another admin's password
      if (u.role === 'admin' && String(u.id) !== currentId) {
        const { password, ...safe } = u;
        return safe;
      }
      return u;
    }
    // Students & unauthenticated users: never store or see any other user's password!
    if (String(u.id) === currentId) {
      return u;
    }
    const { password, ...safe } = u;
    return safe;
  });
}

export function UserProvider({ children }) {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('eTestUsers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeUsersForStorage(parsed);
        }
      } catch {}
    }
    return DEFAULT_FALLBACK_USERS;
  });

  useEffect(() => {
    async function syncUsersFromSupabase() {
      if (!isSupabaseConfigured()) return;
      if (isCacheValid('users', 30) && users.length > 0) {
        return;
      }
      const dbUsersList = await dbGetUsers();
      if (dbUsersList && dbUsersList.length > 0) {
        touchCache('users');
        setUsers(prev => {
          const merged = dbUsersList.map(dbU => {
            const localU = prev.find(l => 
              String(l.id) === String(dbU.id) || 
              (l.email && dbU.email && l.email.toLowerCase() === dbU.email.toLowerCase())
            );
            const actualGradeId = dbU.gradeId || dbU.grade_id || localU?.gradeId || localU?.grade_id || 'g1';
            return {
              ...localU,
              ...dbU,
              id: dbU.id || localU?.id,
              gradeId: actualGradeId,
              grade_id: actualGradeId,
              classId: actualGradeId,
              grade: dbU.grade || localU?.grade || null,
              className: dbU.className || localU?.className || null,
              teacherId: (dbU.teacherId !== undefined && dbU.teacherId !== null) ? dbU.teacherId : (localU?.teacherId || null),
              password: dbU.password || localU?.password || null,
            };
          });

          // Preserve any locally created users not present in Supabase
          prev.forEach(localU => {
            if (!merged.some(m => String(m.id) === String(localU.id) || (m.email && localU.email && m.email.toLowerCase() === localU.email.toLowerCase()))) {
              merged.push(localU);
            }
          });

          safeSetItem('eTestUsers', JSON.stringify(sanitizeUsersForStorage(merged)));
          return merged;
        });
      }
    }
    syncUsersFromSupabase();
  }, []);

  useEffect(() => {
    if (users && users.length > 0) {
      safeSetItem('eTestUsers', JSON.stringify(sanitizeUsersForStorage(users)));
    }
  }, [users]);

  const addUser = async (userData) => {
    const gId = userData.gradeId || userData.grade_id || userData.grade || userData.classId || 'g1';
    const newUser = {
      id: userData.id || `u_${Date.now()}`,
      gradeId: gId,
      grade_id: gId,
      classId: gId,
      ...userData
    };
    setUsers(prev => {
      const exists = prev.some(u => String(u.id) === String(newUser.id) || (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase()));
      const newList = exists 
        ? prev.map(u => (String(u.id) === String(newUser.id) || (u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase())) ? { ...u, ...newUser } : u) 
        : [...prev, newUser];
      localStorage.setItem('eTestUsers', JSON.stringify(newList));
      return newList;
    });
    const res = await dbAddUser(newUser);
    if (res?.error) {
      console.error('[UserContext] dbAddUser error:', res.error);
    }
    return newUser;
  };

  const updateUser = async (id, updatedData) => {
    let updatedUserObj = null;
    const targetEmail = (updatedData.email || '').trim().toLowerCase();

    setUsers(prev => {
      const newList = prev.map(u => {
        const isMatch = String(u.id) === String(id) || 
          (targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail);
        
        if (isMatch) {
          const newGradeId = updatedData.gradeId || updatedData.grade_id || updatedData.classId || u.gradeId || u.grade_id;
          updatedUserObj = { 
            ...u, 
            ...updatedData,
            gradeId: newGradeId,
            grade_id: newGradeId,
            classId: newGradeId,
            grade: updatedData.grade !== undefined ? updatedData.grade : (u.grade || null),
            className: updatedData.className !== undefined ? updatedData.className : (updatedData.grade || u.className || null)
          };
          return updatedUserObj;
        }
        return u;
      });
      safeSetItem('eTestUsers', JSON.stringify(newList));
      return newList;
    });

    if (updatedUserObj) {
      await dbUpdateUser(updatedUserObj.id || id, updatedUserObj);
    }
    return updatedUserObj;
  };

  const deleteUser = async (id) => {
    setUsers(prev => {
      const newList = prev.filter(u => String(u.id) !== String(id));
      localStorage.setItem('eTestUsers', JSON.stringify(newList));
      return newList;
    });
    await dbDeleteUser(id);
  };

  const addStudentForTeacher = async (studentData, teacherId) => {
    let inputEmail = (studentData.email || '').trim().toLowerCase();
    if (!inputEmail) {
      inputEmail = `ogrenci_${Date.now()}@etest.com`;
    } else if (!inputEmail.includes('@')) {
      inputEmail = `${inputEmail.replace(/\s+/g, '')}@etest.com`;
    }

    const newStudent = {
      id: studentData.id || `u_std_${Date.now()}`,
      name: studentData.name,
      email: inputEmail,
      password: studentData.password || '123456',
      role: 'student',
      gradeId: studentData.gradeId || studentData.grade || studentData.classId || 'g1',
      teacherId: teacherId,
      isApproved: true,
      createdAt: new Date().toISOString(),
      ...studentData
    };
    return await addUser(newStudent);
  };

  const value = useMemo(() => ({
    users,
    addUser,
    updateUser,
    deleteUser,
    addStudentForTeacher
  }), [users]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
