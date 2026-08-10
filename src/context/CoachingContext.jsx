import { createContext, useContext, useState, useEffect } from 'react';
import {
  dbGetCoachingData,
  dbSaveCoachingNote,
  dbToggleCoachedStudent,
  dbGetMockExams,
  dbSaveMockExam,
  dbDeleteMockExam,
  dbGetCoachingMeetings,
  dbSaveCoachingMeeting,
  dbGetCoachingProfiles,
  dbSaveCoachingProfile
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

  const [coachingProfiles, setCoachingProfiles] = useState(() => {
    const saved = localStorage.getItem('eTestCoachingProfiles');
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

      const dbProfiles = await dbGetCoachingProfiles();
      if (dbProfiles && dbProfiles.length > 0) {
        setCoachingProfiles(prev => {
          const merged = [...prev];
          dbProfiles.forEach(dbP => {
            const idx = merged.findIndex(p => String(p.studentId) === String(dbP.studentId));
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                ...dbP,
                weeklyProgram: (dbP.weeklyProgram && dbP.weeklyProgram.length > 0) ? dbP.weeklyProgram : (merged[idx].weeklyProgram || []),
                topicPool: (dbP.topicPool && dbP.topicPool.length > 0) ? dbP.topicPool : (merged[idx].topicPool || []),
                goals: dbP.goals || merged[idx].goals || {},
                monthlyGoals: (dbP.monthlyGoals && dbP.monthlyGoals.length > 0) ? dbP.monthlyGoals : (merged[idx].monthlyGoals || []),
                weeklyGoals: (dbP.weeklyGoals && dbP.weeklyGoals.length > 0) ? dbP.weeklyGoals : (merged[idx].weeklyGoals || []),
                dailyGoals: (dbP.dailyGoals && dbP.dailyGoals.length > 0) ? dbP.dailyGoals : (merged[idx].dailyGoals || []),
                topicList: (dbP.topicList && dbP.topicList.length > 0) ? dbP.topicList : (merged[idx].topicList || []),
                dailyLogs: (dbP.dailyLogs && dbP.dailyLogs.length > 0) ? dbP.dailyLogs : (merged[idx].dailyLogs || []),
                questionTrack: dbP.questionTrack || merged[idx].questionTrack || {},
                errors: (dbP.errors && dbP.errors.length > 0) ? dbP.errors : (merged[idx].errors || []),
                habits: (dbP.habits && dbP.habits.length > 0) ? dbP.habits : (merged[idx].habits || []),
                motivation: dbP.motivation || merged[idx].motivation || {},
              };
            } else {
              merged.push(dbP);
            }
          });
          return merged;
        });
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

  useEffect(() => {
    localStorage.setItem('eTestMockExams', JSON.stringify(mockExams));
  }, [mockExams]);

  useEffect(() => {
    localStorage.setItem('eTestCoachingMeetings', JSON.stringify(coachingMeetings));
  }, [coachingMeetings]);

  useEffect(() => {
    localStorage.setItem('eTestCoachingProfiles', JSON.stringify(coachingProfiles));
  }, [coachingProfiles]);

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

  const saveCoachingProfile = async (profileData) => {
    const profileId = profileData.id || `cp_${profileData.studentId}`;
    const newProfile = {
      id: profileId,
      createdAt: new Date().toISOString(),
      ...profileData
    };
    setCoachingProfiles(prev => {
      const idx = prev.findIndex(p => String(p.studentId) === String(profileData.studentId));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...newProfile };
        return copy;
      }
      return [newProfile, ...prev];
    });
    await dbSaveCoachingProfile(newProfile);
    return newProfile;
  };

  const addMockExam = async (examData) => {
    const newExam = {
      id: `me_${Date.now()}`,
      createdAt: new Date().toISOString(),
      approvalStatus: examData.createdBy === 'student' ? 'pending' : 'approved',
      ...examData
    };
    setMockExams(prev => [newExam, ...prev]);
    await dbSaveMockExam(newExam);
    return newExam;
  };

  const updateMockExam = async (id, updateData) => {
    let updatedExam = null;
    setMockExams(prev => prev.map(m => {
      if (m.id === id) {
        updatedExam = { ...m, ...updateData };
        return updatedExam;
      }
      return m;
    }));
    if (updatedExam) {
      await dbSaveMockExam(updatedExam);
    }
  };

  const approveMockExam = async (id) => {
    await updateMockExam(id, { approvalStatus: 'approved' });
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
    return coachingNotes.find(n => String(n.studentId) === String(studentId)) || null;
  };

  const getCoachingProfileForStudent = (studentId) => {
    return coachingProfiles.find(p => String(p.studentId) === String(studentId)) || null;
  };

  const getMockExamsForStudent = (studentId) => {
    return mockExams.filter(m => String(m.studentId) === String(studentId));
  };

  const getMeetingsForStudent = (studentId) => {
    return coachingMeetings.filter(m => String(m.studentId) === String(studentId));
  };

  const isStudentCoached = (studentId) => {
    if (!studentId) return false;
    return coachingLinks.some(l => String(l.studentId) === String(studentId));
  };

  const addStudentError = async (studentId, errorData) => {
    const profile = getCoachingProfileForStudent(studentId) || { studentId, errors: [] };
    const newError = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'active',
      ...errorData
    };
    const updatedErrors = [newError, ...(profile.errors || [])];
    const updatedProfile = { ...profile, errors: updatedErrors };
    await saveCoachingProfile(updatedProfile);
    return newError;
  };

  const updateStudentError = async (studentId, errorId, updates) => {
    const profile = getCoachingProfileForStudent(studentId);
    if (!profile) return;
    const updatedErrors = (profile.errors || []).map(e => e.id === errorId ? { ...e, ...updates } : e);
    const updatedProfile = { ...profile, errors: updatedErrors };
    await saveCoachingProfile(updatedProfile);
  };

  const deleteStudentError = async (studentId, errorId) => {
    const profile = getCoachingProfileForStudent(studentId);
    if (!profile) return;
    const updatedErrors = (profile.errors || []).filter(e => e.id !== errorId);
    const updatedProfile = { ...profile, errors: updatedErrors };
    await saveCoachingProfile(updatedProfile);
  };

  return (
    <CoachingContext.Provider value={{
      coachingLinks,
      coachingNotes,
      mockExams,
      coachingMeetings,
      coachingProfiles,
      toggleCoachedStudent,
      saveCoachingNote,
      saveCoachingProfile,
      addMockExam,
      updateMockExam,
      deleteMockExam,
      addCoachingMeeting,
      getCoachedStudentIds,
      isStudentCoached,
      getCoachingNoteForStudent,
      getCoachingProfileForStudent,
      getMockExamsForStudent,
      getMeetingsForStudent,
      addStudentError,
      updateStudentError,
      deleteStudentError
    }}>
      {children}
    </CoachingContext.Provider>
  );
}