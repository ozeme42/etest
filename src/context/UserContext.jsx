import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetUsers, dbAddUser, dbUpdateUser, dbDeleteUser } from '../services/supabaseService';
import { safeSetItem } from '../utils/storageUtils';

const UserContext = createContext();

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    return { users: [], addUser: async () => {}, updateUser: async () => {}, deleteUser: async () => {}, addStudentForTeacher: async () => {} };
  }
  return context;
}

export function UserProvider({ children }) {
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('eTestUsers');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function syncUsersFromSupabase() {
      const dbUsersList = await dbGetUsers();
      if (dbUsersList && dbUsersList.length > 0) {
        setUsers(prev => {
          const merged = dbUsersList.map(dbU => {
            const localU = prev.find(l => 
              String(l.id) === String(dbU.id) || 
              (l.email && dbU.email && l.email.toLowerCase() === dbU.email.toLowerCase())
            );
            return {
              ...localU,
              ...dbU,
              // Permanently preserve class/grade and teacher info if dbU has default/null values
              gradeId: (dbU.gradeId && dbU.gradeId !== 'g1') ? dbU.gradeId : (localU?.gradeId || dbU.gradeId || 'g1'),
              classId: dbU.classId || localU?.classId || null,
              className: dbU.className || localU?.className || null,
              grade: dbU.grade || localU?.grade || null,
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

          safeSetItem('eTestUsers', JSON.stringify(merged));
          return merged;
        });
      }
    }
    syncUsersFromSupabase();
  }, []);

  useEffect(() => {
    if (users && users.length > 0) {
      safeSetItem('eTestUsers', JSON.stringify(users));
    }
  }, [users]);

  const addUser = async (userData) => {
    const newUser = {
      id: userData.id || `u_${Date.now()}`,
      gradeId: userData.gradeId || userData.grade || userData.classId || 'g1',
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
    setUsers(prev => {
      const newList = prev.map(u => {
        if (String(u.id) === String(id)) {
          updatedUserObj = { ...u, ...updatedData };
          return updatedUserObj;
        }
        return u;
      });
      safeSetItem('eTestUsers', JSON.stringify(newList));
      return newList;
    });

    if (updatedUserObj) {
      await dbUpdateUser(id, updatedData);
      await dbAddUser(updatedUserObj);
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

  return (
    <UserContext.Provider value={{
      users,
      addUser,
      updateUser,
      deleteUser,
      addStudentForTeacher
    }}>
      {children}
    </UserContext.Provider>
  );
}
