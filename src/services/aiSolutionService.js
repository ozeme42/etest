import { dbGetUserAiApiKey, dbGetSystemAiApiKey } from './supabaseService';
import { idbSetPayload, idbGetPayload, idbDeletePayload } from './indexedDbService';

export const GEMINI_AVAILABLE_MODELS = [
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    tag: '⚡ En Hızlı & En Kararlı (Önerilen)',
    desc: "Geniş bağlam ve güvenilir görsel analiz performansı sunan, 503 yoğunluk hatası vermeyen en kararlı üretim modeli.",
    badge: 'Önerilen',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#6ee7b7'
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tag: '🚀 Yüksek Muhakeme & Hızlı',
    desc: "Yüksek akıl yürütme kabiliyeti ve hızlı yanıt süresi ile kendini kanıtlamış kararlı model.",
    badge: 'Kararlı',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    border: '#7dd3fc'
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    tag: '💡 Ultra Hızlı & Yüksek Kota',
    desc: "Düşük gecikmeli, yüksek kotalı ve seri soru çözümleri için Google tarafından optimize edilmiş Flash Lite sürümü.",
    badge: 'Ultra Hızlı',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: '#93c5fd'
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    tag: '📦 Otomatik Güncel',
    desc: "Google'ın sürekli güncel tuttuğu en yeni stabil flash sürümü.",
    badge: 'Güncel',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    border: '#f472b6'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: '⭐ İleri Düzey Düşünme & Hibrit (Dönemsel Yoğunluk)',
    desc: "Google'ın en gelişmiş yeni nesil hibrit modeli (yoğunluk dönemlerinde 503 yanıtı verebilir, otomatik yedek modele geçer).",
    badge: 'Yeni Nesil',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.12)',
    border: '#c084fc'
  }
];

export const GEMINI_SOLVER_MODELS = GEMINI_AVAILABLE_MODELS.map(m => m.id);

/**
 * Get active Gemini API Key from localStorage, environment, or Supabase
 */
export async function getResolvedAiApiKey(userId) {
  try {
    const local = localStorage.getItem('system_ai_api_key') || localStorage.getItem('gemini_api_key') || localStorage.getItem('eTestGeminiApiKey');
    if (local && local.trim()) return local.trim();

    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && envKey.trim()) return envKey.trim();

    // Check system-wide key set by Admin
    const systemCloudKey = await dbGetSystemAiApiKey();
    if (systemCloudKey && systemCloudKey.trim()) {
      return systemCloudKey.trim();
    }

    // Check user-specific key
    if (userId) {
      const cloudKey = await dbGetUserAiApiKey(userId);
      if (cloudKey && cloudKey.trim()) {
        localStorage.setItem('eTestGeminiApiKey', cloudKey.trim());
        return cloudKey.trim();
      }
    }
  } catch (err) {
    console.warn('[aiSolutionService] Error getting API key:', err);
  }
  return '';
}

/**
 * Clean raw LaTeX and math tokens to human-readable Turkish math text
 */
export function cleanAiMathText(str) {
  if (!str || typeof str !== 'string') return str || '';
  let res = str;

  // 1. Remove duplicate step headings like "1. Adım:", "Adım 1:", "1. Adım -", "Adım 1 -" at the beginning
  res = res.replace(/^(\d+[\.\)]\s*(?:Adım|Aşama)[:\-]?|\s*(?:Adım|Aşama)\s*\d+[:\-]?)\s*/i, '');

  // 2. Clean LaTeX \text{...} -> ...
  res = res.replace(/\\text\s*\{([^}]+)\}/gi, '$1');
  res = res.replace(/\\mathrm\s*\{([^}]+)\}/gi, '$1');
  res = res.replace(/\\mathbf\s*\{([^}]+)\}/gi, '$1');

  // 3. Clean LaTeX \frac{a}{b} -> a / b
  res = res.replace(/\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}/gi, '$1 / $2');

  // 4. Clean LaTeX math symbols
  res = res.replace(/\\times/gi, '×');
  res = res.replace(/\\cdot/gi, '·');
  res = res.replace(/\\div/gi, '÷');
  res = res.replace(/\\pm/gi, '±');
  res = res.replace(/\\neq/gi, '≠');
  res = res.replace(/\\leq/gi, '≤');
  res = res.replace(/\\geq/gi, '≥');
  res = res.replace(/\\approx/gi, '≈');
  res = res.replace(/\\sqrt\s*\{([^}]+)\}/gi, '√($1)');
  res = res.replace(/\\sqrt/gi, '√');
  res = res.replace(/\\pi/gi, 'π');
  res = res.replace(/\\degree/gi, '°');
  res = res.replace(/\\circ/gi, '°');
  res = res.replace(/\\infty/gi, '∞');
  res = res.replace(/\\Delta/gi, 'Δ');
  res = res.replace(/\\alpha/gi, 'α');
  res = res.replace(/\\beta/gi, 'β');
  res = res.replace(/\\theta/gi, 'θ');

  // 5. Clean dollar signs used for inline math $x$ -> x
  res = res.replace(/\$([^$]+)\$/g, '$1');
  res = res.replace(/\$/g, '');

  // 6. Clean escaped braces or remaining backslashes
  res = res.replace(/\\\{/g, '{').replace(/\\\}/g, '}');
  res = res.replace(/\\([a-zA-Z]+)/g, '$1');

  // 7. Clean multiple consecutive spaces
  res = res.replace(/[ \t]{2,}/g, ' ');

  return res.trim();
}

export async function resolveImageToBase64(imgSrc) {
  if (!imgSrc) return null;
  if (typeof imgSrc === 'object' && imgSrc.data) {
    return imgSrc;
  }
  if (typeof imgSrc !== 'string') return null;
  const trimmed = imgSrc.trim();

  // If already base64 data URL
  if (trimmed.startsWith('data:image/')) {
    const parts = trimmed.split(';base64,');
    return {
      mimeType: parts[0].replace('data:', '') || 'image/jpeg',
      data: parts[1]
    };
  }

  // If it's a raw base64 string without data prefix
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('blob:') && trimmed.length > 100 && !trimmed.includes('/')) {
    return {
      mimeType: 'image/jpeg',
      data: trimmed
    };
  }

  // If it's an HTTP/HTTPS/Blob URL, fetch and convert to base64
  try {
    const res = await fetch(trimmed);
    const blob = await res.blob();
    const mimeType = blob.type || (trimmed.endsWith('.png') ? 'image/png' : (trimmed.endsWith('.webp') ? 'image/webp' : 'image/jpeg'));
    
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string' && result.includes(';base64,')) {
          const split = result.split(';base64,');
          resolve({
            mimeType: split[0].replace('data:', '') || mimeType,
            data: split[1]
          });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Direct fetch failed, attempting canvas fallback for:', trimmed, err);
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const split = dataUrl.split(';base64,');
            resolve({
              mimeType: 'image/jpeg',
              data: split[1]
            });
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = trimmed;
      });
    } catch (e) {
      return null;
    }
  }
}

/**
 * Extract targeted question text and options from HTML document
 */
export function extractTargetQuestionFromHtml(html, qNo) {
  if (!html || typeof html !== 'string') return '';
  if (html === '[STORED_IN_INDEXEDDB]' || html === '[LOCALSTORAGE_CACHE]') return '';

  try {
    const cleaned = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleaned, 'text/html');

      // 1. Selector based match
      const selectors = [
        `#q${qNo}`, `#q_${qNo}`, `#question_${qNo}`, `#question-${qNo}`, `#soru_${qNo}`, `#soru-${qNo}`, `#s${qNo}`,
        `[data-question="${qNo}"]`, `[data-q="${qNo}"]`, `[data-index="${qNo - 1}"]`, `[data-qno="${qNo}"]`,
        `.question:nth-of-type(${qNo})`, `.soru:nth-of-type(${qNo})`, `.question-card:nth-of-type(${qNo})`,
        `.question-block:nth-of-type(${qNo})`, `.test-question:nth-of-type(${qNo})`
      ];
      for (const sel of selectors) {
        const el = doc.querySelector(sel);
        if (el && el.textContent && el.textContent.trim().length > 10) {
          return el.textContent.trim();
        }
      }

      // 2. Element header text search (e.g. <h3>Soru 2...</h3> or <b>Soru 2:</b>)
      const elements = Array.from(doc.querySelectorAll('div, section, article, p, h1, h2, h3, h4, h5, h6, li, tr'));
      for (const el of elements) {
        const text = (el.innerText || el.textContent || '').trim();
        const startsWithQ = new RegExp(`^(?:(?:Soru|SORU|soru)[\\s\\-_:]*${qNo}[:\\.\\s]|${qNo}\\s*[\\.\\)]\\s*(?:Soru|SORU|soru)?|${qNo}\\s*[\\.\\)])`, 'i').test(text);
        if (startsWithQ && text.length > 25) {
          return text;
        }
      }

      // 3. Document body full-text regex extraction
      const allText = doc.body ? (doc.body.innerText || doc.body.textContent || '') : '';
      if (allText) {
        const qRegex = new RegExp(`(?:(?:Soru|SORU|soru)[\\s\\-_:]*${qNo}[:\\.\\s]|${qNo}\\s*[\\.\\)]\\s*(?:Soru|SORU|soru)?|^\\s*${qNo}\\s*[\\.\\)])([\\s\\S]*?)(?=(?:(?:Soru|SORU|soru)[\\s\\-_:]*${qNo + 1}[:\\.\\s]|${qNo + 1}\\s*[\\.\\)]\\s*(?:Soru|SORU|soru)?|^\\s*${qNo + 1}\\s*[\\.\\)]|$))`, 'im');
        const match = allText.match(qRegex);
        if (match && match[0] && match[0].trim().length > 10) {
          return match[0].trim();
        }
      }
    }

    // 4. Raw text fallback
    const textOnly = cleaned.replace(/<[^>]+>/g, '\n').replace(/&nbsp;/g, ' ');
    const qRegex = new RegExp(`(?:(?:Soru|SORU|soru)[\\s\\-_:]*${qNo}[:\\.\\s]|${qNo}\\s*[\\.\\)]\\s*(?:Soru|SORU|soru)?|^\\s*${qNo}\\s*[\\.\\)])([\\s\\S]*?)(?=(?:(?:Soru|SORU|soru)[\\s\\-_:]*${qNo + 1}[:\\.\\s]|${qNo + 1}\\s*[\\.\\)]\\s*(?:Soru|SORU|soru)?|^\\s*${qNo + 1}\\s*[\\.\\)]|$))`, 'im');
    const match = textOnly.match(qRegex);
    if (match && match[0] && match[0].trim().length > 10) {
      return match[0].trim();
    }
  } catch (e) {
    console.warn('[aiSolutionService] extractTargetQuestionFromHtml error:', e);
  }
  return '';
}

export function getHtmlFromActiveIframe() {
  if (typeof document === 'undefined') return '';
  try {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const ifr of iframes) {
      try {
        const doc = ifr.contentDocument || ifr.contentWindow?.document;
        if (doc && doc.body) {
          const bodyText = doc.body.innerText || doc.body.textContent || '';
          if (bodyText && bodyText.trim().length > 10) {
            return doc.documentElement.outerHTML || bodyText;
          }
        }
      } catch (e) {
        if (ifr.srcDoc && ifr.srcDoc.trim().length > 10) {
          return ifr.srcDoc;
        }
      }
    }
  } catch (e) {
    console.warn('[ScreenSnipper] iframe read error:', e);
  }
  return '';
}

export function isGenericPlaceholderSolution(parsed) {
  if (!parsed || typeof parsed !== 'object') return true;
  // If it's literally the prompt placeholder template where fields were not filled
  if (parsed.summary === 'Sorunun kazanımı ve temel mantığının 1-2 cümlelik özeti' ||
      parsed.summary === 'Sorunun 1-2 cümlelik Türkçe özeti') {
    return true;
  }
  const sText = JSON.stringify(parsed);
  const hasRawJsonPollution = Array.isArray(parsed.steps) && parsed.steps.some(st => {
    const s = typeof st === 'string' ? st.trim() : (st?.detail || st?.content || '');
    return s === '{' || s === '}' || s === '[' || s === ']' || s.includes('"isEnglishQuestion"') || s.includes('"summary":');
  });

  return (
    hasRawJsonPollution ||
    sText.includes('genel test mantığı çerçevesinde temel bir kazanımı') ||
    sText.includes('rastgele harfler girmen')
  );
}

/**
 * Solve a single question using Gemini (Multimodal Vision / Text)
 * Zero database storage, processed strictly in-memory.
 */
export async function solveQuestionWithAi({
  apiKey,
  userId,
  imageBase64, // Cropped image / photo dataUrl or raw base64
  questionText = '',
  htmlPayload = '',
  options = [],
  studentAnswer = '',
  correctAnswer = '',
  mistakeReason = '',
  subject = 'Genel',
  grade = '',
  topic = '',
  questionNo = 1,
  cacheKey = '',
  forceRefresh = false
}) {
  // Extract question from HTML or active iframe if questionText is minimal
  const extractedFromHtml = extractTargetQuestionFromHtml(htmlPayload, questionNo);
  const extractedFromIframe = !extractedFromHtml ? extractTargetQuestionFromHtml(getHtmlFromActiveIframe(), questionNo) : '';
  const effectiveQuestionText = (questionText && questionText.trim().length > 10)
    ? questionText.trim()
    : (extractedFromHtml || extractedFromIframe || questionText || '');

  // Strict language / subject analysis
  const isEnglishSubject = Boolean(
    (subject && /ingilizce|english|yks[\s-_]*dil|yds|lgs[\s-_]*ingilizce|toefl|ielts/i.test(subject)) ||
    (topic && /ingilizce|english|grammar|vocabulary|tenses|reading|cloze/i.test(topic))
  );

  const containsTurkishMarkers = /[çğıöşüÇĞİÖŞÜ]|\b(soru|kelime|cümle|aşağıdaki|metne|hangisi|doğrudur|yanlıştır|sesteş|eş sesli|eş anlamlı|zıt anlamlı|paragraf|yazar|metin|türkçe|matematik|fen|sosyal|din|tarih)\b/i.test(
    (effectiveQuestionText || '') + ' ' + (subject || '') + ' ' + (topic || '')
  );

  const isEnglishQuestion = isEnglishSubject || (
    !containsTurkishMarkers &&
    effectiveQuestionText &&
    /\b(which of the following|according to the text|according to the passage|choose the correct|fill in the blank|complete the sentence|opposite meaning|closest in meaning|read the text and answer)\b/i.test(effectiveQuestionText)
  );

  // 1. Invalidate or check local cache (both localStorage and IndexedDB)
  if (forceRefresh && cacheKey) {
    try {
      localStorage.removeItem(`ai_sol_${cacheKey}`);
      await idbDeletePayload(`ai_sol_${cacheKey}`);
    } catch {}
  }

  if (!forceRefresh && cacheKey) {
    try {
      let parsed = null;
      const cached = localStorage.getItem(`ai_sol_${cacheKey}`);
      if (cached) {
        try { parsed = JSON.parse(cached); } catch {}
      }
      if (!parsed) {
        parsed = await idbGetPayload(`ai_sol_${cacheKey}`);
      }
      if (parsed) {
        const isPlaceholder = isGenericPlaceholderSolution(parsed);
        if ((parsed.steps || parsed.explanation || parsed.summary) && !isPlaceholder) {
          return parsed;
        } else if (isPlaceholder) {
          localStorage.removeItem(`ai_sol_${cacheKey}`);
          await idbDeletePayload(`ai_sol_${cacheKey}`);
        }
      }
    } catch {}
  }

  // 2. Resolve API key
  const effectiveKey = (apiKey && apiKey.trim()) || (await getResolvedAiApiKey(userId));
  if (!effectiveKey) {
    throw new Error('API_KEY_REQUIRED');
  }

  // 3. Prepare System Instruction & Prompt
  const cleanReason = mistakeReason || 'Hata Sebebi Belirtilmedi';
  const hasOfficialAnswer = Boolean(correctAnswer && correctAnswer !== '—' && correctAnswer !== 'Belirtilmedi' && String(correctAnswer).trim().length > 0);
  const hasStudentAnswer = Boolean(studentAnswer && studentAnswer !== 'Boş' && studentAnswer !== '—' && String(studentAnswer).trim().length > 0);
  const isStudentWrong = hasStudentAnswer && hasOfficialAnswer && String(studentAnswer).trim().toUpperCase() !== String(correctAnswer).trim().toUpperCase();

  const systemInstruction = isEnglishQuestion
    ? `Sen Türkiye MEB müfredatına ve LGS/YKS sınav standartlarına tam hakim, Türkçe konuşan öğrencilere ders anlatan uzman bir İngilizce öğretmenisin.
GÖREV VE PEDAGOJİK KURALLAR:
1. Sorunun görselini, metnini ve şıklarını titizlikle analiz et.
${hasOfficialAnswer ? `• Sistemde kayıtlı beklenen cevap: "${String(correctAnswer).trim().toUpperCase()}" şıkkıdır.` : ''}
${hasStudentAnswer ? `• Öğrencinin işaretlediği yanıt: "${String(studentAnswer).trim().toUpperCase()}" şıkkıdır.` : ''}
2. "isEnglishQuestion": true olarak işaretle.
3. "summary": Soruda ne anlatıldığını ve soru kökünün ne istediğini 1-2 cümlelik net Türkçe ile özetle.
4. "sentenceTranslations": Soruda geçen İngilizce cümleleri ve soru kökünü satır satır Türkçe çevirileriyle eşleştir.
5. "vocabulary": Soruda geçen en önemli 4-8 İngilizce kelimeyi/kalıbı anlamları ve ipuçlarıyla listele.
6. "grammarNotes": Sorudaki gramer konusunu Türkçe açıkla.
7. "optionTranslations": Şıkları Türkçe anlamları ve çeldirici analizleriyle açıkla.
8. "steps": Adım adım çözüm (1. Çeviri ve Anlam, 2. Gramer/Kelime İpuçları, 3. Doğru Cevap).
9. "goldenRule": İngilizce soru çözerken hayat kurtaran pratik altın kural.
10. KESİNLİKLE "talimat gereği", "sistem kuralı", "prompt" gibi yapay zeka meta-ifadeleri KULLANMA. Tamamen doğal bir öğretmen diliyle konuş.
11. DİL VE MATEMATİK YAZIMI: Kesinlikle LaTeX veya '$' sembolü KULLANMA. Temiz Türkçe yaz.
12. Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak döndür.`
    : `Sen Türkiye MEB müfredatına ve LGS/YKS/ÖSYM sınav standartlarına tam hakim, son derece titiz, pedagojik ve uzman bir öğretmenisin.
GÖREV VE PEDAGOJİK KURALLAR:
1. SORUYU VE GÖRSELİ DİKKATLE ANALİZ ET:
• Sorunun kökünü, öncüllerini ve tüm seçeneklerini MEB kazanımlarına göre nesnel ve titiz bir öğretmen gibi çöz.
${hasOfficialAnswer ? `• Sistemde kayıtlı beklenen cevap: "${String(correctAnswer).trim().toUpperCase()}" şıkkıdır.` : ''}
${hasStudentAnswer ? `• Öğrencinin işaretlediği yanıt: "${String(studentAnswer).trim().toUpperCase()}" şıkkıdır.` : ''}
• Eğer sorunun görselindeki bilimsel/mantıksal çözüm ${hasOfficialAnswer ? `"${String(correctAnswer).trim().toUpperCase()}" şıkkı` : 'beklenen cevap'} ile uyuşuyorsa, bu şıkkın neden doğru olduğunu ve öğrencinin yanlış işaretlediği çeldiricinin neden elenmesi gerektiğini adım adım açıkla.
• Eğer sorunun görseldeki bariz bilimsel/dilbilgisi çözümü sistemdeki kayıtlı cevaptan farklıysa (örneğin cevap anahtarında bir basım/kayıt hatası varsa); doğrudan sorunun doğru bilimsel cevabını açıkla ve not olarak "Soru kökündeki kazanım gereği doğru yanıt ... şıkkıdır." şeklinde nazik bir açıklama yap.
• KESİNLİKLE "talimatınız gereği", "sistem kuralı", "kural gereği D kabul ediyorum", "teknik hata olsa da işaretliyorum" gibi robotik/meta ifadeler KULLANMA. Her zaman öğrenciye hitap eden güvenilir, bilge ve sıcak bir öğretmen üslubu kullan.

2. "isEnglishQuestion": false olarak işaretle. Kesinlikle İngilizce çeviri, İngilizce kelime sözlüğü veya İngilizce kalıp EKLEME.
3. "summary": Sorunun temel mantığını ve kazanımını 1-2 cümlelik net Türkçe ile özetle.
4. "steps": Soruyu 3 net adımda anlaşılır Türkçe ile çöz (1. Verilenleri ve soru kökünü anlama, 2. Çözüm yolunu ve kuralları adım adım uygulama / çeldiricileri eleme, 3. Doğru şıkkı ve gerekçesini ispatlama).
5. "goldenRule": Bu soruyu çözerken kullanılan temel kural, formül veya altın ipucu.
6. "mistakeAdvice": Öğrencinin seçtiği HATA SEBEBİ (${cleanReason}) ve sorudaki kritik püf noktası doğrultusunda nokta atışı koçluk uyarısı.
7. "similarQuestion": Öğrencinin bu kazanımı pekiştirmesi için 1 adet benzer mini soru metni, şıkları ve çözümü.
8. DİL VE MATEMATİK YAZIMI: Kesinlikle LaTeX, kodlama etiketleri veya '$', '\\text', '\\frac' gibi semboller KULLANMA. Günlük temiz Türkçe sembollerle doğal olarak yaz.
9. ADIM BAŞLIKLARI: Her adımın başına '1. Adım:', 'Adım 1:' gibi ifadeler YAZMA. Doğrudan açıklamayı yaz.
10. Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak döndür.`;

  let prompt = `Aşağıdaki ${subject && subject !== 'Genel' ? subject : ''} sorusunu incele ve ayrıntılı çözümünü üret:\n\n`;
  if (subject) prompt += `Ders: ${subject}\n`;
  if (grade) prompt += `Sınıf / Seviye: ${grade}\n`;
  if (topic) prompt += `Konu: ${topic}\n`;
  if (questionNo) prompt += `Soru Numarası: ${questionNo}\n`;
  if (hasOfficialAnswer) prompt += `Sistemde Kayıtlı Cevap: ${String(correctAnswer).trim().toUpperCase()} Şıkkı\n`;
  if (hasStudentAnswer) prompt += `Öğrencinin İşaretlediği Yanıt: ${String(studentAnswer).trim().toUpperCase()} Şıkkı\n`;
  if (cleanReason) prompt += `Öğrencinin Belirttiği Hata Sebebi: ${cleanReason}\n`;

  if (effectiveQuestionText) {
    prompt += `\nHEDEF SORU METNİ (${questionNo}. Soru):\n"""\n${effectiveQuestionText}\n"""\n`;
  } else if (htmlPayload && typeof htmlPayload === 'string') {
    const cleanHtml = htmlPayload
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .slice(0, 15000);
    prompt += `\nTEST DÖKÜMANI:\n"""\n${cleanHtml}\n"""\n`;
    prompt += `\nYukarıdaki test dökümanında yer alan ${questionNo}. soruyu bul ve tam olarak çöz.\n`;
  }

  if (Array.isArray(options) && options.length > 0) {
    prompt += `\nŞIKLAR:\n${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}\n`;
  }

  const jsonSchema = isEnglishQuestion ? `{
  "isEnglishQuestion": true,
  "correctAnswer": "C",
  "summary": "Sorunun 1-2 cümlelik Türkçe özeti",
  "steps": [
    "Paragraf/Diyalog Çevirisi ve Anlamı...",
    "Sorudaki Kilit Gramer ve Kelime İpuçları...",
    "Şıkların İncelenmesi ve Doğru Cevap..."
  ],
  "sentenceTranslations": [
    { "english": "English sentence from the question", "turkish": "Türkçe çevirisi" }
  ],
  "vocabulary": [
    { "word": "target word", "meaning": "Türkçe anlamı", "type": "Fiil/İsim/Sıfat", "clue": "Kullanım ipucu" }
  ],
  "grammarNotes": "Sorudaki gramer yapısının açıklaması...",
  "optionTranslations": [
    { "letter": "A", "english": "Option in English", "turkish": "Şıkkın Türkçe çevirisi", "isCorrect": false, "reason": "Neden elendiği" },
    { "letter": "C", "english": "Correct option", "turkish": "Doğru şıkkın çevirisi", "isCorrect": true, "reason": "Neden doğru olduğu" }
  ],
  "mistakeAdvice": "Öğrencinin seçtiği '${cleanReason}' sebebine göre koçluk tavsiyesi",
  "goldenRule": "Bu soru için altın kural",
  "similarQuestion": {
    "questionText": "Benzer 1 adet pekiştirme sorusu...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswerLetter": "C",
    "explanation": "Çözüm açıklaması"
  }
}` : `{
  "isEnglishQuestion": false,
  "correctAnswer": "${correctAnswer || 'A'}",
  "summary": "Sorunun kazanımı ve temel mantığının 1-2 cümlelik özeti",
  "steps": [
    "Soruda verilenleri ve isteneni netleştirelim...",
    "Kuralı veya çözüm yolunu adım adım uygulayalım...",
    "Sonucu hesaplayıp şıkları eleyerek doğru cevabı bulalım..."
  ],
  "mistakeAdvice": "Öğrencinin seçtiği '${cleanReason}' sebebine göre koçluk tavsiyesi",
  "goldenRule": "Bu soruyu çözerken dikkat edilmesi gereken formül, kural veya püf nokta",
  "similarQuestion": {
    "questionText": "Öğrencinin bu kazanımı pekiştirmesi için 1 adet benzer mini soru metni...",
    "options": ["A) Şık 1", "B) Şık 2", "C) Şık 3", "D) Şık 4"],
    "correctAnswerLetter": "B",
    "explanation": "Pekiştirme sorusunun kısa çözümü"
  }
}`;

  prompt += `\nDöndürülecek JSON Şeması:\n${jsonSchema}`;

  // 4. Prepare Parts (Multimodal Image + Text)
  const parts = [];

  if (imageBase64) {
    let resolvedImg = null;
    if (typeof imageBase64 === 'object' && imageBase64.data) {
      resolvedImg = imageBase64;
    } else if (typeof imageBase64 === 'string') {
      resolvedImg = await resolveImageToBase64(imageBase64);
    }

    if (resolvedImg && resolvedImg.data) {
      parts.push({
        inlineData: {
          mimeType: resolvedImg.mimeType || 'image/jpeg',
          data: resolvedImg.data
        }
      });
    }
  }

  if (forceRefresh) {
    prompt += `\n🔄 ÖNEMLİ TALİMAT (YENİDEN / ALTERNATİF ÇÖZÜM):
Öğrenci bu soruyu daha derinlemesine kavramak için "Yeniden Çözdür" butonuna basmıştır.
Lütfen bu soruyu standart/önceki anlatımdan FARKLI bir yöntemle, alternatif bir bakış açısıyla, farklı pratik kestirmeler, mantıksal modellemeler veya farklı pedagojik örneklerle açıkla. Çözüm adımlarındaki ve özetindeki açıklamalarını zenginleştir ve çeşitlendir.\n`;
  }

  parts.push({ text: systemInstruction + '\n\n' + prompt });

  const requestBody = {
    contents: [
      { parts }
    ],
    generationConfig: {
      temperature: forceRefresh ? 0.75 : 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 3000,
      responseMimeType: 'application/json'
    }
  };

  let responseData = null;
  let lastError = null;

  let preferredModel = localStorage.getItem('system_ai_default_model');
  // 3.7 Flash is currently experiencing 503 high demand spikes on Google API; fallback default to 3.6 Flash
  if (!preferredModel || preferredModel === 'gemini-3.7-flash') {
    preferredModel = 'gemini-3.6-flash';
  }

  const prioritizedModels = [
    preferredModel,
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash'
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  for (const model of prioritizedModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new Error(`Timeout: ${model} 35 saniyede yanıt vermedi.`));
        } catch {
          controller.abort();
        }
      }, 35000);

      const isThinkingModel = model.includes('3.7');
      const bodyWithModelConfig = {
        ...requestBody,
        generationConfig: {
          ...requestBody.generationConfig,
          ...(isThinkingModel ? { thinkingConfig: { thinkingBudget: 0 } } : {})
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyWithModelConfig),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        const errMsg = errorJson.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        console.warn(`[aiSolutionService] Model ${model} returned HTTP ${res.status}:`, errMsg);
        throw new Error(errMsg);
      }

      responseData = await res.json();
      if (responseData && responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        break;
      }
    } catch (err) {
      console.warn(`[aiSolutionService] Model ${model} failed, trying next model:`, err?.message || err);
      lastError = err;
    }
  }

  if (!responseData) {
    throw new Error(lastError?.message || 'Yapay zeka soru çözümü üretemedi. Lütfen internet bağlantınızı veya API anahtarınızı kontrol ediniz.');
  }

  const rawText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawText) {
    throw new Error('Gemini API boş yanıt döndürdü.');
  }

  // Parse JSON response safely
  const parsed = parseGeminiJsonResponse(rawText, { correctAnswer, cleanReason });

  // Save to local cache with dual-layer storage (LocalStorage + IndexedDB)
  if (cacheKey && parsed) {
    try {
      localStorage.setItem(`ai_sol_${cacheKey}`, JSON.stringify(parsed));
    } catch {}
    try {
      await idbSetPayload(`ai_sol_${cacheKey}`, parsed);
    } catch {}
  }

  return parsed;
}

export function parseGeminiJsonResponse(rawText, fallbackData = {}) {
  if (!rawText || typeof rawText !== 'string') return null;

  // 1. Direct Clean & Parse
  let cleaned = rawText
    .replace(/^[\s\S]*?```json\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object') return normalizeParsedSolution(parsed);
  } catch {}

  // 2. Direct Match between first { and last }
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = rawText.substring(firstBrace, lastBrace + 1).trim();
    try {
      const parsed = JSON.parse(jsonSubstring);
      if (parsed && typeof parsed === 'object') return normalizeParsedSolution(parsed);
    } catch {}

    // 3. Fix common JSON formatting issues (trailing commas, control chars)
    try {
      const relaxed = jsonSubstring
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, (match) => (match === '\n' || match === '\r' || match === '\t' ? match : ''));
      const parsed = JSON.parse(relaxed);
      if (parsed && typeof parsed === 'object') return normalizeParsedSolution(parsed);
    } catch {}
  }

  // 4. Regex extraction for all known fields
  try {
    const extractStringField = (fieldName) => {
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*"([\\s\\S]*?)(?<!\\\\)"`, 'i');
      const m = rawText.match(regex);
      if (m && m[1]) {
        return m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
      }
      return '';
    };

    const extractArrayField = (fieldName) => {
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, 'i');
      const m = rawText.match(regex);
      if (m && m[1]) {
        const itemMatches = m[1].match(/"([\s\S]*?)(?<!\\)"/g);
        if (itemMatches && itemMatches.length > 0) {
          return itemMatches.map(s => s.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').trim()).filter(Boolean);
        }
      }
      return [];
    };

    const summary = extractStringField('summary');
    const steps = extractArrayField('steps');
    const mistakeAdvice = extractStringField('mistakeAdvice') || extractStringField('mistakeAnalysis');
    const goldenRule = extractStringField('goldenRule') || extractStringField('keyConcept') || extractStringField('tips');
    const correctAnswer = extractStringField('correctAnswer') || extractStringField('correctAnswerLetter');

    if (summary || steps.length > 0 || mistakeAdvice || goldenRule) {
      return normalizeParsedSolution({
        isEnglishQuestion: /"isEnglishQuestion"\s*:\s*true/i.test(rawText),
        summary: summary || 'Çözüm Başarıyla Üretildi',
        steps: steps.length > 0 ? steps : (summary ? [summary] : []),
        mistakeAdvice,
        goldenRule,
        correctAnswer: correctAnswer || fallbackData.correctAnswer || 'Belirtilmedi'
      });
    }
  } catch {}

  // 5. Clean out JSON syntax markers completely if text is unparseable
  const cleanRawText = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .replace(/["{}\[\]]/g, '')
    .replace(/^\s*(?:isEnglishQuestion|correctAnswer|summary|steps|mistakeAdvice|goldenRule|similarQuestion)\s*:\s*/gim, '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 3 && !/^[:,]$/.test(l));

  return {
    correctAnswer: fallbackData.correctAnswer || 'Belirtilmedi',
    summary: 'Çözüm Başarıyla Üretildi',
    steps: cleanRawText.length > 0 ? cleanRawText : ['Sorunun adımları analiz edildi.'],
    mistakeAdvice: fallbackData.cleanReason ? `Hata sebebi (${fallbackData.cleanReason}) analizi ve doğru çözüm adımları yukarıda sunulmuştur.` : 'Çözüm adımlarını inceleyiniz.',
    goldenRule: 'Sorunun temel kazanımını ve çözüm adımlarını dikkatle inceleyiniz.'
  };
}

function normalizeParsedSolution(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj.steps)) {
    obj.steps = obj.steps.filter(st => {
      if (typeof st === 'string') {
        const t = st.trim();
        return t && t !== '{' && t !== '}' && t !== '[' && t !== ']' && !/^"(?:isEnglishQuestion|correctAnswer|summary|steps|mistakeAdvice|goldenRule)"\s*:/.test(t);
      }
      return true;
    });
  }

  return obj;
}
