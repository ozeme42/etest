import { registerPlugin, Capacitor } from '@capacitor/core';

const WidgetBridge = registerPlugin('WidgetBridge');

/**
 * Synchronizes:
 * 1. 📚 Books Widget (BooksWidgetProvider)
 * 2. 📅 Today's Study Program Widget (ProgramWidgetProvider)
 * 3. 🔥 Remedial / CatchUp Pool Widget (CatchUpWidgetProvider)
 */
export async function syncWidgetData({
  studentName = 'Öğrenci',
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

    // 1. Format Program Tasks (Up to 4)
    const formattedProgramTasks = (todayTasks || []).slice(0, 4).map(task => ({
      id: String(task.id || task.testId || ''),
      title: String(task.title || task.testName || task.name || 'Test'),
      subject: String(task.subject || task.subjectName || ''),
      page: task.page ? `Sayfa ${task.page}` : (task.pages ? `Sayfa ${task.pages}` : ''),
      isDone: Boolean(task.isDone || task.done || task.isCompleted),
      url: `/quiz-tracked/${task.testId || task.id || ''}`
    }));

    const programData = {
      studentName: String(studentName || 'Öğrenci'),
      todayTotalCount: Number(todayTotalCount || todayTasks.length || 0),
      todayRemainingCount: Number(todayRemainingCount >= 0 ? todayRemainingCount : todayTasks.filter(t => !t.isDone && !t.done).length),
      todayTasks: formattedProgramTasks
    };

    // 2. Format Books Progress (Up to 4)
    const formattedBooks = (booksProgress || []).slice(0, 4).map(book => ({
      id: String(book.id || ''),
      title: String(book.title || 'Kitap'),
      solvedTests: Number(book.solvedTests || book.completedCount || 0),
      totalTests: Number(book.totalTests || book.totalCount || 0),
      percent: Number(book.percent || book.progressPercent || 0),
      url: `/student-book-details/${book.id || ''}`
    }));

    const booksData = {
      studentName: String(studentName || 'Öğrenci'),
      totalBooks: Number(booksProgress.length || 0),
      books: formattedBooks
    };

    // 3. Format CatchUp Tasks (Up to 4)
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
      todayTasks: formattedProgramTasks,
      booksProgress: formattedBooks
    };

    await WidgetBridge.updateWidgetData(fullPayload);
  } catch (err) {
    console.debug('[WidgetSyncService] Sync failed:', err);
  }
}