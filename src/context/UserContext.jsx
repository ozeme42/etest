import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetUsers, dbAddUser, dbDeleteUser } from '../services/supabaseService';

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
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
            const localU = prev.find(l => l.id === dbU.id || (l.email && dbU.email && l.email.toLowerCase() === dbU.email.toLowerCase()));
            return {
              ...localU,
              ...dbU,
              teacherId: dbU.teacherId !== undefined && dbU.teacherId !== null ? dbU.teacherId : (localU?.teacherId || null),
              password: dbU.password || localU?.password || null,
              gradeId: dbU.gradeId || localU?.gradeId || 'g1'
            };
          });

          // Preserve any locally created users not present in Supabase
          prev.forEach(localU => {
            if (!merged.some(m => m.id === localU.id || (m.email && localU.email && m.email.toLowerCase() === localU.email.toLowerCase()))) {
              merged.push(localU);
            }
          });

          localStorage.setItem('eTestUsers', JSON.stringify(merged));
          return merged;
        });
      }
    }
    syncUsersFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestUsers', JSON.stringify(users));
  }, [users]);

  const addUser = async (userData) => {
    const newUser = {
      id: userData.id || `u_${Date.now()}`,
      ...userData
    };
    setUsers(prev => {
      const exists = prev.some(u => u.email === newUser.email);
      const newList = exists ? prev.map(u => u.email === newUser.email ? { ...u, ...newUser } : u) : [...prev, newUser];
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
        if (u.id === id) {
          updatedUserObj = { ...u, ...updatedData };
          return updatedUserObj;
        }
        return u;
      });
      localStorage.setItem('eTestUsers', JSON.stringify(newList));
      return newList;
    });

    if (updatedUserObj) {
      await dbAddUser(updatedUserObj);
    }
  };

  const deleteUser = async (id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
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
      gradeId: studentData.gradeId || 'g1',
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
