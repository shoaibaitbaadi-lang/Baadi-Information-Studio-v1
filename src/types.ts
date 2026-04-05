export type BookStatus = 'Available' | 'Borrowed' | 'Lost';

export interface Book {
  id: string; // Book_UID (UUID)
  numericalId: string; // Numerical_ID
  specialCode: string; // Special_Code
  title: string;
  category: string;
  owner: string;
  status: BookStatus;
}

export interface Loan {
  id: string;
  studentName: string;
  classSection: string;
  studentNumber: string;
  bookTitle: string;
  bookNumericalId: string;
  bookSpecialCode: string;
  loanDate: string;
  targetReturnDate: string;
  returnedDate: string; // Empty if not returned
  linkedBook: string; // Book_UID
}

export type Language = 'ar' | 'en';

export interface Translations {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  available: string;
  borrowed: string;
  adminLogin: string;
  username: string;
  password: string;
  login: string;
  logout: string;
  addBook: string;
  borrowBook: string;
  returnBook: string;
  bookId: string;
  specialCode: string;
  bookTitle: string;
  category: string;
  owner: string;
  status: string;
  studentName: string;
  classLevel: string;
  studentId: string;
  loanDate: string;
  targetReturnDate: string;
  overdueAlerts: string;
  overdueAlertsNone: string;
  totalBooks: string;
  overdue: string;
  lost: string;
  actions: string;
  save: string;
  cancel: string;
  delete: string;
  settings: string;
  updateCredentials: string;
  newUsername: string;
  newPassword: string;
  confirmDelete: string;
  confirmDeleteMessage: string;
  developedBy: string;
  role: string;
  institution: string;
}
