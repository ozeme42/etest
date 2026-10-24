# -*- coding: utf-8 -*-
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open("turkce_transcription_from_summary.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.splitlines()

turkce_dicts = {}

current_tema = 0
current_type = None # "ETKINLIK" or "YAZILI"

for line in lines:
    line_s = line.strip()
    if not line_s:
        continue
    
    m_t = re.search(r'(\d+)\.\s*TEMA', line_s)
    if m_t:
        current_tema = int(m_t.group(1))
        continue
        
    if "Etkinlikler" in line_s and current_tema > 0:
        current_type = "ETKINLIK"
        turkce_dicts[f"TURKCE_TEMA_{current_tema}_ETKINLIKLER"] = {}
        continue
        
    if "Yazılıya Hazırlık" in line_s and current_tema > 0:
        current_type = "YAZILI"
        turkce_dicts[f"TURKCE_TEMA_{current_tema}_YAZILI"] = {}
        continue
        
    m_item = re.match(r'-\s*(\d+):\s*(.*)', line_s)
    if m_item and current_tema > 0 and current_type:
        q_no = int(m_item.group(1))
        ans = m_item.group(2).strip()
        dict_key = f"TURKCE_TEMA_{current_tema}_ETKINLIKLER" if current_type == "ETKINLIK" else f"TURKCE_TEMA_{current_tema}_YAZILI"
        turkce_dicts[dict_key][q_no] = ans

# Now let's explicitly provide Temas 5 and 6 from our visual transcription of p_365.png and p_366.png!
turkce_dicts["TURKCE_TEMA_5_ETKINLIKLER"] = {
    1: 'A. Alice aşağıya düşer ve bir tavşanla karşılaşır. Önünde iki yol vardır, tavşana sorar: "Hangi yoldan gideyim?" Tavşan bugüne dek duyduğum en iyi cevaplardan birini verir: "Nereye gideceğini bilmiyorsan hangi yoldan gittiğinin hiçbir önemi yok." Tavşanın diğer yanında bir tavşan da ben olsaydım derdim ki: "Aslında nereye gideceğini bilmenden daha önemlisi, kim olduğunu bilmen. Kim olduğunu bilirsen gideceğin yer değiştiğinde ortalıkta dımdızlak kalmazsın ve nereye gideceğini çok daha iyi belirlersin." B. 1. GÜNEŞ, 2. NEŞELİ, 3. SEYAHAT, 4. GERÇEK, 5. KUSURSUZ, 6. YAŞAM',
    2: '1. Dil bilgisi, 2. Matematik, 3. Güzel sanatlar, 4. Gök bilimi, 5. Spor, 6. Müzik',
    3: '1. G, 2. F, 3. J, 4. D, 5. E, 6. A, 7. C, 8. H, 9. I, 10. B',
    4: 'Matematik: açı, basamak, kesir; Müzik: beste, senfoni; Spor: basketbol, taç; Tıp: kanal, anestezi, grip',
    5: '1. İnsanlar daha önce çabuk sinirlenmiyor, kalp kırmıyordu., 2. Bileti tek sayı olmayanlar sıraya geçemez., 3. Onunla başka konular hakkında da görüşmek istiyor.',
    6: '1, 5, 6',
    7: "1. 2024'te, 2. Taşınabilir ve uzaktan kumanda edilebilir bir robotik cerrahi platformu, 3. Platformun zarar görmeden istasyona ulaşması için, 4. İstasyonda, 5. Uzayda kullanılacak bir platformun uygun koşullara hazırlanması., 6. Doktorların da dâhil olduğu insan grupları",
    8: '1, 2, 4',
    9: 'A. 3, B. 1, C. 4',
    10: 'A. 2, 4, 1, 3; B. 2, 3, 1; C. 2, 1, 3',
    11: '"...yaşamak için diğer canlılara muhtacız."',
    12: '1. D, 2. E, 3. C, 4. B, 5. A',
    13: '1. ✓, 2. ✓, 3. ✗, 4. ✗, 5. ✗, 6. ✓',
    14: '1. Karşılaştırma, 2. Karşılaştırma, 3. Benzetme, 4. Benzetme, 5. Karşılaştırma',
    15: '1, 4, 6, 8, 10',
    16: 'Öğrenci cevabı',
    17: '1, 2, 5, 6, 7',
    18: '1, 3, 4',
    19: '3. Çıkış',
    20: 'SAYGI',
    21: '1. D, 2. Y, 3. D, 4. D, 5. Y, 6. D, 7. Y, 8. D, 9. D, 10. Y, 11. D, 12. Y, 13. D, 14. Y, 15. Y'
}

turkce_dicts["TURKCE_TEMA_5_YAZILI"] = {
    1: 'a. Terim, b. Mecaz, c. Gerçek',
    2: "Metindeki durum nedir?: Zeytin hasadının gecikmesi; Metindeki durum nerede gerçekleşmiştir?: Aydın'da; Metne konu olan durum ne zaman gerçekleşmiştir?: Sonbahar; Metne konu olan durum nasıl gerçekleşmiştir?: Yağışlar başlayınca üreticiler hasada başlamış ve ara tatil nedeniyle çocuklar da tarlaya gitmiştir.; Metne konu olan durum neden gerçekleşmiştir?: Yağışların geç gelmesi nedeniyle hasat gecikmiştir.; Metinde bahsedilen durum kim tarafından oluşturulmuştur?: Hasat, zeytin üreticileri tarafından oluşturulmuştur.",
    3: '1, 3, 4',
    4: '1. Daha önce tarihî yerleri gezmekten zevk almıyordum., 2. Havaların ısınmasıyla başka ağaçlar da kendine gelmiştir., 3. Kuzenim şimdi de sülalenin tüm işlerine koşuyor., 4. Daha önce dostlarımı seçerken dikkatli değildim., 5. En sevdiklerim arasında başka şairler de vardır.',
    5: '"Afrikaname", bu zengin coğrafyayı keşfetmeye okuyarak başlamak isteyenler için hazırlanmış bir kitaptır. Kitap, uzun yıllar Boğaziçi Üniversitesinde öğretim üyeliği yapmış Güliz Elal\'ın kaleminden seyrine doyumsuz manzaralar içeriyor. Elal; nefes kesen doğası, çeşitliliği, yaban hayatı ve kendine özgü ritmi ile Afrika\'yı başlı başına bir macera olarak bizlere sunmuştur.',
    6: 'Nilay, ailesinin Manisa\'dan Sakarya\'ya taşınması nedeniyle okulunu değiştirmek zorunda kalmıştır. Yeni okulunda ilk dersine giren Nilay, sınıf arkadaşlarına gülümseyerek "Merhaba arkadaşlar, ben Nilay. Bundan sonra ben de bu sınıfta eğitim göreceğim." der. Sınıftaki arkadaşlarından Selin, Nilay\'ın bu sıcak tavrını takdir eder.',
    7: 'Öğrenci cevabı'
}

turkce_dicts["TURKCE_TEMA_6_ETKINLIKLER"] = {
    1: '1. c, 2. j, 3. b, 4. ı, 5. ğ, 6. i, 7. a, 8. ç, 9. g, 10. e, 11. l, 12. d, 13. h, 14. f, 15. k',
    2: '1. Ekosistem - Canlı - İnsan - Organ - Göz, 2. Zaman - 2019 - Temmuz - Gün - Cuma',
    3: 'A. 1, 5, 6; B. 1, 2, 5; C. 3, 4, 6',
    4: 'Öğrenci cevabı',
    5: '3, 4, 2, 5, 1, 6, 7',
    6: 'Hikaye edici: 1, 4, 5; Bilgilendirici: 2, 3, 6',
    7: 'Öğrenci cevabı',
    8: 'Yer: Çadırdaki sofra; Zaman: Belirsiz; Şahıs ve Varlık Kadrosu: Kral, hizmetkârları, kralın adamları; Metin Türü: Hikâye; Anlatıcı: 3. Kişi; Olay: Sofrasında tuz eksik olan bir kralın hizmetkârı yoluyla köylülerden tuz istemesi fakat ileride oluşabilecek durumlar için tuzun parasını vermek istemesi.',
    9: '1. Hikâye, 2. Fabl, 3. Haber Metni, 4. Masal',
    10: '2, 4, 5',
    11: '✓, ✓, ✗, ✗, ✗, ✓',
    12: '1, 4, 5',
    13: '1. Y, 2. D, 3. Y, 4. Y, 5. D, 6. D, 7. D, 8. Y, 9. D, 10. Y, 11. D, 12. D',
    14: '1. Nokta, 2. İki nokta, 3. Kısa çizgi, 4. Üç nokta, 5. Virgül, 6. Kesme işareti, 7. Virgül, 8. Soru işareti, 9. Soru işareti, 10. Ünlem, 11. Ünlem, 12. Kesme işareti, 13. Uzun çizgi, 14. Kısa çizgi, 15. Nokta, 16. İki nokta, 17. Üç nokta, 18. Kısa çizgi'
}

turkce_dicts["TURKCE_TEMA_6_YAZILI"] = {
    1: 'ARKA',
    2: 'Bir varlığa biçilen değer, kişiden kişiye ve ihtiyaçlara göre değişebilir.',
    3: 'a. Çünkü, b. fakat, c. böylece, d. kısacası',
    4: '1. Fiil, 2. Sıfat, 3. İsim, 4. İsim, 5. Fiil',
    5: 'N, N, Ö, N, Ö',
    6: 'Kesin olarak bilinmemekle birlikte 1923 yılında doğduğu düşünülen Yaşar Kemal, Osmaniye ilinde dünyaya gelmiştir.',
    7: '-/ "/ !/ "/ .',
    8: 'Öğrenci cevabı'
}

print(f"Total parsed dicts for Turkce: {len(turkce_dicts)}")
for name, d in turkce_dicts.items():
    print(f"{name}: {len(d)} questions (keys {min(d.keys()) if d else None}..{max(d.keys()) if d else None})")

# Write out bumerang_turkce_answers.py
with open("bumerang_turkce_answers.py", "w", encoding="utf-8") as f:
    f.write("# -*- coding: utf-8 -*-\n")
    f.write('"""\nAuthentic Open-Ended Answer Keys for 5. Sınıf Bumerang Türkçe\nTranscribed verbatim from printed teacher answer keys (pages 358-366).\n"""\n\n')
    
    for name, d in turkce_dicts.items():
        f.write(f"{name} = {{\n")
        for q_no in sorted(d.keys()):
            val = d[q_no].replace('\\', '\\\\').replace('"', '\\"')
            f.write(f'    {q_no}: "{val}",\n')
        f.write("}\n\n")

print("Generated bumerang_turkce_answers.py successfully!")
