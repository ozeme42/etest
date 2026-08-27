import { dbGetUserAiApiKey, dbGetSystemAiApiKey } from './supabaseService';

export const GEMINI_AVAILABLE_MODELS = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    tag: '⚡ En Hızlı & En Kararlı (Önerilen)',
    desc: "Yapay zeka ile şekilli soru çözümü, fotoğraf tanıma ve adım adım çözüm için en hızlı ve yüksek başarımlı model.",
    badge: 'Önerilen',
    color: '#7c3aed',
    bg: 'rgba(124, 58, 237, 0.12)',
    border: '#c084fc'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    tag: '🚀 Yüksek Başarım & Hız',
    desc: "Google'ın yeni nesil yüksek hızlı multimodal görsel analiz ve muhakeme modeli.",
    badge: 'Hızlı & Güçlü',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    border: '#a5b4fc'
  },
  {
    id: 'gemini-2.0-flash-lite',
    name: 'Gemini 2.0 Flash-Lite',
    tag: '⚡ Ultra Düşük Gecikme',
    desc: 'Anlık yanıtlar ve düşük gecikmeli soru çözümü için optimize edilmiş hafif model.',
    badge: 'Ultra Hızlı',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: '#86efac'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    tag: '🛡️ Kararlı & Güvenilir',
    desc: 'Geniş bağlam penceresi ve güvenilir soru analiz performansı sunan standart Flash modeli.',
    badge: 'Kararlı',
    color: '#0284c7',
    bg: 'rgba(2, 132, 199, 0.12)',
    border: '#7dd3fc'
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash-8B',
    tag: '📦 Ultra Hafif & Hızlı',
    desc: 'Yüksek hacimli ve hızlı soru çözümleri için tasarlanmış küçük boyutlu model.',
    badge: 'Ekonomik',
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)',
    border: '#cbd5e1'
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
  if (!imgSrc || typeof imgSrc !== 'string') return null;
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
  cacheKey = ''
}) {
  // 1. Check local cache first to avoid re-calling API (Zero API & DB cost)
  if (cacheKey) {
    try {
      const cached = localStorage.getItem(`ai_sol_${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.steps || parsed.explanation || parsed.summary)) {
          return parsed;
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
  
  const systemInstruction = `Sen Türkiye MEB müfredatına ve LGS/YKS/ÖSYM sınav standartlarına tam hakim, son derece pedagojik, cana yakın ve uzman bir öğretmensin.
Görevin: Öğrencinin yanlış yaptığı veya boş bıraktığı soruyu adım adım, tane tane ve en anlaşılır şekilde çözmek ve seçtiği hata sebebine göre özel bir koçluk tavsiyesi sunmaktır.

Kurallar:
1. Çözümü madde madde, adım adım ve net matematiksel/mantıksal akışla yaz.
2. DİL VE MATEMATİK YAZIMI: Kesinlikle LaTeX, kodlama etiketleri veya '$', '\\text', '\\frac', '\\times' gibi semboller KULLANMA. Tüm işlemleri günlük temiz Türkçe ve anlaşılır matematik sembolleriyle (örn: 2 L = 2000 mL, 2 × 1000 = 2000, 2500 / 250 = 10 bardak) doğal olarak yaz.
3. ADIM BAŞLIKLARI: Her adımın başına '1. Adım:', 'Adım 1:' gibi ifadeler YAZMA. Doğrudan o adımda yapılan açıklamayı ve işlemi yaz. (Çünkü arayüz adım numaralarını otomatik olarak yan kutucukta göstermektedir).
4. Öğrencinin seçtiği HATA SEBEBİ (${cleanReason}) doğrultusunda:
   - "İşlem Hatası" ise: En sık hata yapılan işlem adımını ve işlem sırasını vurgula.
   - "Formül / Bilgi Unutuldu" ise: Kullanılan ana formülü veya kuralı 'Altın Kural' kutusunda net ver.
   - "Konu Eksiği" ise: Sorunun ait olduğu konunun 2-3 cümlelik mini konu özetini ve püf noktasını ekle.
   - "Dikkat / Yanlış Okuma" ise: Sorudaki çeldiricileri, olumsuz kökleri (değildir, çıkarılamaz vb.) ve dikkat edilmesi gereken anahtar kelimeleri göster.
   - "Zaman Yetmedi" ise: Soruyu 30 saniyede çözebileceği pratik kısayol taktiğini açıkla.
5. Yanıtını YALNIZCA geçerli bir JSON nesnesi olarak döndür.`;

  let prompt = `Aşağıdaki soruyu incele ve ayrıntılı çözümünü üret:\n\n`;
  if (subject) prompt += `Ders: ${subject}\n`;
  if (grade) prompt += `Sınıf / Seviye: ${grade}\n`;
  if (topic) prompt += `Konu: ${topic}\n`;
  if (questionNo) prompt += `Soru Numarası: ${questionNo}\n`;
  if (studentAnswer) prompt += `Öğrencinin Yanıtı: ${studentAnswer}\n`;
  if (correctAnswer) prompt += `Doğru Yanıt: ${correctAnswer}\n`;
  if (cleanReason) prompt += `Öğrencinin Belirttiği Hata Sebebi: ${cleanReason}\n`;

  if (htmlPayload && typeof htmlPayload === 'string') {
    const cleanHtml = htmlPayload
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .slice(0, 30000);
    prompt += `\nTEST DÖKÜMANI / HTML METNİ:\n"""\n${cleanHtml}\n"""\n`;
    prompt += `\nYukarıdaki test dökümanında yer alan ${questionNo}. soruyu bul, soru kökünü ve şıklarını dikkatle analiz ederek çözümü üret.\n`;
  }

  if (questionText && questionText.trim()) {
    prompt += `\nSORU METNİ:\n"""\n${questionText}\n"""\n`;
  }
  if (Array.isArray(options) && options.length > 0) {
    prompt += `\nŞIKLAR:\n${options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}\n`;
  }

  prompt += `\nDöndürülecek JSON Şeması:
{
  "correctAnswer": "A",
  "summary": "Sorunun 1-2 cümlelik özeti ve ana fikri",
  "steps": [
    "1. Adım: Verilenleri ve istenenleri belirleyelim...",
    "2. Adım: Formülü/kuralı uygulayalım...",
    "3. Adım: Sonucu hesaplayalım ve doğru şıkkı bulalım..."
  ],
  "mistakeAdvice": "Öğrencinin seçtiği '${cleanReason}' sebebine göre nokta atışı koçluk uyarısı ve tavsiyesi",
  "goldenRule": "Bu soruyu çözmek için gereken altın kural, formül veya püf nokta",
  "similarQuestion": {
    "questionText": "Öğrencinin bu konuyu pekiştirmesi için 1 adet benzer mini soru metni...",
    "options": ["A) Şık 1", "B) Şık 2", "C) Şık 3", "D) Şık 4"],
    "correctAnswerLetter": "B",
    "explanation": "Pekiştirme sorusunun kısa çözümü"
  }
}`;

  // 4. Prepare Parts (Multimodal Image + Text)
  const parts = [];

  if (imageBase64 && typeof imageBase64 === 'string') {
    const resolvedImg = await resolveImageToBase64(imageBase64);
    if (resolvedImg && resolvedImg.data) {
      parts.push({
        inlineData: {
          mimeType: resolvedImg.mimeType || 'image/jpeg',
          data: resolvedImg.data
        }
      });
    }
  }

  parts.push({ text: systemInstruction + '\n\n' + prompt });

  const requestBody = {
    contents: [
      { parts }
    ],
    generationConfig: {
      temperature: 0.3,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096
    }
  };

  let responseData = null;
  let lastError = null;

  const preferredModel = localStorage.getItem('system_ai_default_model') || 'gemini-2.5-flash';
  const prioritizedModels = [
    preferredModel,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b'
  ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

  for (const model of prioritizedModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${effectiveKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        try {
          controller.abort(new Error(`Timeout: ${model} 12 saniyede yanıt vermedi.`));
        } catch {
          controller.abort();
        }
      }, 12000);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
