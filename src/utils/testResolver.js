import { toUUID } from '../services/supabaseService';
import { getTurkeyYMD, extractItemDate } from './dateHelpers';
import { checkIsAnswerCorrect, resolveQuestionCorrectAnswer, formatAnswerLetter, normalizeAnswerIndex } from './answerEvaluation';
import { normalizeUnifiedTest, normalizeUnifiedSubmission } from '../services/unifiedQuizAdapter';

/**
 * Intelligently extracts option choices (A, B, C, D, E) from raw question text if present.
 */
export function parseOptionsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = rawText.trim();
  if (text.length < 4) return null;

  // Match patterns like:
  // A) ... B) ... C) ... D) ...
  // A. ... B. ... C. ... D. ...
  // [A] ... [B] ...
  // (A) ... (B) ...
  // A - ... B - ...
  // A: ... B: ...
  const optRegex = /(?:^|\s|\n)(?:\(|\[)?([A-Ea-e])(?:\)|\.|\:|\]|-)\s*([\s\S]*?)(?=(?:(?:\s|\n)(?:\(|\[)?[A-Ea-e](?:\)|\.|\:|\]|-)\s*)|$)/g;

  const matches = [];
  let m;
  while ((m = optRegex.exec(text)) !== null) {
    const letter = m[1].toUpperCase();
    const content = (m[2] || '').trim();
    matches.push({ letter, content, fullIndex: m.index });
  }

  if (matches.length >= 2) {
    const letters = matches.map(m => m.letter);
    const hasA = letters.includes('A');
    const hasB = letters.includes('B');
    if (hasA && hasB) {
      const optMap = {};
      matches.forEach(match => {
        if (!optMap[match.letter] && match.content) {
          optMap[match.letter] = match.content;
        }
      });

      const maxLetter = letters.includes('E') ? 'E' : (letters.includes('D') ? 'D' : (letters.includes('C') ? 'C' : 'B'));
      const count = maxLetter === 'E' ? 5 : (maxLetter === 'D' ? 4 : (maxLetter === 'C' ? 3 : 2));
      const opts = [];
      let foundAnyText = false;
      for (let i = 0; i < count; i++) {
        const L = String.fromCharCode(65 + i);
        const val = optMap[L] || '';
        if (val) foundAnyText = true;
        opts.push(val);
      }
      if (foundAnyText) {
        return opts;
      }
    }
  }
  return null;
}

/**
 * Strips option block (A) ... B) ...) from question stem if options were extracted from text.
 */
export function stripOptionsFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return rawText;
  const match = rawText.match(/(?:^|\s|\n)(?:\(|\[)?A(?:\)|\.|\:|\]|-)\s*[\s\S]*$/i);
  if (match && match.index > 0) {
    const stem = rawText.slice(0, match.index).trim();
    if (stem.length > 2) {
      return stem;
    }
  }
  return rawText;
}

/**
 * Helper to extract question text robustly from any question object format.
 */
export function extractQuestionText(qObj, testObj = {}, index = 0) {
  if (!qObj) qObj = {};
  if (!testObj) testObj = {};

  const isGenericSectionTitle = (str) => {
    if (!str || typeof str !== 'string') return true;
    const t = str.trim().toLowerCase();
    return (
      /^\d+\.\s*bölüm/i.test(t) ||
      /^bölüm\s*\d+/i.test(t) ||
      t === 'çoktan seçmeli bölüm' ||
      t === 'açık uçlu bölüm' ||
      t === 'genel test' ||
      t === 'ödev testi' ||
      t === 'sınav' ||
      t === 'kitap testi' ||
      t === 'kitap ödevi'
    );
  };

  const candidates = [
    qObj.questionText,
    qObj.text,
    qObj.question,
    qObj.soruMetni,
    qObj.soru,
    qObj.questionTitle,
    qObj.stem,
    qObj.body,
    qObj.prompt,
    qObj.content,
    qObj.description,
    qObj.questionTextHtml,
    qObj.htmlText,
    qObj.html,
    (typeof qObj.contentPayload === 'string' && !qObj.contentPayload.startsWith('http') && !qObj.contentPayload.startsWith('data:') && !qObj.contentPayload.startsWith('[') && !qObj.contentPayload.startsWith('{') && qObj.contentPayload !== '[STORED_IN_INDEXEDDB]' && qObj.contentPayload !== '[LOCALSTORAGE_CACHE]' ? qObj.contentPayload : null),
    (qObj.title && !isGenericSectionTitle(qObj.title) ? qObj.title : null),
    (index === 0 ? (testObj.questionText || testObj.text || testObj.soruMetni || testObj.soru || (testObj.title && !isGenericSectionTitle(testObj.title) ? testObj.title : null)) : null)
  ];

  for (const c of candidates) {
    if (c && typeof c === 'string' && c.trim() && !c.startsWith('data:') && !c.startsWith('http')) {
      const trimmed = c.trim();
      if (isGenericSectionTitle(trimmed)) continue;
      const parsedOpts = parseOptionsFromText(trimmed);
      if (parsedOpts && parsedOpts.length >= 2) {
        return stripOptionsFromText(trimmed);
      }
      return trimmed;
    }
  }

  return `Soru ${index + 1}`;
}

/**
 * Helper to extract option texts robustly from any question object format.
 */
export function extractQuestionOptions(qObj, testObj = {}) {
  if (!qObj) qObj = {};
  if (!testObj) testObj = {};

  const isOE = (
    qObj.type === 'acik_uclu' ||
    qObj.type === 'yazili' ||
    qObj.questionType === 'acik_uclu' ||
    qObj.questionType === 'yazili' ||
    qObj.isOpenEnded ||
    testObj.type === 'acik_uclu' ||
    testObj.type === 'yazili' ||
    testObj.questionType === 'acik_uclu' ||
    testObj.questionType === 'yazili' ||
    testObj.contentType === 'acik_uclu' ||
    testObj.contentType === 'yazili' ||
    testObj.isOpenEnded ||
    (testObj.title && (testObj.title.toLowerCase().includes('açık uçlu') || testObj.title.toLowerCase().includes('acik uclu') || testObj.title.toLowerCase().includes('yazılı') || testObj.title.toLowerCase().includes('yazili') || testObj.title.toLowerCase().includes('klasik')))
  );
  if (isOE) {
    return [];
  }

  const rawOptions = qObj.options || qObj.choices || qObj.secenekler || qObj.optionsList || qObj.answers || qObj.items || qObj.opt || testObj.options || testObj.choices || testObj.secenekler;

  let optArray = [];

  if (Array.isArray(rawOptions) && rawOptions.length > 0) {
    optArray = [...rawOptions];
  } else if (rawOptions && typeof rawOptions === 'object') {
    const keys = ['A', 'B', 'C', 'D', 'E'];
    const foundKeys = keys.filter(k => rawOptions[k] !== undefined || rawOptions[k.toLowerCase()] !== undefined);
    if (foundKeys.length > 0) {
      optArray = keys.map(k => rawOptions[k] ?? rawOptions[k.toLowerCase()]);
    } else {
      optArray = Object.values(rawOptions);
    }
  }

  // Check if options are embedded inside question text candidates
  const rawTextCandidates = [
    qObj.questionText,
    qObj.text,
    qObj.question,
    qObj.soruMetni,
    qObj.content,
    qObj.prompt,
    (typeof qObj.contentPayload === 'string' && !qObj.contentPayload.startsWith('http') && !qObj.contentPayload.startsWith('data:') && !qObj.contentPayload.startsWith('[') && !qObj.contentPayload.startsWith('{') ? qObj.contentPayload : null),
    testObj.questionText,
    testObj.text
  ].filter(t => t && typeof t === 'string');

  let parsedFromText = null;
  for (const rawText of rawTextCandidates) {
    parsedFromText = parseOptionsFromText(rawText);
    if (parsedFromText && parsedFromText.length >= 2) break;
  }

  if (parsedFromText && parsedFromText.length > 0) {
    if (optArray.length === 0) {
      optArray = parsedFromText;
    } else {
      // Merge: if optArray has empty or placeholder items, replace with parsedFromText
      optArray = optArray.map((opt, idx) => {
        const textVal = (typeof opt === 'string' ? opt : (opt?.text || opt?.optionText || '')).trim();
        const letter = String.fromCharCode(65 + idx);
        const lower = textVal.toLowerCase();
        const isPlaceholder = !textVal || lower === letter.toLowerCase() || lower === `şık ${letter.toLowerCase()}` || lower === `sik ${letter.toLowerCase()}` || lower === `seçenek ${letter.toLowerCase()}` || lower === `secenek ${letter.toLowerCase()}` || lower === `option ${letter.toLowerCase()}`;
        if (isPlaceholder && parsedFromText[idx]) {
          return parsedFromText[idx];
        }
        return opt;
      });
      if (optArray.length < parsedFromText.length) {
        for (let i = optArray.length; i < parsedFromText.length; i++) {
          optArray.push(parsedFromText[i]);
        }
      }
    }
  }

  if (optArray.length === 0) {
    return [];
  }

  const mapped = optArray.map((opt, optIdx) => {
    const optLabel = String.fromCharCode(65 + optIdx);
    if (typeof opt === 'string') {
      const trimmed = opt.trim();
      return trimmed || null;
    }
    if (opt && typeof opt === 'object') {
      const textCandidate = [
        opt.text,
        opt.optionText,
        opt.content,
        opt.value,
        opt.statement,
        opt.choice,
        opt.val,
        opt.title,
        opt.secenekText,
        opt.name,
        opt.answer,
        opt.label
      ].find(t => t && typeof t === 'string' && t.trim());

      if (textCandidate) return textCandidate.trim();
    }
    return null;
  });

  const realOptions = mapped.filter(Boolean);
  if (realOptions.length > 0) return mapped.map((m, i) => m || String.fromCharCode(65 + i));

  return [];
}

/**
 * Resolves full question objects for a given test from QuestionBank.
 */
export function resolveTestQuestions(foundTest, allBankQuestions = []) {
  if (!foundTest) return [];

  let rawQuestions = [];
  const normalizeId = (id) => String(id || '').replace(/^q_?/, '');

  // 1. If test has questionsList array (e.g. JSON package, optic package, or multi-question package)
  if (foundTest.questionsList && Array.isArray(foundTest.questionsList) && foundTest.questionsList.length > 0) {
    rawQuestions = foundTest.questionsList.map((q, idx) => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: `Soru ${idx + 1}` };
      }
      return {
        ...q,
        questionText: extractQuestionText(q, foundTest, idx),
        options: extractQuestionOptions(q, foundTest)
      };
    });
  }
  // 2. If contentPayload is a JSON string containing an array of questions or { questions: [...] }
  else if (typeof foundTest.contentPayload === 'string' && (foundTest.contentPayload.trim().startsWith('[') || foundTest.contentPayload.trim().startsWith('{'))) {
    try {
      const parsed = JSON.parse(foundTest.contentPayload);
      const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items || null);
      if (list && Array.isArray(list) && list.length > 0) {
        rawQuestions = list.map((q, idx) => ({
          ...q,
          id: q.id || `${foundTest.id || 'q'}_${idx + 1}`,
          questionText: extractQuestionText(q, foundTest, idx),
          options: extractQuestionOptions(q, foundTest)
        }));
      }
    } catch {}
  }

  // 3. If test has questionIds, selectedQuestions, tests, or items
  const candidateIdList = foundTest.questionIds || foundTest.selectedQuestions || foundTest.tests || foundTest.items || null;
  if (rawQuestions.length === 0 && Array.isArray(candidateIdList) && candidateIdList.length > 0) {
    const unbundled = [];
    candidateIdList.forEach((qId, idx) => {
      const rawId = typeof qId === 'object' ? (qId.id || qId.questionId) : qId;
      const bankMatch = allBankQuestions.find(bq =>
        String(bq.id) === String(rawId) ||
        normalizeId(bq.id) === normalizeId(rawId)
      ) || (typeof qId === 'object' ? qId : null);

      if (bankMatch) {
        if (bankMatch.questionsList && Array.isArray(bankMatch.questionsList) && bankMatch.questionsList.length > 0) {
          bankMatch.questionsList.forEach((subQ, subIdx) => {
            unbundled.push({
              ...subQ,
              id: subQ.id || `${bankMatch.id || rawId}_sub_${subIdx + 1}`,
              questionNo: subIdx + 1,
              questionText: extractQuestionText(subQ, bankMatch, subIdx),
              options: extractQuestionOptions(subQ, bankMatch)
            });
          });
        } else if (typeof bankMatch.contentPayload === 'string' && (bankMatch.contentPayload.trim().startsWith('[') || bankMatch.contentPayload.trim().startsWith('{'))) {
          try {
            const parsed = JSON.parse(bankMatch.contentPayload);
            const list = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.questionsList || parsed.items || null);
            if (list && Array.isArray(list) && list.length > 0) {
              list.forEach((subQ, subIdx) => {
                unbundled.push({
                  ...subQ,
                  id: subQ.id || `${bankMatch.id || rawId}_sub_${subIdx + 1}`,
                  questionNo: subIdx + 1,
                  questionText: extractQuestionText(subQ, bankMatch, subIdx),
                  options: extractQuestionOptions(subQ, bankMatch)
                });
              });
            } else {
              unbundled.push({
                ...bankMatch,
                questionText: extractQuestionText(bankMatch, foundTest, idx),
                options: extractQuestionOptions(bankMatch, foundTest)
              });
            }
          } catch {
            unbundled.push({
              ...bankMatch,
              questionText: extractQuestionText(bankMatch, foundTest, idx),
              options: extractQuestionOptions(bankMatch, foundTest)
            });
          }
        } else {
          unbundled.push({
            ...bankMatch,
            questionText: extractQuestionText(bankMatch, foundTest, idx),
            options: extractQuestionOptions(bankMatch, foundTest)
          });
        }
      } else {
        unbundled.push({
          id: rawId,
          questionText: `Soru ${idx + 1}`,
          options: []
        });
      }
    });
    if (unbundled.length > 0) {
      rawQuestions = unbundled;
    }
  }
  // 4. If test has questions array directly
  else if (rawQuestions.length === 0 && foundTest.questions && Array.isArray(foundTest.questions) && foundTest.questions.length > 0) {
    rawQuestions = foundTest.questions.map((q, idx) => {
      if (typeof q === 'string') {
        const bankMatch = allBankQuestions.find(bq => String(bq.id) === String(q) || normalizeId(bq.id) === normalizeId(q));
        return bankMatch || { id: q, questionText: `Soru ${idx + 1}`, options: ['A','B','C','D','E'] };
      }
      return {
        ...q,
        questionText: extractQuestionText(q, foundTest, idx),
        options: extractQuestionOptions(q, foundTest)
      };
    });
  }
  // 5. Fallback: single item
  else if (rawQuestions.length === 0 && (foundTest.contentPayload || foundTest.htmlPayload || foundTest.pdfPayload || foundTest.type || foundTest.contentType || foundTest.imageUrl || foundTest.imageUrls)) {
    rawQuestions = [foundTest];
  }

  // Unbundle multi-image question sets if single container with multiple images
  if (rawQuestions.length === 1) {
    const singleQ = rawQuestions[0];
    let imgs = [];
    if (Array.isArray(singleQ.imageUrls) && singleQ.imageUrls.length > 1) {
      imgs = singleQ.imageUrls.filter(u => typeof u === 'string' && !u.startsWith('[STORED_IN_'));
    } else if (typeof singleQ.contentPayload === 'string' && (singleQ.contentPayload.includes('\n\n') || singleQ.contentPayload.includes('|'))) {
      imgs = singleQ.contentPayload.split(/\n\n|\|/).map(s => s.trim()).filter(s => s.startsWith('data:image/') || s.startsWith('http') || /\.(png|jpe?g|webp|gif)/i.test(s));
    }
    if (imgs.length > 1) {
      rawQuestions = imgs.map((imgUrl, imgIdx) => ({
        ...singleQ,
        id: `${singleQ.id || 'q'}_sub_${imgIdx + 1}`,
        questionNo: imgIdx + 1,
        questionText: `Soru ${imgIdx + 1}`,
        imageUrl: imgUrl,
        imageUrls: [imgUrl],
        options: singleQ.options || ['A', 'B', 'C', 'D', 'E']
      }));
    }
  }

  // Final check: enrich items from allBankQuestions if needed
  const finalQuestions = rawQuestions.map((q, idx) => {
    if (q.id && (!q.contentPayload && !q.htmlPayload && !q.pdfPayload && !q.questionText)) {
      const matched = allBankQuestions.find(bq => String(bq.id) === String(q.id) || normalizeId(bq.id) === normalizeId(q.id));
      if (matched) return { ...matched, ...q };
    }
    return {
      ...q,
      questionText: extractQuestionText(q, foundTest, idx),
      options: extractQuestionOptions(q, foundTest)
    };
  });

  return finalQuestions;
}
export function isHomeworkForStudent(hw, student, grades = []) {
  if (!hw || !student) return false;
  const studentObj = typeof student === 'string' ? { id: student } : student;
  const studentId = String(studentObj.id || studentObj.studentId || studentObj.userId || '');
  const studentUuid = toUUID(studentId);
  const rawTargetIds = hw.targetIds || hw.target_ids || hw.raw_data?.targetIds || hw.raw_data?.target_ids || [];
  const targetIds = Array.isArray(rawTargetIds) ? rawTargetIds.map(String) : [];

  // Check if student is explicitly targeted by id or UUID
  const isDirectlyTargeted = targetIds.some(tid => {
    const tidStr = String(tid);
    return tidStr === studentId ||
      (studentUuid && tidStr === studentUuid) ||
      toUUID(tidStr) === studentId ||
      (studentUuid && toUUID(tidStr) === studentUuid);
  });

  if (isDirectlyTargeted) return true;

  if (hw.targetType === 'student' || hw.targetType === 'individual' || hw.targetType === 'students' || hw.targetType === 'user') {
    return isDirectlyTargeted;
  }

  // 2. Class / Grade target
  if (hw.targetType === 'grade' || hw.targetType === 'class' || !hw.targetType) {
    if (targetIds.length === 0) return true; // General assignment to everyone

    // Gather all possible identifiers for the student
    const studentIdentifiers = new Set([
      studentId,
      studentUuid,
      String(studentObj.gradeId || ''),
      String(studentObj.classId || ''),
      String(studentObj.grade || ''),
      String(studentObj.className || '')
    ]);

    // Also add grade names/IDs from grades list matching student's grade
    if (grades && Array.isArray(grades)) {
      grades.forEach(g => {
        const gId = String(g.id);
        const gName = String(g.name || '');
        if (studentIdentifiers.has(gId) || (gName && studentIdentifiers.has(gName))) {
          studentIdentifiers.add(gId);
          if (gName) studentIdentifiers.add(gName);
        }
      });
    }

    // Remove empty string
    studentIdentifiers.delete('');

    // Check if any targetId matches student's identifiers
    return targetIds.some(tid => {
      const tidStr = String(tid);
      if (studentIdentifiers.has(tidStr)) return true;
      const matchedGrade = grades.find(g => String(g.id) === tidStr || String(g.name) === tidStr);
      if (matchedGrade) {
        if (studentIdentifiers.has(String(matchedGrade.id)) || (matchedGrade.name && studentIdentifiers.has(String(matchedGrade.name)))) {
          return true;
        }
      }
      return false;
    });
  }

  return isDirectlyTargeted;
}

/**
 * Sorts an array of day items according to the official Book Tracking hierarchy:
 * 1. Book sequence (in `books` list / by book title)
 * 2. Subject sequence in book (`subject.topics` structure)
 * 3. Topic sequence in subject
 * 4. Test definition order in `bookTests` & natural numeric test sorting ("Test 1" before "Test 2" before "Test 10")
 * 5. Fallback task priority (Kitap/Ödev -> Konu -> Serbest/Manuel)
 */
export function sortItemsByBookOrder(items, books = [], bookTests = []) {
  if (!Array.isArray(items) || items.length <= 1) return items || [];

  // 1. Map Books and build strict sequential order of all tests as defined in the book's subjects & topics
  const bookMap = new Map();
  const bookTestSequentialIndexMap = new Map();
  let globalSeq = 0;

  (books || []).forEach((b, bIdx) => {
    if (!b?.id) return;
    const bId = String(b.id);
    const bUuid = String(b.id).replace(/-/g, '');
    bookMap.set(bId, { index: bIdx, book: b });
    if (bUuid) bookMap.set(bUuid, { index: bIdx, book: b });

    // Traverse subjects -> tests and subjects -> topics -> tests in exact book order
    (b.subjects || []).forEach((subj, sIdx) => {
      (subj.tests || []).forEach((t, tIdx) => {
        if (t?.id) {
          const tId = String(t.id);
          const tUuid = String(t.id).replace(/-/g, '');
          const info = {
            bookIndex: bIdx,
            subjectIndex: sIdx,
            topicIndex: -1,
            testIndex: tIdx,
            seq: globalSeq++
          };
          bookTestSequentialIndexMap.set(tId, info);
          if (tUuid) bookTestSequentialIndexMap.set(tUuid, info);
        }
      });
      (subj.topics || []).forEach((tp, tpIdx) => {
        (tp.tests || []).forEach((t, tIdx) => {
          if (t?.id) {
            const tId = String(t.id);
            const tUuid = String(t.id).replace(/-/g, '');
            const info = {
              bookIndex: bIdx,
              subjectIndex: sIdx,
              topicIndex: tpIdx,
              testIndex: tIdx,
              seq: globalSeq++
            };
            bookTestSequentialIndexMap.set(tId, info);
            if (tUuid) bookTestSequentialIndexMap.set(tUuid, info);
          }
        });
      });
    });
  });

  const testMap = new Map();
  (bookTests || []).forEach(t => {
    if (t?.id) {
      testMap.set(String(t.id), t);
      const tUuid = String(t.id).replace(/-/g, '');
      if (tUuid) testMap.set(tUuid, t);
    }
  });

  // Helper to extract starting page number from title/name (e.g. "45-46. Sayfa..." -> 45, "s. 13" -> 13)
  const extractPageNo = (str) => {
    if (!str) return null;
    const m = String(str).match(/(?:(\d+)\s*[-–]\s*\d+|\b(\d+))\s*\.?\s*sayfa|sayfa\s*(\d+)|s\.\s*(\d+)/i);
    if (m) {
      const num = parseInt(m[1] || m[2] || m[3] || m[4], 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  // Helper to extract unit number from title/name (e.g. "2. Ünite" -> 2)
  const extractUnitNo = (str) => {
    if (!str) return null;
    const m = String(str).match(/(\d+)\s*\.\s*ünite/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  // Helper to extract test number from title/name (e.g. "TEST - 6" -> 6)
  const extractTestNo = (str) => {
    if (!str) return null;
    const m = String(str).match(/test\s*[-–]?\s*(\d+)/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num)) return num;
    }
    return null;
  };

  return [...items].sort((a, b) => {
    // 1. Task type priority: Book tests & Quizzes first, then Topics/Roadmaps, then Manual/Schedule
    const getTypePriority = (it) => {
      if (it.taskType === 'kitap' || it.testId || it.bookTitle) return 1;
      if (it.taskType === 'ödev' || it.hwId) return 2;
      if (it.taskType === 'konu' || it.isRoadmapTask) return 3;
      return 4;
    };
    const prioA = getTypePriority(a);
    const prioB = getTypePriority(b);
    if (prioA !== prioB) return prioA - prioB;

    // 2. Book Order (Order of books in system)
    const tObjA = a.testId ? testMap.get(String(a.testId)) : null;
    const tObjB = b.testId ? testMap.get(String(b.testId)) : null;

    const bookIdA = a.bookId || tObjA?.bookId || (a.hwId && a.isAutoHomework ? a.bookId : null);
    const bookIdB = b.bookId || tObjB?.bookId || (b.hwId && b.isAutoHomework ? b.bookId : null);

    const bInfoA = bookIdA ? bookMap.get(String(bookIdA)) : null;
    const bInfoB = bookIdB ? bookMap.get(String(bookIdB)) : null;

    const bookIndexA = bInfoA ? bInfoA.index : 9999;
    const bookIndexB = bInfoB ? bInfoB.index : 9999;
    if (bookIndexA !== bookIndexB) return bookIndexA - bookIndexB;

    // 3. Subject Hierarchy Order (Türkçe -> Matematik -> Fen ...)
    const subjNameA = (a.subject || tObjA?.subject || '').trim();
    const subjNameB = (b.subject || tObjB?.subject || '').trim();

    const bookObj = bInfoA?.book || bInfoB?.book;
    if (bookObj && Array.isArray(bookObj.subjects)) {
      const sIdxA = bookObj.subjects.findIndex(s => 
        (tObjA?.subjectId && String(s.id) === String(tObjA.subjectId)) ||
        (subjNameA && s.name?.toLocaleLowerCase('tr-TR') === subjNameA.toLocaleLowerCase('tr-TR'))
      );
      const sIdxB = bookObj.subjects.findIndex(s => 
        (tObjB?.subjectId && String(s.id) === String(tObjB.subjectId)) ||
        (subjNameB && s.name?.toLocaleLowerCase('tr-TR') === subjNameB.toLocaleLowerCase('tr-TR'))
      );
      if (sIdxA !== -1 && sIdxB !== -1 && sIdxA !== sIdxB) {
        return sIdxA - sIdxB;
      }
    }

    // 4. Sequential Book Test Index if both tests exist in the book's internal structure
    const seqA = a.testId && bookTestSequentialIndexMap.has(String(a.testId)) ? bookTestSequentialIndexMap.get(String(a.testId)).seq : 999999;
    const seqB = b.testId && bookTestSequentialIndexMap.has(String(b.testId)) ? bookTestSequentialIndexMap.get(String(b.testId)).seq : 999999;
    if (seqA !== seqB && seqA !== 999999 && seqB !== 999999) {
      return seqA - seqB;
    }

    // 5. Page Number Order (Sayfa Numarası Sırası: 9-10 < 13-14 < 17-18 ...)
    const titleA = a.testName || a.title || a.name || '';
    const titleB = b.testName || b.title || b.name || '';

    const pageA = extractPageNo(titleA);
    const pageB = extractPageNo(titleB);
    if (pageA !== null && pageB !== null && pageA !== pageB) {
      return pageA - pageB;
    }

    // 6. Unit Number Order (Ünite Numarası Sırası)
    const unitA = extractUnitNo(titleA);
    const unitB = extractUnitNo(titleB);
    if (unitA !== null && unitB !== null && unitA !== unitB) {
      return unitA - unitB;
    }

    // 7. Test Number Order (Test Numarası Sırası)
    const testNoA = extractTestNo(titleA);
    const testNoB = extractTestNo(titleB);
    if (testNoA !== null && testNoB !== null && testNoA !== testNoB) {
      return testNoA - testNoB;
    }

    // 8. Natural Alphanumeric Sorting by Test Name / Title
    return titleA.localeCompare(titleB, 'tr', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Computes unified submission stats for multi-section assignments and tests.
 */
export function computeUnifiedSubmissionStats(sub, hw, allQuestions = []) {
  if (!sub) return null;
  const isMultiSec = Boolean(
    hw?.isBulk ||
    hw?.type === 'multi' ||
    sub?.type === 'multi' ||
    (Array.isArray(hw?.sections) && hw.sections.length > 1) ||
    (Array.isArray(hw?.tests) && hw.tests.length > 1) ||
    (Array.isArray(hw?.items) && hw.items.length > 1) ||
    (sub?.sections && typeof sub.sections === 'object' && Object.keys(sub.sections).length > 1)
  );

  if (!isMultiSec) return null;

  try {
    const unifiedTest = normalizeUnifiedTest(hw || sub, allQuestions);
    const rawSections = unifiedTest.sections;
    if (!rawSections || rawSections.length === 0) return null;

    const unifiedSub = normalizeUnifiedSubmission(sub, unifiedTest);
    const sectionAnswersMap = unifiedSub.sections || {};
    const teacherScores = sub.teacherScores || sub.scores || (sub.raw_data && (sub.raw_data.teacherScores || sub.raw_data.scores)) || {};

    let totalQuestions = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let blankCount = 0;
    let pendingCount = 0;

    rawSections.forEach((sec, sIdx) => {
      const sa = sectionAnswersMap[sec.id] ||
                 sectionAnswersMap[sIdx] ||
                 sectionAnswersMap[String(sIdx)] ||
                 (sec.title && sectionAnswersMap[sec.title]) ||
                 (sec.raw?.id && sectionAnswersMap[sec.raw.id]) ||
                 (sec.raw?.questionId && sectionAnswersMap[sec.raw.questionId]) ||
                 { answers: {}, openEndedText: {}, teacherScores: {} };

      const secQs = sec.questions || [];
      const count = sec.qCount || secQs.length || 1;
      const isSecOpenEnded = sec.type === 'open_ended';

      for (let i = 1; i <= count; i++) {
        totalQuestions++;
        const qObj = secQs[i - 1] || {};
        const isQOE = isSecOpenEnded ||
                      qObj.type === 'open_ended' ||
                      qObj.type === 'acik_uclu' ||
                      qObj.type === 'yazili' ||
                      qObj.questionType === 'acik_uclu' ||
                      qObj.questionType === 'yazili' ||
                      Boolean(sa.openEndedText?.[i] && String(sa.openEndedText[i]).trim() !== '') ||
                      Boolean(sa.openEndedText?.[String(i)] && String(sa.openEndedText[String(i)]).trim() !== '');

        const teacherScore = teacherScores[sec.id]?.[i] ??
                             teacherScores[sIdx]?.[i] ??
                             sa.teacherScores?.[i] ??
                             sa.teacherScores?.[String(i)];

        if (isQOE) {
          const textVal = sa.openEndedText?.[i] ?? sa.openEndedText?.[String(i)];
          const hasText = textVal && String(textVal).trim() !== '';

          if (teacherScore !== undefined && teacherScore !== null && teacherScore !== 'empty') {
            const scNum = Number(teacherScore);
            if (scNum >= 5 || scNum > 0) {
              correctCount++;
            } else {
              wrongCount++;
            }
          } else if (teacherScore === 'empty' || !hasText) {
            blankCount++;
          } else {
            correctCount++;
          }
        } else {
          // Multiple choice
          const rawAns = sa.answers?.[i] ?? sa.answers?.[String(i)];
          const u = normalizeAnswerIndex(rawAns);
          if (u === null) {
            blankCount++;
          } else {
            const cAns = (Array.isArray(sec.correctAnswers) && sec.correctAnswers[i - 1] !== undefined)
              ? sec.correctAnswers[i - 1]
              : (Array.isArray(sec.raw?.correctAnswers) && sec.raw.correctAnswers[i - 1] !== undefined)
                ? sec.raw.correctAnswers[i - 1]
                : (sec.answerKey?.[i - 1] ?? sec.raw?.answerKey?.[i - 1] ?? sec.opticAnswers?.[i - 1] ?? sec.raw?.opticAnswers?.[i - 1] ?? qObj.correctAnswer ?? qObj.answer ?? qObj.correctOption);

            let isCorr = null;
            if (cAns !== undefined && cAns !== null && cAns !== '') {
              const normC = normalizeAnswerIndex(cAns);
              if (normC !== null) {
                isCorr = (u === normC);
              }
            }

            if (isCorr === null) {
              isCorr = checkIsAnswerCorrect(u, qObj.raw || qObj, sec.raw || sec, i);
            }

            if (isCorr === true) {
              correctCount++;
            } else if (isCorr === false) {
              wrongCount++;
            } else {
              correctCount++;
            }
          }
        }
      }
    });

    const totalScored = correctCount + wrongCount + blankCount;
    const scorePct = totalScored > 0 ? Math.round((correctCount / totalScored) * 100) : 0;
    const rawNet = Math.max(0, correctCount - (wrongCount * 0.25));
    const netScore = Number.isInteger(rawNet) ? rawNet : Number(rawNet.toFixed(2));

    return {
      total: totalQuestions,
      correct: correctCount,
      wrong: wrongCount,
      blank: blankCount,
      pending: pendingCount,
      scorePct,
      netScore
    };
  } catch (err) {
    console.warn('computeUnifiedSubmissionStats error in testResolver:', err);
    return null;
  }
}

/**
 * Computes synchronized, clean, and normalized analytics data for any student:
 * - Filters out deleted homework submissions (only includes active homeworks and valid book tests)
 * - Excludes in-progress/drafts and empty unsubmitted items
 * - Separates mock exams (generalTrialExams) and regular homeworks (otherHomeworkSubmissions)
 * - Guarantees 100% data consistency between Coaching Page, Student Dashboard, and Results Page!
 */
export function computeStudentAnalyticsData({
  studentId,
  targetStudent = null,
  submissions = [],
  homeworks = [],
  books = [],
  bookTests = [],
  studentMockExams = []
}) {
  if (!studentId && !targetStudent) {
    return { generalTrialExams: [], otherHomeworkSubmissions: [] };
  }

  const studentIdStr = String(studentId || targetStudent?.id || '').trim();
  const studentUuidStr = String(toUUID(studentIdStr) || '').trim();
  const studentNameClean = (targetStudent?.name || targetStudent?.fullName || '').trim().toLowerCase();
  const studentEmailClean = (targetStudent?.email || '').trim().toLowerCase();

  const isStudentMatch = (s) => {
    if (!s) return false;
    const raw = s.raw_data || {};
    const sid = String(s.studentId || s.student_id || s.userId || s.user_id || raw.studentId || raw.student_id || raw.userId || '').trim();

    // Direct ID check
    if (studentIdStr && sid) {
      if (sid === studentIdStr || sid.toLowerCase() === studentIdStr.toLowerCase()) return true;
      if (studentUuidStr && (sid === studentUuidStr || String(toUUID(sid)) === studentUuidStr)) return true;
    }

    // Name check
    const sName = (s.studentName || s.student_name || raw.studentName || raw.student_name || '').trim().toLowerCase();
    if (studentNameClean && sName && (sName === studentNameClean || sName.includes(studentNameClean) || studentNameClean.includes(sName))) return true;

    // Email check
    const sEmail = (s.studentEmail || s.student_email || s.email || raw.studentEmail || raw.student_email || '').trim().toLowerCase();
    if (studentEmailClean && sEmail && sEmail === studentEmailClean) return true;

    return false;
  };

  const normalizeSub = (s, parentHw, defaultType = 'online', subDate = null, testObj = null, bookObj = null) => {
    let title = s.title || s.testTitle || parentHw?.title || 'Sınav / Test';

    let isExamBook = false;
    if (bookObj && bookObj.bookType === 'exam') {
      isExamBook = true;
    }

    if (testObj && bookObj) {
      const cleanBook = (bookObj.title || '').replace(/\s*\(Tüm Kitap Görevi\)/gi, '').replace(/\s*\(Tüm Kitap\)/gi, '').replace(/\s*\(Kendi Eklediğim\)/gi, '').trim();
      const testName = testObj.name || s.testTitle || s.title || 'Test';
      title = cleanBook ? `${cleanBook} — ${testName}` : testName;
    } else {
      title = (s.title || s.testTitle || parentHw?.title || 'Sınav / Test')
        .replace(/\s*\(Tüm Kitap Görevi\)/gi, '')
        .replace(/\s*\(Tüm Kitap\)/gi, '')
        .replace(/\s*\(Kendi Eklediğim\)/gi, '')
        .trim();
    }

    const isTrial = isExamBook || s.isDeneme || s.isExam || parentHw?.isDeneme || /deneme|lgs|yks|tyt|ayt|bursluluk|kurumsal/i.test(title);

    let correct = s.correctCount ?? s.correct ?? s.totalCorrect ?? 0;
    let wrong = s.wrongCount ?? s.wrong ?? s.totalWrong ?? 0;
    let empty = s.emptyCount ?? s.blankCount ?? s.empty ?? s.totalEmpty ?? 0;

    // Extract from answers array if available
    if (Array.isArray(s.answers) && s.answers.length > 0) {
      let aCorr = 0;
      let aWrong = 0;
      let aEmpty = 0;
      s.answers.forEach((ans, aIdx) => {
        const qNo = ans.questionNoInSection || ans.questionNo || (aIdx + 1);
        const userAns = ans.userAnswer;
        const isOE = Boolean(ans.isOpenEnded || ans.is_open_ended || ans.userAnswerText);
        const numScore = ans.score !== undefined && ans.score !== null ? Number(ans.score) : null;

        if (isOE || numScore !== null) {
          if (ans.isCorrect === true || (numScore !== null && numScore >= 5) || ans.earnedPoints > 0) {
            aCorr++;
          } else if (ans.evalStatus === 'empty') {
            aEmpty++;
          } else if (ans.isCorrect === false || ans.evalStatus === 'wrong' || (numScore !== null && numScore === 0)) {
            const isB = (userAns === null || userAns === undefined || userAns === '') && !ans.userAnswerText;
            if (isB) aEmpty++;
            else aWrong++;
          }
          return;
        }

        const hasOption = userAns !== null && userAns !== undefined && userAns !== '' && userAns !== 'empty';
        if (!hasOption) {
          aEmpty++;
          return;
        }

        const resolvedCorrect = resolveQuestionCorrectAnswer(qNo, null, ans, s, []);
        const uLetter = formatAnswerLetter(userAns);
        const cLetter = formatAnswerLetter(resolvedCorrect);

        let isRight = null;
        if (uLetter && cLetter) {
          isRight = (uLetter === cLetter);
        } else if (ans.isCorrect !== undefined && ans.isCorrect !== null) {
          isRight = ans.isCorrect;
        } else {
          isRight = checkIsAnswerCorrect(userAns, ans, s, qNo);
        }

        if (isRight === true) aCorr++;
        else if (isRight === false) aWrong++;
        else aEmpty++;
      });
      if (aCorr > 0 || aWrong > 0 || aEmpty > 0) {
        correct = aCorr;
        wrong = aWrong;
        empty = aEmpty;
      }
    }
    
    const isSingleTestSub = Boolean(
      s.sourceType === 'study_room_optical' ||
      s.sourceType === 'bookTest' ||
      s.bookTestId ||
      testObj ||
      (Array.isArray(s.answers) && s.answers.length > 0 && (!s.sections || Object.keys(s.sections || {}).length <= 1))
    );

    if (!isSingleTestSub) {
      const unifiedStats = computeUnifiedSubmissionStats(s, parentHw || testObj, []);
      if (unifiedStats) {
        correct = unifiedStats.correct;
        wrong = unifiedStats.wrong;
        empty = unifiedStats.blank;
      }
    }

    // Total questions
    const totalQ = isSingleTestSub
      ? (s.totalQuestions || testObj?.questionCount || (Array.isArray(s.answers) ? s.answers.length : 0) || (correct + wrong + empty) || 10)
      : (parentHw?.totalQuestions || parentHw?.questionCount || testObj?.questionCount || s.totalQuestions || (correct + wrong + empty) || 10);

    // Deduce D/Y/B if score was stored as 0-100 percentage or points without D/Y/B
    if (!correct && !wrong && s.score !== undefined && s.score !== null) {
      const numScore = parseFloat(s.score) || 0;
      if (numScore <= totalQ && numScore > 0) {
        correct = Math.round(numScore);
      } else if (numScore > 0) {
        correct = Math.round((numScore / 100) * totalQ);
      }
    }

    // Always ensure empty accounts for all remaining questions if totalQ is known
    if (totalQ > (correct + wrong)) {
      empty = Math.max(empty, totalQ - (correct + wrong));
    }

    // Net calculation
    let net = 0;
    const penaltyRatio = /lgs|bursluluk/i.test(title) ? 3 : 4;
    if (correct > 0 || wrong > 0) {
      net = Math.max(0, correct - (wrong / penaltyRatio));
    } else if (s.net !== undefined && s.net !== null) {
      net = parseFloat(s.net);
    } else if (s.totalNet !== undefined && s.totalNet !== null) {
      net = parseFloat(s.totalNet);
    } else if (s.score !== undefined && parseFloat(s.score) <= totalQ) {
      net = parseFloat(s.score);
    }

    // Clean subject detection
    let subject = '';
    if (testObj && bookObj) {
      const subjObj = (bookObj.subjects || []).find(sb => String(sb.id) === String(testObj.subjectId));
      subject = subjObj?.name || bookObj.subject || '';
    } else {
      subject = s.subject || parentHw?.subject || '';
    }

    const KNOWN_SUBJECTS = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'İngilizce', 'Din Kültürü'];
    if (!KNOWN_SUBJECTS.includes(subject)) {
      const lower = (title + ' ' + (subject || '') + ' ' + (parentHw?.title || '')).toLowerCase();
      if (lower.includes('matematik') || lower.includes('geometri')) subject = 'Matematik';
      else if (lower.includes('türkçe') || lower.includes('paragraf') || lower.includes('edebiyat')) subject = 'Türkçe';
      else if (lower.includes('fen') || lower.includes('fizik') || lower.includes('kimya') || lower.includes('biyoloji')) subject = 'Fen Bilimleri';
      else if (lower.includes('sosyal') || lower.includes('tarih') || lower.includes('coğrafya') || lower.includes('inkılap')) subject = 'Sosyal Bilgiler';
      else if (lower.includes('ingilizce') || lower.includes('english')) subject = 'İngilizce';
      else if (lower.includes('din')) subject = 'Din Kültürü';
      else subject = 'Genel / Diğer';
    }

    const cleanDate = extractItemDate(subDate || s);

    return {
      id: s.id || `sub_${Date.now()}_${Math.random()}`,
      originalSubmissionId: s.id,
      title,
      subject,
      date: cleanDate,
      totalNet: parseFloat(net.toFixed(2)),
      correctCount: correct,
      wrongCount: wrong,
      emptyCount: empty,
      totalQuestions: totalQ,
      sourceType: defaultType,
      approvalStatus: 'approved',
      isTrial,
      isExamBook,
      parentBookId: bookObj?.id || null,
      hwId: s.hwId || parentHw?.id || null
    };
  };

  const processedKeys = new Set();

  // 1. HomeworkContext Optik / Ödev Sınavları
  const hwSubmissions = [];
  (homeworks || []).forEach(hw => {
    if (!hw) return;
    if (hw.bookId && !books.some(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId))) {
      return; // Deleted book or exam!
    }
    if (hw.type === 'physicalExam' && !books.some(b => String(b.id) === String(hw.bookId) || toUUID(b.id) === toUUID(hw.bookId))) {
      return; // Deleted physical exam!
    }
    const hwSubList = Array.isArray(hw.submissions) && hw.submissions.length > 0
      ? hw.submissions
      : (Array.isArray(hw.raw_data?.submissions) ? hw.raw_data.submissions : []);

    const allMatching = [
      ...hwSubList.filter(isStudentMatch),
      ...(submissions || []).filter(s => isStudentMatch(s) && (
        String(s.hwId) === String(hw.id) ||
        String(s.homeworkId) === String(hw.id) ||
        String(s.testId) === String(hw.id) ||
        String(s.id) === String(hw.id) ||
        String(s.id) === `hw_sub_${hw.id}_${studentIdStr}`
      ))
    ].filter(s => s && s.status !== 'in_progress' && s.status !== 'draft');

    if (allMatching.length === 0) return;

    allMatching.forEach(sub => {
      const sDate = extractItemDate(sub.submittedAt || sub.completedAt || sub.date || sub);
      if (!sDate) return;

      const subKey = String(sub.id || sub.submissionId || `${hw.id}_${sub.bookTestId || sub.testId || ''}_${sDate}`);
      if (processedKeys.has(subKey)) return;
      processedKeys.add(subKey);
      if (sub.id) processedKeys.add(String(sub.id));
      if (sub.supabaseId) processedKeys.add(String(sub.supabaseId));

      const bTestId = String(sub.bookTestId || sub.testId || hw.id || '');
      let testObj = (bookTests || []).find(bt => String(bt.id) === bTestId || (toUUID(bt.id) && String(toUUID(bt.id)) === bTestId));
      let bookObj = (books || []).find(b => String(b.id) === String(sub.bookId || hw.bookId || testObj?.bookId) || (toUUID(b.id) && String(toUUID(b.id)) === String(sub.bookId || hw.bookId || testObj?.bookId)));

      hwSubmissions.push(normalizeSub(sub, hw, 'optik', sDate, testObj, bookObj));
    });
  });

  // 2. Online Sınavlar & Kitap Testleri (Standalone submissions)
  const onlineEval = [];

  (submissions || []).forEach(s => {
    if (!s) return;
    if (!isStudentMatch(s)) return;

    const subIdStr = String(s.id || s.supabaseId || '');
    if (subIdStr.startsWith('draft_') || subIdStr.startsWith('64726166')) return;
    if (s.status === 'in_progress' || s.status === 'draft') return;
    const raw = s.raw_data || {};
    if (raw.status === 'draft' || raw.status === 'in_progress') return;

    // Skip only if the EXACT submission was already processed
    if (s.id && processedKeys.has(String(s.id))) return;
    if (s.supabaseId && processedKeys.has(String(s.supabaseId))) return;

    // Only approved manual tests count towards system analytics and statistics
    const isManualTest = s.isManual === true || s.sourceType === 'manual_test' || raw.isManual === true || raw.sourceType === 'manual_test' || String(s.id || '').startsWith('sub_manual') || String(s.testId || '').startsWith('sub_manual');
    if (isManualTest) {
      const isApproved = s.approvalStatus === 'approved' || s.isApproved === true || s.status === 'completed' || raw.approvalStatus === 'approved' || raw.isApproved === true;
      if (!isApproved) return;
    }

    const subDate = extractItemDate(s);
    if (!subDate) return;

    const bTestId = String(s.bookTestId || s.testId || raw.bookTestId || raw.testId || '');
    let testObj = (bookTests || []).find(bt => String(bt.id) === bTestId || (toUUID(bt.id) && String(toUUID(bt.id)) === bTestId));
    let bookObj = (books || []).find(b => String(b.id) === String(s.bookId || raw.bookId || testObj?.bookId) || (toUUID(b.id) && String(toUUID(b.id)) === String(s.bookId || raw.bookId || testObj?.bookId)));

    if (!testObj && books && Array.isArray(books)) {
      for (const b of books) {
        if (b.subjects && Array.isArray(b.subjects)) {
          for (const sb of b.subjects) {
            if (sb.tests && Array.isArray(sb.tests)) {
              const ft = sb.tests.find(t => String(t.id) === bTestId || (toUUID(t.id) && String(toUUID(t.id)) === bTestId));
              if (ft) { testObj = { ...ft, bookId: b.id, subjectId: sb.id }; if (!bookObj) bookObj = b; break; }
            }
            if (sb.topics && Array.isArray(sb.topics)) {
              for (const tp of sb.topics) {
                if (tp.tests && Array.isArray(tp.tests)) {
                  const ft = tp.tests.find(t => String(t.id) === bTestId || (toUUID(t.id) && String(toUUID(t.id)) === bTestId));
                  if (ft) { testObj = { ...ft, bookId: b.id, subjectId: sb.id, topicId: tp.id }; if (!bookObj) bookObj = b; break; }
                }
              }
            }
          }
        }
        if (testObj) break;
      }
    }

    const parentHw = (homeworks || []).find(h => String(h.id) === String(s.testId) || String(h.id) === String(s.hwId) || String(h.id) === String(s.homeworkId) || (toUUID(h.id) && (String(toUUID(h.id)) === String(s.testId) || String(toUUID(h.id)) === String(s.hwId))));

    const isBookTestSub = Boolean(
      s.bookId ||
      s.bookTestId ||
      raw.bookId ||
      raw.bookTestId ||
      s.sourceType === 'trackedBook' ||
      raw.sourceType === 'trackedBook' ||
      s.sourceType === 'bookTest' ||
      raw.sourceType === 'bookTest' ||
      testObj ||
      bookObj
    );

    if (!isManualTest && !isBookTestSub) {
      const isHwSub = Boolean(s.hwId || s.homeworkId || s.testId);
      if (isHwSub && !parentHw && (!s.answers || s.answers.length === 0)) {
        return; // Deleted empty homework
      }
    }

    if (s.id) processedKeys.add(String(s.id));
    if (s.supabaseId) processedKeys.add(String(s.supabaseId));

    onlineEval.push(normalizeSub(s, parentHw, 'online', subDate, testObj, bookObj));
  });

  // 3. Fiziki Deneme Modülü Sınavları
  const manualExams = (studentMockExams || []).map(m => {
    let tD = m.totalCorrect ?? m.correctCount ?? m.correct ?? 0;
    let tY = m.totalWrong ?? m.wrongCount ?? m.wrong ?? 0;
    let tB = m.totalEmpty ?? m.emptyCount ?? m.blankCount ?? m.empty ?? 0;
    if (tD === 0 && tY === 0 && tB === 0 && m.scores && typeof m.scores === 'object') {
      Object.values(m.scores).forEach(sc => {
        tD += Number(sc?.d || sc?.correct || 0);
        tY += Number(sc?.y || sc?.wrong || 0);
        tB += Number(sc?.b || sc?.empty || sc?.blank || 0);
      });
    }
    return {
      id: m.id,
      title: m.title || 'Fiziki Deneme Sınavı',
      date: getTurkeyYMD(m.date || m.createdAt || m.submittedAt),
      totalNet: parseFloat(m.totalNet) || 0,
      sourceType: 'manual',
      approvalStatus: m.approvalStatus || (m.createdBy === 'student' ? 'pending' : 'approved'),
      scores: m.scores || {},
      totalCorrect: tD,
      totalWrong: tY,
      totalEmpty: tB,
      isTrial: true
    };
  });

  const seen = new Set();
  const all = [];
  [...manualExams, ...onlineEval, ...hwSubmissions].forEach(item => {
    if (!item) return;
    
    // Normalize title: strip any book prefix like "Kitap Adı — " or "Kitap Adı - "
    let rawTitle = String(item.title || '').trim().toLowerCase();
    if (rawTitle.includes('—')) {
      rawTitle = rawTitle.split('—').pop().trim();
    } else if (rawTitle.includes(' - ')) {
      rawTitle = rawTitle.split(' - ').pop().trim();
    }
    rawTitle = rawTitle.replace(/\s*\(tüm kitap.*?\)/g, '').replace(/\s*\(kendi eklediğim.*?\)/g, '').trim();

    const cleanSubj = String(item.subject || '').trim().toLowerCase();
    const origId = String(item.originalSubmissionId || item.id || '');
    
    // Multi-criteria uniqueness keys
    const primaryKey = String(item.id || '');
    const logicalKey = `${cleanSubj}___${rawTitle}___${item.correctCount}_${item.wrongCount}`;
    const origKey = origId ? `orig_${origId}` : null;

    if ((primaryKey && seen.has(primaryKey)) || (logicalKey && seen.has(logicalKey)) || (origKey && seen.has(origKey))) {
      return; // Duplicate!
    }

    if (primaryKey) seen.add(primaryKey);
    if (logicalKey) seen.add(logicalKey);
    if (origKey) seen.add(origKey);
    all.push(item);
  });

  const trials = [];
  const homeworksOnly = [];
  const groupedExams = {};

  all.forEach(item => {
    if (item.sourceType === 'manual') {
      trials.push(item);
    } else if (item.isExamBook) {
      const groupKey = `${item.parentBookId}_${item.date}`;
      if (!groupedExams[groupKey]) {
        groupedExams[groupKey] = {
          id: `grp_${groupKey}`,
          title: item.title,
          date: item.date,
          totalNet: 0,
          totalCorrect: 0,
          totalWrong: 0,
          totalEmpty: 0,
          sourceType: item.sourceType,
          approvalStatus: item.approvalStatus,
          isTrial: true,
          scores: {},
          submissions: []
        };
      }

      const group = groupedExams[groupKey];
      const subj = item.subjectName || item.subject || 'Genel';
      group.scores[subj] = {
        d: item.correctCount || 0,
        y: item.wrongCount || 0,
        b: item.emptyCount || 0,
        net: item.totalNet || 0
      };
      if (item.originalSubmissionId) group.submissions.push(item.originalSubmissionId);
    } else {
      if (item.isTrial) {
        if (!item.scores) {
          const sName = item.subject || item.subjectName || 'Genel';
          item.scores = {
            [sName]: {
              d: item.correctCount || 0,
              y: item.wrongCount || 0,
              b: item.emptyCount || 0,
              net: item.totalNet || 0
            }
          };
        }
        item.totalCorrect = item.totalCorrect ?? item.correctCount ?? 0;
        item.totalWrong = item.totalWrong ?? item.wrongCount ?? 0;
        item.totalEmpty = item.totalEmpty ?? item.emptyCount ?? 0;
        trials.push(item);
      } else {
        homeworksOnly.push(item);
      }
    }
  });

  Object.values(groupedExams).forEach(grp => {
    let tNet = 0, tCorrect = 0, tWrong = 0, tEmpty = 0;
    Object.values(grp.scores).forEach(sc => {
      tNet += sc.net || 0;
      tCorrect += sc.d || 0;
      tWrong += sc.y || 0;
      tEmpty += sc.b || 0;
    });
    grp.totalNet = parseFloat(tNet.toFixed(2));
    grp.totalCorrect = tCorrect;
    grp.totalWrong = tWrong;
    grp.totalEmpty = tEmpty;
    trials.push(grp);
  });

  trials.sort((a, b) => new Date(b.date) - new Date(a.date));
  homeworksOnly.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { generalTrialExams: trials, otherHomeworkSubmissions: homeworksOnly };
}


