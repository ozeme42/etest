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

// Read existing MC tests from current build_fen_max_complete.cjs
const currentFile = fs.readFileSync('scripts/build_fen_max_complete.cjs', 'utf8');
const mcMatch = currentFile.match(/const mcTests = (\[[\s\S]*?\n\];)/);
if (!mcMatch) {
  console.error('Could not find mcTests in build_fen_max_complete.cjs');
  process.exit(1);
}
const mcTestsStr = mcMatch[1];

// Complete 20 Open-Ended Tests with all 296 questions
const openEndedTests = [
  // ================= 1. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Şimdi Uygula',
    qCount: 31,
    answers: {
      "1": "a. Hava küre, b. Su küre, c. Taş küre, d. Ateş küre (Manto), e. Çekirdek",
      "2": "a. 1, b. 2, c. 2, d. 1, e. 2",
      "3": "a. Gündüz, b. Dünya'nın dönme hareketinin saat yönünün tersi yönünde olmasıdır., c. Dönme hareketi ile ilgilidir.",
      "4": "a. Öğrenci cevapları değerlendirilir., b. Öğrenci cevapları değerlendirilir., c. 3 ve 6, d. Öğrenci cevapları değerlendirilir.",
      "5": "a ve c",
      "6": "helyum, ışık, orta, küre, Dünya",
      "7": "Dünya'nın Güneş etrafında dolanırken izlediği yörüngenin şeklinden kaynaklanır.",
      "8": "a, b, c, d ve e öğrenci cevapları değerlendirilir.",
      "9": "a. Güneş lekesi, b. Güneş'in dönme hareketi yapması, c. Soldan sağa doğru (batıdan doğuya doğru), d. Galileo Galilei'dir.",
      "10": "c ve d",
      "11": "a. Güneşin kendi etrafında dönme hareketi yapması, b. Güneşin zararlı ışınlarından gözlerini korumak için bu şekilde gözlem yapmıştır.",
      "12": "a. Güneş, b. Dünya, c. Güneşin çapının Dünya'nınkinin 109 katı olmasıdır.",
      "13": "a. Cisimlerden uzaklaştıkça cisimlerin daha küçük algılanmasıdır., b. Hayır sığmaz.",
      "14": "a. M, b. Ağaç daha büyük görünür., c. Ağaç daha küçük görünür.",
      "15": "a. Pinpon topu: Ay / Basketbol topu: Güneş, b. Uzaktaki cisimlerin olduğundan daha küçük görünmesi",
      "16": "Ay'a ait özellik: c, g, ı / Güneş'e ait özellik: b, d, f, h / Ortak özellik: a, e",
      "17": "II ve III",
      "18": "Güneş'in Dünya'ya olan uzaklığı Ay'ın Dünya'ya uzaklığından çok daha fazla olduğu için Güneş ve Ay neredeyse aynı büyüklükte görünür.",
      "19": "Gece ile gündüz arasındaki sıcaklık farkı çok fazla olur; Atmosferine giren gök taşlarının büyük bir kısmı Ay yüzeyine düşer; Yağmur, kar, dolu, rüzgâr gibi hava olayları gerçekleşmez.",
      "20": "a. Gök taşlarıdır., b. Ay'ın atmosferinin ince olmasıdır., c. Atmosferinin kalın olmasıdır.",
      "21": "a. 27 gün 8 saat, b. Dünya'dan bakıldığında Ay'ın hep aynı yüzünün görünmesine sebep olur.",
      "22": "a. L = M > K, b. Hepsi saat yönünün tersi yöndedir., c. K ve M, d. L",
      "23": "a. Ali Kuşçu, b. Atatürk, c. Öğrenci cevapları değerlendirilir.",
      "24": "a, c, d, f",
      "25": "a, b, f",
      "26": "Yeni Ay, Hilâl, İlk Dördün, Şişkin Ay, Dolunay, Şişkin Ay, Son Dördün, Hilâl",
      "27": "a. Yeni Ay, b. Dolunay, c. Dolunay, d. Dolunay, e. Dolunay, f. Şişkin Ay, g. Dolunay, h. Yeni Ay, ı. Yeni Ay, i. Son Dördün, j. Dolunay, k. Şişkin Ay, l. Dolunay, m. İlk dördün ile dolunay arasında ve dolunay ile son dördün arasında görülür.",
      "28": "a. Dolunay, b. Son Dördün, c. Yeni Ay, d. İlk Dördün",
      "29": "a. Evet, b. Ay'ın kendi ekseni etrafında dönme süresinin Dünya etrafında dolanma süresiyle aynı olmasından kaynaklanır., c. Gök taşının Ay yüzeyine düşmesiyle oluşmuştur., d. Ay'da hava olayları görülmediğinden bozulmaz.",
      "30": "a. Özel filtreli gözlükler kullanmıştır., b. Dünya'nın kendi etrafında dönmesidir., c. 5, d. 1, e. 1, f. 5",
      "31": "a. K, L, M, N, O, b. N, c. K, M ve O, d. M ve K, e. N ve K, f. M, g. M ve O, h. K, ı. N, i. K",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Birbirine Bağla',
    qCount: 2,
    answers: {
      "1": "Sadece Güneş'e ait özellik: 2, 3 ve 7; Sadece Dünya'ya ait özellikler: 6; Ortak özellikler: 1, 4, 5 ve 8",
      "2": "a. L ve M, b. K, c. M, d. K, e. K, f. K ve L, g. M, h. L, ı. K, i. M",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_1',
    name: '1. Fasikül - Yaşama Uyarla',
    qCount: 3,
    answers: {
      "1": "1. Görme bozukluklarına yol açabilir., 2. Sıcaklığının çok yüksek olmasıdır., 3. Parker Güneş Sondası, 4. Güneş hakkında yeni bilgiler edinme amaçlıdır.",
      "2": "1. Ay, Dünya etrafında elips şeklinde bir yörüngede hareket ettiği için Dünya ile arasındaki uzaklık değişir., 2. Evet, 3. Dünya'ya yakın olmasıdır., 4. Güneş - Dünya - Ay şeklinde sıralanır.",
      "3": "1. Zamanı gün, ay, yıl olarak belirli aralıklara bölmek için takvim sistemleri kullanılmıştır., 2. Yaklaşık 88,5 gündür., 3. 28 Haziran 2023",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= 2. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Şimdi Uygula',
    qCount: 51,
    answers: {
      "1": "Temas gerektirenler: a, c, d, f, g, ı / Temas gerektirmeyenler: b, e, h",
      "2": "a. Evet, b. Hayır, c. Hayır, d. Evet",
      "3": "a. Hızlandırma, b. Yavaşlatma ve durdurma, c. Şekil değiştirme, d. Durdurma, e. Yön değiştirme, f. Şekil değiştirme",
      "4": "Esnek cisimler: c, d, e, f, g, h",
      "5": "K = 30 N, L = 10 N, M = 50 N, N = 70 N",
      "6": "M > K > L",
      "7": "K = 60 N, L = 40 N, M = 50 N",
      "8": "K = 30 N, L = 20 N",
      "9": "a. L = 2 N, M = 2 N, b. 6, c. 6",
      "10": "a. 4 bölme, b. 6 bölme, c. 9 bölme, d. 9 bölme",
      "11": "1. a, b, c, e ve f, 2. b ve c, 3. b, c ve e, 4. c",
      "12": "L = 30 N, M = 25 N, N = 7 cm, O = 12 cm",
      "13": "b, c ve f",
      "14": "a. Hepsi, b. 3 ve 4, c. K, d. M",
      "15": "a. K, b. 6 cm, c. 4 cm, d. Yayın esneklik özelliği bozulduğu için doğru ölçüm yapılamamıştır.",
      "16": "a. K, b. K, L ve M, c. K ve L, d. L ve M",
      "17": "a. 2 cm, b. Yayın esneklik özelliğinin bozulmasıdır. Yaya gereğinden fazla kuvvet uygulanmış ve esneklik sınırı aşılmıştır.",
      "18": "Doğru ifadeler: a, b, c, e ve g / Yanlış ifadeler: d, f ve h",
      "19": "a. büyük, b. küçük, c. küçük, d. büyük",
      "20": "a. K, b. L",
      "21": "a. K > L > M, b. M, c. M",
      "22": "a. L, b. L, c. K, d. Az kuvvetle sıkışıp eski hâline dönebildiği için uygundur., e. Az kuvvetle sıkışıp eski hâline dönebildiği için uygundur., f. Orta sertlikte olduğu için darbeleri dengeli şekilde sönümleyebilir.",
      "23": "Doğru ifadeler: a ve e / Yanlış ifadeler: b, c, d, f ve g",
      "24": "a. 50 N, b. 10 N, c. 2, d. 40 N",
      "25": "H = 20 N, İ = 75 N, P = 10 N, E = 40 N, R = 20 N",
      "26": "H = 90 N, İ = 40 N, P = 24 N, E = 120 N, R = 42 N",
      "27": "A = 3 N, B = 210 N, C = 21 N, D = 36 N, E = 9 N, F = 45 N",
      "28": "a. 4 N, b. 27 N, c. 18 N, d. 3 N, e. 8 N, f. 19 N, g. 7 N",
      "29": "Ağırlık olanlar: b ve e",
      "30": "a. K = L = M, b. K > L > M, c. K > L > M",
      "31": "a. K = L = M = N, b. K > L > N > M, c. K > L > N > M",
      "32": "Noktalar: K (deniz seviyesi), L, M, N (zirve)",
      "33": "a. Hayır, b. Hayır, c. Evet, d. Evet",
      "34": "Doğru ifadeler: a, d, f ve g / Yanlış ifadeler: b, c, e ve h",
      "35": "K: D. Kütle 18, D. Ağırlık 180, Ay Kütle 18, Ay Ağırlık 30 / L: 36, 360, 36, 60 / M: 60, 600, 60, 100 / N: 6, 60, 6, 10 / O: 54, 540, 54, 90 / Ö: 96, 960, 96, 160",
      "36": "K: D. Kütle 120, D. Ağırlık 1200, Ay Kütle 120, Ay Ağırlık 200 / L: 6, 60, 6, 10 / M: 240, 2400, 240, 400 / N: 360, 3600 N, 360, 600 / O: 48, 480, 48, 80 / Ö: 18, 180, 18, 30",
      "37": "1. Olay, 2. Olay, 3. Olay, 4. Olay, 5. Olay, 6. Olay Ağırlık-Zaman ve Kütle-Zaman grafikleri",
      "38": "a. Cam: Az pürüzlü, Hareketi az engeller. / b. Çakıl: Çok pürüzlü, Hareketi çok engeller. / c. Buz: Az pürüzlü, Hareketi az engeller. / d. Zımpara kâğıdı: Çok pürüzlü, Hareketi çok engeller. / e. Halı: Çok pürüzlü, Hareketi çok engeller. / f. Toprak: Çok pürüzlü, Hareketi çok engeller.",
      "39": "K > M > L",
      "40": "a. L, b. K ve M, c. Çakıl > Halı > Fayans",
      "41": "a. Çakıl yüzey, b. Çakıl yüzey, c. Mermer yüzey, d. Artardı., e. Artardı.",
      "42": "a. L > K > M, b. L > K > M, c. L yüzeyi halı, M yüzeyi buz olabilir.",
      "43": "a. Farklı zeminlerde olmalarından dolayı etki eden sürtünme kuvvetlerinin farklı olmasıdır., b. 3. zemin, c. 3. zemin, d. 8 N'dır.",
      "44": "Sürtünme kuvvetinin (su direncinin) etkisini azaltarak balığın su içinde rahat hareket etmesini sağlar, kolaylaştırır.",
      "45": "a. Sürtünme kuvvetini azaltarak rakibini yenmeyi zorlaştırmak; kayganlık sağlayarak rekabeti artırmak., b. Yağlamanın iki yüzey (pehlivanların vücudu) arasında sürtünmeyi azaltması...",
      "46": "a. Sürtünmeyi azaltmak için yağlanmıştır., b. Daha süratli ve kısa zamanda taşınmasını sağlamıştır.",
      "47": "a. K > L > M, b. M, c. K",
      "48": "a. D, b. Y, c. Y, d. D, e. D, f. Y",
      "49": "Hava direnci: a, b ve d / Su direnci: c ve e / Kara direnci: f, g ve h",
      "50": "a. 2. düzenek, b. 1. düzenek, c. 1. düzenek, d. 1. düzenek, e. Kolaylaştırmıştır., f. Öğrenci cevapları değerlendirilir.",
      "51": "Sürtünme kuvvetini artıran eylemler: a, b, e, g, ı, i, l / Sürtünme kuvvetini azaltan eylemler: c, d, f, h, j, k, m, n, o",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Birbirine Bağla',
    qCount: 11,
    answers: {
      "1": "a. L > K > M, b. M, c. M, d. L, e. K ve M",
      "2": "1. a. Küçük kuvvetleri ölçmek ve daha hassas ölçümler yapabilmek için ince yaylar kullanılır. Altın kolye, yüzük ve küpe gibi çok hafif ürünleri tartmak için böyle dinamometreler gereklidir., b. Büyük kuvvetleri ölçmek için dayanıklı, kalın telli bir yaydan yapılmış dinamometreler kullanılmalıdır., c. Dinamometrenin bozulmasına ya da hatalı ölçüm yapılmasına neden olur., d. Kalın telli dinamometre, küçük kuvvetleri hassas şekilde ölçemez., e. Öğrenci cevapları değerlendirilir. / 2. Pazarcı: a, b ve e / Kuyumcu: c, d ve f",
      "3": "a. L, b. K dinamometresinde 10 N, L dinamometresinde 5 N'dır., c. 18 N, d. 80 N, e. 75 N, f. 4, g. 10 N, h. 20 N, ı. 90 N, i. 44 N",
      "4": "a. Hayır. Kütle değişmeyen madde miktarıdır., b. Kütle, c. Dinamometre, d. Evet, azalır. (Yer çekimi kuvveti azaldığı için yerin merkezinden uzaklaşıldığı için...), e. Hayır, farklıdır. Kütlesi fazla olanın ağırlığı da fazladır. Çünkü; ağırlık kütleye etki eden yer çekimi kuvvetidir., f. Farklıdır. Ağırlık, konuma göre değişir., g. Artar, h. Değişmez., ı. Evet, j. Farklıdır. Biri kütle diğeri ağırlık değerleridir., k. Azalır., l. Kütlesi değişmez, ağırlığı azalır., m. Evet, mümkündür. Kütlesi fazla olan daha yüksek bir konuma götürülürse olabilir., n. Hayır, değişmez. Madde miktarı kütledir, bulunulan yere göre değişmez.",
      "5": "a. Ağırlığı 50 N olan cismi kolaylıkla kaldırabildim., b. Halterci 300 kg kütleli yükü iki hamlede havaya kaldırdı., c. Kütle eşit kollu terazi ile ölçülür., d. Güreşçi, ağırlığının 500 Newton olduğunu söyleyince çok şaşırdım., e. Ağırlık cisme etki eden yer çekimi kuvvetidir., f. Kütle eşit kollu terazi ile ölçülür., g. Dünya'daki cismin ağırlığı kutuplara gittikçe artar., h. Kütle madde miktarının ölçüsüdür., ı. Bugün pazardan aldığım elmaların kütlesi 5 kg geldi., i. Ay'a giden astronotun ağırlığı altıda birine düşer., j. Ay'daki 60 N'lık cisim Dünya'da 360 N ağırlığındadır., k. Kutuplardan Ekvator'a gittikçe ağırlık artar., l. Deniz kıyısından dağa tırmanırken ağırlık azalır., m. Uçak inişe geçtiğinde ağırlığı artar., n. Bir oturuşta 1 kg kütleli yemek yedim., o. Bu ay kütlemin 5 kg arttığını fark ettim., ö. Cismin bulunduğu yere göre ağırlığı değişir., p. Kütle birimi kg ya da g'dır., r. Cismin kütlesi bulunduğu yere göre değişmez., s. Ağırlık birimi N'dır.",
      "6": "a. Yüzeylerin araçlara uyguladığı sürtünme kuvvetlerinin farklı olmasıdır., b. K > M > L, c. K > M > L, d. K, e. K, f. K",
      "7": "Doğru ifadeler: b, c, d, f, g, i, k, m / Yanlış ifadeler: a, e, h, ı, j, l",
      "8": "a. sürtünme, b. temas gerektiren, c. cinsine, d. az pürüzlü, e. çok pürüzlü, f. zıt, g. hava direnci, h. artırılarak, i. azaltacak, j. su direnci",
      "9": "Doğru ifadeler: a, e, f, g, ve i / Yanlış ifadeler: b, c, d, h ve j",
      "10": "1. TEMAS GEREKTİREN KUVVET, 2. DİNAMOMETRE, 3. SÜRTÜNME KUVVETİ, 4. YÜZEY CİNSİ, 5. HAVA DİRENCİ, 6. TEMAS YÜZEYİ, 7. ESNEK CİSİM, 8. NEWTON, 9. SU DİRENCİ, 10. YERÇEKİMİ",
      "11": "a. Yuvarlak tekerlekler sürtünmeyi azaltarak aracın daha kolay ve daha az enerji harcayarak hareket etmesini sağlar., b. Hava direncini azaltarak uçağın daha hızlı ve daha az yakıt tüketerek hareket etmesini sağlar., c. Su direncini azaltır. Böylece gemi suda daha kolay ilerler ve daha az enerji harcar., d. Zincir, tekerlek ile zemin arasındaki sürtünmeyi artırır. Böylece aracın kaymasını önler ve güvenli sürüş sağlar., e. Tırtıklı tabanlar zeminle sürtünmeyi artırır ve kaymayı önler., f. Su direncinin olumsuz etkilerini azaltmak için özel kıyafetler giyerler., g. Gemilerin altına yağlanmış kütükler yerleştirilerek sürtünme azaltılmış ve gemiler karadan kaydırılarak Haliç'e indirilmiştir., h. Paraşüt hava direncini artırarak düşme hızını azaltır ve güvenli iniş sağlar., ı. Su, ayakkabı ile zemin arasındaki sürtünmeyi azalttığı için kayma kolaylaşır., j. Su direncini azaltarak daha hızlı ve kolay yüzmelerini sağlar. Ayrıca pullar vücutlarını korur., k. Hava direnci damlaların hızını azaltır., l. Derin desenler kar ve suyu tahliye ederek yol tutuşunu artırır ve kaymayı önler., m. Daha hızlı hareket etmelerini sağlar ve yürümeye göre daha az enerji harcamalarına yardımcı olur., n. Su direncini azaltır, su altında daha kolay hareket etmelerini sağlar ve yüksek su basıncına daha dayanıklı olmalarına yardımcı olur., o. Öndeki kuşun oluşturduğu hava akımından yararlanarak hava direncini azaltırlar. Böylece daha az enerji harcar ve daha uzun mesafeler uçabilirler.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_2',
    name: '2. Fasikül - Yaşama Uyarla',
    qCount: 3,
    answers: {
      "1": "1. Evet vardır., 2. Kalın ve esneklik sınırı yüksek olan yay kullanılmıştır., 3. Balıkçılar, kasaplar, manavlar ve kargocular cisimlerin ağırlıklarını ölçerken, sporcular da uyguladıkları kuvvetin büyüklüğünü, sürekliliğini ve değişimini test ederler., 4. Öğrenci cevapları değerlendirilir.",
      "2": "1. Ağırlığı yoktur., 2. Evet, daha yükseğe zıplar., 3. Hayır, 4. Azalır.",
      "3": "1. Öğrencilerden gelen cevaplar değerlendirilir. Sürtünmeyi azaltarak hareketi hızlandırmak., 2. Öğrencilerden gelen cevaplar değerlendirilir. Hareketi zorlaştırma; sürtünmeyi artırma, 3. Öğrencilerden gelen cevaplar değerlendirilir. Sürtünmeyi azaltarak hızlandırma hareketi kolaylaştırmak., 4. Öğrencilerden gelen cevaplar değerlendirilir. Sürtünmeyi artırarak kayıp düşmeyi engellemek.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= 3. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Şimdi Uygula',
    qCount: 27,
    answers: {
      "1": "a. Hücreyi büyüteçle bir arada gruplanmış halde görebiliriz, ancak ayrıntılı olarak göremeyiz., b. Objektif, c. Tabla, d. Diyafram",
      "2": "A Hücresi: Akasya, Gül, Pırasa / B Hücresi: Tavşan, İnsan",
      "3": "Hücre Zarı: a, c, ı ve j / Sitoplazma: d, e, g, h ve i / Çekirdek: b ve f",
      "4": "Doğru ifadeler: b, c, f / Yanlış ifadeler: a, d, e",
      "5": "a. Bitki hücresi, b. Hücre çeperinin bitki hücrelerine ait olması, c. Hücre zarı, sitoplazma ve çekirdek",
      "6": "a. Hücre çeperi, bitki hücresinde bulunur., b. Sitoplazma, hücre zarı ile çekirdek arasında yer alır., c. Çekirdek, hücrenin yönetim merkezidir., d. Hücre zarı, hem bitki hem de hayvan hücresinde bulunur., e. Bitki ve hayvan hücrelerinin hücre zarı, sitoplazma ve çekirdek gibi ortak yapıları vardır.",
      "7": "a. Bitki hücreleri dik durabilmek, destek ve dayanıklılık sağlamak için hücre çeperine sahiptir. Hayvan hücreleri ise hareket edebilmek ve esnek yapıda olmak zorunda olduklarından hücre çeperi bulundurmaz., b. Hücre zarı olmasaydı hücreyi dış ortamdan ayıran bir yapı olmazdı. Madde alışverişi kontrol edilemez, zararlı maddeler hücreye girer, yararlı maddeler dışarı çıkar ve hücre yaşamını sürdüremezdi., c. Hücre faaliyetleri kontrol edilemez, büyüme ve bölünme gerçekleşmez, protein üretimi aksar ve hücre zamanla işlevini kaybederek ölür., d. Bir hücrenin bitki hücresi olduğunu anlamak için öncelikle hücre çeperi ve kloroplast bulunup bulunmadığına bakılır. Bunlar varsa hücre bitki hücresidir.",
      "8": "a. Koful, b. Mitokondri, c. Sentrozom, d. Kloroplast, e. Lizozom",
      "9": "a. Mitokondri, b. Koful, c. Koful, d. Ribozom, e. Golgi Cisimciği, f. Lizozom, g. Lizozom, h. Mitokondri, ı. Sentrozom, i. Kloroplast",
      "10": "a. Sentrozom, b. Lizozom, c. Koful, d. Endoplazmik retikulum, e. Mitokondri, f. Hücre duvarı, g. Kloroplast",
      "11": "Hücre: a, Doku: d, Organ: c, Sistem: e, Organizma: b",
      "12": "Doğru ifadeler: a, b, c ve d / Yanlış ifadeler: e ve f",
      "13": "a. H, b. P, c. E, d. İ, e. R",
      "14": "a. Tıkanması engellenerek nefes alınması sağlanır., b. Esneklik sağlar., c. Hareketi kolaylaştırır. Kemiklerin aşınmasını engeller., d. Öğrenci cevapları değerlendirilir.",
      "15": "a. 3, b. 1, c. 2",
      "16": "a. Doğru, b. Yanlış, c. Doğru, d. Doğru, e. Yanlış, f. Yanlış, g. Yanlış",
      "17": "a. Kafatası kemiği, b. Leğen kemiği, c. Kaval kemiği, d. Ayak bilek kemiği",
      "18": "Uzun Kemik: c, e, h, j / Yassı Kemik: a, d, f, g, ı / Kısa Kemik: b, i, k",
      "19": "a. Oynar eklem, b. Oynamaz eklem, c. Yarı oynar eklem, d. Oynamaz eklem",
      "20": "Oynar eklem: c, e / Yarı oynar eklem: b, d / Oynamaz eklem: a",
      "21": "a. 3, 5, 6, 7 ve 8, b. 2, 4, c. Oynamaz eklem",
      "22": "a. 2, b. 1, c. 2, d. 3",
      "23": "a. Düz kas, b. Kalp kası, c. Çizgili kas",
      "24": "Düz kas: a, b, c / Kalp kası: d / Çizgili kas: e, f, g",
      "25": "a. 1, b. 3, c. 2",
      "26": "a. 1, b. 1, c. 2, d. 2, e. 1, f. 1, g. 2",
      "27": "Olumlu: f / Olumsuz: a, b, c, d, e",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Birbirine Bağla',
    qCount: 18,
    answers: {
      "1": "a. Hayır, b. Hayır, c. Evet, d. Hayır",
      "2": "a, b, c, d, e, f, g, h: Öğrenci cevapları değerlendirilir.",
      "3": "Duvar: Hücre zarı / Nakliyeci: Endoplazmik Retikulum / Kasap: Lizozom / Çiftçi: Kloroplast / Elektrik santrali: Mitokondri / Kiler: Koful / Köy muhtarı: Çekirdek / Bölücü: Sentriyol / Öğrenci betimlemesi değerlendirilir.",
      "4": "a. 1, b. 1, c. 2, d. Hücre zarı, sitoplazma, çekirdek, e. 2, f. 1",
      "5": "a. 2, b. 7, c. 10, d. 11, e. 9, f. 4, g. 5, h. 8, ı. 6, i. 1",
      "6": "a. 4. çıkış, b. 2, c. 2, d. 11. çıkış",
      "7": "a. Evet, b. Evet, c. Hayır, d. Öğrenci cevapları değerlendirilir., e. Hücre duvarı ve kloroplast olmamalı, sentrozom ve lizozom olmalı, f. Öğrenci cevapları değerlendirilir.",
      "8": "1. Endoplazmik retikulum, 2. Golgi cisimciği, 3. Lizozom, 4. Sistem, 5. Ribozom, 6. Hücre, 7. Çekirdek, 8. Sentrozom, 9. Mitokondri, 10. Sentrozom, 11. Koful, 12. Organizma",
      "9": "a. Doğru, b. Yanlış, c. Yanlış, d. Yanlış, e. Doğru, f. Doğru",
      "10": "a. Uzun ve kalın kemikler, canlının iri yapılı, güçlü ve ağırlığını rahatlıkla taşıyabilen bir canlı olduğunu göstermektedir., b. Geniş ve yassı kafatası, beynini ve duyu organlarını dış etkilere karşı koruduğunu düşündürmektedir., c. El ve ayaklarını esnek kullanabildiğini, dengesini kolay sağlayabildiğini ve çevik hareket edebildiğini düşündürmektedir., d. Omurgasının hem sağlam hem de esnek olmasını sağlayarak rahat hareket etmesine, eğilip dönmesine ve hızlı koşmasına yardımcı olmuş olabilir., e. Hızlı koşabilen bir canlı olabilir. Çünkü güçlü bacak kemiklerine ve esnek bir omurga yapısına sahiptir., f. Bacak kemiklerinin güçlü olması avcı olduğunu gösterir., g. Kalp ve akciğer gibi hayati organlarını korumuş olabilir., h. Öğrenci cevapları değerlendirilir.",
      "11": "a. eklem, b. oynar, c. yarı oynar, d. kıkırdak, e. kulak kepçesi, f. burun",
      "12": "a. Kaslarının yer değiştirmesi ve eklemlerinin yanlış çalışması nedeniyle kalem tutmakta, yazı yazmakta ve merdiven çıkıp inmekte zorlanır; beden eğitimi dersine katılamaz., b. Boynunun aşırı dönebilmesi ve eklemlerinin yanlış çalışması nedeniyle yemek yerken, kıyafet giyerken ve günlük işlerini yaparken zorlanır; düşme ve yaralanma riski artar., c. Bacak kasları ve eklemleri düzgün çalışmadığı için güvenli yürüyemez veya koşamaz, yolda karşıdan karşıya geçerken dengesini kaybedebilir ve kazalara maruz kalabilir.",
      "13": "1. a, b: Öğrenci cevapları değerlendirilir., 2. Öğrenci cevapları değerlendirilir.",
      "14": "a. Kürek kemiği, b. Oynar eklem, c. Çizgili kas, d. Uzun kemik, e. Oynar eklem, f. Pazu kemiği",
      "15": "a. Çizgili kaslar görev yapmıştır. Çünkü göz kapağının açılıp kapanması istemli bir harekettir., b. Çizgili kaslar (çene kasları) çalışmıştır. Çünkü çiğneme istemli olarak gerçekleştirilir., c. Düz kaslar görev yapmıştır. Çünkü sindirim sistemi istemsiz olarak çalışır., d. Evet. Gülerken çalışan yüz kasları çizgili kaslardır ve isteğe bağlı olarak çalışırlar., e. Kalp kası da iskelet kası gibi çizgili kastır. Çok çalışır ancak kalp kası istemsiz ve sürekli çalışırken iskelet kası isteğe bağlı çalışır ve çabuk yorulur.",
      "16": "a. Kemikler, kaslar ve eklemler iş birliği hâlinde çalışmaktadır., b. Destek ve hareket sistemi, c. Dengeli ve düzenli beslenmeliyiz; Yaşımıza uygun spor yapmalıyız; Ağır yükleri doğru yöntemle kaldırmalıyız; Duruşumuza dikkat etmeliyiz; D vitamini tüketmeliyiz; Güneş ışığından yararlanmalıyız., d. Kemiklerinin kıkırdak dokudan dolayı daha esnek olmasıdır., e. Röntgen cihazı",
      "17": "1. Destek ve hareket sistemi, 2. Düz kas, 3. İskelet, 4. Kıkırdak, 5. Çizgili kas, 6. Kalp kası, 7. Yassı kemik, 8. Oynar eklem, 9. Kısa kemik, 10. Röntgen",
      "18": "a. Kemikler, eklemler ve kaslar birlikte çalışarak hareket etmemizi sağlar. Bu yapılar destek ve hareket sistemini oluşturur., b. Destek ve hareket sistemi, dolaşım sistemi, solunum sistemi ve sinir sistemi birlikte ve aktif olarak çalışır., c. Dengeli beslenmek, düzenli egzersiz, güneş ışığı, doğru duruş ve ağır yüklerden kaçınmak., d. Bebeklerin kemiklerinde kıkırdak oranı daha fazladır, daha esnek olduğundan kırılma olasılığı düşüktür., e. Röntgen (X-ışını), BT, MR, Ultrason. En yaygın kullanılanı röntgendir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_3',
    name: '3. Fasikül - Yaşama Uyarla',
    qCount: 2,
    answers: {
      "1": "1. Oküler, 2. Hayır, 3. Bitki hücresi, 4. Mitokondri, lizozom, koful, kloroplast, endoplazmik retikulum, ribozom ve golgi cisimciği bulunur., 5. Hayvan hücreleri seçilmelidir.",
      "2": "1. Köprü gibi sağlam ve esnek olması gereken yapılarda kullanılabilir. Öğrenci cevapları değerlendirilir., 2. Dayanıklı yapıların yapılmasını sağlayabilir. Öğrenci cevapları değerlendirilir., 3. Öğrenci cevapları değerlendirilir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= 4. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Şimdi Uygula',
    qCount: 30,
    answers: {
      "1": "a. 1, 2, 4, 5, 7, 8, 9, b. 3, 6, c. 1, 2, 4, 5, 7, 8, 9, d. 1, 2, 4, 5, e. 3, 7, 8, 9, f. Doğrusal olarak her yönde yayılmasıdır.",
      "2": "a. 1, b. 3, c. 2",
      "3": "1. Öğrenci: Doğru / 2. Öğrenci: Doğrusal yayıldığını gösterememiş. / 3. Öğrenci: Doğrusal yayıldığını gösterememiş. / 4. Öğrenci: Yönünü doğru gösterememiş.",
      "4": "Görseller: a, b, c, d ışık ışınlarının doğrusal yayılma modelleri",
      "5": "Işık ışını deliklerden geçerken yön değiştirmiş.",
      "6": "a. Işık ışınlarının göze ulaşamaması, b. 2",
      "7": "a. 3, b. Boruların düz olmaması",
      "8": "a. Evet, b. Evet",
      "9": "Işık ışınları doğrusal yayıldığı için O ve Ö noktalarına ışık ışınları ulaşamaz.",
      "10": "a. 1. delikten baktığında mor, kırmızı, yeşil ve pembe renkteki ışıklar göze ulaşamaz., b. Mor, turuncu, beyaz, c. Kırmızı, yeşil, beyaz, pembe, mor, d. 2. Levhaya delik açabilir., e. Mor, turuncu, yeşil, pembe, f. 2",
      "11": "a. Evet, b. Bulutların ya da ağaçların arasından sızan ışık vb.",
      "12": "a. D, b. Y, c. Y, d. Y, e. D, f. Y",
      "13": "Işığın doğrusal yolla ve her yer yöne dağılması",
      "14": "Saydam Cisimler: a, b, g / Yarı Saydam Cisimler: d, f, h, i / Opak Cisimler: c, e, ı",
      "15": "a. Evet, b. Hayır, c. Biraz gösterir., d. Evet, e. L, f. M",
      "16": "a. 3, 8, 9, 12, b. 1, 4, 5, 7, 10, c. 2, 6, 11, d. 2, 6, 11, e. 3, 8, 9, 12, f. 1, 4, 5, 7, 10",
      "17": "a. 7, 9, b. 1, 3, c. 2, 4, 5, 6, 8",
      "18": "Mumu net görür: e, f / Mumu bulanık görür: b, c / Mumu göremez: a, d",
      "19": "a. L, M, b. K, c. Üzerine ışık düşmemesidir.",
      "20": "a. Evet, b. 1 > 2 > 3",
      "21": "Artar: b, c / Azalır: a, d, e, f, g",
      "22": "a. Doğrusal yayılması, b. Hayır, c. Evet",
      "23": "Gölge çizimleri: a (ok yukarı), b (üçgen), c (ok sağa), d (kalp), e (beşgen)",
      "24": "Sokak lambasına yaklaşırken gölge boyu kısalır, uzaklaşırken uzar.",
      "25": "Gölge boyu ve şekli çizimleri (a, b, c)",
      "26": "a. 1, 2, 3 dairesel gölge modelleri, b. 1. Evet, 2. Evet, 3. Evet, 4. Evet",
      "27": "a. Artar., b. Artar., c. Artar., d. Artar., e. Azalır., f. Azalır.",
      "28": "a. Yanlış, b. Yanlış, c. Yanlış, d. Doğru, e. Yanlış, f. Yanlış, g. Doğru, h. Doğru",
      "29": "a. Opak cisim olduğundan., b. Saydam cisimler olduklarından., c. Gölge oluşmazdı., d. Artar.",
      "30": "Öğrenci cevapları değerlendirilir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Birbirine Bağla',
    qCount: 4,
    answers: {
      "1": "Öğrenci yorumları değerlendirilir.",
      "2": "a. M, b. L, c. K",
      "3": "Saydam cisimlerin kalınlığı arttıkça opak gibi davranmasıdır.",
      "4": "a. Doğrusal yayılmasıdır., b. Işığı geçirmez., c. Işık kaynağı cisimlere yaklaştırılmalıdır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_4',
    name: '4. Fasikül - Yaşama Uyarla',
    qCount: 3,
    answers: {
      "1": "1. Ters bir şekilde görünmüştür., 2. L düzeneği, 3. Evet, 4. Kamera",
      "2": "1. Öğrenci cevapları değerlendirilir., 2. Öğrenci cevapları değerlendirilir., 3. Olumlu yönde etkilemiştir.",
      "3": "1. Düzenli ve planlı olmayı sağlar., 2. Bulutlu havalarda ve gece zamanı tahmin edememektir., 3. Evet",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= 5. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Şimdi Uygula',
    qCount: 41,
    answers: {
      "1": "Maddenin boşluklu yapıda olması nedeniyle su tanecikleri arasındaki boşluklara mürekkebin yerleşmesi",
      "2": "b. Alkol tanecikleri arasındaki boşlukların arasına iyot tanecikleri yerleşir., c. Su tanecikleri arasına mürekkep tanecikleri yerleşir., d. Gaz tanecikleri arasındaki boşluk çok fazladır ve bulunduğu kabın şeklini alır., e. Yemek kokusu gaz tanecikleri arasındaki boşluğa yayılarak odanın içini kaplar.",
      "3": "Tuz tanecikleri su tanecikleri arasındaki boşluklara yerleştiği için sıvı seviyesinde artış olmamıştır.",
      "4": "Demir: Belirli bir şekli vardır. / Tanecikleri düzenlidir. | Su: Akışkandır. | Hava: Akışkandır. / Sıkıştırılabilir. | Buhar: Akışkandır. / Sıkıştırılabilir.",
      "5": "a. Hava, b. Taş, Su, c. Taş",
      "6": "a. B, b. C, c. A, d. A, e. A, B ve C, f. A, B ve C",
      "7": "a. D, b. Y, c. Y, d. D, e. D, f. D, g. D, h. D, ı. D",
      "8": "a. 1, 2, 5, 6, 7, ve 9, b. 2, 5, 7 ve 9, c. 1, 2, 5, 6, 7, ve 9, d. 3, 4, 8 ve 10, e. 3, 4, 8 ve 10, f. 2, 5, 7 ve 9, g. 3, 4, 8 ve 10, h. 1, 2, 5, 6, 7, ve 9, ı. 2, 5, 7 ve 9",
      "9": "1. e, 2. b, 3. f, 4. d, 5. c, 6. a",
      "10": "a. ısı, b. enerji, c. cal, d. sıcaklık, e. termometre",
      "11": "a. Sıcaklık, b. Isı, c. Isı, d. Sıcaklık, e. Sıcaklık",
      "12": "a. Öğrenci cevapları değerlendirilir., b. Isı bir enerjidir, sıcaklık bir enerji değildir. Isı alınıp verilebilir, sıcaklık alınıp verilemez., c. Eşit değildir.",
      "13": "a, b, c, d, e. Öğrenci cevapları değerlendirilir.",
      "14": "25 cal yerine 25 °C ve sıcaklık enerjisi yerine ısı enerjisi yazılmalı",
      "15": "a. Isı alışverişinin yönü sıcak maddeden soğuk maddeye doğrudur., b. Odanın sıcaklığı 5 °C arttı., f. Hastayken vücut sıcaklığımı 40 °C ölçtüm., g. Dünya'mız Güneş'ten ısı alır., h. Fırının kapağını açınca fırın mutfağa ısı verdi.",
      "16": "a, d, e ve f",
      "17": "a. 1, b. 2, c. 1, d. 2",
      "18": "a. 80 °C, b. 30 °C, c. 40 °C, 75 °C ve 80 °C",
      "19": "a. L, b. K, c. 70 °C",
      "20": "a. D, b. Y, c. D, d. D, e. D, f. D",
      "21": "a. 2, 3, 4, 5 ve 9, b. 1, 7 ve 8, c. 2, 3, 4, 5 ve 9, d. 1, 7 ve 8, e. 6, f. 6, g. 6, h. 2, 3, 4, 5 ve 9",
      "22": "a. Buharlaşma, b. Evet, c. Ortamdan ısı alarak gerçekleştiği için ortamın sıcaklığı azalır., d. Kaynama",
      "23": "a. Y, b. D, c. Y, d. D, e. D, f. Y, g. Y, h. D",
      "24": "a. hâl değişimi, b. erime, c. buharlaşma, d. boşluk, e. süblimleşme, f. kaynama",
      "25": "a. Y, b. D, c. D, d. Y, e. Y, f. D, g. D",
      "26": "a. donma, b. kırağılaşma, c. yoğuşma, d. hızı, e. vererek",
      "27": "a. 1, 2 ve 3, b. 4, 5 ve 6, c. 1, 2 ve 3, d. 4, 5 ve 6, e. 3, f. 4, g. 1, 2 ve 3, h. 2 ve 3",
      "28": "a. 4, b. 2, c. 3, d. 1, e. 5",
      "29": "a. Isı alarak, b. Isı vererek, c. Isı vererek, d. Isı vererek, e. Isı alarak, f. Isı alarak",
      "30": "a. 1: Isı yalıtkanı, 2: Isı iletkeni / b. 1: Isı iletkeni, 2: Isı yalıtkanı / c. 1: Isı iletkeni, 2: Isı yalıtkanı",
      "31": "a. 3, 5, 6 ve 8, b. 1, 2, 4 ve 7, c. 3, 5, 6 ve 8, d. 1, 2, 4 ve 7",
      "32": "a. tanecikli, b. boşluk, c. metaller, d. iletkeni, e. yalıtkanı",
      "33": "a. Y, b. Y, c. D, d. Y, e. D, f. Y",
      "34": "a. K, b. L, c. X",
      "35": "a. 'Metallerin ısı iletkenlikleri aynı mıdır?' sorusuna cevap bulmak için hazırlamıştır., b. L, c. M, d. 2. düzenekteki metalin ısı iletkenliği diğerlerinden azdır., e. M, f. M > K > L",
      "36": "a. ısı, b. sıcak, c. enerji, d. cam yünü, e. ekonomik, f. strafor köpük, g. yalıtımı, h. vakumlanmış",
      "37": "a. D, b. Y, c. Y, d. Y, e. Y",
      "38": "a. Isı yalıtımı sağlamak., b. Isı yalıtımı sağlamak., c. Isı yalıtımı sağlamak., d. Yapılmalıdır., e. Tahta banka otururum çünkü metal ısı iletkeni olduğu için çok sıcak olur., f. İnce kazaklar arasında oluşan hava boşluğu ısı akışının yavaş olmasını sağlar.",
      "39": "a. Yüksek maliyetli olması ve kullanım ömrünün kısa olması, b. Yanma özelliğinin az olması, c. Yanma özelliğinin az olması, düşük maliyetli olması ve kullanım ömrünün uzun olması, d. L",
      "40": "a. Evet, b. Evet, c. Evet, d. Evet, e. Hayır",
      "41": "a. L, b. K",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Birbirine Bağla',
    qCount: 14,
    answers: {
      "1": "a. Maddenin tanecikleri, b. Maddenin boşluklu yapısını, c. L modeli, d. Maddenin gaz hâlinde tanecikler arasındaki boşluğun fazla olduğunu göstermek için, e. Maddenin katı hâlinin en düzenli hâli olduğunu göstermek için, f. M modeli",
      "2": "Isı alan madde taneciklerinin hareketliliğinin artması",
      "3": "a. titreşimler, b. katı, c. küçük, d. öteleme, e. dönme, f. sıvıların, g. gazların, h. belirli, ı. kabın, j. hacmini",
      "4": "Su: 1, 3, 4, 6, 9, 10 ve 15 | Tahta: 3, 5, 7, 9, 11, 13, 14, 15 ve 16 | Hava: 2, 4, 6, 8, 9, 12, 15, 17 ve 18 | Limonata: 1, 4, 6, 9, 10 ve 15 | Masa: 3, 5, 7, 9, 11, 13, 14, 15 ve 16 | Oksijen: 2, 4, 6, 8, 9, 12, 15, 17 ve 18",
      "5": "a. K'den M'ye doğru, b. Azalır., c. L, d. N, e. 15 °C, f. 30 °C, g. 25 °C",
      "6": "a. Çorba, b. Su, c. Odadaki hava, masa, d. Su, e. Ayak",
      "7": "1. Öğrenci cevapları değerlendirilir., 2. Öğrenci cevapları değerlendirilir., 3. Hayır. Isı aktarılır., 4. Hayır. Isı aktarılır., 5. Isıdır., 6. Sıcak cisimden soğuk cisme aktarılır., 7. Isı vermesi, 8. Isı alması, 9. Isı, sıcak cisimlerden soğuk cisimlere aktarılan bir enerjidir., 10. Hayır. Katı ve gazlarda da gerçekleşir., 11. Maddeler denge sıcaklığına geldiğinde ısı alış verişi tamamlanır., 12. Olmazdı. Isı alış verişi sıcaklıkları farklı maddeler arasında gerçekleşir.",
      "8": "a. 8 ve 10. dakikalar ile 12-14. dakikalar arası, b. 5 °C, c. 15 °C, d. 2. dakika, e. 2. dakika, f. Alınan ısı, sıcaklığı artırmak yerine maddenin hâl değiştirmesi için kullanılır. Bu nedenle sıcaklık sabit kalır., g. Yalnızca katı: 0-4. dakikalar / Yalnızca sıvı: 10-12. dakikalar / Yalnızca gaz: 14. dakikadan sonra, h. 8-10. dakikalar: Katı ve sıvı birlikte bulunur (erime). / 12-14. dakikalar: Sıvı ve gaz birlikte bulunur (kaynama)., i. 10-12. dakikalar arasında, j. Hayır, tamamlanamazdı. Çünkü hâl değişiminin tamamlanabilmesi için maddenin ısı almaya devam etmesi gerekir. Isı kesildiğinde hâl değişimi durur.",
      "9": "a. 10-15. dakikalar ile 20-25. dakikalar arasında, b. 100, c. 0, d. 5 dakika, e. 5 dakika, f. Hâl değiştirmektedir., g. Yalnızca gaz: 0-10. dakikalar / Yalnızca sıvı: 15-20. dakikalar / Yalnızca katı: 25-30. dakikalar, h. 10-15. dakikalar: Gaz ve sıvı birlikte bulunur (yoğuşma). / 20-25. dakikalar: Sıvı ve katı birlikte bulunur (donma)., i. Maddenin soğuması gerçekleşmektedir. Bu aralıklarda madde çevresine ısı verir, taneciklerin hareket enerjisi azalır ve sıcaklığı düşer., j. Verilen ısı, maddenin hâl değiştirmesi sırasında taneciklerin birbirine yaklaşmasını ve yeni bağlar oluşturmasını sağlar. Bu nedenle sıcaklık değişmez; enerji hâl değişimi için kullanılır.",
      "10": "a. Erime, b. Buharlaşma, c. Süblimleşme, d. Buharlaşma, e. Süblimleşme, f. Buharlaşma, g. Buharlaşma, h. Yoğuşma, ı. Kırağılaşma, i. Buharlaşma, j. Kırağılaşma, k. Erime, l. Buharlaşma, m. Buharlaşma, n. Yoğuşma",
      "11": "a. 4-8. dakikalar ile 28-32. dakikalar arası, b. 0 °C, c. 100 °C, d. 4 dakika, e. 4 dakika",
      "12": "a. Yalnızca gaz: 0-4. dakikalar / Yalnızca sıvı: 12-28. dakikalar / Yalnızca katı: 32-36. dakikalar, b. 4-8. dakikalar: Gaz ve sıvı birlikte bulunur (yoğuşma). / 28-32. dakikalar: Sıvı ve katı birlikte bulunur (donma)., c. Çünkü verilen ısı, sıcaklığı değiştirmek yerine hâl değişiminin gerçekleşmesi için kullanılır. Bu nedenle sıcaklık sabit kalır., d. Maddenin saf bir madde olduğunu gösterir. Saf maddeler hâl değiştirirken sıcaklıkları sabit kalır., e. Saf olmayan maddelerde yoğuşma ve donma sırasında sıcaklık sabit kalmaz, zamanla değişmeye devam ederdi.",
      "13": "a. 11. çıkış, b. 2, c. 2, d. 5. çıkış",
      "14": "a. 1, b. 2, c. 3, d. 4 ve 5, e. 5, f. 6",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_5',
    name: '5. Fasikül - Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "1. Tanecik, 2. Madde gözle görülemeyecek kadar küçük taneciklerden oluşmaktadır., 3. Câbir bin Hayyân, 4. Etmez., 5. Gerekir., 6. Maddeyi oluşturan taneciklerin hareketli yapıda olduğu sonucuna ulaşmıştır.",
      "2": "1. Su, 2. Sıcaklık değiştiği için maddenin özellikleri de değişmektedir., 3. Isı kaybını önlemek için kullanılır., 4. Isı yalıtımı sağlayarak yakıt tüketimi azaltılır.",
      "3": "1. Isı enerjisinin elektrik enerjisine dönüşümü, 2. Çevre kirliliğinin azalmasını sağlar., 3. Enerji kaybını azaltır., 4. Araba egzozlarında, buzdolabı ve soğutucularda",
      "4": "1. Isı yalıtımı sağlamak., 2. Boşluk bulunması, 3. Her ikisinde de ısı akışı yavaşlatılmıştır., 4. Isı akışını daha fazla önlemek., 5. Yaşam konforunu artırır, yakıt tüketimini azaltarak ekonomiye katkı sağlar ve çevre kirliliğini azaltır.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= 6. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Şimdi Uygula',
    qCount: 24,
    answers: {
      "1": "a. 2, b. 6, c. 1, d. 3, e. 4, f. 5",
      "2": "a. 4, b. 5, c. 2, d. 1, e. 3",
      "3": "a. pil, b. bağlantı kablosu, c. pil, d. duy, e. Anahtar",
      "4": "a. Bir başka ülkede üretilen bir cihazın devre şemasını başka bir ülkedeki tamirci anlayabilir., b. Pil, bağlantı kablosu, ampul, açık ve kapalı anahtar, c. Duy, pil yatağı, d. Kurulabilir.",
      "5": "a. 2, 6, 8, 9 ve 10, b. 1, 3, 4, 5 ve 7, c. 10, d. 9, e. 4, f. 6, g. 5",
      "6": "a. Y, b. Y, c. D, d. D, e. Y",
      "7": "a. Ampulün patlak olması, b. Ampul, c. Elektriğin iletilmesini sağlar., d. Yanmazdı. Anahtar açıksa devreden elektrik akımı geçemezdi.",
      "8": "a. Pillerin yanlış bağlanmış olması, b. Pil, c. Çalışmazdı. Çünkü elektrik enerjisini ışık enerjisine çeviren devre elemanı ampuldür.",
      "9": "a. Anahtar, b. Evet, c. Elektriğin devreden geçip geçmemesini sağlar.",
      "10": "Öğrenci cevapları değerlendirilir.",
      "11": "Devre şemaları çizimleri (a, b, c, d)",
      "12": "K devresi: Pil 2, Ampul 3, Anahtar 2 | L devresi: Pil 1, Ampul 2, Anahtar 1 | M devresi: Pil 4, Ampul 4, Anahtar 0",
      "13": "a. 2, b. 3, c. 4, d. 1",
      "14": "a. 3, b. 2, c. 1, d. 5, e. 4",
      "15": "Devre şemaları çizimleri (a, b)",
      "16": "a. Anahtarın açık olması, b. Ampul patlak olabilir, pil bitmiş olabilir., c. Anahtarın açık olması, d. Anahtarın açık olması, e. Piller ters bağlanmış",
      "17": "Hipotez: Ampul sayısı ampul parlaklığını etkiler (ya da etkilemez). | Değişkenler: Kontrol: Pil sayısı, iletken tel, kapalı anahtar; Bağımsız: Ampul sayısı; Bağımlı: Ampul parlaklığı | Sonuç: 2. düzenekte ampulün parlaklığı daha fazla. | Sorunun cevabı: Azalır.",
      "18": "Soru: Basit elektrik devresinde pil sayısı ampul parlaklığını etkiler mi? | Değişkenler: Kontrol: Ampul sayısı, iletken tel, kapalı anahtar; Bağımsız: Pil sayısı; Bağımlı: Ampul parlaklığı | Sonuç: 2. düzenekte ampul parlaklığı daha fazla. | Sorunun cevabı: Artar.",
      "19": "a. Azalır., b. Artar., c. Artar., d. Azalır.",
      "20": "a. Evet, b. Evet, c. Evet, d. Hayır, e. Hayır, f. Hayır",
      "21": "L > M > K",
      "22": "L = M > K",
      "23": "L > M > K",
      "24": "a. Ulaşamaz çünkü 2 tane bağımsız değişken kullanmıştır., b. Çizim, c. Çizim",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Birbirine Bağla',
    qCount: 4,
    answers: {
      "1": "a. 2 ve 5, b. 1: Bağlantı kablosu kopuk / 3: Anahtar açık / 6: Ampul devreye bağlı değil",
      "2": "Devre şemaları (K, L, M)",
      "3": "a. N, b. L, c. M, d. L ve N, e. K ve M, f. Hayır, g. Hayır, h. Ampul sayısı, ı. Ampul sayısı, anahtar, iletken tel",
      "4": "a. Bağımsız: Ampul sayısı, Bağımlı: Ampul parlaklığı, Kontrol: Pil sayısı, anahtar, iletken tel, Daha parlak: 2. devre | b. Bağımsız: Pil sayısı, Bağımlı: Ampul parlaklığı, Kontrol: Ampul sayısı, anahtar, iletken tel, Daha parlak: 2. devre | c. Bağımsız: Ampul sayısı, Bağımlı: Ampul parlaklığı, Kontrol: Pil sayısı, anahtar, iletken tel, Daha parlak: 1. devre | d. Bağımsız: Pil sayısı, Bağımlı: Ampul parlaklığı, Kontrol: Ampul sayısı, anahtar, iletken tel, Daha parlak: 1. devre",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_6',
    name: '6. Fasikül - Yaşama Uyarla',
    qCount: 4,
    answers: {
      "1": "İçinde bulunan lityum, gümüş, nikel ve cıva gibi zehirli metaller toprağı ve suyu kirletir.",
      "2": "Su ve toprakta yetişen ürünlerle ulaşır.",
      "3": "Zehirli atıkların doğaya bırakılmaması için önemlidir.",
      "4": "Öğrenci cevapları değerlendirilir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },

  // ================= 7. FASİKÜL =================
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Şimdi Uygula',
    qCount: 15,
    answers: {
      "1": "a. Atık madde olmaları ortak özellikleridir. Geri dönüştürülebilir ya da geri dönüştürülemez özellikte olmaları farklı özellikleridir., b. Öğrenci cevapları değerlendirilir.",
      "2": "a. Atıkların toplaması, ham maddeye dönüşmesi, yeni ürün eldesi, b. Sürdürülebilir kalkınmaya destek olmak., c. Geri dönüşüm sürecine katkı sağlar., d. Öğrenci cevapları değerlendirilir.",
      "3": "Geri dönüştürülebilen atıklar: 2, 3, 7, 9 ve 10 / Geri dönüştürülemeyen atıklar: 1, 4, 5, 6, 8, 11 ve 12",
      "4": "Kâğıt: 1 ve 2 / Plastik: 8 ve 9 / Metal: 4, 12 ve 16 / Cam: 3",
      "5": "Geri Dönüşüm Kutusuna Atılmalı: b, e, h ve i / Geri Dönüşüm Kutusuna Atılmamalı: a, c, d ve ı",
      "6": "a. Geri dönüşümü yapılamayan atıklardır., b. Ev gibi yaşam alanlarında çeşitli maddelerin kullanımı sonucunda ihtiyaç duyulmayan maddelerdir., c. Bir ürünün ortaya çıkmasını sağlayan ihtiyaçlardır., d. Sürdürülebilirlik., e. Geri dönüşüm, atık bir maddenin çeşitli işlem sonrasında tekrar ham maddeye dönüşmesidir., f. Toplumun mevcut ihtiyaçlarını gelecek nesillerin ihtiyaçlarını da düşünerek dengelemektir.",
      "7": "a. TAP, b. İmha, c. Cıva, kadmiyum, kurşun",
      "8": "a. Hayır, b. İmha",
      "9": "a. 5, b. 3, c. 4, d. 1",
      "10": "a. Evsel atık, b. Doğal kaynakların korunması sağlanır. Öğrenci cevapları değerlendirilir., c. Öğrenci cevapları değerlendirilir.",
      "11": "a. Karton, b. Metal, c. Atıkları kaynağında ayrıştırabiliriz.",
      "12": "a. Temiz içme suyu kaynaklarının korunması sağlanabilir., b. Tek kullanımlık ürünlerin kullanımını azaltabiliriz.",
      "13": "a, b, c. Öğrenci cevapları değerlendirilir.",
      "14": "Öğrenci cevapları değerlendirilir.",
      "15": "a. Öğrenci cevapları değerlendirilir., b. Gıda atıklarından kompost gübre yapmak., c. Öğrenci cevapları değerlendirilir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  },
  {
    topicId: 'top_max_fen_fas_7',
    name: '7. Fasikül - Yaşama Uyarla',
    qCount: 5,
    answers: {
      "1": "Atıkların içindeki zehirli metaller çevre ve canlılara zarar verdiği için sorundur. Atıkların geri dönüşüme gönderilirse içinde bulunan metaller tekrar kullanılabildiği için fırsattır.",
      "2": "Elektronik atıklardan kıymetli metallerin geri kazanılmasıdır.",
      "3": "Kurşun, cıva ve kadmiyum",
      "4": "Altın, gümüş, bakır ve paladyum",
      "5": "Madenden metali elde etmekten daha az maliyetlidir.",
      "__meta": { "isOpenEnded": true, "questionType": "acik_uclu", "startQuestionNumber": 1 }
    }
  }
];

// Combine into final build_fen_max_complete.cjs
const finalContent = `const fs = require('fs');

const BOOK_ID = '${BOOK_ID}';
const SUBJECT_ID = '${SUBJECT_ID}';

const topics = ${JSON.stringify(topics, null, 2)};

const mcTests = ${mcTestsStr};

const openEndedTests = ${JSON.stringify(openEndedTests, null, 2)};

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
`;

fs.writeFileSync('scripts/build_fen_max_complete.cjs', finalContent, 'utf8');
console.log('build_fen_max_complete.cjs generated successfully!');
