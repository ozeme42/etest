import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetCoachingData,
  dbSaveCoachingNote,
  dbToggleCoachedStudent,
  dbGetMockExams,
  dbSaveMockExam,
  dbDeleteMockExam,
  dbGetCoachingMeetings,
  dbSaveCoachingMeeting
} from '../services/supabaseService';

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

  const [mockExams, setMockExams] = useState(() => {
    const saved = localStorage.getItem('eTestMockExams');
    return saved ? JSON.parse(saved) : [];
  });

  const [coachingMeetings, setCoachingMeetings] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingMeetings');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    async function syncCoachingFromSupabase() {
      const res = await dbGetCoachingData();
      if (res) {
        if (res.links && res.links.length > 0) setCoachingLinks(res.links);
        if (res.notes && res.notes.length > 0) setCoachingNotes(res.notes);
      }
      const dbExams = await dbGetMockExams();
      if (dbExams && dbExams.length > 0) setMockExams(dbExams);

      const dbMeetings = await dbGetCoachingMeetings();
      if (dbMeetings && dbMeetings.length > 0) setCoachingMeetings(dbMeetings);
    }
    syncCoachingFromSupabase();
  }, []);

  useEffect(() => {
    localStorage.setItem('eTestCoachingLinks', JSON.stringify(coachingLinks));
  }, [coachingLinks]);

  useEffect(() => {
    localStorage.setItem('eTestCoachingNotes', JSON.stringify(coachingNotes));
  }, [coachingNotes]);

  useEffect(() => {
    localStorage.setItem('eTestMockExams', JSON.stringify(mockExams));
  }, [mockExams]);

  useEffect(() => {
    localStorage.setItem('eTestCoachingMeetings', JSON.stringify(coachingMeetings));
  }, [coachingMeetings]);

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

  const addMockExam = async (examData) => {
    const newExam = {
      id: `me_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...examData
    };
    setMockExams(prev => [...prev, newExam]);
    await dbSaveMockExam(newExam);
    return newExam;
  };

  const deleteMockExam = async (id) => {
    setMockExams(prev => prev.filter(m => m.id !== id));
    await dbDeleteMockExam(id);
  };

  const addCoachingMeeting = async (meetingData) => {
    const newMeeting = {
      id: `cm_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...meetingData
    };
    setCoachingMeetings(prev => [newMeeting, ...prev]);
    await dbSaveCoachingMeeting(newMeeting);
    return newMeeting;
  };

  const getCoachedStudentIds = (teacherId) => {
    return coachingLinks.filter(l => l.teacherId === teacherId).map(l => l.studentId);
  };

  const getCoachingNoteForStudent = (studentId) => {
    return coachingNotes.find(n => n.studentId === studentId) || null;
  };

  const getMockExamsForStudent = (studentId) => {
    return mockExams.filter(m => String(m.studentId) === String(studentId));
  };

  const getMeetingsForStudent = (studentId) => {
    return coachingMeetings.filter(m => String(m.studentId) === String(studentId));
  };

  return (
    <CoachingContext.Provider value={{
      coachingLinks,
      coachingNotes,
      mockExams,
      coachingMeetings,
      toggleCoachedStudent,
      saveCoachingNote,
      addMockExam,
      deleteMockExam,
      addCoachingMeeting,
      getCoachedStudentIds,
      getCoachingNoteForStudent,
      getMockExamsForStudent,
      getMeetingsForStudent
    }}>
      {children}
    </CoachingContext.Provider>
  );
}
