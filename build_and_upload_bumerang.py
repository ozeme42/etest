import os
import re
import json
import requests
from bumerang_mat_answers import (
    MAT_TEMA_1_ETKINLIKLER, MAT_TEMA_1_YAZILI,
    MAT_TEMA_2_ETKINLIKLER, MAT_TEMA_2_YAZILI,
    MAT_TEMA_3_ETKINLIKLER, MAT_TEMA_3_YAZILI,
    MAT_TEMA_4_ETKINLIKLER, MAT_TEMA_4_YAZILI,
    MAT_TEMA_5_ETKINLIKLER, MAT_TEMA_5_YAZILI,
    MAT_TEMA_6_ETKINLIKLER, MAT_TEMA_6_YAZILI,
    MAT_TEMA_7_ETKINLIKLER
)
from bumerang_fen_answers import (
    FEN_U1_B1_ETK, FEN_U1_B2_ETK, FEN_U1_B3_ETK, FEN_U1_YAZILI,
    FEN_U2_B1_ETK, FEN_U2_B2_ETK, FEN_U2_B3_ETK, FEN_U2_YAZILI,
    FEN_U3_HATIRLAYALIM, FEN_U3_B1_ETK, FEN_U3_B2_ETK, FEN_U3_YAZILI,
    FEN_U4_B1_ETK, FEN_U4_B2_ETK, FEN_U4_B3_ETK, FEN_U4_YAZILI,
    FEN_U5_HATIRLAYALIM, FEN_U5_B1_ETK, FEN_U5_B2_ETK, FEN_U5_B3_ETK, FEN_U5_B4_ETK, FEN_U5_YAZILI,
    FEN_U6_HATIRLAYALIM, FEN_U6_B1_ETK, FEN_U6_B2_ETK, FEN_U6_YAZILI,
    FEN_U7_HATIRLAYALIM, FEN_U7_B1_ETK, FEN_U7_YAZILI
)
from bumerang_turkce_answers import (
    TURKCE_TEMA_1_ETKINLIKLER, TURKCE_TEMA_1_YAZILI,
    TURKCE_TEMA_2_ETKINLIKLER, TURKCE_TEMA_2_YAZILI,
    TURKCE_TEMA_3_ETKINLIKLER, TURKCE_TEMA_3_YAZILI,
    TURKCE_TEMA_4_ETKINLIKLER, TURKCE_TEMA_4_YAZILI,
    TURKCE_TEMA_5_ETKINLIKLER, TURKCE_TEMA_5_YAZILI,
    TURKCE_TEMA_6_ETKINLIKLER, TURKCE_TEMA_6_YAZILI
)

def to_uuid(s):
    if not s:
        return '00000000-0000-4000-8000-000000000000'
    uuid_regex = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.I)
    if uuid_regex.match(str(s)):
        return str(s).lower()
    hex_str = ''
    for c in str(s):
        hex_str += f'{ord(c):x}'
    while len(hex_str) < 32:
        hex_str += '0'
    hex_str = hex_str[:32]
    return f'{hex_str[0:8]}-{hex_str[8:12]}-4{hex_str[13:16]}-a{hex_str[17:20]}-{hex_str[20:32]}'.lower()

SUPABASE_URL = "https://bstcisckpnmwmcggmtfi.supabase.co"
SUPABASE_KEY = "sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates"
}

def slice_dict(full_dict, start, end):
    return {q: full_dict[q] for q in range(start, end + 1) if q in full_dict}

def format_mc_test(test_id, book_id, sub_id, top_id, name, answers, order_idx):
    q_count = len(answers)
    ans_key = {str(k): v for k, v in answers.items()}
    ans_key["__meta"] = {
        "questionType": "coktan_secmeli",
        "isOpenEnded": False,
        "optionCount": 4,
        "startQuestionNumber": 1
    }
    return {
        "id": test_id,
        "book_id": to_uuid(book_id),
        "bookId": to_uuid(book_id),
        "subject_id": sub_id,
        "subjectId": sub_id,
        "topic_id": top_id,
        "topicId": top_id,
        "name": name,
        "question_count": q_count,
        "questionCount": q_count,
        "optionCount": 4,
        "questionType": "coktan_secmeli",
        "isOpenEnded": False,
        "startQuestionNumber": 1,
        "answer_key": ans_key,
        "answerKey": ans_key,
        "order": order_idx,
        "orderIndex": order_idx
    }

def format_oe_test(test_id, book_id, sub_id, top_id, name, answers_dict, order_idx, start_q_no=1):
    q_count = len(answers_dict)
    ans_key = {str(k): v for k, v in answers_dict.items()}
    ans_key["__meta"] = {
        "questionType": "acik_uclu",
        "isOpenEnded": True,
        "startQuestionNumber": start_q_no
    }
    return {
        "id": test_id,
        "book_id": to_uuid(book_id),
        "bookId": to_uuid(book_id),
        "subject_id": sub_id,
        "subjectId": sub_id,
        "topic_id": top_id,
        "topicId": top_id,
        "name": name,
        "question_count": q_count,
        "questionCount": q_count,
        "optionCount": 4,
        "questionType": "acik_uclu",
        "isOpenEnded": True,
        "startQuestionNumber": start_q_no,
        "answer_key": ans_key,
        "answerKey": ans_key,
        "order": order_idx,
        "orderIndex": order_idx
    }

# ==================== DATA DEFINITIONS ====================

# 1. FEN BİLİMLERİ
def build_fen_book():
    book_id = "tb_bumerang_fen_5"
    sub_id = "sub_fen_5"

    units = [
        {
            "id": "top_fen_u1",
            "name": "1. Ünite: Gökyüzündeki Komşularımız ve Biz",
            "items": [
                ("oe", "1. Bölüm: Gökyüzündeki Komşumuz Güneş - Etkinlikler (Soru 1-15)", FEN_U1_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "B", 3: "D", 4: "B", 5: "A", 6: "B"}),
                ("mc", "Bumerang Test - 1", {1: "D", 2: "C", 3: "A", 4: "D"}),
                ("oe", "2. Bölüm: Gökyüzündeki Komşumuz Ay - Etkinlikler (Soru 1-21)", FEN_U1_B2_ETK, 1),
                ("mc", "Kavratan Test - 2", {1: "C", 2: "C", 3: "A", 4: "D", 5: "D", 6: "C"}),
                ("mc", "Bumerang Test - 2", {1: "D", 2: "C", 3: "B", 4: "D"}),
                ("mc", "Kavratan Test - 3", {1: "A", 2: "A", 3: "D", 4: "D"}),
                ("mc", "Bumerang Test - 3", {1: "A", 2: "B", 3: "D", 4: "A"}),
                ("oe", "3. Bölüm: Dünya'mız ve Gökyüzündeki Komşularımız - Etkinlikler (Soru 1-12)", FEN_U1_B3_ETK, 1),
                ("mc", "Kavratan Test - 4", {1: "B", 2: "A", 3: "A", 4: "D", 5: "A"}),
                ("mc", "Bumerang Test - 4", {1: "B", 2: "B", 3: "D", 4: "C"}),
                ("mc", "Beceri Temelli Test - 1", {1: "B", 2: "C", 3: "D", 4: "A", 5: "B", 6: "C", 7: "A", 8: "B"}),
                ("mc", "Beceri Temelli Test - 2", {1: "B", 2: "B", 3: "B", 4: "D", 5: "D", 6: "D", 7: "B", 8: "A"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "B", 2: "C"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "D", 2: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-8)", FEN_U1_YAZILI, 1),
            ]
        },
        {
            "id": "top_fen_u2",
            "name": "2. Ünite: Kuvveti Tanıyalım",
            "items": [
                ("oe", "1. Bölüm: Kuvvet ve Kuvvetin Ölçülmesi - Etkinlikler (Soru 1-10)", FEN_U2_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "B", 3: "C", 4: "C", 5: "B"}),
                ("mc", "Bumerang Test - 1", {1: "C", 2: "A", 3: "B", 4: "B"}),
                ("oe", "2. Bölüm: Kütle ve Ağırlık İlişkisi - Etkinlikler (Soru 1-9)", FEN_U2_B2_ETK, 1),
                ("mc", "Kavratan Test - 2", {1: "B", 2: "A", 3: "C", 4: "A", 5: "B"}),
                ("mc", "Kavratan Test - 3", {1: "C", 2: "A", 3: "C", 4: "B", 5: "D"}),
                ("mc", "Bumerang Test - 2", {1: "D", 2: "B", 3: "A", 4: "A"}),
                ("oe", "3. Bölüm: Sürtünme Kuvveti - Etkinlikler (Soru 1-8)", FEN_U2_B3_ETK, 1),
                ("mc", "Kavratan Test - 4", {1: "A", 2: "D", 3: "B", 4: "B"}),
                ("mc", "Bumerang Test - 3", {1: "B", 2: "C", 3: "B", 4: "A", 5: "C"}),
                ("mc", "Beceri Temelli Test - 1", {1: "A", 2: "C", 3: "C", 4: "A", 5: "B", 6: "C", 7: "C", 8: "B"}),
                ("mc", "Beceri Temelli Test - 2", {1: "A", 2: "C", 3: "C", 4: "D", 5: "A", 6: "D", 7: "C", 8: "D"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "D", 2: "D"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "A", 2: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-4)", FEN_U2_YAZILI, 1),
            ]
        },
        {
            "id": "top_fen_u3",
            "name": "3. Ünite: Canlıların Yapısına Yolculuk",
            "items": [
                ("oe", "Hatırlayalım (Soru 1-2)", FEN_U3_HATIRLAYALIM, 1),
                ("oe", "1. Bölüm: Hücre ve Organelleri - Etkinlikler (Soru 1-8)", FEN_U3_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "A", 2: "C", 3: "D", 4: "B", 5: "C"}),
                ("mc", "Kavratan Test - 2", {1: "B", 2: "A", 3: "A", 4: "D", 5: "B"}),
                ("mc", "Bumerang Test - 1", {1: "C", 2: "B", 3: "C", 4: "C", 5: "A", 6: "D"}),
                ("oe", "2. Bölüm: Destek ve Hareket Sistemi - Etkinlikler (Soru 1-9)", FEN_U3_B2_ETK, 1),
                ("mc", "Kavratan Test - 3", {1: "D", 2: "C", 3: "A", 4: "C", 5: "C", 6: "A"}),
                ("mc", "Kavratan Test - 4", {1: "D", 2: "D", 3: "A", 4: "D", 5: "D"}),
                ("mc", "Bumerang Test - 2", {1: "B", 2: "D", 3: "C", 4: "B", 5: "C"}),
                ("mc", "Beceri Temelli Test - 1", {1: "B", 2: "D", 3: "B", 4: "C", 5: "B", 6: "C", 7: "B", 8: "D", 9: "C"}),
                ("mc", "Beceri Temelli Test - 2", {1: "C", 2: "A", 3: "A", 4: "B", 5: "A", 6: "C", 7: "C", 8: "A", 9: "A", 10: "D"}),
                ("mc", "Beceri Temelli Test - 3", {1: "A", 2: "B", 3: "D", 4: "A", 5: "A", 6: "C", 7: "C", 8: "D"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "C", 2: "D"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "D", 2: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-5)", FEN_U3_YAZILI, 1),
            ]
        },
        {
            "id": "top_fen_u4",
            "name": "4. Ünite: Işığın Dünyası",
            "items": [
                ("oe", "1. Bölüm: Işığın Yayılması - Etkinlikler (Soru 1-7)", FEN_U4_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "C", 3: "C", 4: "B", 5: "D"}),
                ("mc", "Bumerang Test - 1", {1: "A", 2: "D", 3: "D", 4: "B"}),
                ("oe", "2. Bölüm: Madde ve Işık - Etkinlikler (Soru 1-9)", FEN_U4_B2_ETK, 1),
                ("mc", "Kavratan Test - 2", {1: "A", 2: "C", 3: "B", 4: "D"}),
                ("mc", "Bumerang Test - 2", {1: "A", 2: "B", 3: "B", 4: "B", 5: "D"}),
                ("oe", "3. Bölüm: Tam Gölgenin Oluşumu - Etkinlikler (Soru 1-14)", FEN_U4_B3_ETK, 1),
                ("mc", "Kavratan Test - 3", {1: "C", 2: "B", 3: "D", 4: "C"}),
                ("mc", "Bumerang Test - 3", {1: "C", 2: "C", 3: "B", 4: "B", 5: "D", 6: "B"}),
                ("mc", "Beceri Temelli Test - 1", {1: "B", 2: "B", 3: "D", 4: "B", 5: "D"}),
                ("mc", "Beceri Temelli Test - 2", {1: "D", 2: "C", 3: "D", 4: "B", 5: "C", 6: "D", 7: "B", 8: "A"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "D", 2: "A"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "B", 2: "C"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-5)", FEN_U4_YAZILI, 1),
            ]
        },
        {
            "id": "top_fen_u5",
            "name": "5. Ünite: Maddenin Doğası",
            "items": [
                ("oe", "Hatırlayalım (Soru 1-2)", FEN_U5_HATIRLAYALIM, 1),
                ("oe", "1. Bölüm: Maddenin Tanecikli Yapısı - Etkinlikler (Soru 1-11)", FEN_U5_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "A", 2: "C", 3: "B", 4: "C", 5: "C"}),
                ("mc", "Bumerang Test - 1", {1: "B", 2: "B", 3: "B", 4: "D", 5: "C", 6: "D"}),
                ("oe", "2. Bölüm: Isı ve Sıcaklık - Etkinlikler (Soru 1-8)", FEN_U5_B2_ETK, 1),
                ("mc", "Kavratan Test - 2", {1: "A", 2: "B", 3: "C", 4: "B", 5: "A"}),
                ("mc", "Bumerang Test - 2", {1: "D", 2: "D", 3: "C", 4: "C", 5: "D"}),
                ("oe", "3. Bölüm: Maddenin Hâl Değişimi - Etkinlikler (Soru 1-8)", FEN_U5_B3_ETK, 1),
                ("mc", "Kavratan Test - 3", {1: "D", 2: "C", 3: "B", 4: "D", 5: "B", 6: "A"}),
                ("mc", "Bumerang Test - 3", {1: "D", 2: "D", 3: "B", 4: "C"}),
                ("oe", "4. Bölüm: Madde ve Isı - Etkinlikler (Soru 1-4)", FEN_U5_B4_ETK, 1),
                ("mc", "Kavratan Test - 4", {1: "B", 2: "C", 3: "C", 4: "C"}),
                ("mc", "Bumerang Test - 4", {1: "C", 2: "B", 3: "C", 4: "D"}),
                ("mc", "Beceri Temelli Test - 1", {1: "A", 2: "B", 3: "A", 4: "A", 5: "C", 6: "D", 7: "A", 8: "D"}),
                ("mc", "Beceri Temelli Test - 2", {1: "C", 2: "B", 3: "A", 4: "D", 5: "A", 6: "C", 7: "C", 8: "D"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "A", 2: "B"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "B", 2: "C"}),
                ("mc", "Bağlam Temelli Test - 3", {1: "C", 2: "B", 3: "C"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-6)", FEN_U5_YAZILI, 1),
            ]
        },
        {
            "id": "top_fen_u6",
            "name": "6. Ünite: Yaşamımızdaki Elektrik",
            "items": [
                ("oe", "Hatırlayalım (Soru 1-2)", FEN_U6_HATIRLAYALIM, 1),
                ("oe", "1. Bölüm: Devre Elemanlarının Sembollerle Gösterimi - Etkinlikler (Soru 1-7)", FEN_U6_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "A", 2: "C", 3: "C", 4: "A", 5: "C"}),
                ("mc", "Bumerang Test - 1", {1: "B", 2: "A", 3: "C", 4: "C", 5: "D"}),
                ("oe", "2. Bölüm: Basit Bir Elektrik Devresinde Ampul Parlaklığı - Etkinlikler (Soru 1-4)", FEN_U6_B2_ETK, 1),
                ("mc", "Kavratan Test - 2", {1: "D", 2: "A", 3: "B", 4: "D", 5: "B"}),
                ("mc", "Bumerang Test - 2", {1: "D", 2: "B", 3: "C", 4: "A", 5: "B"}),
                ("mc", "Beceri Temelli Test - 1", {1: "D", 2: "A", 3: "B", 4: "B", 5: "B", 6: "C", 7: "C", 8: "A", 9: "C", 10: "D"}),
                ("mc", "Beceri Temelli Test - 2", {1: "D", 2: "C", 3: "B", 4: "B", 5: "C", 6: "A"}),
                ("mc", "Beceri Temelli Test - 3", {1: "A", 2: "D", 3: "A", 4: "D", 5: "A", 6: "B", 7: "A", 8: "A"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "C", 2: "B"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "A", 2: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-6)", FEN_U6_YAZILI, 1),
            ]
        },
        {
            "id": "top_fen_u7",
            "name": "7. Ünite: Sürdürülebilir Yaşam ve Geri Dönüşüm",
            "items": [
                ("oe", "Hatırlayalım (Soru 1-2)", FEN_U7_HATIRLAYALIM, 1),
                ("oe", "1. Bölüm: Evsel Atıklar ve Geri Dönüşüm - Etkinlikler (Soru 1-4)", FEN_U7_B1_ETK, 1),
                ("mc", "Kavratan Test - 1", {1: "C", 2: "D", 3: "C", 4: "D", 5: "C", 6: "D"}),
                ("mc", "Bumerang Test - 1", {1: "B", 2: "B", 3: "C", 4: "C"}),
                ("mc", "Beceri Temelli Test - 1", {1: "C", 2: "B", 3: "D", 4: "C", 5: "D", 6: "A", 7: "D", 8: "C"}),
                ("mc", "Beceri Temelli Test - 2", {1: "C", 2: "A", 3: "D", 4: "A", 5: "C", 6: "B", 7: "C", 8: "D"}),
                ("mc", "Bağlam Temelli Test - 1", {1: "D", 2: "B", 3: "B"}),
                ("mc", "Bağlam Temelli Test - 2", {1: "B", 2: "C", 3: "A"}),
                ("mc", "Bağlam Temelli Test - 3", {1: "D", 2: "D", 3: "D"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-5)", FEN_U7_YAZILI, 1),
            ]
        }
    ]

    all_tests = []
    topics = []
    order_counter = 1

    for u_idx, u in enumerate(units):
        top_id = u["id"]
        unit_tests = []

        for item_i, item in enumerate(u["items"]):
            item_type = item[0]
            item_name = item[1]
            item_ans = item[2]
            t_id = f"tbt_fen_u{u_idx+1}_t{item_i+1}"

            if item_type == "mc":
                test_obj = format_mc_test(t_id, book_id, sub_id, top_id, item_name, item_ans, order_counter)
            else:
                start_q = item[3] if len(item) > 3 else 1
                test_obj = format_oe_test(t_id, book_id, sub_id, top_id, item_name, item_ans, order_counter, start_q_no=start_q)

            unit_tests.append(test_obj)
            all_tests.append(test_obj)
            order_counter += 1

        topics.append({
            "id": top_id,
            "name": u["name"],
            "tests": unit_tests
        })

    subject = {
        "id": sub_id,
        "name": "Fen Bilimleri",
        "topics": topics
    }

    meta_header = {
        "id": "__book_meta__",
        "__meta": True,
        "title": "5. Sınıf Bumerang Fen Bilimleri",
        "publisher": "Günay",
        "optionCount": 4,
        "bookType": "mixed",
        "pdfUrl": "5_Sinif_Bumerang_Fen_Bilimleri.pdf",
        "maxPage": 360,
        "hideAnswerKey": True
    }

    book_obj = {
        "id": book_id,
        "title": "5. Sınıf Bumerang Fen Bilimleri",
        "publisher": "Günay",
        "bookType": "mixed",
        "book_type": "mixed",
        "optionCount": 4,
        "option_count": 4,
        "pdfUrl": "5_Sinif_Bumerang_Fen_Bilimleri.pdf",
        "pdf_url": "5_Sinif_Bumerang_Fen_Bilimleri.pdf",
        "subjects": [meta_header, subject],
        "raw_data": {
            "title": "5. Sınıf Bumerang Fen Bilimleri",
            "publisher": "Günay",
            "bookType": "mixed",
            "optionCount": 4,
            "pdfUrl": "5_Sinif_Bumerang_Fen_Bilimleri.pdf",
            "subjects": [subject]
        }
    }

    return book_obj, all_tests


# 2. MATEMATİK
def build_mat_book():
    book_id = "tb_bumerang_matematik_5"
    sub_id = "sub_mat_5"

    themes = [
        {
            "id": "top_mat_t1",
            "name": "1. Tema: Geometrik Şekiller",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-15)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 1, 15), 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "A", 3: "C", 4: "C", 5: "D", 6: "A", 7: "D"}),
                ("oe", "Etkinlik - 2 (Soru 16-30)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 16, 30), 16),
                ("mc", "Kavratan Test - 2", {1: "C", 2: "C", 3: "B", 4: "D", 5: "A", 6: "C", 7: "C", 8: "D", 9: "A", 10: "D"}),
                ("oe", "Etkinlik - 3 (Soru 31-34)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 31, 34), 31),
                ("mc", "Kavratan Test - 3", {1: "C", 2: "B", 3: "D", 4: "A", 5: "B", 6: "D", 7: "A", 8: "A", 9: "B", 10: "C"}),
                ("oe", "Etkinlik - 4 (Soru 35-43)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 35, 43), 35),
                ("mc", "Kavratan Test - 4", {1: "C", 2: "B", 3: "C", 4: "A", 5: "C", 6: "A", 7: "D", 8: "C", 9: "D"}),
                ("oe", "Etkinlik - 5 (Soru 44-47)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 44, 47), 44),
                ("mc", "Kavratan Test - 5", {1: "D", 2: "C", 3: "C", 4: "B", 5: "A", 6: "B", 7: "B", 8: "B", 9: "D", 10: "D", 11: "B"}),
                ("oe", "Etkinlik - 6 (Soru 48-56)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 48, 56), 48),
                ("mc", "Kavratan Test - 6", {1: "D", 2: "C", 3: "A", 4: "D", 5: "C", 6: "D", 7: "D", 8: "C", 9: "A", 10: "A", 11: "D", 12: "A", 13: "B"}),
                ("oe", "Etkinlik - 7 (Soru 57-63)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 57, 63), 57),
                ("mc", "Kavratan Test - 7", {1: "D", 2: "D", 3: "A", 4: "C", 5: "A", 6: "D", 7: "B", 8: "D", 9: "D", 10: "B"}),
                ("oe", "Etkinlik - 8 (Soru 64-69)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 64, 69), 64),
                ("mc", "Kavratan Test - 8", {1: "B", 2: "C", 3: "D", 4: "D", 5: "D", 6: "A", 7: "D", 8: "C", 9: "A", 10: "D", 11: "A", 12: "B"}),
                ("oe", "Etkinlik - 9 (Soru 70-81)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 70, 81), 70),
                ("mc", "Kavratan Test - 9", {1: "D", 2: "B", 3: "D", 4: "A", 5: "A", 6: "D", 7: "C", 8: "B", 9: "C", 10: "B", 11: "C"}),
                ("oe", "Etkinlik - 10 (Soru 82-90)", slice_dict(MAT_TEMA_1_ETKINLIKLER, 82, 90), 82),
                ("mc", "Kavratan Test - 10", {1: "A", 2: "D", 3: "B", 4: "B", 5: "C", 6: "A", 7: "C", 8: "C", 9: "D", 10: "A", 11: "A", 12: "A"}),
                ("mc", "Bumerang Test - 1", {1: "D", 2: "D", 3: "A", 4: "B", 5: "B", 6: "C", 7: "B", 8: "C", 9: "B", 10: "D", 11: "A", 12: "C"}),
                ("mc", "Bumerang Test - 2", {1: "C", 2: "B", 3: "D", 4: "C", 5: "C", 6: "B", 7: "B", 8: "A", 9: "B", 10: "B", 11: "D", 12: "A"}),
                ("mc", "Beceri Temelli Test - 1", {1: "C", 2: "D", 3: "A", 4: "B"}),
                ("mc", "Beceri Temelli Test - 2", {1: "B", 2: "C", 3: "A", 4: "B"}),
                ("mc", "Bağlam Temelli Sorular", {1: "C", 2: "A", 3: "C", 4: "A", 5: "B", 6: "A"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-10)", MAT_TEMA_1_YAZILI, 1),
            ]
        },
        {
            "id": "top_mat_t2",
            "name": "2. Tema: Sayılar ve Nicelikler: Doğal Sayıları Okuma-Yazma & Gerçek Yaşam Problemleri",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-20)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 1, 20), 1),
                ("mc", "Kavratan Test - 1", {1: "C", 2: "D", 3: "A", 4: "D", 5: "B", 6: "C", 7: "B", 8: "D", 9: "B", 10: "C", 11: "D", 12: "D", 13: "A", 14: "D"}),
                ("oe", "Etkinlik - 2 (Soru 21-29)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 21, 29), 21),
                ("mc", "Kavratan Test - 2", {1: "D", 2: "C", 3: "D", 4: "A", 5: "C", 6: "B", 7: "B", 8: "A", 9: "A", 10: "B", 11: "C"}),
                ("oe", "Etkinlik - 3 (Soru 30-39)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 30, 39), 30),
                ("mc", "Kavratan Test - 3", {1: "D", 2: "D", 3: "A", 4: "D", 5: "B", 6: "C", 7: "B", 8: "A", 9: "B", 10: "D", 11: "D", 12: "D"}),
                ("mc", "Bumerang Test - 1", {1: "C", 2: "D", 3: "D", 4: "A", 5: "B", 6: "C", 7: "C", 8: "C", 9: "B", 10: "D"}),
                ("mc", "Beceri Temelli Test - 1", {1: "B", 2: "C", 3: "C", 4: "C"}),
                ("oe", "Etkinlik - 4 (Soru 40-55)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 40, 55), 40),
                ("mc", "Kavratan Test - 4", {1: "B", 2: "C", 3: "A", 4: "D", 5: "B", 6: "A", 7: "D", 8: "A", 9: "C", 10: "D", 11: "B"}),
                ("oe", "Etkinlik - 5 (Soru 56-67)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 56, 67), 56),
                ("mc", "Kavratan Test - 5", {1: "C", 2: "B", 3: "B", 4: "C", 5: "C", 6: "A", 7: "C", 8: "D", 9: "C", 10: "C", 11: "B"}),
                ("oe", "Etkinlik - 6 (Soru 68-70)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 68, 70), 68),
                ("mc", "Kavratan Test - 6", {1: "D", 2: "C", 3: "D", 4: "B", 5: "D", 6: "A", 7: "D", 8: "A", 9: "C", 10: "D", 11: "A", 12: "C"}),
                ("oe", "Etkinlik - 7 (Soru 71-101)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 71, 101), 71),
                ("mc", "Kavratan Test - 7", {1: "C", 2: "D", 3: "C", 4: "A", 5: "A", 6: "B", 7: "D", 8: "D", 9: "C", 10: "D"}),
                ("oe", "Etkinlik - 8 (Soru 102-124)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 102, 124), 102),
                ("mc", "Kavratan Test - 8", {1: "D", 2: "D", 3: "A", 4: "C", 5: "B", 6: "D", 7: "D", 8: "A", 9: "D", 10: "A", 11: "C", 12: "A"}),
                ("oe", "Etkinlik - 9 (Soru 125-127)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 125, 127), 125),
                ("mc", "Kavratan Test - 9", {1: "C", 2: "A", 3: "D", 4: "B", 5: "B"}),
                ("oe", "Etkinlik - 10 (Soru 128-139)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 128, 139), 128),
                ("mc", "Kavratan Test - 10", {1: "C", 2: "D", 3: "B", 4: "A", 5: "A", 6: "D", 7: "D", 8: "A", 9: "A", 10: "C", 11: "D"}),
                ("oe", "Etkinlik - 11 (Soru 140-146)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 140, 146), 140),
                ("mc", "Kavratan Test - 11", {1: "B", 2: "B", 3: "C", 4: "D", 5: "A", 6: "C", 7: "B", 8: "B", 9: "A", 10: "D", 11: "D", 12: "B"}),
                ("oe", "Etkinlik - 12 (Soru 147-164)", slice_dict(MAT_TEMA_2_ETKINLIKLER, 147, 164), 147),
                ("mc", "Kavratan Test - 12", {1: "A", 2: "B", 3: "B", 4: "C", 5: "A", 6: "C", 7: "A", 8: "A", 9: "B"}),
                ("mc", "Bumerang Test - 2", {1: "B", 2: "C", 3: "C", 4: "C", 5: "D", 6: "C", 7: "C", 8: "D", 9: "A", 10: "D"}),
                ("mc", "Beceri Temelli Test - 2", {1: "B", 2: "C", 3: "B", 4: "B", 5: "D"}),
                ("mc", "Beceri Temelli Test - 3", {1: "B", 2: "A", 3: "C", 4: "B"}),
                ("mc", "Beceri Temelli Test - 4", {1: "B", 2: "C", 3: "C", 4: "B"}),
                ("mc", "Bağlam Temelli Sorular", {1: "B", 2: "B", 3: "A", 4: "C", 5: "D"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-10)", MAT_TEMA_2_YAZILI, 1),
            ]
        },
        {
            "id": "top_mat_t3",
            "name": "3. Tema: Geometrik Nicelikler",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-11)", slice_dict(MAT_TEMA_3_ETKINLIKLER, 1, 11), 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "C", 3: "B", 4: "C", 5: "A", 6: "D", 7: "B", 8: "B", 9: "D", 10: "C", 11: "D", 12: "D"}),
                ("oe", "Etkinlik - 2 (Soru 12-20)", slice_dict(MAT_TEMA_3_ETKINLIKLER, 12, 20), 12),
                ("mc", "Kavratan Test - 2", {1: "D", 2: "A", 3: "C", 4: "B", 5: "C", 6: "D", 7: "C", 8: "D", 9: "D", 10: "B", 11: "B"}),
                ("oe", "Etkinlik - 3 (Soru 21-31)", slice_dict(MAT_TEMA_3_ETKINLIKLER, 21, 31), 21),
                ("mc", "Kavratan Test - 3", {1: "B", 2: "B", 3: "D", 4: "A", 5: "B", 6: "A", 7: "B", 8: "C"}),
                ("mc", "Bumerang Test - 1", {1: "B", 2: "A", 3: "D", 4: "B", 5: "B", 6: "C", 7: "A", 8: "D", 9: "D", 10: "D"}),
                ("mc", "Beceri Temelli Test - 1", {1: "D", 2: "C", 3: "A", 4: "B"}),
                ("mc", "Bağlam Temelli Sorular", {1: "A", 2: "C", 3: "A", 4: "B", 5: "D"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-10)", MAT_TEMA_3_YAZILI, 1),
            ]
        },
        {
            "id": "top_mat_t4",
            "name": "4. Tema: Sayılar ve Nicelikler - Kesirler",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-9)", slice_dict(MAT_TEMA_4_ETKINLIKLER, 1, 9), 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "C", 3: "A", 4: "C", 5: "C", 6: "C", 7: "B", 8: "B", 9: "A", 10: "B", 11: "A", 12: "D", 13: "A"}),
                ("oe", "Etkinlik - 2 (Soru 10-21)", slice_dict(MAT_TEMA_4_ETKINLIKLER, 10, 21), 10),
                ("mc", "Kavratan Test - 2", {1: "A", 2: "B", 3: "D", 4: "A", 5: "A", 6: "B", 7: "A", 8: "D", 9: "D", 10: "D", 11: "C", 12: "D"}),
                ("oe", "Etkinlik - 3 (Soru 22-32)", slice_dict(MAT_TEMA_4_ETKINLIKLER, 22, 32), 22),
                ("mc", "Kavratan Test - 3", {1: "D", 2: "A", 3: "C", 4: "D", 5: "C", 6: "B", 7: "B", 8: "C", 9: "B", 10: "A", 11: "D", 12: "C"}),
                ("oe", "Etkinlik - 4 (Soru 33-48)", slice_dict(MAT_TEMA_4_ETKINLIKLER, 33, 48), 33),
                ("mc", "Kavratan Test - 4", {1: "D", 2: "C", 3: "B", 4: "D", 5: "D", 6: "A", 7: "A", 8: "C", 9: "C", 10: "B", 11: "B", 12: "D", 13: "C"}),
                ("oe", "Etkinlik - 5 (Soru 49-57)", slice_dict(MAT_TEMA_4_ETKINLIKLER, 49, 57), 49),
                ("mc", "Kavratan Test - 5", {1: "A", 2: "C", 3: "D", 4: "C", 5: "D", 6: "B", 7: "B", 8: "B", 9: "B", 10: "D"}),
                ("oe", "Etkinlik - 6 (Soru 58-68)", slice_dict(MAT_TEMA_4_ETKINLIKLER, 58, 68), 58),
                ("mc", "Kavratan Test - 6", {1: "D", 2: "C", 3: "D", 4: "B", 5: "B", 6: "B", 7: "D", 8: "C", 9: "B", 10: "D", 11: "D", 12: "A", 13: "D", 14: "C"}),
                ("mc", "Bumerang Test - 1", {1: "D", 2: "A", 3: "D", 4: "D", 5: "A", 6: "D", 7: "B", 8: "C"}),
                ("mc", "Beceri Temelli Test - 1", {1: "D", 2: "B", 3: "B", 4: "B", 5: "B"}),
                ("mc", "Beceri Temelli Test - 2", {1: "D", 2: "A", 3: "A", 4: "D"}),
                ("mc", "Beceri Temelli Test - 3", {1: "C", 2: "D", 3: "B", 4: "A"}),
                ("mc", "Bağlam Temelli Sorular", {1: "C", 2: "A", 3: "A", 4: "C", 5: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-10)", MAT_TEMA_4_YAZILI, 1),
            ]
        },
        {
            "id": "top_mat_t5",
            "name": "5. Tema: İstatistiksel Araştırma Süreci",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-10)", slice_dict(MAT_TEMA_5_ETKINLIKLER, 1, 10), 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "C", 3: "B", 4: "C", 5: "D", 6: "A", 7: "C", 8: "C", 9: "B", 10: "C", 11: "C", 12: "D"}),
                ("oe", "Etkinlik - 2 (Soru 11-26)", slice_dict(MAT_TEMA_5_ETKINLIKLER, 11, 26), 11),
                ("mc", "Kavratan Test - 2", {1: "D", 2: "C", 3: "B", 4: "C", 5: "C", 6: "C"}),
                ("oe", "Etkinlik - 3 (Soru 27-37)", slice_dict(MAT_TEMA_5_ETKINLIKLER, 27, 37), 27),
                ("mc", "Kavratan Test - 3", {1: "B", 2: "D", 3: "A", 4: "A", 5: "B", 6: "D", 7: "C", 8: "C", 9: "B", 10: "B", 11: "D"}),
                ("oe", "Etkinlik - 4 (Soru 38-44)", slice_dict(MAT_TEMA_5_ETKINLIKLER, 38, 44), 38),
                ("mc", "Kavratan Test - 4", {1: "B", 2: "A", 3: "D", 4: "C", 5: "C", 6: "A"}),
                ("oe", "Etkinlik - 5 (Soru 45-56)", slice_dict(MAT_TEMA_5_ETKINLIKLER, 45, 56), 45),
                ("mc", "Bumerang Test - 1", {1: "C", 2: "D", 3: "C", 4: "B", 5: "A", 6: "D"}),
                ("mc", "Bumerang Test - 2", {1: "B", 2: "D", 3: "B", 4: "C"}),
                ("mc", "Beceri Temelli Test - 1", {1: "A", 2: "D", 3: "B", 4: "B"}),
                ("mc", "Bağlam Temelli Sorular", {1: "B", 2: "D", 3: "B", 4: "D"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-6)", MAT_TEMA_5_YAZILI, 1),
            ]
        },
        {
            "id": "top_mat_t6",
            "name": "6. Tema: İşlemlerle Cebirsel Düşünme",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-21)", slice_dict(MAT_TEMA_6_ETKINLIKLER, 1, 21), 1),
                ("mc", "Kavratan Test - 1", {1: "D", 2: "B", 3: "D", 4: "A", 5: "A", 6: "B", 7: "B", 8: "C", 9: "A", 10: "C"}),
                ("oe", "Etkinlik - 2 (Soru 22-27)", slice_dict(MAT_TEMA_6_ETKINLIKLER, 22, 27), 22),
                ("mc", "Kavratan Test - 2", {1: "D", 2: "D", 3: "B", 4: "C", 5: "C", 6: "D", 7: "A", 8: "B", 9: "C", 10: "C", 11: "D", 12: "B", 13: "C", 14: "B"}),
                ("oe", "Etkinlik - 3 (Soru 28-38)", slice_dict(MAT_TEMA_6_ETKINLIKLER, 28, 38), 28),
                ("mc", "Kavratan Test - 3", {1: "B", 2: "C", 3: "A", 4: "D", 5: "C", 6: "A", 7: "A", 8: "D", 9: "A", 10: "B", 11: "B", 12: "A", 13: "B"}),
                ("oe", "Etkinlik - 4 (Soru 39-56)", slice_dict(MAT_TEMA_6_ETKINLIKLER, 39, 56), 39),
                ("mc", "Kavratan Test - 4", {1: "B", 2: "C", 3: "A", 4: "A", 5: "C", 6: "B", 7: "C", 8: "D", 9: "B", 10: "B", 11: "C"}),
                ("oe", "Etkinlik - 5 (Soru 57-64)", slice_dict(MAT_TEMA_6_ETKINLIKLER, 57, 64), 57),
                ("mc", "Kavratan Test - 5", {1: "A", 2: "B", 3: "B", 4: "B", 5: "D", 6: "B", 7: "D", 8: "C", 9: "A", 10: "B", 11: "A"}),
                ("mc", "Bumerang Test - 1", {1: "A", 2: "D", 3: "B", 4: "B", 5: "C", 6: "D", 7: "B", 8: "C", 9: "D", 10: "A", 11: "C", 12: "B", 13: "B"}),
                ("mc", "Beceri Temelli Test - 1", {1: "B", 2: "A", 3: "C", 4: "A"}),
                ("mc", "Beceri Temelli Test - 2", {1: "C", 2: "A", 3: "C", 4: "D", 5: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-9)", MAT_TEMA_6_YAZILI, 1),
            ]
        },
        {
            "id": "top_mat_t7",
            "name": "7. Tema: Veriden Olasılığa",
            "items": [
                ("oe", "Etkinlik - 1 (Soru 1-11)", slice_dict(MAT_TEMA_7_ETKINLIKLER, 1, 11), 1),
                ("mc", "Kavratan Test - 1", {1: "B", 2: "C", 3: "B", 4: "C", 5: "A", 6: "D", 7: "D", 8: "B", 9: "D", 10: "B", 11: "A"}),
                ("mc", "Bağlam Temelli Sorular", {1: "A", 2: "B", 3: "C", 4: "B", 5: "D"}),
            ]
        }
    ]

    all_tests = []
    topics = []
    order_counter = 1

    for t_idx, t in enumerate(themes):
        top_id = t["id"]
        theme_tests = []

        for item_i, item in enumerate(t["items"]):
            item_type = item[0]
            item_name = item[1]
            item_ans = item[2]
            t_id = f"tbt_mat_t{t_idx+1}_t{item_i+1}"

            if item_type == "mc":
                test_obj = format_mc_test(t_id, book_id, sub_id, top_id, item_name, item_ans, order_counter)
            else:
                start_q = item[3] if len(item) > 3 else 1
                test_obj = format_oe_test(t_id, book_id, sub_id, top_id, item_name, item_ans, order_counter, start_q_no=start_q)

            theme_tests.append(test_obj)
            all_tests.append(test_obj)
            order_counter += 1

        topics.append({
            "id": top_id,
            "name": t["name"],
            "tests": theme_tests
        })

    subject = {
        "id": sub_id,
        "name": "Matematik",
        "topics": topics
    }

    meta_header = {
        "id": "__book_meta__",
        "__meta": True,
        "title": "5. Sınıf Bumerang Matematik",
        "publisher": "Günay",
        "optionCount": 4,
        "bookType": "mixed",
        "pdfUrl": "5_Sinif_Bumerang_Matematik.pdf",
        "maxPage": 384,
        "hideAnswerKey": True
    }

    book_obj = {
        "id": book_id,
        "title": "5. Sınıf Bumerang Matematik",
        "publisher": "Günay",
        "bookType": "mixed",
        "book_type": "mixed",
        "optionCount": 4,
        "option_count": 4,
        "pdfUrl": "5_Sinif_Bumerang_Matematik.pdf",
        "pdf_url": "5_Sinif_Bumerang_Matematik.pdf",
        "subjects": [meta_header, subject],
        "raw_data": {
            "title": "5. Sınıf Bumerang Matematik",
            "publisher": "Günay",
            "bookType": "mixed",
            "optionCount": 4,
            "pdfUrl": "5_Sinif_Bumerang_Matematik.pdf",
            "subjects": [subject]
        }
    }

    return book_obj, all_tests


# 3. TÜRKÇE
def build_turkce_book():
    book_id = "tb_bumerang_turkce_5"
    sub_id = "sub_turkce_5"

    themes = [
        {
            "id": "top_turkce_t1",
            "name": "1. Tema: Oyun Dünyası",
            "items": [
                ("oe", "Söz Varlığı - Etkinlikler (Soru 1-25)", slice_dict(TURKCE_TEMA_1_ETKINLIKLER, 1, 25), 1),
                ("mc", "Bilgi ve Kavrama Testi - 1", {1: "C", 2: "A", 3: "C", 4: "B", 5: "C", 6: "A", 7: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 2", {1: "A", 2: "D", 3: "C", 4: "A", 5: "B", 6: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 3", {1: "D", 2: "D", 3: "A", 4: "B", 5: "C", 6: "B", 7: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 4", {1: "D", 2: "A", 3: "C", 4: "D", 5: "B", 6: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 5", {1: "A", 2: "C", 3: "B", 4: "B", 5: "C", 6: "A", 7: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 6", {1: "D", 2: "C", 3: "A", 4: "C", 5: "C", 6: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 7", {1: "B", 2: "B", 3: "A", 4: "C", 5: "D", 6: "B", 7: "D", 8: "A", 9: "C"}),
                ("mc", "Bumerang Test - 1", {1: "C", 2: "D", 3: "B", 4: "C", 5: "B", 6: "C", 7: "C", 8: "D", 9: "C", 10: "C", 11: "A", 12: "B"}),
                ("oe", "Metinde Anlam - Etkinlikler (Soru 26-31)", slice_dict(TURKCE_TEMA_1_ETKINLIKLER, 26, 31), 26),
                ("mc", "Bilgi ve Kavrama Testi - 8", {1: "D", 2: "D", 3: "A", 4: "C", 5: "D", 6: "C", 7: "C", 8: "B", 9: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 9", {1: "A", 2: "D", 3: "C", 4: "D", 5: "C", 6: "B", 7: "C", 8: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 10", {1: "A", 2: "D", 3: "A", 4: "D", 5: "A", 6: "C"}),
                ("mc", "Bumerang Test - 2", {1: "A", 2: "B", 3: "C", 4: "C", 5: "B", 6: "D", 7: "C", 8: "B"}),
                ("oe", "Dil Yapıları - Etkinlikler (Soru 32-35)", slice_dict(TURKCE_TEMA_1_ETKINLIKLER, 32, 35), 32),
                ("mc", "Bilgi ve Kavrama Testi - 11", {1: "C", 2: "D", 3: "A", 4: "C", 5: "C", 6: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 12", {1: "A", 2: "A", 3: "D", 4: "B", 5: "D"}),
                ("mc", "Bumerang Test - 3", {1: "A", 2: "D", 3: "C", 4: "C", 5: "D", 6: "D", 7: "C", 8: "D", 9: "A", 10: "D"}),
                ("oe", "Yazım ve Noktalama - Etkinlikler (Soru 36-39)", slice_dict(TURKCE_TEMA_1_ETKINLIKLER, 36, 39), 36),
                ("mc", "Bilgi ve Kavrama Testi - 13", {1: "B", 2: "C", 3: "C", 4: "B", 5: "D", 6: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 14", {1: "C", 2: "D", 3: "C", 4: "A", 5: "D"}),
                ("mc", "Bumerang Test - 4", {1: "D", 2: "A", 3: "B", 4: "D", 5: "C", 6: "B", 7: "A"}),
                ("mc", "Zenginleştirme Testi", {1: "A", 2: "A", 3: "C", 4: "C", 5: "A", 6: "C", 7: "C", 8: "D", 9: "D"}),
                ("mc", "Beceri Testi", {1: "D", 2: "C", 3: "A", 4: "C", 5: "B", 6: "A", 7: "D", 8: "B", 9: "C", 10: "B", 11: "B"}),
                ("mc", "Bağlam Temelli Sorular", {1: "D", 2: "B", 3: "D", 4: "B", 5: "C", 6: "A"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-8)", TURKCE_TEMA_1_YAZILI, 1),
            ]
        },
        {
            "id": "top_turkce_t2",
            "name": "2. Tema: Atatürk'ü Tanımak",
            "items": [
                ("oe", "Söz Varlığı - Etkinlikler (Soru 1-23)", slice_dict(TURKCE_TEMA_2_ETKINLIKLER, 1, 23), 1),
                ("mc", "Bilgi ve Kavrama Testi - 1", {1: "C", 2: "D", 3: "D", 4: "B", 5: "A", 6: "B", 7: "C", 8: "B", 9: "D", 10: "A", 11: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 2", {1: "D", 2: "C", 3: "D", 4: "D", 5: "D", 6: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 3", {1: "C", 2: "D", 3: "C", 4: "D", 5: "D"}),
                ("mc", "Bilgi ve Kavrama Testi - 4", {1: "B", 2: "A", 3: "A", 4: "B", 5: "D", 6: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 5", {1: "C", 2: "B", 3: "B", 4: "D", 5: "C", 6: "C"}),
                ("mc", "Bumerang Test - 1", {1: "B", 2: "A", 3: "D", 4: "D", 5: "A", 6: "C", 7: "A", 8: "D", 9: "C", 10: "B"}),
                ("oe", "Metinde Anlam - Etkinlikler (Soru 24-29)", slice_dict(TURKCE_TEMA_2_ETKINLIKLER, 24, 29), 24),
                ("mc", "Bilgi ve Kavrama Testi - 6", {1: "A", 2: "C", 3: "C", 4: "B", 5: "D", 6: "B", 7: "D", 8: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 7", {1: "A", 2: "D", 3: "D", 4: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 8", {1: "D", 2: "A", 3: "D", 4: "D"}),
                ("mc", "Bumerang Test - 2", {1: "C", 2: "C", 3: "B", 4: "B", 5: "D", 6: "C", 7: "D"}),
                ("oe", "Dil Yapıları - Etkinlikler (Soru 30-33)", slice_dict(TURKCE_TEMA_2_ETKINLIKLER, 30, 33), 30),
                ("mc", "Bilgi ve Kavrama Testi - 9", {1: "A", 2: "C", 3: "B", 4: "C", 5: "D", 6: "D", 7: "D"}),
                ("mc", "Bilgi ve Kavrama Testi - 10", {1: "A", 2: "B", 3: "C", 4: "D", 5: "C", 6: "C"}),
                ("mc", "Bumerang Test - 3", {1: "D", 2: "D", 3: "D", 4: "B", 5: "C", 6: "D", 7: "C", 8: "A", 9: "D", 10: "A", 11: "B"}),
                ("oe", "Yazım ve Noktalama - Etkinlikler (Soru 34-37)", slice_dict(TURKCE_TEMA_2_ETKINLIKLER, 34, 37), 34),
                ("mc", "Bilgi ve Kavrama Testi - 11", {1: "A", 2: "A", 3: "C", 4: "B", 5: "A", 6: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 12", {1: "C", 2: "C", 3: "D", 4: "C", 5: "B", 6: "A"}),
                ("mc", "Bumerang Test - 4", {1: "B", 2: "A", 3: "A", 4: "D", 5: "D", 6: "B", 7: "A", 8: "D", 9: "B"}),
                ("mc", "Zenginleştirme Testi", {1: "A", 2: "A", 3: "C", 4: "A", 5: "A", 6: "B", 7: "B", 8: "A", 9: "C", 10: "A", 11: "D", 12: "C", 13: "A", 14: "D", 15: "D"}),
                ("mc", "Beceri Testi", {1: "C", 2: "C", 3: "D", 4: "D", 5: "C", 6: "D", 7: "C", 8: "B", 9: "C", 10: "D"}),
                ("mc", "Bağlam Temelli Sorular", {1: "A", 2: "C", 3: "D", 4: "D", 5: "A", 6: "D"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-8)", TURKCE_TEMA_2_YAZILI, 1),
            ]
        },
        {
            "id": "top_turkce_t3",
            "name": "3. Tema: Duygularımı Tanıyorum",
            "items": [
                ("oe", "Söz Varlığı - Etkinlikler (Soru 1-7)", slice_dict(TURKCE_TEMA_3_ETKINLIKLER, 1, 7), 1),
                ("mc", "Bilgi ve Kavrama Testi - 1", {1: "A", 2: "C", 3: "C", 4: "D", 5: "B", 6: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 2", {1: "A", 2: "B", 3: "A", 4: "D", 5: "B"}),
                ("mc", "Bumerang Test - 1", {1: "D", 2: "B", 3: "D", 4: "C", 5: "B", 6: "A", 7: "C", 8: "D", 9: "A", 10: "B", 11: "D"}),
                ("oe", "Metinde Anlam - Etkinlikler (Soru 8-28)", slice_dict(TURKCE_TEMA_3_ETKINLIKLER, 8, 28), 8),
                ("mc", "Bilgi ve Kavrama Testi - 3", {1: "C", 2: "B", 3: "C", 4: "D", 5: "D", 6: "C", 7: "A", 8: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 4", {1: "A", 2: "B", 3: "C", 4: "A", 5: "C", 6: "D"}),
                ("mc", "Bilgi ve Kavrama Testi - 5", {1: "C", 2: "B", 3: "D", 4: "B", 5: "C", 6: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 6", {1: "C", 2: "C", 3: "B", 4: "B", 5: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 7", {1: "A", 2: "C", 3: "A", 4: "A", 5: "A", 6: "C", 7: "D", 8: "B", 9: "D"}),
                ("mc", "Bilgi ve Kavrama Testi - 8", {1: "C", 2: "C", 3: "B", 4: "A", 5: "B", 6: "C", 7: "A", 8: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 9", {1: "A", 2: "D", 3: "C", 4: "B"}),
                ("mc", "Bumerang Test - 2", {1: "D", 2: "C", 3: "D", 4: "A", 5: "D", 6: "B", 7: "C"}),
                ("oe", "Dil Yapıları - Etkinlikler (Soru 29-35)", slice_dict(TURKCE_TEMA_3_ETKINLIKLER, 29, 35), 29),
                ("mc", "Bilgi ve Kavrama Testi - 10", {1: "D", 2: "C", 3: "B", 4: "C", 5: "A", 6: "D", 7: "B", 8: "D", 9: "A", 10: "C", 11: "A", 12: "A", 13: "D", 14: "A"}),
                ("mc", "Bumerang Test - 3", {1: "B", 2: "A", 3: "D", 4: "B", 5: "D", 6: "C", 7: "D", 8: "A", 9: "B", 10: "A"}),
                ("oe", "Yazım ve Noktalama - Etkinlikler (Soru 36-38)", slice_dict(TURKCE_TEMA_3_ETKINLIKLER, 36, 38), 36),
                ("mc", "Bilgi ve Kavrama Testi - 11", {1: "D", 2: "C", 3: "D", 4: "C", 5: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 12", {1: "A", 2: "A", 3: "C", 4: "B", 5: "A"}),
                ("mc", "Bumerang Test - 4", {1: "C", 2: "D", 3: "C", 4: "A", 5: "A", 6: "C", 7: "C"}),
                ("mc", "Zenginleştirme Testi", {1: "C", 2: "B", 3: "D", 4: "C", 5: "B", 6: "B", 7: "D", 8: "C", 9: "C"}),
                ("mc", "Beceri Testi", {1: "A", 2: "B", 3: "C", 4: "B", 5: "C", 6: "C", 7: "B", 8: "C", 9: "D", 10: "C", 11: "D"}),
                ("mc", "Bağlam Temelli Sorular", {1: "D", 2: "C", 3: "B", 4: "B", 5: "D", 6: "A"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-9)", TURKCE_TEMA_3_YAZILI, 1),
            ]
        },
        {
            "id": "top_turkce_t4",
            "name": "4. Tema: Geleneklerimiz",
            "items": [
                ("oe", "Söz Varlığı - Etkinlikler (Soru 1-15)", slice_dict(TURKCE_TEMA_4_ETKINLIKLER, 1, 15), 1),
                ("mc", "Bilgi ve Kavrama Testi - 1", {1: "A", 2: "C", 3: "A", 4: "C", 5: "C", 6: "D", 7: "C", 8: "C", 9: "B", 10: "D", 11: "B", 12: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 2", {1: "C", 2: "A", 3: "C", 4: "D", 5: "D", 6: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 3", {1: "B", 2: "A", 3: "B", 4: "C", 5: "D", 6: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 4", {1: "D", 2: "D", 3: "C", 4: "B", 5: "A", 6: "C"}),
                ("mc", "Bumerang Test - 1", {1: "D", 2: "A", 3: "C", 4: "B", 5: "C", 6: "B", 7: "A", 8: "A", 9: "C", 10: "D"}),
                ("oe", "Metinde Anlam - Etkinlikler (Soru 16-19)", slice_dict(TURKCE_TEMA_4_ETKINLIKLER, 16, 19), 16),
                ("mc", "Bilgi ve Kavrama Testi - 5", {1: "A", 2: "A", 3: "C", 4: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 6", {1: "B", 2: "D", 3: "C", 4: "C", 5: "A", 6: "C"}),
                ("mc", "Bumerang Test - 2", {1: "B", 2: "D", 3: "B", 4: "C", 5: "B", 6: "C", 7: "B", 8: "A"}),
                ("oe", "Dil Yapıları - Etkinlikler (Soru 20-28)", slice_dict(TURKCE_TEMA_4_ETKINLIKLER, 20, 28), 20),
                ("mc", "Bilgi ve Kavrama Testi - 7", {1: "A", 2: "D", 3: "B", 4: "D", 5: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 8", {1: "C", 2: "D", 3: "A", 4: "B", 5: "B", 6: "D", 7: "D", 8: "B"}),
                ("mc", "Bumerang Test - 3", {1: "A", 2: "D", 3: "C", 4: "C", 5: "D", 6: "A", 7: "B", 8: "C", 9: "D", 10: "A"}),
                ("oe", "Yazım ve Noktalama - Etkinlikler (Soru 29-31)", slice_dict(TURKCE_TEMA_4_ETKINLIKLER, 29, 31), 29),
                ("mc", "Bilgi ve Kavrama Testi - 9", {1: "A", 2: "B", 3: "C", 4: "C", 5: "D", 6: "C", 7: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 10", {1: "A", 2: "C", 3: "A", 4: "C", 5: "B"}),
                ("mc", "Bumerang Test - 4", {1: "B", 2: "A", 3: "A", 4: "C", 5: "D", 6: "D", 7: "A", 8: "A"}),
                ("mc", "Zenginleştirme Testi", {1: "B", 2: "D", 3: "B", 4: "B", 5: "C", 6: "B", 7: "B", 8: "D", 9: "A", 10: "C"}),
                ("mc", "Beceri Testi", {1: "A", 2: "A", 3: "D", 4: "B", 5: "C", 6: "B", 7: "B", 8: "C", 9: "A", 10: "A", 11: "C"}),
                ("mc", "Bağlam Temelli Sorular", {1: "D", 2: "C", 3: "B", 4: "D", 5: "A", 6: "C"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-7)", TURKCE_TEMA_4_YAZILI, 1),
            ]
        },
        {
            "id": "top_turkce_t5",
            "name": "5. Tema: İletişim ve Sosyal İlişkiler",
            "items": [
                ("oe", "Söz Varlığı - Etkinlikler (Soru 1-7)", slice_dict(TURKCE_TEMA_5_ETKINLIKLER, 1, 7), 1),
                ("mc", "Bilgi ve Kavrama Testi - 1", {1: "A", 2: "C", 3: "B", 4: "C", 5: "B", 6: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 2", {1: "A", 2: "A", 3: "C", 4: "A", 5: "D", 6: "C"}),
                ("mc", "Bumerang Test - 1", {1: "B", 2: "B", 3: "A", 4: "C", 5: "C", 6: "B", 7: "A", 8: "C", 9: "C", 10: "A"}),
                ("oe", "Metinde Anlam - Etkinlikler (Soru 8-13)", slice_dict(TURKCE_TEMA_5_ETKINLIKLER, 8, 13), 8),
                ("mc", "Bilgi ve Kavrama Testi - 3", {1: "A", 2: "B", 3: "A", 4: "C", 5: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 4", {1: "C", 2: "D", 3: "A", 4: "B", 5: "B", 6: "C", 7: "B", 8: "A", 9: "B"}),
                ("mc", "Bilgi ve Kavrama Testi - 5", {1: "D", 2: "D", 3: "B", 4: "B"}),
                ("mc", "Bumerang Test - 2", {1: "A", 2: "A", 3: "C", 4: "B", 5: "A", 6: "D"}),
                ("oe", "Dil Yapıları - Etkinlikler (Soru 14-19)", slice_dict(TURKCE_TEMA_5_ETKINLIKLER, 14, 19), 14),
                ("mc", "Bilgi ve Kavrama Testi - 6", {1: "D", 2: "D", 3: "D", 4: "C", 5: "B"}),
                ("mc", "Bumerang Test - 3", {1: "C", 2: "C", 3: "D", 4: "D", 5: "D", 6: "C", 7: "C", 8: "A", 9: "A", 10: "B"}),
                ("oe", "Yazım ve Noktalama - Etkinlikler (Soru 20-21)", slice_dict(TURKCE_TEMA_5_ETKINLIKLER, 20, 21), 20),
                ("mc", "Bilgi ve Kavrama Testi - 7", {1: "C", 2: "C", 3: "D", 4: "A", 5: "B", 6: "C"}),
                ("mc", "Bumerang Test - 4", {1: "B", 2: "A", 3: "A", 4: "D", 5: "D", 6: "A", 7: "B", 8: "B", 9: "A", 10: "B"}),
                ("mc", "Zenginleştirme Testi", {1: "B", 2: "C", 3: "D", 4: "B", 5: "B", 6: "C", 7: "D", 8: "B", 9: "D", 10: "B"}),
                ("mc", "Beceri Testi", {1: "A", 2: "C", 3: "B", 4: "B", 5: "C", 6: "C", 7: "C", 8: "A", 9: "D"}),
                ("mc", "Bağlam Temelli Sorular", {1: "C", 2: "C", 3: "C", 4: "B", 5: "C", 6: "D"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-7)", TURKCE_TEMA_5_YAZILI, 1),
            ]
        },
        {
            "id": "top_turkce_t6",
            "name": "6. Tema: Sağlıklı Yaşıyorum",
            "items": [
                ("oe", "Söz Varlığı - Etkinlikler (Soru 1-4)", slice_dict(TURKCE_TEMA_6_ETKINLIKLER, 1, 4), 1),
                ("mc", "Bilgi ve Kavrama Testi - 1", {1: "C", 2: "A", 3: "C", 4: "B", 5: "A", 6: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 2", {1: "C", 2: "D", 3: "D", 4: "C", 5: "A", 6: "C"}),
                ("mc", "Bumerang Test - 1", {1: "C", 2: "B", 3: "C", 4: "D", 5: "D", 6: "C", 7: "A", 8: "B", 9: "B", 10: "B"}),
                ("oe", "Metinde Anlam - Etkinlikler (Soru 5-12)", slice_dict(TURKCE_TEMA_6_ETKINLIKLER, 5, 12), 5),
                ("mc", "Bilgi ve Kavrama Testi - 3", {1: "B", 2: "A", 3: "C", 4: "D"}),
                ("mc", "Bilgi ve Kavrama Testi - 4", {1: "B", 2: "A", 3: "D"}),
                ("mc", "Bilgi ve Kavrama Testi - 5", {1: "A", 2: "B", 3: "D", 4: "C", 5: "A"}),
                ("mc", "Bilgi ve Kavrama Testi - 6", {1: "C", 2: "B", 3: "B", 4: "C"}),
                ("mc", "Bilgi ve Kavrama Testi - 7", {1: "B", 2: "D", 3: "C"}),
                ("mc", "Bumerang Test - 2", {1: "B", 2: "A", 3: "B", 4: "D", 5: "B"}),
                ("oe", "Yazım ve Noktalama - Etkinlikler (Soru 13-14)", slice_dict(TURKCE_TEMA_6_ETKINLIKLER, 13, 14), 13),
                ("mc", "Bilgi ve Kavrama Testi - 8", {1: "B", 2: "A", 3: "C", 4: "B", 5: "D", 6: "D"}),
                ("mc", "Bumerang Test - 3", {1: "C", 2: "C", 3: "B", 4: "A", 5: "B", 6: "D", 7: "D", 8: "D", 9: "C", 10: "C", 11: "C", 12: "D"}),
                ("mc", "Zenginleştirme Testi", {1: "C", 2: "D", 3: "C", 4: "A", 5: "B", 6: "D", 7: "B", 8: "C", 9: "A", 10: "D", 11: "A"}),
                ("mc", "Beceri Testi", {1: "B", 2: "D", 3: "C", 4: "C", 5: "C", 6: "A", 7: "B", 8: "B"}),
                ("mc", "Bağlam Temelli Sorular", {1: "D", 2: "A", 3: "C", 4: "A", 5: "B"}),
                ("oe", "Yazılıya Hazırlık (Soru 1-8)", TURKCE_TEMA_6_YAZILI, 1),
            ]
        }
    ]

    all_tests = []
    topics = []
    order_counter = 1

    for t_idx, t in enumerate(themes):
        top_id = t["id"]
        theme_tests = []

        for item_i, item in enumerate(t["items"]):
            item_type = item[0]
            item_name = item[1]
            item_ans = item[2]
            t_id = f"tbt_tur_t{t_idx+1}_t{item_i+1}"

            if item_type == "mc":
                test_obj = format_mc_test(t_id, book_id, sub_id, top_id, item_name, item_ans, order_counter)
            else:
                start_q = item[3] if len(item) > 3 else 1
                test_obj = format_oe_test(t_id, book_id, sub_id, top_id, item_name, item_ans, order_counter, start_q_no=start_q)

            theme_tests.append(test_obj)
            all_tests.append(test_obj)
            order_counter += 1

        topics.append({
            "id": top_id,
            "name": t["name"],
            "tests": theme_tests
        })

    subject = {
        "id": sub_id,
        "name": "Türkçe",
        "topics": topics
    }

    meta_header = {
        "id": "__book_meta__",
        "__meta": True,
        "title": "5. Sınıf Bumerang Türkçe",
        "publisher": "Günay",
        "optionCount": 4,
        "bookType": "mixed",
        "pdfUrl": "5_Sinif_Bumerang_Turkce.pdf",
        "maxPage": 368,
        "hideAnswerKey": True
    }

    book_obj = {
        "id": book_id,
        "title": "5. Sınıf Bumerang Türkçe",
        "publisher": "Günay",
        "bookType": "mixed",
        "book_type": "mixed",
        "optionCount": 4,
        "option_count": 4,
        "pdfUrl": "5_Sinif_Bumerang_Turkce.pdf",
        "pdf_url": "5_Sinif_Bumerang_Turkce.pdf",
        "subjects": [meta_header, subject],
        "raw_data": {
            "title": "5. Sınıf Bumerang Türkçe",
            "publisher": "Günay",
            "bookType": "mixed",
            "optionCount": 4,
            "pdfUrl": "5_Sinif_Bumerang_Turkce.pdf",
            "subjects": [subject]
        }
    }

    return book_obj, all_tests

def main():
    print("=== Building 3 Bumerang Books ===")
    
    fen_book, fen_tests = build_fen_book()
    mat_book, mat_tests = build_mat_book()
    turkce_book, turkce_tests = build_turkce_book()

    # Save backup import JSON files (both full object and { "subjects": [...] } compatible)
    for fname, book, tests in [
        ("bumerang_fen_import.json", fen_book, fen_tests),
        ("bumerang_matematik_import.json", mat_book, mat_tests),
        ("bumerang_turkce_import.json", turkce_book, turkce_tests),
    ]:
        with open(fname, "w", encoding="utf-8") as f:
            json.dump(book, f, ensure_ascii=False, indent=2)
        total_q = sum(t["question_count"] for t in tests)
        print(f"Saved {fname}: {len(tests)} tests, {total_q} questions")

    # Insert into Supabase
    print("\n=== Uploading to Supabase ===")
    books = [
        ("Fen Bilimleri", fen_book, fen_tests),
        ("Matematik", mat_book, mat_tests),
        ("Türkçe", turkce_book, turkce_tests)
    ]

    for title, book, tests in books:
        uuid_book_id = to_uuid(book["id"])
        print(f"\nProcessing '{book['title']}' (UUID: {uuid_book_id})...")

        # 1. Upsert Book Row in tracked_books
        book_payload = {
            "id": uuid_book_id,
            "title": book["title"],
            "publisher": book["publisher"],
            "book_type": book["book_type"],
            "pdf_url": book["pdf_url"],
            "option_count": book["option_count"],
            "total_tests": len(tests),
            "total_questions": sum(t["question_count"] for t in tests),
            "subjects": book["subjects"],
            "raw_data": book["raw_data"]
        }

        # Try upsert via POST with merge-duplicates
        r = requests.post(f"{SUPABASE_URL}/rest/v1/tracked_books", headers=HEADERS, json=book_payload)
        if r.status_code in [200, 201, 204]:
            print(f"  [tracked_books] Upserted successfully (Status {r.status_code})")
        else:
            print(f"  [tracked_books] Upsert status {r.status_code}: {r.text[:200]}")
            # Try PATCH if already exists
            r_patch = requests.patch(f"{SUPABASE_URL}/rest/v1/tracked_books?id=eq.{uuid_book_id}", headers=HEADERS, json=book_payload)
            print(f"  [tracked_books] Patch fallback status {r_patch.status_code}")

        # 2. Batch Upsert Tests into tracked_book_tests
        print(f"  Cleaning up any prior tests and uploading {len(tests)} tests...")
        requests.delete(f"{SUPABASE_URL}/rest/v1/tracked_book_tests?book_id=eq.{uuid_book_id}", headers=HEADERS)
        test_rows = []
        for t in tests:
            test_rows.append({
                "id": to_uuid(t["id"]),
                "book_id": uuid_book_id,
                "subject_id": t["subject_id"],
                "topic_id": t["topic_id"],
                "name": t["name"],
                "question_count": t["question_count"],
                "answer_key": t["answer_key"],
                "option_count": t.get("optionCount", 4),
                "is_open_ended": t.get("isOpenEnded", False),
                "question_type": t.get("questionType", "coktan_secmeli")
            })

        # Batch in chunks of 50
        chunk_size = 50
        for i in range(0, len(test_rows), chunk_size):
            chunk = test_rows[i:i + chunk_size]
            r_tests = requests.post(f"{SUPABASE_URL}/rest/v1/tracked_book_tests", headers=HEADERS, json=chunk)
            if r_tests.status_code in [200, 201, 204]:
                print(f"    Chunk {i//chunk_size + 1}/{(len(test_rows)-1)//chunk_size + 1} upserted successfully.")
            else:
                print(f"    Chunk {i//chunk_size + 1} status {r_tests.status_code}: {r_tests.text[:200]}")
                # Fallback row by row
                for row in chunk:
                    requests.post(f"{SUPABASE_URL}/rest/v1/tracked_book_tests", headers=HEADERS, json=row)

    print("\n=== All 3 books uploaded successfully! ===")

if __name__ == "__main__":
    main()
