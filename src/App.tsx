import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Book as BookIcon, 
  Plus, 
  LogIn, 
  LogOut, 
  Languages, 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle,
  ArrowRightLeft,
  Library,
  Settings,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { AR_TRANSLATIONS, EN_TRANSLATIONS } from './constants';
import { Book, Loan, Language, BookStatus } from './types';

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showAddBook, setShowAddBook] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBorrow, setShowBorrow] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin.toString());
  }, [isAdmin]);
  
  // Form states
  const [newBook, setNewBook] = useState<Partial<Book>>({ numericalId: '', specialCode: '', title: '', category: '', owner: 'School library' });
  const [newLoan, setNewLoan] = useState<Partial<Loan>>({ studentName: '', classSection: '', studentNumber: '', targetReturnDate: '' });
  const [credentials, setCredentials] = useState({ username: '', password: '' });

  const t = lang === 'ar' ? AR_TRANSLATIONS : EN_TRANSLATIONS;
  const isRtl = lang === 'ar';

  const overdueLoans = useMemo(() => {
    const today = new Date();
    return loans.filter(loan => !loan.returnedDate && new Date(loan.targetReturnDate) < today);
  }, [loans]);

  useEffect(() => {
    fetchBooks();
    fetchLoans();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBooks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/books');
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل تحميل الكتب' : 'Failed to fetch books', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLoans = async () => {
    try {
      const res = await fetch('/api/loans');
      const data = await res.json();
      setLoans(data);
    } catch (err) {
      console.error('Failed to fetch loans', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setIsAdmin(true);
        setShowLogin(false);
        setUsername('');
        setPassword('');
      } else {
        setLoginError(lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials');
      }
    } catch (err) {
      setLoginError(lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error');
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.username.trim() || !credentials.password.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      if (res.ok) {
        setShowSettings(false);
        setCredentials({ username: '', password: '' });
        showToast(lang === 'ar' ? 'تم تحديث البيانات بنجاح' : 'Credentials updated successfully');
      }
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل التحديث' : 'Update failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBook = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBooks();
        showToast(lang === 'ar' ? 'تم حذف الكتاب' : 'Book deleted');
        setShowDeleteConfirm(null);
      }
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل الحذف' : 'Delete failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.numericalId?.trim() || !newBook.title?.trim()) return;
    
    setIsLoading(true);
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBook, id: Date.now().toString(), status: 'Available' }),
      });
      
      if (res.ok) {
        fetchBooks();
        setShowAddBook(false);
        setNewBook({ numericalId: '', specialCode: '', title: '', category: '', owner: 'School library' });
        showToast(lang === 'ar' ? 'تمت إضافة الكتاب بنجاح' : 'Book added successfully');
      } else {
        const error = await res.json();
        showToast(error.error, 'error');
      }
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل إضافة الكتاب' : 'Failed to add book', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBorrow || !newLoan.studentName?.trim() || !newLoan.studentNumber?.trim() || !newLoan.targetReturnDate) return;

    const book = books.find(b => b.id === showBorrow);
    if (!book) return;

    setIsLoading(true);
    const loanData: Loan = {
      id: Date.now().toString(),
      studentName: newLoan.studentName.trim(),
      classSection: newLoan.classSection?.trim() || '',
      studentNumber: newLoan.studentNumber.trim(),
      bookTitle: book.title,
      bookNumericalId: book.numericalId,
      bookSpecialCode: book.specialCode,
      loanDate: new Date().toISOString(),
      targetReturnDate: new Date(newLoan.targetReturnDate).toISOString(),
      returnedDate: '',
      linkedBook: book.id,
    };

    try {
      const res = await fetch('/api/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loan: loanData, bookId: book.id }),
      });

      if (res.ok) {
        fetchBooks();
        fetchLoans();
        setShowBorrow(null);
        setNewLoan({ studentName: '', classSection: '', studentNumber: '', targetReturnDate: '' });
        showToast(lang === 'ar' ? 'تمت الإعارة بنجاح' : 'Book borrowed successfully');
      }
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل عملية الإعارة' : 'Borrowing failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReturn = async (bookId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      });

      if (res.ok) {
        fetchBooks();
        fetchLoans();
        showToast(lang === 'ar' ? 'تم استرجاع الكتاب' : 'Book returned');
      }
    } catch (err) {
      showToast(lang === 'ar' ? 'فشل استرجاع الكتاب' : 'Return failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.numericalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.specialCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [books, searchTerm]);

  return (
    <div className={cn(
      "min-h-screen bg-slate-50 font-sans text-slate-900",
      isRtl ? "text-right" : "text-left"
    )} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Library size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{t.title}</h1>
              <p className="text-sm text-slate-500 font-medium">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium text-slate-600"
            >
              <Languages size={20} />
              <span className="hidden sm:inline">{lang === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                  {t.role}
                </span>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title={t.settings}
                >
                  <Settings size={20} />
                </button>
                <button 
                  onClick={() => setIsAdmin(false)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title={t.logout}
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLogin(true)}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all text-sm font-medium shadow-sm"
              >
                <LogIn size={18} />
                <span>{t.adminLogin}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Overdue Alert */}
        {overdueLoans.length > 0 ? (
          <div className="mb-8 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-rose-700">
            <XCircle size={20} />
            <p className="font-semibold">{t.overdueAlerts.replace('{n}', overdueLoans.length.toString())}</p>
          </div>
        ) : (
          <div className="mb-8 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-emerald-700">
            <CheckCircle size={20} />
            <p className="font-semibold">{t.overdueAlertsNone}</p>
          </div>
        )}

        {/* Search & Stats */}
        <div className="mb-8 space-y-6">
          <div className="relative max-w-2xl">
            <div className={cn(
              "absolute inset-y-0 flex items-center pointer-events-none text-slate-400",
              isRtl ? "right-4" : "left-4"
            )}>
              <Search size={20} />
            </div>
            <input 
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cn(
                "w-full bg-white border border-slate-200 rounded-2xl py-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm",
                isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
              )}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">{t.totalBooks}</p>
              <p className="text-2xl font-bold text-slate-900">{books.length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">{t.available}</p>
              <p className="text-2xl font-bold text-emerald-600">{books.filter(b => b.status === 'Available').length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">{t.borrowed}</p>
              <p className="text-2xl font-bold text-rose-600">{books.filter(b => b.status === 'Borrowed').length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">{t.lost}</p>
              <p className="text-2xl font-bold text-slate-400">{books.filter(b => b.status === 'Lost').length}</p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm bg-rose-50 border-rose-100">
              <p className="text-rose-600 text-xs font-medium mb-1">{t.overdue}</p>
              <p className="text-2xl font-bold text-rose-700">{overdueLoans.length}</p>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && (
          <div className="mb-8 flex gap-4">
            <button 
              onClick={() => setShowAddBook(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-all font-semibold shadow-lg shadow-emerald-100"
            >
              <Plus size={20} />
              <span>{t.addBook}</span>
            </button>
          </div>
        )}

        {/* Books Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">{t.bookId}</th>
                  <th className="px-6 py-4">{t.specialCode}</th>
                  <th className="px-6 py-4">{t.bookTitle}</th>
                  <th className="px-6 py-4">{t.category}</th>
                  <th className="px-6 py-4">{t.status}</th>
                  <th className="px-6 py-4">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                      {lang === 'ar' ? 'لا توجد نتائج تطابق بحثك' : 'No books found matching your search'}
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500">{book.numericalId}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">{book.specialCode}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{book.title}</td>
                    <td className="px-6 py-4 text-slate-600">{book.category}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5",
                        book.status === 'Available' 
                          ? "bg-emerald-50 text-emerald-700" 
                          : book.status === 'Borrowed'
                          ? "bg-rose-50 text-rose-700"
                          : "bg-slate-100 text-slate-500"
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          book.status === 'Available' ? "bg-emerald-500" : book.status === 'Borrowed' ? "bg-rose-500" : "bg-slate-400"
                        )} />
                        {book.status === 'Available' ? t.available : book.status === 'Borrowed' ? t.borrowed : t.lost}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {isAdmin && (
                        <div className="flex gap-2">
                          {book.status === 'Available' ? (
                            <button 
                              onClick={() => setShowBorrow(book.id)}
                              className="text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                            >
                              {t.borrowBook}
                            </button>
                          ) : book.status === 'Borrowed' ? (
                            <button 
                              onClick={() => handleReturn(book.id)}
                              className="text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors font-semibold"
                            >
                              {t.returnBook}
                            </button>
                          ) : null}
                          <button 
                            onClick={() => setShowDeleteConfirm(book.id)}
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all"
                            title={t.delete}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {/* Login Modal */}
        {showLogin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogin(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6 text-center">{t.adminLogin}</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {loginError && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-sm font-medium border border-rose-100">
                    {loginError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.username}</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.password}</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">
                  {t.login}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add Book Modal */}
        {showAddBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddBook(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6">{t.addBook}</h2>
              <form onSubmit={handleAddBook} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.bookId}</label>
                  <input 
                    type="text" 
                    value={newBook.numericalId}
                    onChange={(e) => setNewBook({...newBook, numericalId: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.specialCode}</label>
                  <input 
                    type="text" 
                    value={newBook.specialCode}
                    onChange={(e) => setNewBook({...newBook, specialCode: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.bookTitle}</label>
                  <input 
                    type="text" 
                    value={newBook.title}
                    onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.category}</label>
                  <input 
                    type="text" 
                    value={newBook.category}
                    onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.owner}</label>
                  <select 
                    value={newBook.owner}
                    onChange={(e) => setNewBook({...newBook, owner: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="School library">{lang === 'ar' ? 'المكتبة المدرسية' : 'School library'}</option>
                    <option value="A teacher">{lang === 'ar' ? 'أحد الأساتذة' : 'A teacher'}</option>
                  </select>
                </div>
                <div className="sm:col-span-2 flex gap-3 mt-4">
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                    {t.save}
                  </button>
                  <button type="button" onClick={() => setShowAddBook(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                    {t.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Borrow Modal */}
        {showBorrow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBorrow(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-2">{t.borrowBook}</h2>
              <p className="text-slate-500 mb-6">{books.find(b => b.id === showBorrow)?.title}</p>
              <form onSubmit={handleBorrow} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.studentName}</label>
                  <input 
                    type="text" 
                    value={newLoan.studentName}
                    onChange={(e) => setNewLoan({...newLoan, studentName: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.classLevel}</label>
                    <input 
                      type="text" 
                      value={newLoan.classSection}
                      onChange={(e) => setNewLoan({...newLoan, classSection: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.studentId}</label>
                    <input 
                      type="text" 
                      value={newLoan.studentNumber}
                      onChange={(e) => setNewLoan({...newLoan, studentNumber: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.targetReturnDate}</label>
                  <input 
                    type="date" 
                    value={newLoan.targetReturnDate}
                    onChange={(e) => setNewLoan({...newLoan, targetReturnDate: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                    {t.save}
                  </button>
                  <button type="button" onClick={() => setShowBorrow(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                    {t.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <h2 className="text-2xl font-bold mb-6">{t.settings}</h2>
              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.newUsername}</label>
                  <input 
                    type="text" 
                    value={credentials.username}
                    onChange={(e) => setCredentials({...credentials, username: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.newPassword}</label>
                  <input 
                    type="password" 
                    value={credentials.password}
                    onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button type="submit" disabled={isLoading} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {t.save}
                  </button>
                  <button type="button" onClick={() => setShowSettings(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
                    {t.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-bold mb-2">{t.confirmDelete}</h2>
              <p className="text-slate-500 mb-6">
                {t.confirmDeleteMessage}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleDeleteBook(showDeleteConfirm)}
                  disabled={isLoading}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-xl font-bold hover:bg-rose-700 transition-all disabled:opacity-50"
                >
                  {t.delete}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 font-bold",
              toast.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[110] bg-white/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin shadow-lg" />
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div>
            <p className="text-slate-900 font-bold text-lg">{t.developedBy}</p>
            <p className="text-emerald-600 font-semibold">{t.role}</p>
            <p className="text-slate-500 text-sm">{t.institution}</p>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Library size={32} />
            <div className="h-8 w-px bg-slate-200" />
            <p className="text-xs max-w-[200px] leading-relaxed">
              {isRtl ? "نظام متكامل لإدارة الموارد المكتبية وتسهيل عملية الإعارة للطلاب." : "Integrated system for managing library resources and facilitating student loans."}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
