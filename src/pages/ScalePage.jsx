import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import ScaleModule from '../components/ScaleModule';

export default function ScalePage() {
  const { currentUser } = useAuth();
  const { users } = useUser();

  const students = (users || []).filter(u => u.role === 'student');

  return (
    <ScaleModule students={students} teacherId={currentUser?.id || 'teacher_default'} />
  );
}
