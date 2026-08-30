import { registerPlugin, Capacitor } from '@capacitor/core';

const WidgetBridge = registerPlugin('WidgetBridge');

/**
 * Synchronizes student study program tasks & tracked books progress to the Android Home Screen Widget.
 */
export async function syncWidgetData({
  studentName = 'Öğrenci',
  todayTasks = [],
  booksProgress = [],
  todayTotalCount = 0,
  todayRemainingCount = 0
}) {
  try {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const formattedTasks = (todayTasks || []).slice(0, 3).map(task => ({
      id: String(task.id || task.testId || ''),
      title: String(task.title || task.testName || task.name || 'Test'),
      subject: String(task.subject || task.subjectName || ''),
      page: task.page ? `Sayfa ${task.page}` : (task.pages ? `Sayfa ${task.pages}` : ''),
      isDone: Boolean(task.isDone || task.done || task.isCompleted),
      url: `/quiz-tracked/${task.testId || task.id || ''}`
    }));

    const formattedBooks = (booksProgress || []).slice(0, 2).map(book => ({
      id: String(book.id || ''),
      title: String(book.title || 'Kitap'),
      solvedTests: Number(book.solvedTests || book.completedCount || 0),
      totalTests: Number(book.totalTests || book.totalCount || 0),
      percent: Number(book.percent || book.progressPercent || 0),
      url: `/student-book-details/${book.id || ''}`
    }));

    const payload = {
      studentName: String(studentName || 'Öğrenci'),
      todayTotalCount: Number(todayTotalCount || todayTasks.length || 0),
      todayRemainingCount: Number(todayRemainingCount >= 0 ? todayRemainingCount : todayTasks.filter(t => !t.isDone && !t.done).length),
      todayTasks: formattedTasks,
      booksProgress: formattedBooks
    };

    await WidgetBridge.updateWidgetData(payload);
  } catch (err) {
    console.debug('[WidgetSyncService] Sync failed:', err);
  }
}