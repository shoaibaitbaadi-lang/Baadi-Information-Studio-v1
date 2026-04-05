import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, "db.json");

// Define types locally for server-side use
type BookStatus = 'Available' | 'Borrowed' | 'Lost';

interface Book {
  id: string;
  numericalId: string;
  specialCode: string;
  title: string;
  category: string;
  owner: string;
  status: BookStatus;
}

interface Loan {
  id: string;
  studentName: string;
  classSection: string;
  studentNumber: string;
  bookTitle: string;
  bookNumericalId: string;
  bookSpecialCode: string;
  loanDate: string;
  targetReturnDate: string;
  returnedDate: string;
  linkedBook: string;
}

interface DB {
  books: Book[];
  loans: Loan[];
  admin: {
    username: string;
    password: string;
  };
}

async function getDB(): Promise<DB> {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    const db = JSON.parse(data);
    if (!db.admin) {
      db.admin = { username: "admin", password: "admin" };
      await saveDB(db);
    }
    return db;
  } catch (error) {
    const initialDB: DB = {
      books: [
        { id: "B001", numericalId: "101", specialCode: "PH-01", title: "Introduction to Philosophy", category: "Philosophy", status: "Available", owner: "School library" },
        { id: "B002", numericalId: "102", specialCode: "SC-01", title: "Modern Physics", category: "Science", status: "Available", owner: "School library" },
      ],
      loans: [],
      admin: {
        username: "admin",
        password: "admin"
      }
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initialDB, null, 2));
    return initialDB;
  }
}

async function saveDB(db: DB) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/admin", async (req, res) => {
    const db = await getDB();
    res.json({ username: db.admin.username });
  });

  app.post("/api/admin/login", async (req, res) => {
    const db = await getDB();
    const { username, password } = req.body;
    if (username === db.admin.username && password === db.admin.password) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/admin/update", async (req, res) => {
    try {
      const db = await getDB();
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }
      db.admin.username = username;
      db.admin.password = password;
      await saveDB(db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update credentials" });
    }
  });

  app.get("/api/books", async (req, res) => {
    const db = await getDB();
    res.json(db.books);
  });

  app.post("/api/books", async (req, res) => {
    const db = await getDB();
    const newBook = req.body;
    if (db.books.some(b => b.id === newBook.id)) {
      return res.status(400).json({ error: "Duplicate Book ID" });
    }
    db.books.push(newBook);
    await saveDB(db);
    res.json(newBook);
  });

  app.delete("/api/books/:id", async (req, res) => {
    const db = await getDB();
    const { id } = req.params;
    db.books = db.books.filter(b => b.id !== id);
    // Also cleanup loans if needed, but usually we keep history
    await saveDB(db);
    res.json({ success: true });
  });

  app.get("/api/loans", async (req, res) => {
    const db = await getDB();
    res.json(db.loans);
  });

  app.post("/api/borrow", async (req, res) => {
    try {
      const db = await getDB();
      const { loan, bookId } = req.body;
      
      const bookIndex = db.books.findIndex(b => b.id === bookId);
      if (bookIndex === -1) {
        return res.status(404).json({ error: "Book not found" });
      }
      
      if (db.books[bookIndex].status !== "Available") {
        return res.status(400).json({ error: "Book is not available for borrowing" });
      }

      db.books[bookIndex].status = "Borrowed";
      db.loans.push(loan);
      await saveDB(db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to process loan" });
    }
  });

  app.post("/api/return", async (req, res) => {
    try {
      const db = await getDB();
      const { bookId } = req.body;

      const bookIndex = db.books.findIndex(b => b.id === bookId);
      if (bookIndex === -1) {
        return res.status(404).json({ error: "Book not found" });
      }

      db.books[bookIndex].status = "Available";
      
      // Find the active loan for this book
      const loanIndex = db.loans.findIndex(l => l.linkedBook === bookId && !l.returnedDate);
      if (loanIndex !== -1) {
        db.loans[loanIndex].returnedDate = new Date().toISOString();
      }

      await saveDB(db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to process return" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
