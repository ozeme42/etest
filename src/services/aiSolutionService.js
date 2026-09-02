import { dbGetUserAiApiKey, dbGetSystemAiApiKey } from './supabaseService';

export const GEMINI_AVAILABLE_MODELS = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash-Lite',
    tag: '⚡ En Hızlı & Anlık Yanıt (Önerilen)',
    desc: "1-2 saniyede anında soru çözümü, fotoğraf tanıma ve ultra düşük gecikme sağlayan en hafif ve en hızlı resmi model.",
    badge: 'En Hızlı',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#86efac'
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: '⭐ En Yeni Nesil Amiral Gemisi',
    desc: "Google'ın en gelişmiş yeni nesil Flash modeli; karmaşık şekilli sorular, grafikler ve MEB kazanımları için üstün başarı.",
    badge: 'Yeni Nesil',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.12)',
    border: '#c084fc'
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: '🚀 Yüksek Kararlılık',
    desc: "Geniş bağlam ve güvenilir görsel analiz performansı sunan kararlı üretim modeli.",
    badge: 'Kararlı',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: '#a5b4fc'
  },
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash-Lite',
    tag: '⚡ Hızlı & Hafif',
    desc: "Düşük gecikmeli ve ekonomik soru çözümleri için optimize edilmiş Flash Lite sürümü.",
    badge: 'Hızlı',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    border: '#7dd3fc'
  },
  {
    id: 'gemini-3.1-pro',
    name: 'Gemini 3.1 Pro',
    tag: '🧠 Derin Muhakeme & Uzman',
    desc: "İleri düzey matematik, geometri ve karmaşık fen soruları için en yüksek akıl yürütme kapasitesi.",
    badge: 'Uzman',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.12)',
    border: '#f472b6'
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
  const sText = JSON.stringify(parsed);
  return (
    sText.includes('genel test mantığı çerçevesinde temel bir kazanımı') ||
    sText.includes('Öncelikle soruda bizden ne istendiğini ve elimizdeki verilerin neler olduğunu') ||
    sText.includes('Soruda verilenleri ve isteneni netleştirelim') ||
    sText.includes('Kuralı veya çözüm yolunu adım adım uygulayalım') ||
    sText.includes('verilen öncüllerin dikkatli analiz edilerek') ||
    sText.includes('rastgele harfler girmen') ||
    (parsed.isEnglishQuestion && sText.includes('Which of the following is correct according to the text'))
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

  // 1. Invalidate or check local cache
  if (forceRefresh && cacheKey) {
    try {
      localStorage.removeItem(`ai_sol_${cacheKey}`);
    } catch {}
  }

  if (!forceRefresh && cacheKey) {
    try {
      const cached = localStorage.getItem(`ai_sol_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const isStaleEnglish = parsed?.isEnglishQuestion && !isEnglishQuestion;
        const isPlaceholder = isGenericPlaceholderSolution(parsed);
        if (parsed && (parsed.steps || parsed.explanation || parsed.summary) && !isStaleEnglish && !isPlaceholder) {
          return parsed;
        } else if (isStaleEnglish || isPlaceholder) {
          localStorage.removeItem(`ai_sol_${cacheKey}`);
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

  const systemInstruction = isEnglishQuestion
    ? `Sen Türkiye MEB müfredatına ve LGS/YKS sınav standartlarına tam hakim, Türkçe konuşan öğrencilere ders anlatan uzman bir İngilizce öğretmenisin.
Görevin: Öğrencinin yanlış yaptığı veya boş bıraktığı İngilizce sorusunu dil öğretim odaklı olarak Türkçe açıklamalar, cümle çevirileri ve kelime rehberi ile adım adım çözmektir.
1. "isEnglishQuestion": true olarak işaretle.
2. "summary": Soruda ne anlatıldığını ve soru kökünün ne istediğini 1-2 cümlelik net Türkçe ile özetle.
3. "sentenceTranslations": Soruda geçen İngilizce cümleleri ve soru kökünü satır satır Türkçe çevirileriyle eşleştir.
4. "vocabulary": Soruda geçen en önemli 4-8 İngilizce kelimeyi/kalıbı anlamları ve ipuçlarıyla listele.
5. "grammarNotes": Sorudaki gramer konusunu Türkçe açıkla.
6. "optionTranslations": Şıkları Türkçe anlamları ve çeldirici analizleriyle açıkla.
7. "steps": Adım adım çözüm (1. Çeviri ve Anlam, 2. Gramer/Kelime İpuçları, 3. Doğru Cevap).
8. "goldenRule": İngilizce soru çözerken hayat kurtaran pratik altın kural.
9. DİL VE MATEMATİK YAZIMI: Kesinlikle LaTeX veya '$' sembolü KULLANMA. Temiz Türkçe yaz.
10. Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak döndür.`
    : `Sen Türkiye MEB müfredatına ve LGS/YKS/ÖSYM sınav standartlarına tam hakim, öğrencilere ders anlatan son derece pedagojik, cana yakın ve uzman bir öğretmenisin.
Görevin: Öğrencinin yanlış yaptığı veya boş bıraktığı soruyu adım adım, tane tane ve en anlaşılır Türkçe ile çözmek ve seçtiği hata sebebine göre özel bir koçluk tavsiyesi sunmaktır.
1. "isEnglishQuestion": false olarak işaretle. Kesinlikle İngilizce çeviri, İngilizce kelime sözlüğü veya İngilizce kalıp EKLEME.
2. "summary": Sorunun temel mantığını ve kazanımını 1-2 cümlelik net Türkçe ile özetle.
3. "steps": Soruyu 3 net adımda anlaşılır Türkçe ile çöz (1. Verilenleri ve isteneni anlama, 2. Çözüm yolunu ve kuralları adım adım uygulama, 3. Sonucu hesaplama ve şıkları eleyerek doğru cevabı bulma).
4. "goldenRule": Bu soruyu çözerken kullanılan temel kural, formül veya altın ipucu.
5. "mistakeAdvice": Öğrencinin seçtiği HATA SEBEBİ (${cleanReason}) doğrultusunda nokta atışı koçluk uyarısı.
6. "similarQuestion": Öğrencinin bu kazanımı pekiştirmesi için 1 adet benzer mini soru metni, şıkları ve çözümü.
7. DİL VE MATEMATİK YAZIMI: Kesinlikle LaTeX, kodlama etiketleri veya '$', '\\text', '\\frac' gibi semboller KULLANMA. Günlük temiz Türkçe sembollerle doğal olarak yaz.
8. ADIM BAŞLIKLARI: Her adımın başına '1. Adım:', 'Adım 1:' gibi ifadeler YAZMA. Doğrudan açıklamayı yaz.
9. Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak döndür.`;

  let prompt = `Aşağıdaki ${subject && subject !== 'Genel' ? subject : ''} sorusunu incele ve ayrıntılı çözümünü üret:\n\n`;
  if (subject) prompt += `Ders: ${subject}\n`;
  if (grade) prompt += `Sınıf / Seviye: ${grade}\n`;
  if (topic) prompt += `Konu: ${topic}\n`;
  if (questionNo) prompt += `Soru Numarası: ${questionNo}\n`;
  if (studentAnswer) prompt += `Öğrencinin Yanıtı: ${studentAnswer}\n`;
  if (correctAnswer) prompt += `Doğru Yanıt: ${correctAnswer}\n`;
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
      maxOutputTokens: 3000
    }
  };

  let responseData = null;
  let lastError = null;

  const preferredModel = localStorage.getItem('system_ai_default_model') || 'gemini-3.1-flash-lite';
  const prioritizedModels = [
    preferredModel,
    'gemini-3.1-flash-lite',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-3.1-pro'
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  for (const model of prioritizedModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new Error(`Timeout: ${model} 10 saniyede yanıt vermedi.`));
        } catch {
          controller.abort();
        }
      }, 10000);

      const isThinkingModel = model.includes('3.7') || model.includes('3.1-pro');
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

  // Parse JSON response
  let parsed = null;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {}
    }
  }

  if (!parsed || (!parsed.steps && !parsed.explanation && !parsed.summary)) {
    parsed = {
      correctAnswer: correctAnswer || 'Belirtilmedi',
      summary: 'Çözüm Başarıyla Üretildi',
      steps: rawText.split('\n').filter(l => l.trim().length > 0),
      mistakeAdvice: `Hata sebebi (${cleanReason}) analizi ve doğru çözüm adımları yukarıda sunulmuştur.`,
      goldenRule: 'Sorunun temel kazanımını ve çözüm adımlarını dikkatle inceleyiniz.'
    };
  }

  // Save to local cache with zero DB cost
  if (cacheKey && parsed) {
    try {
      localStorage.setItem(`ai_sol_${cacheKey}`, JSON.stringify(parsed));
    } catch {}
  }

  return parsed;
}
