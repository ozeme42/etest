/**
 * Parent Report & WhatsApp Progress Sharing Service
 * Formats student progress into clean, professional WhatsApp messages and progress summaries.
 */
import { triggerHaptic } from './feedbackService';

/**
 * Generates a beautifully formatted WhatsApp text report for parents.
 */
export function formatParentWhatsAppReport({
  student = {},
  stats = {},
  homeworkMetrics = null,
  teacherNote = '',
  schoolName = 'E-Test Eğitim Kurumları',
  teacherName = 'Rehberlik & Koçluk Servisi',
  reportPeriod = 'Haftalık Gelişim Raporu'
}) {
  const studentName = student.name || 'Öğrenci';
  const gradeLabel = student.grade || student.className || 'Öğrenci';
  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // Subjects summary
  const subjectsList = Array.isArray(stats.subjects) ? stats.subjects : [];
  let subjectLines = subjectsList.map(s => {
    const netStr = s.avgNet !== undefined ? ` • ${s.avgNet} Net` : '';
    return `  📘 *${s.name}*: %${s.avg || s.score || 0} (${s.letter?.grade || 'İyi'}) — ${s.total || 0} Soru (${s.correct || 0}D / ${s.wrong || 0}Y)${netStr}`;
  }).join('\n');

  if (!subjectLines) {
    subjectLines = '  • Henüz ders bazlı yeterli soru çözümü bulunmuyor.';
  }

  // Strong topics
  const strongList = Array.isArray(stats.strongTopics) ? stats.strongTopics.slice(0, 3) : [];
  const strongText = strongList.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n🌟 *EN GÜÇLÜ OLDUĞU KONULAR*\n` + strongList.map(t => `  • ${t.name} (%${t.avg || 0} Başarı)`).join('\n')
    : '';

  // Weak / Needs improvement topics
  const weakList = Array.isArray(stats.weakTopics) ? stats.weakTopics.slice(0, 3) : [];
  const weakText = weakList.length > 0
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n⚠️ *ÖNCELİKLİ TEKRAR EDİLECEK KONULAR*\n` + weakList.map(t => `  • ${t.name} (%${t.avg || 0} Başarı)`).join('\n')
    : '';

  // Homework progress
  let hwLine = '';
  if (homeworkMetrics && homeworkMetrics.total > 0) {
    hwLine = `• Ödev Disiplini: *%${homeworkMetrics.completionRate || 0}* (${homeworkMetrics.completed || 0}/${homeworkMetrics.total} Görev Tamamlandı)\n`;
  }

  // Teacher / Coach note
  const noteText = teacherNote && teacherNote.trim()
    ? `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n📝 *ÖĞRETMEN / REHBERLİK DEĞERLENDİRMESİ*\n"${teacherNote.trim()}"\n`
    : '';

  return (
`🎓 *RESMİ ÖĞRENCİ AKADEMİK GELİŞİM RAPORU*
🏛️ *${schoolName}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Öğrenci:* ${studentName}
🏫 *Sınıf / Şube:* ${gradeLabel}
👨‍🏫 *Danışman:* ${teacherName}
📅 *Rapor Tarihi:* ${todayStr} (${reportPeriod})

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *GENEL BAŞARI & ÇALIŞMA GÖSTERGELERİ*
• Genel Başarı Notu: *%${stats.avgScore || stats.successRate || 0} (${stats.overallLetter?.grade || 'B+'})*
• Toplam Çözülen Soru: *${stats.totalQuestions || 0} Soru*
• Doğru / Yanlış / Boş: *${stats.totalCorrect || 0}D / ${stats.totalWrong || 0}Y / ${stats.totalBlank || 0}B*
• Net Ortalaması: *${stats.avgNet || 0} Net*
• Soru Doğruluk Oranı: *%${stats.accuracyPct || stats.successRate || 0}*
• Tamamlanan Test / Deneme: *${stats.testCount || 0} Adet*
${hwLine}━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 *DERS DERS PERFORMANS DÖKÜMÜ*
${subjectLines}
${strongText}${weakText}${noteText}━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 *E-Test Veli Bilgilendirme Notu:*
Çocuğunuzun günlük soru çözümlerini, ödev durumunu ve yapay zeka analizli konu karnesini sistemimiz üzerinden 7/24 canlı takip edebilirsiniz.
✨ *İyi çalışmalar dileriz.*`
  );
}

/**
 * Formats a phone number for international WhatsApp link.
 */
export function normalizePhoneNumberForWhatsApp(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (!cleaned.startsWith('90') && cleaned.length === 10) {
    cleaned = '90' + cleaned;
  }
  return cleaned;
}

/**
 * Opens WhatsApp with pre-filled report text.
 */
export function shareViaWhatsApp({ phone = '', message = '' }) {
  if (!message) return false;
  try {
    triggerHaptic('light');
  } catch {}

  const cleanPhone = normalizePhoneNumberForWhatsApp(phone);
  const encodedText = encodeURIComponent(message);
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Copies the report to the clipboard.
 */
export async function copyReportToClipboard(message) {
  if (!message) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
    } else {
      const el = document.createElement('textarea');
      el.value = message;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    try {
      triggerHaptic('success');
    } catch {}
    return true;
  } catch (err) {
    console.warn('Failed to copy report:', err);
    return false;
  }
}

