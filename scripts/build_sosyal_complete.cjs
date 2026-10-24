const fs = require('fs');

// We have individual page files: scripts/page_261.txt to scripts/page_272.txt
// Let's create the comprehensive mapping of:
// - Book definition
// - 6 Topics (Öğrenme Alanları)
// - 44 MC Tests
// - 18 Open-Ended Activity Tests (covering all 106 activities)

const BOOK_ID = 'tb_hiperzeka_5_sosyal';
const SUBJECT_ID = 'sub_sosyal_5';

const topics = [
  {
    id: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı: Birlikte Yaşamak',
    order: 1
  },
  {
    id: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı: Evimiz Dünya',
    order: 2
  },
  {
    id: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı: Ortak Mirasımız',
    order: 3
  },
  {
    id: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı: Yaşayan Demokrasimiz',
    order: 4
  },
  {
    id: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı: Hayatımızdaki Ekonomi',
    order: 5
  },
  {
    id: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı: Teknoloji ve Sosyal Bilimler',
    order: 6
  }
];

// 44 MC Tests:
const mcTests = [
  // --- Unit 1 ---
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Geliştiriyorum 01',
    answerKey: {"1":"B","2":"A","3":"D","4":"A","5":"C","6":"D","7":"B","8":"D","9":"C"}
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Geliştiriyorum 02',
    answerKey: {"1":"A","2":"B","3":"B","4":"C","5":"D","6":"A","7":"C","8":"A","9":"B","10":"C"}
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Geliştiriyorum 03',
    answerKey: {"1":"B","2":"A","3":"C","4":"B","5":"C","6":"D","7":"B","8":"A","9":"D","10":"C"}
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Geliştiriyorum 04',
    answerKey: {"1":"B","2":"D","3":"C","4":"B","5":"D","6":"D","7":"A","8":"D","9":"B"}
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Uyguluyorum 01',
    answerKey: {"1":"A","2":"B","3":"B","4":"D","5":"C","6":"D"}
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Uyguluyorum 02',
    answerKey: {"1":"A","2":"B","3":"A","4":"B","5":"D"}
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Uyguluyorum 03',
    answerKey: {"1":"C","2":"C","3":"B","4":"D","5":"A","6":"A","7":"B","8":"C","9":"D"}
  },

  // --- Unit 2 ---
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Geliştiriyorum 05',
    answerKey: {"1":"B","2":"A","3":"D","4":"C","5":"B","6":"A","7":"C","8":"B","9":"B","10":"D"}
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Geliştiriyorum 06',
    answerKey: {"1":"D","2":"C","3":"A","4":"B","5":"D","6":"C","7":"D","8":"A","9":"B"}
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Geliştiriyorum 07',
    answerKey: {"1":"D","2":"C","3":"C","4":"B","5":"B","6":"A","7":"D","8":"C"}
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Geliştiriyorum 08',
    answerKey: {"1":"D","2":"B","3":"A","4":"B","5":"D","6":"D","7":"C","8":"D","9":"A","10":"B"}
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Uyguluyorum 04',
    answerKey: {"1":"A","2":"B","3":"B","4":"C","5":"D"}
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Uyguluyorum 05',
    answerKey: {"1":"B","2":"A","3":"D","4":"C","5":"C"}
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Uyguluyorum 06',
    answerKey: {"1":"A","2":"C","3":"D","4":"D","5":"B","6":"A","7":"C","8":"D"}
  },

  // --- Unit 3 ---
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Geliştiriyorum 09',
    answerKey: {"1":"A","2":"A","3":"B","4":"D","5":"B","6":"C","7":"A","8":"A","9":"C","10":"B"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Geliştiriyorum 10',
    answerKey: {"1":"B","2":"D","3":"C","4":"B","5":"C","6":"C","7":"A","8":"B","9":"D","10":"C"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Geliştiriyorum 11',
    answerKey: {"1":"D","2":"C","3":"A","4":"B","5":"C","6":"D","7":"B","8":"B","9":"A","10":"C"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Geliştiriyorum 12',
    answerKey: {"1":"D","2":"A","3":"C","4":"D","5":"B","6":"A","7":"D","8":"C","9":"A","10":"B"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Uyguluyorum 07',
    answerKey: {"1":"B","2":"D","3":"B","4":"A","5":"C","6":"D"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Uyguluyorum 08',
    answerKey: {"1":"C","2":"A","3":"B","4":"D","5":"D"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Uyguluyorum 09',
    answerKey: {"1":"C","2":"D","3":"A","4":"D","5":"C"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Uyguluyorum 10',
    answerKey: {"1":"B","2":"A","3":"B","4":"C","5":"D"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Uyguluyorum 11',
    answerKey: {"1":"B","2":"B","3":"A","4":"C"}
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Uyguluyorum 12',
    answerKey: {"1":"B","2":"B","3":"C","4":"D","5":"C","6":"B"}
  },

  // --- Unit 4 ---
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Geliştiriyorum 13',
    answerKey: {"1":"B","2":"C","3":"A","4":"B","5":"D","6":"C","7":"D","8":"B","9":"A","10":"A"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Geliştiriyorum 14',
    answerKey: {"1":"D","2":"D","3":"C","4":"A","5":"A","6":"D","7":"B","8":"C"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Geliştiriyorum 15',
    answerKey: {"1":"C","2":"B","3":"D","4":"D","5":"C","6":"A","7":"B","8":"A","9":"A"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Geliştiriyorum 16',
    answerKey: {"1":"D","2":"C","3":"A","4":"B","5":"C","6":"B","7":"D","8":"C","9":"A"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Uyguluyorum 13',
    answerKey: {"1":"C","2":"B","3":"A","4":"D","5":"A"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Uyguluyorum 14',
    answerKey: {"1":"B","2":"A","3":"D","4":"C","5":"A"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Uyguluyorum 15',
    answerKey: {"1":"D","2":"C","3":"A","4":"B","5":"D","6":"C"}
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Uyguluyorum 16',
    answerKey: {"1":"B","2":"D","3":"A","4":"C","5":"B","6":"C","7":"C","8":"D"}
  },

  // --- Unit 5 ---
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Geliştiriyorum 17',
    answerKey: {"1":"B","2":"C","3":"D","4":"A","5":"C","6":"A","7":"D","8":"D","9":"B"}
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Geliştiriyorum 18',
    answerKey: {"1":"A","2":"C","3":"D","4":"A","5":"B","6":"B","7":"C","8":"D","9":"D"}
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Geliştiriyorum 19',
    answerKey: {"1":"C","2":"C","3":"A","4":"D","5":"D","6":"C","7":"D","8":"B","9":"C","10":"B"}
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Uyguluyorum 17',
    answerKey: {"1":"A","2":"B","3":"D","4":"C","5":"A"}
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Uyguluyorum 18',
    answerKey: {"1":"D","2":"C","3":"D","4":"A","5":"B"}
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Uyguluyorum 19',
    answerKey: {"1":"B","2":"C","3":"C","4":"A","5":"D"}
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Uyguluyorum 20',
    answerKey: {"1":"B","2":"B","3":"D","4":"C","5":"B","6":"C","7":"D"}
  },

  // --- Unit 6 ---
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Geliştiriyorum 20',
    answerKey: {"1":"D","2":"B","3":"A","4":"B","5":"D","6":"B","7":"D","8":"A","9":"B","10":"D"}
  },
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Geliştiriyorum 21',
    answerKey: {"1":"D","2":"D","3":"D","4":"B","5":"C","6":"C","7":"A","8":"B","9":"D"}
  },
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Uyguluyorum 21',
    answerKey: {"1":"C","2":"A","3":"C","4":"B"}
  },
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Uyguluyorum 22',
    answerKey: {"1":"D","2":"B","3":"A","4":"B"}
  },
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Uyguluyorum 23',
    answerKey: {"1":"B","2":"D","3":"C","4":"B","5":"D","6":"C"}
  }
];

// Open-Ended Activity Tests:
const openEndedTests = [
  // ================= UNIT 1 =================
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Açık Uçlu Etkinlik 1: Anlıyorum (01-03)',
    qCount: 3,
    answers: {
      "1": "1. Okul, aile, arkadaş, sınıf, satranç kulübü gruplarında yer almıştır. 2. Aile grubunda kardeş ve evlat; sınıf grubunda arkadaş, başkan ve öğrenci; satranç kulübü grubunda üye rollerini üstlenmiştir. 3. Öğrenci cevabı. 4. Müşteri.",
      "2": "1. a: 1 → Türk kahvesi geleneği, 2 → Cağ kebabı (yemeklerimiz), 3 → Halk oyunları, 4 → Halı dokumacılığı, 5 → Kıyafet (Bindallı), 6 → Millî bayramlar; b: Öğrenci cevabı; c: Öğrenci cevabı. 2. a: Evet, çünkü suşi yemeğine karşı ön yargılı olmalarına rağmen tadına bakmaları farklı kültürlere saygı duyduklarının göstergesidir; b: İş birliği, dayanışma ve birlik-beraberlik arkadaşlık ilişkilerini olumlu etkiler; c: Öğrenci cevabı.",
      "3": "1. Birlik ve beraberlik, dayanışma. 2. Öğrenci cevabı. 3. Sadaka taşı uygulaması; toplumsal ihtiyaçların karşılanmasında, yardımlaşma, birlik ve beraberliğin gelişmesinde etkili olmaktadır. 4. Öğrenci cevabı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Açık Uçlu Etkinlik 2: Pekiştiriyorum (01-08)',
    qCount: 8,
    answers: {
      "1": "Pekiştiriyorum 01: b. oyuncu, kaleci ve kaptan; c. öğrenci, nöbetçi öğrenci, sınıf başkanı ve sınıf arkadaşı; d. oyun arkadaşı; e. evlat, kardeş, abi, abla, torun, yeğen.",
      "2": "Pekiştiriyorum 02: a. Aile grubunda evlat ve torun, basketbol takımı grubunda oyuncu ve takım kaptanı, müzik kursunda kursiyer veya üye rollerine sahiptir; b. Öğrenci cevabı.",
      "3": "Pekiştiriyorum 03: Okul roller: Öğrenci, arkadaş, sınıf başkanı, kulüp üyesi. Haklar: Eğitim almak, sosyal faaliyetlere katılmak, teneffüs yapmak. Sorumluluklar: Ders dinlemek, sınıfı temiz tutmak, kurallara uymak. Arkadaş roller: Oyun arkadaşı, arabulucu, lider. Haklar: Düşüncelerini açıklamak, oyun oynamak. Sorumluluklar: Kurallara uymak, eşit/adil/hoşgörülü olmak.",
      "4": "Pekiştiriyorum 04: İşaretlenecekler: b ve d.",
      "5": "Pekiştiriyorum 05: a. Elazığ, b. Trabzon-Rize, c. İzmir, d. Diyarbakır-Mardin (ülkemizin genelinde), e. Artvin, f. Tekirdağ.",
      "6": "Pekiştiriyorum 06: a. Giyilen kıyafetler, oyunların kaynağı ve panduri müzik aleti benzerlik göstermektedir. Erkekler tarafından oynanması benzerlik gösteren diğer bir özelliktir; b. Bölge halkının günlük yaşantısı ve yaşanan bölgenin coğrafi özellikleri; c. Öğrenci cevabı.",
      "7": "Pekiştiriyorum 07: a. Japonya, b. Kayseri, c. İtalya, d. Gaziantep, e. Erzurum, f. Bursa.",
      "8": "Pekiştiriyorum 08: a. Öğrenci cevabı; b. Öğrenci cevabı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa1',
    name: '1. Öğrenme Alanı - Açık Uçlu Etkinlik 3: Pekiştiriyorum (09-16)',
    qCount: 8,
    answers: {
      "1": "Pekiştiriyorum 09: İşaretlenecekler: a, b ve d.",
      "2": "Pekiştiriyorum 10: a. Öğrenci cevabı; b. Güreş.",
      "3": "Pekiştiriyorum 11: a. Yemek, b. Müzik, c. El sanatları, d. Halkoyunları, e. Giyim.",
      "4": "Pekiştiriyorum 12: a. Örnek olay 1: Eğitim, Örnek olay 2: Kutlama; b. Birlikte yaşama kültürünün oluşmasına, birlik ve beraberliğin güçlenmesine, sağlıklı iletişim kurulmasına, barış ve huzurun artmasına katkı sağlar.",
      "5": "Pekiştiriyorum 13: a. Olivia; b. Farklı kültürlerin bir araya gelmesi kültürel etkileşime yol açmaktadır; c. Öğrenci cevabı; d. Birlik ve beraberliğin gelişmesi, ön yargıların ortadan kalkması ve toplumsal huzurun sağlanması.",
      "6": "Pekiştiriyorum 14: Öğrenci cevabı.",
      "7": "Pekiştiriyorum 15: a. Bireylere Etkisi: İhtiyaçlar karşılanır, birey topluma ait hisseder, huzur ve güven duyar. Topluma Etkisi: Birlik-beraberlik güçlenir, toplum kalkınır, diğer hayırseverlere örnek olur; b. Yardımlaşma, dayanışma, birlik ve beraberlik.",
      "8": "Pekiştiriyorum 16: a. Askıda ekmek yardıma muhtaç kişilerin beslenme ihtiyacını karşılar, yardımlaşma ve dayanışmayı güçlendirir; b. Öğrenci cevabı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= UNIT 2 =================
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Açık Uçlu Etkinlik 1: Anlıyorum (04-07)',
    qCount: 4,
    answers: {
      "1": "Anlıyorum 04: 1. Yeryüzü şekilleri, tarihî mekân, doğal mekân, ulaşım, komşular, yer altı kaynakları, su kaynakları. 2. a. Ulaşım - Su kaynakları, b. Tarihi mekan, c. Yeryüzü şekilleri, d. Su kaynakları. 3. a. Yeryüzü şekilleri, komşuları ve su kaynakları; b. Tunceli, Diyarbakır, Malatya ve Bingöl; c. Bingöl.",
      "2": "Anlıyorum 05: 1. a. Yollar ve binalar değişmiştir. AVM ve iş yerleri değişen beşeri unsurlardır; b. Ağaçların büyük kısmı yok edilmiştir, değişen doğal unsur bitki örtüsüdür. 2. Doğal Unsurlar: Manavgat Şelalesi, Erciyes Dağı, Uzungöl, Belgrad Ormanı. Beşerî Unsurlar: Van Kalesi, Ayasofya Cami, Çanakkale Köprüsü, Efes Antik Kent.",
      "3": "Anlıyorum 06: a. Deprem, b. Sel, c. Çığ, d. Orman yangını, e. Erozyon, f. Heyelan.",
      "4": "Anlıyorum 07: 1. a. Dil, b. Bayrak, c. Marş, d. Başkent. 2. a. Milli marş, b. Para, c. Başkent, d. Bayrak, e. Dış politika. 3. 3. Bulgaristan (Kuzeybatı), 4. Suriye (Güney), 5. Irak (Güneydoğu), 6. İran (Doğu), 7. Ermenistan (Doğu), 8. Gürcistan (Kuzeydoğu).",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Açık Uçlu Etkinlik 2: Pekiştiriyorum (17-22)',
    qCount: 6,
    answers: {
      "1": "Pekiştiriyorum 17: Duru: Yeryüzü şekilleri, Metin: Ulaşım.",
      "2": "Pekiştiriyorum 18: a. Yer altı kaynakları, b. Su kaynakları, c. Komşular.",
      "3": "Pekiştiriyorum 19: Tarihi mekân: a, c, d | Doğal mekân: b, e, f.",
      "4": "Pekiştiriyorum 20: Öğrenci cevabı (Örnek: Fabrika açılması nüfusu artırır, yol yapımını hızlandırır, sosyal imkanları geliştirir veya çevre/hava kirliliğine yol açabilir).",
      "5": "Pekiştiriyorum 21: a. Ulaşım, b. Enerji ve su, c. Barınma.",
      "6": "Pekiştiriyorum 22: a. Ekonomi, ulaşım, eğitim ve siyasi; b. Üniversite açılması nüfus ve sosyal hayatı geliştirir; sanayi tesisleri ekonomik kalkınma sağlarken kirliliğe yol açabilir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa2',
    name: '2. Öğrenme Alanı - Açık Uçlu Etkinlik 3: Pekiştiriyorum (23-27)',
    qCount: 5,
    answers: {
      "1": "Pekiştiriyorum 23: a. Baraj ve sanayi tesisleri iş imkanını ve göçü artırarak köyün ilçeye dönüşmesini sağlamıştır; b. Hava, su, toprak kirliliği, doğal bitki örtüsü kaybı; c. Yol, köprü, viyadük ile ulaşım; çok katlı binalar ile barınma; hastane/okul ile sağlık ve eğitim gelişmiştir.",
      "2": "Pekiştiriyorum 24: a. Öğrenci cevabı; b. İç kesimler ve güneydoğu hariç genelinde deprem riski yüksektir (Bolu, Düzce, Hatay, Malatya, Kahramanmaraş, Bingöl, Erzincan, Van vb.).",
      "3": "Pekiştiriyorum 25: Ulaşım ve eğitim.",
      "4": "Pekiştiriyorum 26: a. Erozyon, b. Sel, c. Deprem, d. Orman yangını.",
      "5": "Pekiştiriyorum 27: 1. c, e | 2. ı | 3. d, j | 4. b, i | 5. g | 6. h, k | 7. f | 8. a.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= UNIT 3 =================
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Açık Uçlu Etkinlik 1: Anlıyorum (08-10)',
    qCount: 3,
    answers: {
      "1": "Anlıyorum 08: a. ✓, b. ✓, c. ✘, d. ✓, e. ✓, f. ✘, g. ✓, h. ✓.",
      "2": "Anlıyorum 09: Kanıt 1: Barınma, Kanıt 2: Giyim-kuşam, Kanıt 4: Temel geçim faaliyeti.",
      "3": "Anlıyorum 10: a. Hititler, b. Sümerler, c. Sümerler, d. Lidyalılar, e. Babiller, Hititler, İyonyalılar, Lidyalılar.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Açık Uçlu Etkinlik 2: Pekiştiriyorum (28-35)',
    qCount: 8,
    answers: {
      "1": "Pekiştiriyorum 28: Somut Miras: a, c, f, h, ı | Somut Olmayan Miras: b, d, e, g, i.",
      "2": "Pekiştiriyorum 29: 1. Öğrenci cevabı, 2. Öğrenci cevabı, 3. Öğrenci cevabı.",
      "3": "Pekiştiriyorum 30: Tarihi Mekân: b, f, i | Tarihi Eser: d, g, ı | Tarihi Nesne: a, c, h.",
      "4": "Pekiştiriyorum 31: a. Hacılar, b. Göbeklitepe, c. Günümüzden 9000 bin yıl öncesine dayanmaktadır.",
      "5": "Pekiştiriyorum 32: Tarım ve Hayvancılık.",
      "6": "Pekiştiriyorum 33: Sokak ve evlerin kapısının olmamasının temel amacı güvenliği sağlamaktır.",
      "7": "Pekiştiriyorum 34: a. Çayönü, b. Göbeklitepe, c. Çayönü, d. Çatalhöyük, e. Hacılar, f. Çatalhöyük, g. Hacılar, h. Göbeklitepe.",
      "8": "Pekiştiriyorum 35: a. Giyim-kuşam, b. Temel geçim faaliyeti, c. Beslenme, d. Barınma, e. İnanç, f. Giyim-kuşam, g. Barınma, h. İnanç.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa3',
    name: '3. Öğrenme Alanı - Açık Uçlu Etkinlik 3: Pekiştiriyorum (36-43)',
    qCount: 8,
    answers: {
      "1": "Pekiştiriyorum 36: Kültür.",
      "2": "Pekiştiriyorum 37: Sümerler: a, d, h, i | Asurlar: b, e, g | Babiller: c, f, ı.",
      "3": "Pekiştiriyorum 38: a. Bilim, b. Hukuk.",
      "4": "Pekiştiriyorum 39: Hukuk: Medeni kanunları var. Kültür: Anal adı verilen yıllıklar tutmuşlardır.",
      "5": "Pekiştiriyorum 40: Ekonomi.",
      "6": "Pekiştiriyorum 41: Bilim.",
      "7": "Pekiştiriyorum 42: 3. Çıkış.",
      "8": "Pekiştiriyorum 43: Doğru (✓): b, c, d, e, f, i | Yanlış (✘): a, g, h, ı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= UNIT 4 =================
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Açık Uçlu Etkinlik 1: Anlıyorum (11-14)',
    qCount: 4,
    answers: {
      "1": "Anlıyorum 11: 1. Cumhuriyet, 2. Demokrasi.",
      "2": "Anlıyorum 12: 1. Serkan ve Hakan, 2. Sevda, 3. Öğrenci cevabı, 4. Dilekçe hakkı.",
      "3": "Anlıyorum 13: a. Eğitim hakkı, b. Temiz ve sağlıklı bir çevrede yaşama hakkı, c. Sağlık hakkı, d. Eğlenme hakkı, e. Haberleşme özgürlüğü, f. Beslenme hakkı.",
      "4": "Anlıyorum 14: 1. Belediyeye dilekçe ile başvuruda bulunabilirler, 2. Öğrenci cevabı, 3. Öğrenci cevabı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Açık Uçlu Etkinlik 2: Pekiştiriyorum (44-53)',
    qCount: 10,
    answers: {
      "1": "Pekiştiriyorum 44: a. Demokratik - ev, b. Demokratik - toplum, c. Demokratik değil - okul.",
      "2": "Pekiştiriyorum 45: Seçme ve seçilme hakkı, katılım.",
      "3": "Pekiştiriyorum 46: a. Cumhuriyet, b. Cumhuriyet, c. Demokrasi, d. Demokrasi, e. Demokrasi.",
      "4": "Pekiştiriyorum 47: a. Çoğulculuk, b. Katılım, c. Eşitlik, d. Özgürlük, e. Hukuk devleti, f. Seçme ve seçilme hakkı, g. Milli egemenlik, h. Çoğunluk.",
      "5": "Pekiştiriyorum 48: Gençlere.",
      "6": "Pekiştiriyorum 49: a. Çoğulculuk, b. Katılım, seçme ve seçilme hakkı, milli egemenlik.",
      "7": "Pekiştiriyorum 50: a. Gökhan ve İrem, b. Derya ve Atilla, c. Öğrenci cevabı.",
      "8": "Pekiştiriyorum 51: a ve c.",
      "9": "Pekiştiriyorum 52: 2. Öğrenci cevabı, 3. Öğrenci cevabı, 4. Öğrenci cevabı.",
      "10": "Pekiştiriyorum 53: Eğitim hakkı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa4',
    name: '4. Öğrenme Alanı - Açık Uçlu Etkinlik 3: Pekiştiriyorum (54-62)',
    qCount: 9,
    answers: {
      "1": "Pekiştiriyorum 54: Yaşama hakkı, sağlık hakkı, beslenme hakkı ve eğitim hakkı.",
      "2": "Pekiştiriyorum 55: Doğru (✓): c, g, ı, i | Yanlış (✘): a, b, d, e, f, h.",
      "3": "Pekiştiriyorum 56: b. Ders dinlemek, ödev yapmak, derse zamanında gitmek; c. Toplum ahlakına uygun konuşmak, başkalarına saygı duymak; d. Evi temiz tutmak, kurallara uymak; e. Çevreyi temiz tutmak, geri dönüşüm kullanmak.",
      "4": "Pekiştiriyorum 57: b. Özel hayatın gizliliği, c. Yerleşme ve seyahat özgürlüğü, d. Düşünce ve ifade özgürlüğü, e. Eğitim hakkı.",
      "5": "Pekiştiriyorum 58: Sağlık.",
      "6": "Pekiştiriyorum 59: Tan: Muhtarlık, Emine: Belediye, Hüma: Kaymakamlık, Nehir: Belediye, Metin: Muhtarlık.",
      "7": "Pekiştiriyorum 60: a. Tüketici Hakem Heyeti, b. Alışveriş, ekonomik.",
      "8": "Pekiştiriyorum 61: b. Belediye, c. 112 Acil Çağrı Merkezi, d. Darüşşafaka, e. Tüketici Hakem Heyeti, f. Cimer.",
      "9": "Pekiştiriyorum 62: Doğru (✓): b, d, e | Yanlış (✘): a, c.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= UNIT 5 =================
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Açık Uçlu Etkinlik 1: Anlıyorum (15-17)',
    qCount: 3,
    answers: {
      "1": "Anlıyorum 15: a. Toprak - Tarım, b. Su - Balıkçılık, c. Rüzgâr - Enerji üretimi, d. Orman - Mobilya, e. Güneş - Enerji üretimi, f. Maden - Sanayi.",
      "2": "Anlıyorum 16: İhtiyaç: b, c, d, f, h | İstek: a, e, g.",
      "3": "Anlıyorum 17: 1. a: Toprak, b: Tarım ve hayvancılık; 2. a: Tarım, b: Madencilik, c: Turizm, d: Sanayi, e: Ormancılık, f: Ulaşım.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Açık Uçlu Etkinlik 2: Pekiştiriyorum (63-69)',
    qCount: 7,
    answers: {
      "1": "Pekiştiriyorum 63: a. Ormanlık alanlarda ağaçlandırma ile artış görülürken mera ve tarım arazilerinde düşüş olmuştur; b. Tarım arazilerinin yerleşime açılması düşüşün temel nedenidir.",
      "2": "Pekiştiriyorum 64: a. Sanayi, Hayvancılık, Turizm; b. Ormanlar oksijen kaynağıdır, su ve toprağı korur, rekreasyon ve dinlenme sağlar.",
      "3": "Pekiştiriyorum 65: a. ✓, b. ✘, c. ✓, d. ✓.",
      "4": "Pekiştiriyorum 66: a. Su ve enerjiyi bilinçsiz kullanması, pilleri toprağa gömmesi; b. Dönüştür Doğa Kazansın, Farklı Amaçlarla Kullan; c. Düşün, Gerekli Değilse Tüketme.",
      "5": "Pekiştiriyorum 67: Geri dönüşebilen: a, b, c, f | Geri dönüşemeyen: d, e, h.",
      "6": "Pekiştiriyorum 68: İhtiyaç: a, b, e, f, i | İstek: c, d, g, h, ı.",
      "7": "Pekiştiriyorum 69: a. İsteklerine öncelik vermesi, bütçe yapmaması; b. Öğrenci cevabı; c. Öğrenci cevabı; d. Plansız harcama borçlanmaya ve temel ihtiyaçları karşılayamamaya neden olmuştur.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa5',
    name: '5. Öğrenme Alanı - Açık Uçlu Etkinlik 3: Pekiştiriyorum (70-76)',
    qCount: 7,
    answers: {
      "1": "Pekiştiriyorum 70: a. Konut ve kira, b. Sigorta ve finansal hizmetler, c. Sağlık, eğlence ve kültür.",
      "2": "Pekiştiriyorum 71: Öğrenci cevabı.",
      "3": "Pekiştiriyorum 72: a. Birincil, b. Üçüncül, c. Dördüncül, d. İkincil, e. Beşincil, f. Üçüncül, g. Birincil.",
      "4": "Pekiştiriyorum 73: a. Tarım, b. Tarım, c. Madencilik, d. Büyükbaş hayvancılık, e. Tarım, f. Madencilik.",
      "5": "Pekiştiriyorum 74: b. Tarım - Birincil, c. Turizm - Üçüncül, d. Grafik ve tasarım - Dördüncül.",
      "6": "Pekiştiriyorum 75: Öğrenci cevabı.",
      "7": "Pekiştiriyorum 76: a. Turizm, büyükbaş hayvancılık, Tarım, Sanayi; b. Beşincil ekonomik faaliyet.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= UNIT 6 =================
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Açık Uçlu Etkinlik 1: Anlıyorum (18-19)',
    qCount: 2,
    answers: {
      "1": "Anlıyorum 18: 1. a: Ulaşım, b: Sağlık, c: Eğitim, d: Ekonomi, e: Ulaşım, f: Kültürel; 2. a: Kültür, b: Turizm, c: Öğrenci cevabı.",
      "2": "Anlıyorum 19: 1. Bilgilerin güvenirliğini sorgulamaması, yabancı kaynaktan gelen iletileri açması; 2. Bilgiyi doğrulamalı, güvenilir değilse iletiyi silmeliydi; 3. Öğrenci cevabı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Açık Uçlu Etkinlik 2: Pekiştiriyorum (77-82)',
    qCount: 6,
    answers: {
      "1": "Pekiştiriyorum 77: a. Ulaşım, barınma, beslenme; b. Beyaz eşya ve küçük ev aletleri.",
      "2": "Pekiştiriyorum 78: a. ✓, b. ✘, c. ✓, d. ✓.",
      "3": "Pekiştiriyorum 79: a. Tarım ve hayvancılık; b. Robotların yaygınlaşması insan gücüne ihtiyacı azaltarak işsizliğe yol açabilir.",
      "4": "Pekiştiriyorum 80: a. Sağlık; b. Ulaşım giderlerinden ve zamandan tasarruf sağlamıştır.",
      "5": "Pekiştiriyorum 81: a. ✓, b. ✘, c. ✓, d. ✓, e. ✓, f. ✘.",
      "6": "Pekiştiriyorum 82: a. Kültür, b. Sağlık, c. Ekonomi, d. Ulaşım, e. Eğitim, f. İletişim.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_sosyal_oa6',
    name: '6. Öğrenme Alanı - Açık Uçlu Etkinlik 3: Pekiştiriyorum (83-87)',
    qCount: 5,
    answers: {
      "1": "Pekiştiriyorum 83: Olumlu: a, f, ı | Olumsuz: b, c, d, e, g, h.",
      "2": "Pekiştiriyorum 84: Doğru (✓): a, c | Yanlış (✘): b, d, e.",
      "3": "Pekiştiriyorum 85: a. Isıtma; b. Tasarruflu ampul kullanımı, ev yalıtımı, yüksek verimli cihazlar, fişlerin prizden çekilmesi; c. Öğrenci cevabı.",
      "4": "Pekiştiriyorum 86: Mustafa, Ömer, Buse, Berkan ve Can.",
      "5": "Pekiştiriyorum 87: a. Evet, bilgisayarda aşırı zaman geçirmesi ve yemek yemeyi bile bilgisayar başında yapması bağımlılık göstergesidir; b. Yüz yüze iletişimi engellemiş, arkadaş edinememesine ve etkinliklerden kopmasına yol açmıştır; c. Öğrenci cevabı.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  }
];

console.log('Book: 5. Sınıf Hiper Sosyal Bilgiler Soru Bankası');
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
