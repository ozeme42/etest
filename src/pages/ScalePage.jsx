import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import ScaleModule from '../components/ScaleModule';

export default function ScalePage() {
  const { currentUser } = useAuth();
  const { users } = useUser();

  const students = users.filter(u => u.role === 'student');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #f8faff 0%, #f0f4ff 50%, #faf5ff 100%)',
      padding: '1.5rem',
    }}>
      <ScaleModule students={students} teacherId={currentUser?.id || 'teacher_default'} />
    </div>
  );
}
