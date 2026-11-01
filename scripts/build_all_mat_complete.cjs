const fs = require('fs');

function parseAnswerString(str) {
  const answers = {};
  const regex = /(\d+)\s*\.\s*([A-D])/gi;
  let m;
  while ((m = regex.exec(str)) !== null) {
    answers[m[1]] = m[2].toUpperCase();
  }
  return answers;
}

// 99 Multiple Choice Tests
const allMcTests = [
  // =========================================================================
  // FASİKÜL 1: GEOMETRİK ŞEKİLLER (18 test)
  // =========================================================================
  // Kavramları Kavra (01 - 07)
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 01', raw: '1.C 2.D 3.B 4.D 5.B 6.A 7.C 8.B 9.C 10.C 11.A 12.B' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 02', raw: '1.D 2.C 3.C 4.B 5.C 6.D 7.D 8.C 9.A 10.D 11.C 12.A' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 03', raw: '1.C 2.A 3.B 4.D 5.C 6.C 7.D 8.A 9.C 10.C 11.D 12.C' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 04', raw: '1.D 2.B 3.C 4.B 5.C 6.B 7.A 8.B 9.C 10.C 11.C 12.B' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 05', raw: '1.D 2.C 3.B 4.A 5.C 6.B 7.A 8.D 9.D 10.C 11.C 12.A' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 06', raw: '1.C 2.C 3.A 4.B 5.D 6.D 7.C 8.C 9.B 10.C 11.A 12.C' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Kavramları Kavra 07', raw: '1.A 2.B 3.D 4.C 5.A 6.D 7.B 8.C 9.B 10.A 11.B' },
  // Öğrendiğini Kanıtla (01 - 07)
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 01', raw: '1.D 2.B 3.D 4.B 5.D 6.C 7.C 8.D 9.B 10.A 11.A 12.D' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 02', raw: '1.D 2.C 3.D 4.D 5.C 6.A 7.B 8.A 9.D 10.A' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 03', raw: '1.D 2.C 3.C 4.B 5.A 6.A 7.C 8.D 9.B 10.C 11.A' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 04', raw: '1.D 2.A 3.A 4.A 5.B 6.A 7.B 8.D 9.C' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 05', raw: '1.D 2.A 3.C 4.D 5.A 6.B 7.D 8.B 9.B 10.D' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 06', raw: '1.C 2.A 3.A 4.C 5.B 6.C 7.D 8.A 9.C 10.A' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Öğrendiğini Kanıtla 07', raw: '1.D 2.D 3.A 4.A 5.C 6.B 7.A 8.D 9.C 10.C' },
  // Becerini Sergile (01 - 04)
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Becerini Sergile 01', raw: '1.B 2.A 3.A 4.C' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Becerini Sergile 02', raw: '1.D 2.B 3.A 4.D' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Becerini Sergile 03', raw: '1.C 2.A 3.A 4.B' },
  { fasNo: 1, topicId: 'top_mat_cilt3_fas_1', name: '1. Fasikül - Becerini Sergile 04', raw: '1.A 2.C 3.B 4.C 5.D 6.B' },

  // =========================================================================
  // FASİKÜL 2: SAYILAR VE İŞLEMLER (21 test)
  // =========================================================================
  // Kavramları Kavra (01 - 07)
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 01', raw: '1.C 2.C 3.D 4.B 5.A 6.D 7.B 8.C 9.A 10.B 11.C 12.D 13.D' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 02', raw: '1.D 2.A 3.A 4.D 5.B 6.B 7.C 8.C 9.D 10.A 11.C 12.D 13.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 03', raw: '1.D 2.C 3.B 4.B 5.A 6.D 7.C 8.A 9.C 10.B 11.C 12.B 13.D 14.D' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 04', raw: '1.C 2.D 3.A 4.B 5.C 6.D 7.A 8.C 9.B 10.D 11.C 12.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 05', raw: '1.B 2.D 3.B 4.A 5.C 6.A 7.B 8.C 9.B 10.D 11.A 12.C' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 06', raw: '1.A 2.D 3.C 4.C 5.D 6.A 7.A 8.C 9.D 10.D 11.D 12.A 13.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Kavramları Kavra 07', raw: '1.D 2.B 3.A 4.C 5.B 6.A 7.C 8.B 9.C 10.D 11.C 12.B' },
  // Öğrendiğini Kanıtla (01 - 10)
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 01', raw: '1.D 2.C 3.A 4.C 5.C 6.B 7.D 8.C 9.D 10.D 11.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 02', raw: '1.D 2.C 3.A 4.C 5.C 6.C 7.D 8.B 9.A 10.C 11.D' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 03', raw: '1.B 2.A 3.C 4.B 5.A 6.C 7.B 8.B 9.D 10.A 11.B 12.C' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 04', raw: '1.B 2.C 3.C 4.D 5.A 6.C 7.A 8.D 9.B 10.C' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 05', raw: '1.C 2.D 3.C 4.A 5.C 6.D 7.B 8.B 9.C' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 06', raw: '1.A 2.A 3.D 4.B 5.C 6.B 7.A 8.C 9.C 10.C 11.D' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 07', raw: '1.B 2.D 3.C 4.D 5.A 6.D 7.D 8.B 9.A' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 08', raw: '1.A 2.C 3.A 4.D 5.C 6.D 7.C 8.D 9.C 10.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 09', raw: '1.B 2.A 3.C 4.A 5.C 6.D 7.B 8.C 9.C 10.D' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Öğrendiğini Kanıtla 10', raw: '1.B 2.D 3.C 4.A 5.B 6.D 7.A 8.B 9.D' },
  // Becerini Sergile (01 - 04)
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Becerini Sergile 01', raw: '1.D 2.D 3.A 4.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Becerini Sergile 02', raw: '1.C 2.B 3.D 4.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Becerini Sergile 03', raw: '1.A 2.B 3.A 4.B' },
  { fasNo: 2, topicId: 'top_mat_cilt3_fas_2', name: '2. Fasikül - Becerini Sergile 04', raw: '1.A 2.B 3.C 4.C 5.B 6.C' },

  // =========================================================================
  // FASİKÜL 3: GEOMETRİK NİCELİKLER (12 test)
  // =========================================================================
  // Kavramları Kavra (01 - 03)
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Kavramları Kavra 01', raw: '1.D 2.C 3.A 4.D 5.B 6.B 7.B 8.C 9.D 10.C 11.C' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Kavramları Kavra 02', raw: '1.D 2.B 3.D 4.D 5.B 6.D 7.D 8.B 9.A 10.B 11.D 12.A' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Kavramları Kavra 03', raw: '1.B 2.C 3.A 4.D 5.C 6.B 7.D 8.D 9.A 10.B 11.B 12.D' },
  // Öğrendiğini Kanıtla (01 - 05)
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Öğrendiğini Kanıtla 01', raw: '1.C 2.A 3.B 4.D 5.A 6.A 7.C 8.B' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Öğrendiğini Kanıtla 02', raw: '1.B 2.D 3.A 4.C 5.A 6.B 7.D 8.C' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Öğrendiğini Kanıtla 03', raw: '1.A 2.B 3.D 4.C 5.B 6.A 7.C 8.B 9.C' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Öğrendiğini Kanıtla 04', raw: '1.B 2.D 3.D 4.A 5.C 6.D 7.A 8.C 9.B' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Öğrendiğini Kanıtla 05', raw: '1.B 2.C 3.A 4.D 5.C 6.A 7.C 8.A 9.C' },
  // Becerini Sergile (01 - 04)
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Becerini Sergile 01', raw: '1.A 2.B 3.C 4.B' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Becerini Sergile 02', raw: '1.D 2.C 3.B 4.A' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Becerini Sergile 03', raw: '1.C 2.C 3.C 4.A' },
  { fasNo: 3, topicId: 'top_mat_cilt3_fas_3', name: '3. Fasikül - Becerini Sergile 04', raw: '1.C 2.D 3.A 4.B' },

  // =========================================================================
  // FASİKÜL 4: KESİRLER (19 test)
  // =========================================================================
  // Kavramları Kavra (01 - 07)
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 01', raw: '1.B 2.A 3.B 4.B 5.D 6.C 7.A 8.C 9.B 10.A 11.A 12.D 13.A 14.C 15.A' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 02', raw: '1.B 2.D 3.B 4.D 5.A 6.D 7.C 8.B 9.D 10.B 11.A 12.D 13.D 14.B 15.D 16.C' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 03', raw: '1.D 2.C 3.C 4.A 5.C 6.A 7.A 8.B 9.B 10.D 11.A 12.C 13.A 14.B' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 04', raw: '1.C 2.C 3.B 4.D 5.A 6.A 7.C 8.B 9.B 10.A 11.A 12.D 13.B 14.A 15.B' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 05', raw: '1.B 2.C 3.D 4.C 5.D 6.A 7.D 8.C 9.A 10.B 11.C 12.C 13.B 14.A 15.C' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 06', raw: '1.D 2.C 3.B 4.A 5.D 6.D 7.C 8.B 9.D 10.C 11.A 12.C 13.C 14.A 15.B 16.A' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Kavramları Kavra 07', raw: '1.B 2.D 3.C 4.D 5.B 6.D 7.A 8.B 9.D 10.D 11.B 12.B 13.C 14.C 15.C 16.B' },
  // Öğrendiğini Kanıtla (01 - 06)
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Öğrendiğini Kanıtla 01', raw: '1.D 2.A 3.C 4.C 5.D 6.C 7.B 8.C 9.B 10.A 11.D' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Öğrendiğini Kanıtla 02', raw: '1.D 2.A 3.D 4.B 5.A 6.D 7.C 8.D 9.B 10.A 11.B' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Öğrendiğini Kanıtla 03', raw: '1.A 2.D 3.A 4.B 5.A 6.D 7.C 8.B 9.A 10.B' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Öğrendiğini Kanıtla 04', raw: '1.D 2.B 3.B 4.C 5.A 6.C 7.C 8.D 9.D 10.B 11.D 12.C' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Öğrendiğini Kanıtla 05', raw: '1.B 2.C 3.B 4.A 5.B 6.C 7.D 8.C' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Öğrendiğini Kanıtla 06', raw: '1.B 2.A 3.D 4.A 5.C 6.C 7.C 8.B 9.B 10.C 11.D' },
  // Becerini Sergile (01 - 06)
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Becerini Sergile 01', raw: '1.D 2.C 3.D 4.C' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Becerini Sergile 02', raw: '1.A 2.C 3.B 4.A' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Becerini Sergile 03', raw: '1.A 2.A 3.B 4.A' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Becerini Sergile 04', raw: '1.D 2.C 3.B 4.A' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Becerini Sergile 05', raw: '1.C 2.D 3.D 4.A' },
  { fasNo: 4, topicId: 'top_mat_cilt3_fas_4', name: '4. Fasikül - Becerini Sergile 06', raw: '1.C 2.D 3.D 4.D' },

  // =========================================================================
  // FASİKÜL 5: İSTATİSTİKSEL ARAŞTIRMA SÜRECİ (8 test)
  // =========================================================================
  // Kavramları Kavra (01 - 02)
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Kavramları Kavra 01', raw: '1.D 2.C 3.B 4.D 5.A 6.D 7.C 8.D 9.B 10.C 11.B 12.C' },
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Kavramları Kavra 02', raw: '1.B 2.D 3.C 4.A 5.C 6.D 7.D 8.A 9.B 10.C 11.B 12.A' },
  // Öğrendiğini Kanıtla (01 - 02)
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Öğrendiğini Kanıtla 01', raw: '1.C 2.C 3.D 4.D 5.D 6.C 7.C 8.A 9.D' },
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Öğrendiğini Kanıtla 02', raw: '1.C 2.A 3.B 4.D 5.D 6.C 7.A 8.B 9.C' },
  // Becerini Sergile (01 - 04)
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Becerini Sergile 01', raw: '1.D 2.A 3.C 4.D' },
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Becerini Sergile 02', raw: '1.C 2.A 3.C 4.A' },
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Becerini Sergile 03', raw: '1.B 2.B 3.A 4.C' },
  { fasNo: 5, topicId: 'top_mat_cilt3_fas_5', name: '5. Fasikül - Becerini Sergile 04', raw: '1.D 2.A 3.D' },

  // =========================================================================
  // FASİKÜL 6: İŞLEMLERLE CEBİRSEL DÜŞÜNME (21 test)
  // =========================================================================
  // Kavramları Kavra (01 - 07)
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 01', raw: '1.D 2.A 3.C 4.D 5.A 6.B 7.B 8.C 9.C 10.D 11.B 12.A' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 02', raw: '1.A 2.B 3.C 4.D 5.B 6.A 7.D 8.C 9.A 10.B 11.B 12.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 03', raw: '1.A 2.D 3.B 4.D 5.C 6.A 7.C 8.C 9.D 10.A 11.C 12.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 04', raw: '1.C 2.B 3.D 4.A 5.B 6.D 7.B 8.D 9.C 10.C 11.D 12.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 05', raw: '1.C 2.B 3.C 4.B 5.A 6.D 7.C 8.B 9.D 10.D 11.A 12.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 06', raw: '1.D 2.C 3.B 4.D 5.D 6.D 7.A 8.C 9.A 10.B 11.B 12.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Kavramları Kavra 07', raw: '1.A 2.D 3.A 4.D 5.C 6.D 7.B 8.D 9.C 10.D 11.C 12.D 13.A 14.B' },
  // Öğrendiğini Kanıtla (01 - 09)
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 01', raw: '1.B 2.C 3.A 4.B 5.D 6.A 7.C 8.A 9.D 10.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 02', raw: '1.C 2.A 3.C 4.D 5.C 6.D 7.D 8.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 03', raw: '1.C 2.D 3.B 4.D 5.C 6.B 7.A 8.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 04', raw: '1.C 2.A 3.B 4.A 5.D 6.C 7.C 8.C' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 05', raw: '1.C 2.A 3.A 4.C 5.B 6.C 7.D 8.A 9.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 06', raw: '1.B 2.A 3.B 4.C 5.B 6.D 7.C 8.A 9.B 10.C 11.B' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 07', raw: '1.B 2.D 3.C 4.B 5.D 6.D 7.C 8.B 9.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 08', raw: '1.C 2.A 3.D 4.C 5.B 6.B 7.A 8.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Öğrendiğini Kanıtla 09', raw: '1.C 2.A 3.A 4.C 5.D 6.C 7.D 8.D' },
  // Becerini Sergile (01 - 05)
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Becerini Sergile 01', raw: '1.C 2.B 3.D 4.A' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Becerini Sergile 02', raw: '1.B 2.D 3.C 4.A' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Becerini Sergile 03', raw: '1.C 2.B 3.A 4.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Becerini Sergile 04', raw: '1.C 2.D 3.C 4.D' },
  { fasNo: 6, topicId: 'top_mat_cilt3_fas_6', name: '6. Fasikül - Becerini Sergile 05', raw: '1.D 2.B 3.B 4.C' }
];

console.log(`Verified total MC tests: ${allMcTests.length}`);
allMcTests.forEach(t => {
  t.answerKey = parseAnswerString(t.raw);
  t.questionCount = Object.keys(t.answerKey).length;
});

fs.writeFileSync('scripts/all_mc_tests_structured.json', JSON.stringify(allMcTests, null, 2), 'utf8');
console.log('Saved scripts/all_mc_tests_structured.json');
