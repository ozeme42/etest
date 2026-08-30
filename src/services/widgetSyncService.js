import { registerPlugin, Capacitor } from '@capacitor/core';

const WidgetBridge = registerPlugin('WidgetBridge');

/**
 * Synchronizes:
 * 1. 📚 Books Widget (BooksWidgetProvider) with student-page stats (D, Y, B, Net, Success %, Progress %)
 * 2. 📅 Interactive Study Program Widget (ProgramWidgetProvider) with 7-day switcher & direct "Çöz"
 * 3. 🔥 Remedial / CatchUp Pool Widget (CatchUpWidgetProvider)
 */
export async function syncWidgetData({
  studentName = 'Öğrenci',
  days = [],
  todayTasks = [],
  booksProgress = [],
  catchUpTasks = [],
  todayTotalCount = 0,
  todayRemainingCount = 0
}) {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // 1. Format Program Days (7 days with direct quiz URLs)
    const formattedDays = (days || []).map(d => ({
      dayKey: String(d.dayKey || ''),
      dayName: String(d.dayName || ''),
      dateLabel: String(d.dateLabel || d.short || ''),
      isToday: Boolean(d.isToday),
      totalCount: Number(d.totalCount || (d.items ? d.items.length : 0)),
      remainingCount: Number(d.items ? d.items.filter(i => !i.done && !i.isCompleted).length : 0),
      items: (d.items || []).slice(0, 4).map(task => ({
        id: String(task.id || task.testId || ''),
        title: String(task.title || task.testName || task.name || 'Test'),
        subject: String(task.subject || task.subjectName || ''),
        page: task.page ? `Sayfa ${task.page}` : (task.pages ? `Sayfa ${task.pages}` : ''),
        isDone: Boolean(task.isDone || task.done || task.isCompleted),
        url: `/quiz-tracked/${task.testId || task.id || ''}`
      }))
    }));

    const programData = {
      studentName: String(studentName || 'Öğrenci'),
      todayTotalCount: Number(todayTotalCount || todayTasks.length || 0),
      todayRemainingCount: Number(todayRemainingCount >= 0 ? todayRemainingCount : todayTasks.filter(t => !t.isDone && !t.done).length),
      days: formattedDays,
      todayTasks: (todayTasks || []).slice(0, 4).map(t => ({
        id: String(t.id || t.testId || ''),
        title: String(t.title || t.testName || t.name || 'Test'),
        subject: String(t.subject || t.subjectName || ''),
        page: t.page ? `Sayfa ${t.page}` : '',
        isDone: Boolean(t.isDone || t.done || t.isCompleted),
        url: `/quiz-tracked/${t.testId || t.id || ''}`
      }))
    };

    // 2. Format Detailed Books (with exact student-page D, Y, B, Net, Success Rate and Progress)
    const formattedBooks = (booksProgress || []).map(b => ({
      id: String(b.id || ''),
      title: String(b.title || 'Kitap'),
      publisher: String(b.publisher || 'Özel / MEB Yayınları'),
      solvedTests: Number(b.solvedTests || 0),
      totalTests: Number(b.totalTests || 1),
      percent: Number(b.percent || 0),
      totalCorrect: Number(b.totalCorrect || 0),
      totalWrong: Number(b.totalWrong || 0),
      totalBlank: Number(b.totalBlank || 0),
      net: Number(b.net || 0),
      successRate: Number(b.successRate || 0),
      subjectsBreakdown: String(b.subjectsBreakdown || ''),
      url: `/student-book-details/${b.id || ''}`
    }));

    const booksData = {
      studentName: String(studentName || 'Öğrenci'),
      totalBooks: Number(formattedBooks.length || 0),
      books: formattedBooks
    };

    // 3. Format CatchUp Tasks
    const formattedCatchUp = (catchUpTasks || []).slice(0, 4).map(task => ({
      id: String(task.id || task.testId || ''),
      title: String(task.title || task.testName || task.name || 'Telafi Testi'),
      sourceDay: String(task.sourceDayName || task.sourceDay || task.dayName || 'Gecikmiş'),
      bookTitle: String(task.bookTitle || task.subject || ''),
      url: `/quiz-tracked/${task.testId || task.id || ''}`
    }));

    const catchUpData = {
      studentName: String(studentName || 'Öğrenci'),
      totalCatchUp: Number(catchUpTasks.length || 0),
      catchUpTasks: formattedCatchUp
    };

    const fullPayload = {
      booksData,
      programData,
      catchUpData,
      studentName: String(studentName || 'Öğrenci'),
      todayTotalCount: programData.todayTotalCount,
      todayRemainingCount: programData.todayRemainingCount,
      todayTasks: programData.todayTasks,
      booksProgress: formattedBooks
    };

    await WidgetBridge.updateWidgetData(fullPayload);
  } catch (err) {
    console.debug('[WidgetSyncService] Sync failed:', err);
  }
}