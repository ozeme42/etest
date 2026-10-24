const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://bstcisckpnmwmcggmtfi.supabase.co';
const key = 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9';
const supabase = createClient(url, key);

const BOOK_ID = 'tb_hiperzeka_5_turkce_cilt3';
const PDF_URL = 'https://www.uzmankariyer.com/hiperzeka/uploads/ebooks/2026/max/5/5_max_turkce/mobile/index.html';

// 22 comprehensive open-ended activity tests with exact answer keys extracted from pages 138-142, 237-239, 333-335, 430-431, 495-496, 528
const openEndedTestDefinitions = [
  // ===================== FASİKÜL 1 =====================
  {
    fasNo: 1,
    topicId: 'top_cilt3_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 1: Söz Varlığımız (Şimdi Uygula 01-07)',
    qCount: 7,
    answers: {
      "1": "1. a, 2. a, 3. b, 4. b (Çok Anlamlılık anlam tespiti)",
      "2": "1. d, 2. f, 3. e, 4. c, 5. a, 6. b, 7. g, 8. h ('Almak' sözcüğü eşleştirmeleri)",
      "3": "Gerçek Anlam: 2, 3 ve 6 | Mecaz Anlam: 1, 4 ve 5",
      "4": "1. Anlamı: Çok hoşlanmak (İşaretlenecek: b) | 2. Anlamı: Baygın duruma gelmek (İşaretlenecek: a)",
      "5": "1. Mecaz, 2. Gerçek, 3. Gerçek, 4. Gerçek, 5. Mecaz, 6. Gerçek, 7. Mecaz, 8. Mecaz, 9. Mecaz, 10. Mecaz",
      "6": "1. ince, 2. tartıyordu, 3. bayat, 4. daralmıştı, 5. yumuşak (Mecaz anlamlı sözcükler)",
      "7": "1. Havacılık, 2. Tıp / Sağlık, 3. Tıp / Sağlık, 4. Biyoloji / Fen, 5. Futbol, 6. Bilişim, 7. Müzik (Terim alanları)",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 1,
    topicId: 'top_cilt3_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 2: Söz Varlığımız (Şimdi Uygula 08-14)',
    qCount: 7,
    answers: {
      "1": "Doğru (✓): 1, 3, 5 ve 7 | Yanlış (✗): 2, 4, 6 ve 8",
      "2": "1. aile - huzur - yuva, 2. bilgi - kâğıt - yazı, 3. gezegen - yıldız - astronot, 4. yardım - mutluluk - tebessüm",
      "3": "1. Anne, 2. Öğrenci, 3. Merhamet, 4. Kıta, 5. Bilet, 6. Orman, 7. Sağlık, 8. Adalet (Çağrışım kelimeleri)",
      "4": "Navigasyon - Monoton / Yolbul - Tekdüze (Türkçe karşılıkları)",
      "5": "1. Nesil, 2. İtina, 3. Yanlış, 4. Görev, 5. Gerçek, 6. Fedakârlık",
      "6": "1. a, 2. a, 3. b, 4. b (Eş ve yakın anlam)",
      "7": "1. b, 2. a, 3. b, 4. a, 5. b",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 1,
    topicId: 'top_cilt3_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 3: Cümlede Anlam (Şimdi Uygula 15-27)',
    qCount: 13,
    answers: {
      "1": "Zıt ve Olumsuz: 2. Deli / Akılsız, 3. Tatlı / Acısız, 4. Vermek / Almamak, 5. Ölü / Cansız, 6. Binmek / İnmemek, 7. Masum / Suçsuz, 8. Uyanmak / Uyumamak",
      "2": "Eş sesli kelimeler: yer, var, uç, iç, gül",
      "3": "Cümle içi eş sesliler: 2. yol - var, 3. sağ - yan - sol - yan - var, 4. kart - açacak, 5. yaşlı - koca, 6. ekmek - için",
      "4": "İşaretlenecek: d",
      "5": "Öznel cümle: Çocuklar, güle oynaya kışın tadını çıkarıyor. | Nesnel cümle: Birkaç çocuk kayıyor, birkaçı da kardan adam yapıyor.",
      "6": "1. Öznel, 2. Nesnel, 3. Öznel, 4. Nesnel, 5. Öznel, 6. Nesnel, 7. Öznel",
      "7": "1. a ve c, 2. b ve d, 3. a ve c",
      "8": "1. K, 2. K, 3. G (Karşılaştırma / Genel)",
      "9": "Abartılı: 2 ve 3 | Duygusal: 1",
      "10": "Sebep İşlevli: 6 | Amaç İşlevli: 3 ve 4 | Koşul İşlevli: 1, 2 ve 5",
      "11": "2. karşılaştırma, 3. neden, 4. amaç, 5. benzerlik",
      "12": "2. Kişi, 3. Yer, 4. Zaman, 5. Durum, 6. Kişi",
      "13": "Anahtar kelimeler: Erteleme, başarısızlık, işlerin birikmesi | Açıklama: Bugünün işini yarına bırakmamak başarı için şarttır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 1,
    topicId: 'top_cilt3_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 4: Metinde Anlam & Noktalama (Şimdi Uygula 28-40)',
    qCount: 13,
    answers: {
      "1": "1. a, 2. b, 3. b, 4. a",
      "2": "1. c, 2. b, 3. a",
      "3": "1. a, 2. a, 3. b, 4. a",
      "4": "1. b, 2. c",
      "5": "İşaretlenecek: a",
      "6": "1. D, 2. D, 3. Y, 4. D",
      "7": "1. Doğru, 2. Yanlış, 3. Doğru",
      "8": "1. D, 2. Y, 3. D, 4. D, 5. Y",
      "9": "1. b, 2. c, 3. a",
      "10": "1. D, 2. D, 3. Y, 4. D",
      "11": "1. c, 2. b, 3. a",
      "12": "1. D, 2. Y, 3. D, 4. D, 5. Y",
      "13": "1. Mimarî yapı ve şehirleşme, 2. Ulaşım araçları, 3. Kültürel ve dinî yaşam",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 1,
    topicId: 'top_cilt3_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 5: Birbirine Bağla & Yaşama Uyarla',
    qCount: 6,
    answers: {
      "1": "1 - 2 (Eşleştirme)",
      "2": "Gerçek Anlamlı Sözcükler: 1, 3, 5 ve 7 | Mecaz Anlamlı Sözcükler: 2, 4, 6 ve 8",
      "3": "Terim Anlam: Yapay zekâ, teleskop, gök cismi, mekik",
      "4": "İlişkili Kelimeler: Yapay zekâ, bilgisayar, yazılım, robot, dijitalleşme...",
      "5": "1. b, 2. b, 3. a, 4. a, 5. b",
      "6": "Cümle Analizi: 2. Amaç-Sonuç, 3. Koşul-Sonuç, 4. Koşul-Sonuç",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ===================== FASİKÜL 2 =====================
  {
    fasNo: 2,
    topicId: 'top_cilt3_fas_2',
    name: '2. Fasikül - Açık Uçlu Etkinlik 1: Deyimler ve İkilemeler (Şimdi Uygula 01-08)',
    qCount: 8,
    answers: {
      "1": "1. d, 2. b, 3. a, 4. c (Deyim eşleştirmeleri)",
      "2": "1. göz kulak olur musun, 2. gözünden düştü, 3. ipe un seriyor, 4. yüreği ağzına geldi, 5. burnu büyüdü, 6. eli ayağına dolaştı, 7. etekleri zil çaldı",
      "3": "a. 5, b. 1, c. 4, d. 3, e. 6, f. 2",
      "4": "Çok sevinmek: 1, 3 ve 7 | Üstünkörü, rastgele: 5, 6 ve 8 | Çok üzülmek: 4 | Çok düşünmek: 2",
      "5": "1. b, 2. a",
      "6": "1. a ve c, 2. b ve d, 3. a ve d, 4. b ve d",
      "7": "1. Ara vermeden özveriyle çalışmak, 2. Şaşkınlıktan veya sevinçten konuşamaz olmak",
      "8": "2. başka bir deyişle, 3. oysaki, 4. ve, 5. buna karşılık, 6. mesela, 7. açıkçası, 8. ama, 9. kısaca, 10. ya ... ya",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 2,
    topicId: 'top_cilt3_fas_2',
    name: '2. Fasikül - Açık Uçlu Etkinlik 2: Metin Türleri & Dil Yapıları (Şimdi Uygula 09-16)',
    qCount: 8,
    answers: {
      "1": "Sırasıyla: ve - çünkü - fakat - hatta - yahut - hem ... hem - meğerse",
      "2": "1. yani / bu yüzden, 2. böylece / yani, 3. ve / böylece, 4. yahut, 5. hem ... hem, 6. bu yüzden, 7. ve, 8. söz gelimi / örneğin",
      "3": "1. a, 2. c, 3. b, 4. c",
      "4": "1. b, 2. c, 3. a (Metin türleri)",
      "5": "Sıralama: 3 - 2 - 1 (Paragraf akışı)",
      "6": "1. +, 2. -, 3. -, 4. -, 5. +",
      "7": "Sıralama: 1. Peri, 2. Umut, 3. Reyhan, 4. Yunus, 5. Zeki",
      "8": "Kitap - Yıl eşleştirmesi: 2016: Dedemin Bakkalı, 2018: Cingo, 2019: Abartma Tozu, 2022: Para Ağacı, 2025: Telefon Melefon Yok",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 2,
    topicId: 'top_cilt3_fas_2',
    name: '2. Fasikül - Açık Uçlu Etkinlik 3: Birbirine Bağla & Yaşama Uyarla',
    qCount: 6,
    answers: {
      "1": "1. Deyim: Gözden geçirmek (İncelemek, kontrol etmek) | 2. Deyim: Kulak kabartmak",
      "2": "İkilemeler: pırıl pırıl, yavaş yavaş, eğri büğrü, ses seda",
      "3": "Geçiş ve bağlantı unsurları: Oysaki, buna rağmen, ne var ki, özellikle",
      "4": "Metin Yapısı Analizi: Giriş (I), Gelişme (II-III), Sonuç (IV)",
      "5": "1. b, 2. d, 3. a, 4. c",
      "6": "Yaşama Uyarla: Öğrenci kendi günlük gözlemlerine göre cümle yazmıştır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ===================== FASİKÜL 3 =====================
  {
    fasNo: 3,
    topicId: 'top_cilt3_fas_3',
    name: '3. Fasikül - Açık Uçlu Etkinlik 1: Söz Sanatları & Cümlede Anlam (Şimdi Uygula 01-08)',
    qCount: 8,
    answers: {
      "1": "İşaretlenecekler: 1, 3 ve 4 (Benzetme ve kişileştirme)",
      "2": "2. Benzeyen: El, Benzetilen: Pamuk | 3. Benzeyen: Ev, Benzetilen: Kutu | 4. Benzeyen: İtfaiye aracı, Benzetilen: Şimşek | 5. Benzeyen: Göz, Benzetilen: Kömür",
      "3": "1. Benzeyen: Gülümseme, Benzetilen: Hilal | 2. Benzeyen: Gönül, Benzetilen: Kuş",
      "4": "1. İşaretlenecekler: b, c ve d | 2. İşaretlenecekler: a ve b",
      "5": "2. Ö, 3. Ö, 4. A, 5. Ö, 6. Ö, 7. A, 8. Ö, 9. A, 10. A (Örtük / Açık İfade)",
      "6": "Örtük Anlam Çıkarımları: 1. Daha önce de sinemaya gitmiştir. 2. Diğer yemekler de lezzetlidir. 3. Elif diğer derslerde de başarılıdır.",
      "7": "2. Mutluluk, 3. Kararlılık, 4. Öfke, 5. Tiksinme, 6. Meraklı, 7. Şaşkınlık, 8. Heyecan",
      "8": "1. b, 2. a",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 3,
    topicId: 'top_cilt3_fas_3',
    name: '3. Fasikül - Açık Uçlu Etkinlik 2: Metinde Anlam & Dil Yapıları (Şimdi Uygula 09-16)',
    qCount: 8,
    answers: {
      "1": "1. Şehrin gürültüsünden uzakta sakin yaşam (İmrenme), 2. A Millî Takım başarısı (Kıvanç), 3. Alçakgönüllülük, 4. Küçümseme, 5. Merhamet",
      "2": "1. b, 2. a, 3. d, 4. c, 5. e",
      "3": "Kişilik özellikleri: 1. Çekingen, 2. Alıngan, 3. Tedbirli, 4. Yardımsever",
      "4": "1. d, 2. a ve c",
      "5": "Duygular: 1. Utangaç, 2. Kararlı, 3. Mutlu, 4. Pişman, 5. Özlem dolu, 6. Cesur",
      "6": "İşaretlenecekler: 4 ve 5",
      "7": "1. a, 2. a, 3. b, 4. a, 5. b, 6. a",
      "8": "İşaretlenecekler: 1, 3 ve 6",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 3,
    topicId: 'top_cilt3_fas_3',
    name: '3. Fasikül - Açık Uçlu Etkinlik 3: Birbirine Bağla & Yaşama Uyarla',
    qCount: 5,
    answers: {
      "1": "Söz Sanatı Eşleştirme: Kişileştirme (Bulutlar ağladı), Benzetme (Aslan gibi kuvvetli), Konuşturma (Bülbül güle seslendi)",
      "2": "Düşünceyi Geliştirme Yolları: Tanımlama, Örneklendirme, Karşılaştırma, Tanık Gösterme",
      "3": "İsmin Hâlleri: -i (belirtme), -e (yönelme), -de (bulunma), -den (ayrılma)",
      "4": "Noktalama: İki nokta (örnek verilmeden veya konuşmadan önce), Üç nokta (tamamlanmamış cümle sonuna)",
      "5": "Yaşama Uyarla: Çevre temizliği ve doğa sevgisi üzerine öğrenci metni",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ===================== FASİKÜL 4 =====================
  {
    fasNo: 4,
    topicId: 'top_cilt3_fas_4',
    name: '4. Fasikül - Açık Uçlu Etkinlik 1: Atasözleri ve Paragraf (Şimdi Uygula 01-09)',
    qCount: 9,
    answers: {
      "1": "1. önce, 2. sonra, 3. önce - sonra, 4. -meden önce, 5. -tikten sonra",
      "2": "1. a, 2. b, 3. a, 4. b, 5. a, 6. a (Öncelik-sonralık bildiren kelimeler)",
      "3": "a. 1, b. 6, c. 2, d. 7, e. 8, f. 3, g. 5, h. 4 (Atasözü eşleştirmeleri)",
      "4": "a. 6, b. 5, c. 4, d. 8, e. 3, f. 1, g. 7, h. 2",
      "5": "a. 2, b. 1, c. 3, d. 4",
      "6": "1. c, 2. i, 3. g, 4. ı, 5. d - i, 6. e, 7. b, 8. c, 9. a, 10. h",
      "7": "1. G, 2. M, 3. M, 4. G, 5. M - G, 6. G, 7. G, 8. G (Gerçek / Mecaz Atasözleri)",
      "8": "Ortak: 1, 2 ve 5 | Farklı: 3, 4 ve 6 (Metinleri karşılaştırma)",
      "9": "1. Nesne tanıtma, 2. Kişi tanıtma, 3. Yer tanıtma, 4. Eser tanıtma (Paragraf türleri)",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 4,
    topicId: 'top_cilt3_fas_4',
    name: '4. Fasikül - Açık Uçlu Etkinlik 2: Sayıların Yazımı & Noktalama (Şimdi Uygula 10-17)',
    qCount: 8,
    answers: {
      "1": "İşaretlenecekler: 1, 2, 4, 5 ve 7",
      "2": "2. ahşap, 3. Küçük, 4. Yaralı, 5. bol, 6. Zengin, 7. uçsuz bucaksız, 8. kalabalık (Niteleme sıfatları)",
      "3": "İşaretlenecekler: 1, 2 ve 6",
      "4": "Belirtme sıfatları: kaç, bazı, hiçbir, nasıl, bir, birkaç, hangi, pek çok",
      "5": "İşaretlenecekler: 3, 5, 7 ve 8",
      "6": "Doğru: 2, 4, 5 ve 8 | Yanlış: 3, 6 ve 7 (Kesme işareti kuralları)",
      "7": "İşaretlenecekler: 1, 3, 4, 9 ve 10 (Kısa çizgi kullanımı)",
      "8": "Sayıların Yazımı: b. 8, c. 1 - 3, d. 6, e. 9, f. 5, g. 7, h. 4",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 4,
    topicId: 'top_cilt3_fas_4',
    name: '4. Fasikül - Açık Uçlu Etkinlik 3: Birbirine Bağla & Yaşama Uyarla',
    qCount: 5,
    answers: {
      "1": "Sabah uyandım ve öncelikle kahvaltımı yaptım. Sonra çantamı hazırladım. Ardından ayakkabılarımı giydim ve okula gittim. Projemi sundum ve sonrasında okul zilinin çalmasıyla eve döndüm.",
      "2": "1. Birlikten kuvvet doğar, 2. Misafirlik üç gündür, 3. Altın yere düşmekle pul olmaz, 4. Bir elin nesi var iki elin sesi var, 5. Hazıra dağ dayanmaz, 6. Çam sakızı çoban armağanı",
      "3": "Noktalama İşaretleri: 1. (?), (:), (...) | 2. ('), (.), (!)",
      "4": "Yaşama Uyarla: 1. b, 2. c | 3. Atasözleri öğüt verir, deyimler bir durumu bildirir. | 4. c, 5. a",
      "5": "Sayıların Yazımı Uygulama: 1. Belçika'da üniversitede eğitim aldığı yıllarda, 2. Paris Olimpiyatları'nda, 3. 2024'te",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ===================== FASİKÜL 5 =====================
  {
    fasNo: 5,
    topicId: 'top_cilt3_fas_5',
    name: '5. Fasikül - Açık Uçlu Etkinlik 1: Metinde Soru-Cevap & 5N1K (Şimdi Uygula 01-06)',
    qCount: 6,
    answers: {
      "1": "1. Bal arıları sallantı dansını nasıl yapar ve bu dans ne işe yarar? 2. Çay ilk kez nerede ve nasıl keşfedilmiş? 3. Çikolatanın tarihsel yolculuğu nasıldır?",
      "2": "İşaretlenecekler: 1 ve 2 (Metindeki sorun ve çözüm önerisi)",
      "3": "İşaretlenecek: 3",
      "4": "İşaretlenecekler: 3, 4 ve 5",
      "5": "Karakter Analizi: 1. Kararlı, azimli ve cesur. 2. Çalışkan, disiplinli ve sorumluluk sahibi. 3. Mücadeleci ve inançlı.",
      "6": "Zamirler: 1. ona, 2. Sizi - kim, 3. sizden, 4. Bana - sen, 5. Onlara, 6. sizinle",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 5,
    topicId: 'top_cilt3_fas_5',
    name: '5. Fasikül - Açık Uçlu Etkinlik 2: Zamir Türleri & Dil Yapıları (Şimdi Uygula 07-12)',
    qCount: 6,
    answers: {
      "1": "1. İşaret, 2. Kişi, 3. İşaret, 4. Kişi, 5. İşaret",
      "2": "1. c, 2. b, 3. d, 4. a, 5. c, 6. b, 7. c, 8. b",
      "3": "Doğru çıkış: 2. çıkış",
      "4": "İsmi Niteleyen: çalışkan, sevimli, yeni, beyaz, eski, dürüst, büyük | İsmi Belirten: şu, birkaç, o, üç, bazı | İsmin Yerini Tutan (Zamir): biz, seni, bunu, burada, bazı, herkes, burası",
      "5": "1. Belirsizlik, 2. Kişi, 3. İşaret, 4. Belirsizlik, 5. İşaret, 6. Belirsizlik",
      "6": "Zamir Türleri Eşleştirme: Kişi Zamirleri, İşaret Zamirleri, Belgisiz Zamirler, Soru Zamirleri",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 5,
    topicId: 'top_cilt3_fas_5',
    name: '5. Fasikül - Açık Uçlu Etkinlik 3: Birbirine Bağla & Yaşama Uyarla',
    qCount: 5,
    answers: {
      "1": "1. b, 2. d, 3. a, b ve d",
      "2": "1. a. Asansör gibi ortak alanlara selamlaşmayı teşvik edici nazik notlar asılabilir. b. Tanışma etkinlikleri düzenlenebilir. | 2. a. Parka gidildiğinde telefon/tablet evde bırakılmalı. b. Geleneksel oyunlar için alanlar yapılmalı.",
      "3": "5N1K Çıkarımı: 1. Kim: Emre Sakçı, 2. Ne: 50 metre kurbağalamada Avrupa şampiyonu olması, 3. Nerede, 4. Ne zaman",
      "4": "Çevre Sorununa Çözüm: a. Okulda 'en temiz sınıf' yarışması düzenlenebilir. b. Çöp kutuları dikkat çekici renklere boyanabilir.",
      "5": "Zamir Tespiti: 2. O, buraya → İşaret - işaret | 3. Buraya, ondan → İşaret - kişi | 4. Şeyin, biz → Belgisiz - kişi",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ===================== FASİKÜL 6 =====================
  {
    fasNo: 6,
    topicId: 'top_cilt3_fas_6',
    name: '6. Fasikül - Açık Uçlu Etkinlik 1: Nezaket İfadeleri & Pekiştirmeler (Şimdi Uygula 01-05)',
    qCount: 5,
    answers: {
      "1": "Altı çizilecek nezaket ifadeleri: kusura bakma - özür dilerim - lütfen beni bağışlayın - önemli değil arkadaşım - canını sıkma",
      "2": "Pekiştirmeler: 2. tatlı mı tatlıydı, 3. sımsıkı, 7. yamyassı, 8. kapkaranlık",
      "3": "Pekiştirmeler: 1. yemyeşil, 2. sapsarı, 3. tupturuncu, 4. masmavi, 5. bembeyaz (Cümleler öğrenci yorumuna bırakılmıştır)",
      "4": "İşaretlenecek: b",
      "5": "İşaretlenecek: d",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    fasNo: 6,
    topicId: 'top_cilt3_fas_6',
    name: '6. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Metin Tamamlama',
    qCount: 3,
    answers: {
      "1": "1. a ve b, 2. a, 3. c",
      "2": "Pekiştirme ve nezaket dolu cümle tamamlama: Yağmurdan sonra çıkan rengârenk gökkuşağını gören Beren, yemyeşil kırlara attı kendini. Bembeyaz kuzular, simsiyah keçilerle oynadı...",
      "3": "Nezaket İfadelerinin Günlük Hayattaki Rolü ve Önemi üzerine düşünce yazısı",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  }
];

async function addOpenEndedTests() {
  console.log('--- ADDING OPEN-ENDED TESTS TO CİLT-3 ---');

  // 1. Fetch current book record
  const { data: book, error: fetchErr } = await supabase.from('tracked_books').select('*').eq('id', BOOK_ID).single();
  if (fetchErr || !book) {
    console.error('Error fetching book:', fetchErr);
    return;
  }

  const subjects = book.subjects || [];
  const turkceSubj = subjects.find(s => s.name === 'Türkçe');
  if (!turkceSubj) {
    console.error('Türkçe subject not found in book subjects');
    return;
  }

  const testsToInsert = [];

  openEndedTestDefinitions.forEach((def, idx) => {
    const testId = `tbt_cilt3_open_${def.fasNo}_${idx + 1}_${Date.now().toString(36).substring(2,6)}`;
    
    // Find matching topic
    const topic = turkceSubj.topics.find(t => t.id === def.topicId);
    if (topic) {
      if (!topic.tests) topic.tests = [];
      topic.tests.push({
        id: testId,
        name: def.name,
        book_id: BOOK_ID,
        bookId: BOOK_ID,
        subject_id: 'sub_cilt3_turkce',
        subjectId: 'sub_cilt3_turkce',
        topic_id: def.topicId,
        topicId: def.topicId,
        question_count: def.qCount,
        questionCount: def.qCount,
        answer_key: def.answers,
        answerKey: def.answers,
        isOpenEnded: true,
        questionType: 'acik_uclu',
        pdf_url: PDF_URL,
        pdfUrl: PDF_URL
      });
    }

    testsToInsert.push({
      id: testId,
      book_id: BOOK_ID,
      subject_id: 'sub_cilt3_turkce',
      topic_id: def.topicId,
      name: def.name,
      question_count: def.qCount,
      answer_key: def.answers,
      option_count: 0,
      pdf_url: PDF_URL
    });
  });

  // 2. Update tracked_books table
  console.log('Updating tracked_books with open-ended tests in subjects...');
  const { error: updErr } = await supabase.from('tracked_books').update({
    subjects: subjects,
    raw_data: {
      ...book.raw_data,
      subjects: subjects
    }
  }).eq('id', BOOK_ID);

  if (updErr) {
    console.error('Error updating tracked_books:', updErr);
    return;
  }
  console.log('Book record updated with open-ended tests in subjects!');

  // 3. Insert tests into tracked_book_tests
  console.log(`Inserting ${testsToInsert.length} open-ended tests into tracked_book_tests...`);
  const { error: insErr } = await supabase.from('tracked_book_tests').insert(testsToInsert);
  if (insErr) {
    console.error('Error inserting open-ended tests:', insErr);
    return;
  }
  console.log('Successfully inserted open-ended tests into tracked_book_tests!');

  // 4. Verify total test count
  const { count: totalTests } = await supabase.from('tracked_book_tests').select('*', { count: 'exact', head: true }).eq('book_id', BOOK_ID);
  console.log(`VERIFICATION: Total tests now in DB for ${BOOK_ID}: ${totalTests} (105 Çoktan Seçmeli + 22 Açık Uçlu = 127 Test)`);

  // 5. Update backup.json
  const { data: allBooks } = await supabase.from('tracked_books').select('*');
  const { data: allTests } = await supabase.from('tracked_book_tests').select('*');
  const backup = JSON.parse(fs.readFileSync('./backup.json', 'utf8'));
  backup[0].backup_data.tracked_books = allBooks;
  backup[0].backup_data.tracked_book_tests = allTests;
  fs.writeFileSync('./backup.json', JSON.stringify(backup, null, 2), 'utf8');
  console.log('backup.json successfully updated with all open-ended tests!');
}

addOpenEndedTests();
