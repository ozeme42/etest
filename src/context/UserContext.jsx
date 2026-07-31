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
        setUsers(dbUsersList);
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
      if (exists) return prev.map(u => u.email === newUser.email ? { ...u, ...newUser } : u);
      return [...prev, newUser];
    });
    const res = await dbAddUser(newUser);
    if (res?.error) {
      console.error('[UserContext] dbAddUser error:', res.error);
    }
    return newUser;
  };

  const updateUser = (id, updatedData) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updatedData } : u)));
  };

  const deleteUser = async (id) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    await dbDeleteUser(id);
  };

  return (
    <UserContext.Provider value={{
      users,
      addUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </UserContext.Provider>
  );
}
