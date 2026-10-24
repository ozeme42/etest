const fs = require('fs');

const BOOK_ID = 'tb_hiperzeka_5_fen_max';
const SUBJECT_ID = 'sub_max_fen_5';

const topics = [
  { id: 'top_max_fen_fas_1', name: '1. Fasikül: Güneş, Dünya ve Ay', order: 1 },
  { id: 'top_max_fen_fas_2', name: '2. Fasikül: Kuvvetin Ölçülmesi ve Sürtünme', order: 2 },
  { id: 'top_max_fen_fas_3', name: '3. Fasikül: Canlıların Yapısına Yolculuk', order: 3 },
  { id: 'top_max_fen_fas_4', name: '4. Fasikül: Işığın Yayılması', order: 4 },
  { id: 'top_max_fen_fas_5', name: '5. Fasikül: Madde ve Değişim', order: 5 },
  { id: 'top_max_fen_fas_6', name: '6. Fasikül: Yaşamımızdaki Elektrik', order: 6 },
  { id: 'top_max_fen_fas_7', name: '7. Fasikül: Sürdürülebilir Yaşam ve Geri Dönüşüm', order: 7 }
];

const mcTests = [
  // ================= 1. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Kavramları Kavra 01',
    answerKey: {"1":"A","2":"D","3":"D","4":"C","5":"B","6":"B","7":"D","8":"C","9":"C","10":"A"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Kavramları Kavra 02',
    answerKey: {"1":"C","2":"C","3":"D","4":"B","5":"D","6":"B","7":"B","8":"A","9":"A","10":"C"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Kavramları Kavra 03',
    answerKey: {"1":"C","2":"A","3":"B","4":"B","5":"B","6":"A","7":"C","8":"B","9":"B","10":"A","11":"C","12":"C"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"B","2":"A","3":"C","4":"B","5":"D","6":"A","7":"C"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Öğrendiğini Kanıtla 02',
    answerKey: {"1":"D","2":"B","3":"D","4":"C","5":"D","6":"D","7":"A","8":"C"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Öğrendiğini Kanıtla 03',
    answerKey: {"1":"B","2":"D","3":"C","4":"C","5":"B","6":"D","7":"A"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Öğrendiğini Kanıtla 04',
    answerKey: {"1":"C","2":"A","3":"B","4":"A","5":"D","6":"D","7":"B","8":"A"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Öğrendiğini Kanıtla 05',
    answerKey: {"1":"A","2":"B","3":"A","4":"D","5":"A"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"A","2":"A","3":"B","4":"D"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Becerini Sergile 02',
    answerKey: {"1":"A","2":"A","3":"D","4":"B"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Becerini Sergile 03',
    answerKey: {"1":"B","2":"B","3":"C","4":"C"}
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"C","2":"D","3":"A","4":"B","5":"A","6":"C","7":"A","8":"B","9":"A","10":"A"}
  },

  // ================= 2. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Kavramları Kavra 01',
    answerKey: {"1":"B","2":"C","3":"C","4":"D","5":"A","6":"C","7":"C","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"B","2":"B","3":"C","4":"A","5":"B","6":"D","7":"A","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Öğrendiğini Kanıtla 02',
    answerKey: {"1":"C","2":"A","3":"C","4":"B","5":"B","6":"C","7":"B"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Öğrendiğini Kanıtla 03',
    answerKey: {"1":"D","2":"B","3":"C","4":"C","5":"D","6":"A","7":"A","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Öğrendiğini Kanıtla 04',
    answerKey: {"1":"D","2":"A","3":"C","4":"C","5":"B","6":"C","7":"D","8":"B","9":"C"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"C","2":"D","3":"D","4":"D"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Becerini Sergile 02',
    answerKey: {"1":"B","2":"B","3":"C","4":"D"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Becerini Sergile 03',
    answerKey: {"1":"D","2":"A","3":"B","4":"A"}
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"A","2":"B","3":"C","4":"D","5":"B","6":"C","7":"A","8":"D","9":"A","10":"B"}
  },

  // ================= 3. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Kavramları Kavra 01',
    answerKey: {"1":"B","2":"A","3":"B","4":"C","5":"B","6":"C","7":"B","8":"A"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Kavramları Kavra 02',
    answerKey: {"1":"C","2":"C","3":"A","4":"B","5":"C","6":"C","7":"B","8":"C"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Kavramları Kavra 03',
    answerKey: {"1":"B","2":"C","3":"B","4":"B","5":"B","6":"C","7":"B","8":"B","9":"C","10":"C","11":"B"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Kavramları Kavra 04',
    answerKey: {"1":"C","2":"C","3":"B","4":"D","5":"C","6":"D","7":"C","8":"D","9":"C","10":"B","11":"A"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"C","2":"B","3":"B","4":"C","5":"C","6":"A","7":"C","8":"A","9":"B"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Öğrendiğini Kanıtla 02',
    answerKey: {"1":"C","2":"B","3":"C","4":"D","5":"D","6":"C","7":"C","8":"A"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Öğrendiğini Kanıtla 03',
    answerKey: {"1":"A","2":"B","3":"A","4":"B","5":"A","6":"C"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Öğrendiğini Kanıtla 04',
    answerKey: {"1":"C","2":"A","3":"A","4":"A","5":"B","6":"B","7":"A","8":"C","9":"C"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Öğrendiğini Kanıtla 05',
    answerKey: {"1":"A","2":"B","3":"D","4":"C","5":"D","6":"A","7":"A","8":"D"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"A","2":"B","3":"D","4":"A"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Becerini Sergile 02',
    answerKey: {"1":"C","2":"D","3":"C","4":"A"}
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"D","2":"A","3":"A","4":"C","5":"C","6":"D","7":"B","8":"A","9":"B","10":"B"}
  },

  // ================= 4. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Kavramları Kavra 01',
    answerKey: {"1":"D","2":"C","3":"A","4":"C","5":"B","6":"C","7":"C","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Kavramları Kavra 02',
    answerKey: {"1":"A","2":"A","3":"C","4":"C","5":"B","6":"B","7":"A","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"B","2":"B","3":"A","4":"D","5":"B","6":"D","7":"A","8":"A"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Öğrendiğini Kanıtla 02',
    answerKey: {"1":"B","2":"D","3":"D","4":"D","5":"C","6":"C"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Öğrendiğini Kanıtla 03',
    answerKey: {"1":"B","2":"B","3":"A","4":"B","5":"D","6":"D","7":"D"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"A","2":"D","3":"B","4":"B"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Becerini Sergile 02',
    answerKey: {"1":"C","2":"D","3":"B","4":"D"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Becerini Sergile 03',
    answerKey: {"1":"B","2":"C","3":"D","4":"D"}
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"C","2":"A","3":"D","4":"A","5":"C","6":"A","7":"C","8":"A","9":"D"}
  },

  // ================= 5. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Kavramları Kavra 01',
    answerKey: {"1":"A","2":"B","3":"D","4":"C","5":"B","6":"D","7":"A"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Kavramları Kavra 02',
    answerKey: {"1":"B","2":"B","3":"C","4":"A","5":"B","6":"C"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Kavramları Kavra 03',
    answerKey: {"1":"B","2":"A","3":"A","4":"C","5":"D","6":"C","7":"C","8":"B","9":"C"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Kavramları Kavra 04',
    answerKey: {"1":"C","2":"B","3":"B","4":"A","5":"C","6":"B","7":"B","8":"C","9":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"B","2":"D","3":"D","4":"B","5":"B","6":"B","7":"C","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 02',
    answerKey: {"1":"A","2":"B","3":"A","4":"B","5":"A","6":"D","7":"D","8":"D"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 03',
    answerKey: {"1":"A","2":"D","3":"C","4":"B","5":"C","6":"C","7":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 04',
    answerKey: {"1":"D","2":"C","3":"B","4":"D","5":"C","6":"B","7":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 05',
    answerKey: {"1":"D","2":"C","3":"B","4":"B","5":"D","6":"B","7":"B","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 06',
    answerKey: {"1":"C","2":"D","3":"D","4":"B","5":"C","6":"C","7":"C"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Öğrendiğini Kanıtla 07',
    answerKey: {"1":"D","2":"A","3":"B","4":"D","5":"B","6":"B","7":"B","8":"A"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"C","2":"C","3":"A","4":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Becerini Sergile 02',
    answerKey: {"1":"D","2":"D","3":"B","4":"D"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Becerini Sergile 03',
    answerKey: {"1":"B","2":"A","3":"B","4":"B"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Becerini Sergile 04',
    answerKey: {"1":"B","2":"C","3":"C","4":"C"}
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"A","2":"B","3":"A","4":"A","5":"B","6":"D","7":"C","8":"A","9":"D","10":"C","11":"D","12":"A"}
  },

  // ================= 6. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"B","2":"C","3":"A","4":"C","5":"B","6":"C","7":"D","8":"D"}
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Öğrendiğini Kanıtla 02',
    answerKey: {"1":"C","2":"B","3":"C","4":"B","5":"D","6":"C","7":"C"}
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Öğrendiğini Kanıtla 03',
    answerKey: {"1":"B","2":"D","3":"C","4":"B","5":"C","6":"B","7":"C","8":"D"}
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"B","2":"B","3":"D","4":"A"}
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Becerini Sergile 02',
    answerKey: {"1":"A","2":"B","3":"B","4":"C"}
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"B","2":"C","3":"C","4":"C","5":"C","6":"B","7":"B","8":"C","9":"D","10":"B"}
  },

  // ================= 7. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Kavramları Kavra 01',
    answerKey: {"1":"B","2":"B","3":"B","4":"C","5":"D","6":"C","7":"B","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Kavramları Kavra 02',
    answerKey: {"1":"C","2":"B","3":"C","4":"B","5":"C","6":"B","7":"B","8":"B"}
  },
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Öğrendiğini Kanıtla 01',
    answerKey: {"1":"A","2":"C","3":"B","4":"A","5":"B","6":"D","7":"B","8":"C"}
  },
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Becerini Sergile 01',
    answerKey: {"1":"C","2":"D","3":"C","4":"A"}
  },
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Becerini Değerlendir',
    answerKey: {"1":"A","2":"B","3":"C","4":"D","5":"A","6":"C","7":"B"}
  }
];

// Open-Ended Activity Tests (2 per fasikül: Şimdi Uygula & Birbirine Bağla / Yaşama Uyarla)
const openEndedTests = [
  // Fasikül 1
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-31)',
    qCount: 5,
    answers: {
      "1": "Güneş'in Yapısı ve Özellikleri: Gazlardan oluşur, küreseldir, kendi ekseni etrafında döner.",
      "2": "Ay'ın Yapısı ve Özellikleri: Atmosferi yok denecek kadar azdır, yüzeyinde kraterler bulunur, su ve yaşam yoktur.",
      "3": "Güneş, Dünya ve Ay'ın Büyüklük Karşılaştırması: Güneş > Dünya > Ay.",
      "4": "Ay'ın Hareketleri: Kendi ekseni etrafında döner, Dünya etrafında dolanır, Güneş etrafında dolanır. Hepsi yaklaşık 27,3 günde tamamlanır.",
      "5": "Ay'ın Evreleri: Ana evreler (Yeni Ay, İlk Dördün, Dolunay, Son Dördün) ve ara evreler (Hilal, Şişkin Ay).",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "Birbirine Bağla 01: Sadece Güneş'e ait özellik (2, 3 ve 7), Sadece Dünya'ya ait özellik (6), Ortak özellikler (1, 4, 5 ve 8).",
      "2": "Birbirine Bağla 02: a. L ve M, b. K, c. M, d. K, e. K, f. K ve L, g. M, h. L, ı. K, i. M.",
      "3": "Yaşama Uyarla 01: 1. Görme bozukluklarına yol açabilir. 2. Sıcaklığının çok yüksek olmasıdır. 3. Parker Güneş Sondası. 4. Güneş hakkında yeni bilgiler edinme amaçlıdır.",
      "4": "Yaşama Uyarla 02 & 03: 1. Ay elips yörüngede hareket eder. 2. Zamanı gün, ay, yıl dilimlerine bölmek için takvimler yapılmıştır. 3. 28 Haziran 2023.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // Fasikül 2
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-51)',
    qCount: 5,
    answers: {
      "1": "Kuvvetin Ölçülmesi: Dinamometre ile ölçülür. Birimi Newton'dur (N). Yayların esneklik özelliğinden faydalanılır.",
      "2": "Esneklik Sınırı: Yaya taşıyabileceğinden fazla kuvvet uygulanırsa esneklik özelliği kaybolur.",
      "3": "Sürtünme Kuvveti: Hareketi zorlaştıran veya engelleyen kuvvettir. Pürüzlü yüzeylerde sürtünme fazla, kaygan yüzeylerde azdır.",
      "4": "Hava ve Su Direnci: Hava ve suda cisimlerin hareketini engelleyen sürtünme kuvvetidir.",
      "5": "Sürtünmenin Etkileri: Sürtünmeyi artıranlar (kışlık lastikler, zımpara kağıdı) ve azaltanlar (makinelerin yağlanması, tekerlek kullanımı).",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "Birbirine Bağla: Sürtünme kuvveti kavram haritası ve kuvvet eşleştirmeleri tamamlanır.",
      "2": "Yaşama Uyarla 01: Balıkçılar, manavlar cisimlerin ağırlığını ölçmek için dinamometre kullanır. Kalın yaylar büyük kuvvetleri ölçer.",
      "3": "Yaşama Uyarla 02: Yerçekiminin olmadığı ortamda zıplama ve ağırlık değişimleri analiz edilir.",
      "4": "Yaşama Uyarla 03: Günlük hayatta sürtünmeyi artırma (kaymayı önleme) ve azaltma (hızlı hareket sağlama) uygulamaları.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // Fasikül 3
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-27)',
    qCount: 5,
    answers: {
      "1": "Hücrenin Temel Kısımları: Hücre zarı, sitoplazma ve çekirdek.",
      "2": "Organeller ve Görevleri: Mitokondri (enerji), ribozom (protein), kloroplast (fotosentez), koful (depo), golgi (salgı), lizozom (sindirim).",
      "3": "Bitki ve Hayvan Hücresi Farkları: Bitkide hücre duvarı ve kloroplast bulunur, koful büyük ve az sayıdadır. Hayvanda hücre duvarı yoktur, sentriyol bulunur.",
      "4": "Destek ve Hareket Sistemi: Kemikler (uzun, kısa, yassı), eklemler (oynar, yarı oynar, oynamaz) ve kaslar (çizgili, düz, kalp kası).",
      "5": "Kemik ve Kas Sağlığı: Dengeli beslenme, kalsiyum ve D vitamini, düzenli egzersiz ve doğru duruş alışkanlığı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "Birbirine Bağla 17: Destek ve hareket sistemi bulmacası (Kemik, eklem, kas, omurga, kıkırdak eşleştirmeleri).",
      "2": "Birbirine Bağla 18: Kemikler, eklemler ve kasların birlikte çalışarak hareketi sağlaması; röntgen, MR ve ultrason görüntüleme yöntemleri.",
      "3": "Yaşama Uyarla 01: Mikroskop parçaları (Oküler, objektif); bitki ve hayvan hücresi mikroskop incelemesi.",
      "4": "Yaşama Uyarla 02: Kemik ve kıkırdağın dayanıklı ve esnek mimari yapılara (köprüler vb.) ilham vermesi.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // Fasikül 4
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-26)',
    qCount: 5,
    answers: {
      "1": "Işığın Yayılması: Işık her yönde ve doğrusal yolla yayılır. Işık ışınları ile gösterilir.",
      "2": "Maddelerin Işık Geçirgenliği: Saydam maddeler (cam, hava), yarı saydam maddeler (buzlu cam, yağlı kağıt), opak maddeler (tahta, taş, metal).",
      "3": "Tam Gölge Oluşumu: Işık opak cisimlerden geçemediği için arkasında karanlık gölge alanı oluşur.",
      "4": "Gölge Boyunu Etkileyen Faktörler: Işık kaynağı cisme yaklaştıkça gölge büyür, cisim ekrandan uzaklaştıkça gölge büyür.",
      "5": "Güneş Saati ve Gün İçinde Gölge: Sabah ve akşam gölge uzun, öğle vakti gölge en kısadır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "Birbirine Bağla 01-04: Işığın doğrusal yayılması ve opak cisimlerin arkasında gölge oluşturması kavram ilişkileri.",
      "2": "Yaşama Uyarla 01: İğne deliği kamerası (camera obscura): Görüntünün ters oluşması ışığın doğrusal yayıldığını kanıtlar.",
      "3": "Yaşama Uyarla 02: Gölge oyunları (Hacivat ve Karagöz) ve ışık kaynağı-tasvir mesafesinin gölge boyutuna etkisi.",
      "4": "Yaşama Uyarla 03: Güneş saatleri ile antik dönemde zaman tahmini ve bulutlu günlerdeki sınırları.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // Fasikül 5
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-41)',
    qCount: 5,
    answers: {
      "1": "Maddenin Tanecikli Yapısı: Katı, sıvı ve gazlar boşluklu ve tanecikli yapıdadır. Katılarda boşluk az, gazlarda çok fazladır.",
      "2": "Hâl Değişimi: Erime, donma, buharlaşma, yoğuşma, süblimleşme ve kırağılaşma.",
      "3": "Isı ve Sıcaklık: Isı alınıp verilen bir enerjidir (Joule/Kalori). Sıcaklık termometre ile ölçülür (°C).",
      "4": "Isı Alışverişi: Sıcak maddeden soğuk maddeye doğru ısı akışı olur, denge sıcaklığına ulaşınca biter.",
      "5": "Isı Yalıtımı ve Yalıtım Malzemeleri: Strafor köpük, cam yünü, taş yünü gibi boşluklu malzemeler ısı akışını yavaşlatır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "Birbirine Bağla 01-08: Tanecik hareketliliği (titreşim, öteleme, dönme) ve hâl değişim grafikleri analizi.",
      "2": "Yaşama Uyarla 01: Câbir bin Hayyân ve maddenin tanecikli yapısı, maddelerin atomik boyuttaki davranışları.",
      "3": "Yaşama Uyarla 02 & 03: Isı enerjisinin elektrik enerjisine dönüşümü ve araç egzozlarındaki yalıtım sistemleri.",
      "4": "Yaşama Uyarla 04: Binalarda ısı yalıtımının enerji tasarrufu, ekonomi ve karbon salınımını azaltmadaki hayati önemi.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // Fasikül 6
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-24)',
    qCount: 5,
    answers: {
      "1": "Devre Elemanları ve Sembolleri: Pil (+ ve - kutuplu), iletken kablo, ampul, anahtar (açık/kapalı). Duy ve pil yatağının sembolü yoktur.",
      "2": "Devre Şeması Çizimi: Semboller kullanılarak yapılan devre çizimleri evrenseldir, her ülkede anlaşılır.",
      "3": "Basit Elektrik Devresi Kurma: Kapalı anahtar durumunda elektrik akımı pilden çıkıp ampulü yakar.",
      "4": "Kontrollü Deney ve Değişkenler: Bağımsız değişken (bizim değiştirdiğimiz), Bağımlı değişken (etkilenen/sonuç), Kontrol değişkeni (sabit tutulan).",
      "5": "Ampul Parlaklığı: Pil sayısı arttıkça parlaklık artar; ampul sayısı arttıkça parlaklık azalır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Açık Uçlu Etkinlik 2: Birbirine Bağla & Yaşama Uyarla',
    qCount: 3,
    answers: {
      "1": "Birbirine Bağla 01-04: Devredeki hataları bulma (kopuk tel, açık anahtar, ters pil bağlantısı) ve değişken tabloları.",
      "2": "Yaşama Uyarla: Atık pillerin toprağa ve suya zararları (lityum, cıva, kadmiyum) ve TAP geri dönüşüm kutuları.",
      "3": "Elektrik Tasarrufu ve Güvenliği: Devrelerde enerjinin verimli kullanımı ve güvenlik önlemleri.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // Fasikül 7
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Açık Uçlu Etkinlik 1: Şimdi Uygula (01-17)',
    qCount: 4,
    answers: {
      "1": "Evsel Atıklar ve Türleri: Katı atıklar (organik atıklar, plastik, cam, metal, kağıt) ve tehlikeli atıklar (piller, elektronik atıklar).",
      "2": "Geri Dönüşümün Aşamaları: Kaynağında ayrıştırma, toplama, sınıflandırma, işleme ve ham maddeye dönüştürme.",
      "3": "Geri Dönüştürülebilen ve Dönüştürülemeyen Maddeler: Dönüştürülebilir: cam, kağıt, alüminyum, plastik. Dönüştürülemez: kirli peçete, ayna, strafor.",
      "4": "Kompost Gübre Yapımı: Meyve ve sebze kabukları gibi organik atıkların doğal gübreye dönüştürülmesi.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Açık Uçlu Etkinlik 2: Yaşama Uyarla (1-5) & Sıfır Atık',
    qCount: 3,
    answers: {
      "1": "Yaşama Uyarla 1-5: Elektronik atıklardaki kıymetli metallerin (altın, gümüş, bakır) geri kazanılması hem doğayı korur hem maliyeti düşürür.",
      "2": "Sıfır Atık Projesi: Atık miktarını en aza indirmek, tekrar kullanmak ve doğal kaynakları korumak.",
      "3": "Sürdürülebilir Gelecek: Gelecek nesillere yaşanabilir temiz bir çevre ve zengin doğal kaynaklar bırakma bilinci.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  }
];

console.log('Book: 5. Sınıf MAX Fen Bilimleri Konu & Soru Fasikülleri');
console.log('Topics count:', topics.length);
console.log('MC tests count:', mcTests.length);
console.log('Open-ended tests count:', openEndedTests.length);
console.log('Total tests:', mcTests.length + openEndedTests.length);

module.exports = {
  BOOK_ID,
  SUBJECT_ID,
  topics,
  mcTests,
  openEndedTests
};
