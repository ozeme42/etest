import sys
import io
import requests

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://bstcisckpnmwmcggmtfi.supabase.co'
HEADERS = {
    'apikey': 'sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9',
    'Authorization': 'Bearer sb_publishable_7Cl0FqN78pFePi0J-rf1wA_maOE4sJ9'
}

print('=== SUPABASE VERIFICATION ===')
books_info = [
    ('Fen Bilimleri', '74625f62-756d-4572-a16e-675f66656e5f'),
    ('Matematik', '74625f62-756d-4572-a16e-675f6d617465'),
    ('Türkçe', '74625f62-756d-4572-a16e-675f7475726b')
]

for title, bid in books_info:
    r_book = requests.get(f'{SUPABASE_URL}/rest/v1/tracked_books?id=eq.{bid}', headers=HEADERS)
    book_data = r_book.json()
    r_tests = requests.get(f'{SUPABASE_URL}/rest/v1/tracked_book_tests?book_id=eq.{bid}&select=id,name,question_count,answer_key', headers=HEADERS)
    tests_data = r_tests.json()
    
    total_q = sum(t.get('question_count', 0) for t in tests_data)
    mc_tests = [t for t in tests_data if t.get('answer_key', {}).get('__meta', {}).get('questionType') == 'coktan_secmeli']
    oe_tests = [t for t in tests_data if t.get('answer_key', {}).get('__meta', {}).get('questionType') == 'acik_uclu']
    
    print(f"\nBook: {book_data[0]['title']} (ID: {bid})")
    print(f"  Publisher: {book_data[0]['publisher']}")
    print(f"  Total Tests: {len(tests_data)}")
    print(f"  Multiple-Choice Tests: {len(mc_tests)}")
    print(f"  Open-Ended Tests: {len(oe_tests)}")
    print(f"  Total Questions: {total_q}")
    
    if mc_tests:
        sample_mc = [f"{k}:{v}" for k, v in mc_tests[0]['answer_key'].items() if k != '__meta'][:5]
        print(f"  Sample MC: '{mc_tests[0]['name']}' -> Keys: {sample_mc}")
    if oe_tests:
        sample_oe = {k: v[:35] + '...' for k, v in oe_tests[0]['answer_key'].items() if k != '__meta'}
        print(f"  Sample OE: '{oe_tests[0]['name']}' -> Answers: {sample_oe}")
