import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PdfQuestionSlicerModal from '../components/question-bank/PdfQuestionSlicerModal';
import { useTrackedBooks } from '../context/TrackedBookContext';

export default function PdfQuestionSlicerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { books = [] } = useTrackedBooks();

  const mode = searchParams.get('mode') || 'mistakes';
  const bookId = searchParams.get('bookId');
  const subject = searchParams.get('subject') || 'Matematik';
  const grade = searchParams.get('grade') || '8. Sınıf';

  const initialBook = bookId ? books.find(b => String(b.id) === String(bookId)) : null;

  return (
    <PdfQuestionSlicerModal
      isOpen={true}
      isPageMode={true}
      onClose={() => navigate(-1)}
      mode={mode}
      initialBook={initialBook}
      initialBookId={bookId}
      initialPdfUrl={initialBook?.pdfUrl}
      subject={initialBook?.subject || subject}
      grade={initialBook?.grade ? `${initialBook.grade}. Sınıf` : grade}
    />
  );
}
