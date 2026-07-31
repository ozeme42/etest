import { createContext, useContext, useState, useEffect } from 'react';
import { dbGetCoachingData, dbSaveCoachingNote, dbToggleCoachedStudent } from '../services/supabaseService';

const CoachingContext = createContext();

export function useCoaching() {
  return useContext(CoachingContext);
}

export function CoachingProvider({ children }) {
  const [coachingLinks, setCoachingLinks] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingLinks');
    return saved ? JSON.parse(saved) : [];
  });

  const [coachingNotes, setCoachingNotes] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingNotes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function syncCoachingFromSupabase() {
      const res = await dbGetCoachingData();
      if (res) {
        if (res.links && res.links.length > 0) setCoachingLinks(res.links);
        if (res.notes && res.notes.length > 0) setCoachingNotes(res.notes);
      }
    }
    syncCoachingFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestCoachingLinks', JSON.stringify(coachingLinks));
  }, [coachingLinks]);

  useEffect(() => {
    localStorage.setItem('eTestCoachingNotes', JSON.stringify(coachingNotes));
  }, [coachingNotes]);

  const toggleCoachedStudent = async (teacherId, studentId) => {
    const exists = coachingLinks.some(l => l.teacherId === teacherId && l.studentId === studentId);
    let nextLinks = [];
    if (exists) {
      nextLinks = coachingLinks.filter(l => !(l.teacherId === teacherId && l.studentId === studentId));
    } else {
      nextLinks = [...coachingLinks, { id: `cl_${teacherId}_${studentId}`, teacherId, studentId, createdAt: new Date().toISOString() }];
    }
    setCoachingLinks(nextLinks);
    await dbToggleCoachedStudent(teacherId, studentId, !exists);
  };

  const saveCoachingNote = async (noteData) => {
    const noteId = noteData.id || `cn_${noteData.teacherId}_${noteData.studentId}`;
    const newNote = {
      id: noteId,
      createdAt: new Date().toISOString(),
      ...noteData
    };
    setCoachingNotes(prev => {
      const idx = prev.findIndex(n => n.studentId === noteData.studentId && n.teacherId === noteData.teacherId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newNote };
        return copy;
      }
      return [newNote, ...prev];
    });
    await dbSaveCoachingNote(newNote);
    return newNote;
  };

  const getCoachedStudentIds = (teacherId) => {
    return coachingLinks.filter(l => l.teacherId === teacherId).map(l => l.studentId);
  };

  const getCoachingNoteForStudent = (studentId) => {
    return coachingNotes.find(n => n.studentId === studentId) || null;
  };

  return (
    <CoachingContext.Provider value={{
      coachingLinks,
      coachingNotes,
      toggleCoachedStudent,
      saveCoachingNote,
      getCoachedStudentIds,
      getCoachingNoteForStudent
    }}>
      {children}
    </CoachingContext.Provider>
  );
}
