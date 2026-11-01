const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware (Limit 10mb untuk foto Base64)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// 1. KONFIGURASI KONEKSI DATABASE MYSQL (XAMPP)
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'litera_db'
});

db.connect((err) => {
    if (err) {
        console.error('Gagal terhubung ke MySQL:', err);
    } else {
        console.log('Berhasil terhubung ke Database MySQL Litera!');
    }
});

// ==========================================
// 2. ROUTE / ENDPOINT API UNTUK BUKU
// ==========================================

// [GET] Mengambil semua data buku dari database
app.get('/api/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, books: results, data: results });
        }
    });
});

// [POST] Menambah buku baru ke database (Admin Upload Foto & Detail)
app.post('/api/books', (req, res) => {
    const { title, author, category, grade, price, rating, img, desc } = req.body;

    // Perhatikan: 9 Nama Kolom = 9 Parameter (7 buah '?' + 1 + 'READY')
    const query = `
        INSERT INTO books (title, author, category, grade, price, rating, img, description, stock, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'READY')
    `;

    const values = [
        title,
        author,
        category,
        grade,
        Number(price) || 0,
        parseFloat(rating) || 4.8,
        img,
        desc
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error MySQL Query:', err);
            return res.status(500).json({ success: false, message: 'Gagal menambah buku: ' + err.message });
        }
        res.json({ success: true, message: 'Buku berhasil ditambahkan!', id: result.insertId });
    });
});



// ==========================================
// 3. ROUTE / ENDPOINT API UNTUK CHECKOUT
// ==========================================

// [POST] Memproses transaksi checkout & menyimpan ke tabel orders
app.post('/api/checkout', (req, res) => {
    const { customer_name, customer_phone, region, address, courier, payment_method, total_price, items } = req.body;

    const query = `INSERT INTO orders (customer_name, customer_phone, region, address, courier, payment_method, total_price, items) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(query, [customer_name, customer_phone, region, address, courier, payment_method, total_price, items || ''], (err, result) => {
        if (err) {
            console.error("Gagal menyimpan pesanan:", err);
            res.status(500).json({ success: false, message: 'Gagal menyimpan transaksi ke database' });
        } else {
            res.json({ 
                success: true, 
                message: 'Pesanan berhasil disimpan ke database MySQL!', 
                order_id: result.insertId 
            });
        }
    });
});

// ==========================================
// ROUTE / ENDPOINT API UNTUK PENGGUNA (AUTH)
// ==========================================

// 1. Registrasi Akun Baru
app.post('/api/register', (req, res) => {
    const { nama, email, password } = req.body;

    // Cek apakah email sudah terdaftar
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
        }

        // Simpan pengguna baru ke database (default role 'user')
        const query = 'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, "user")';
        db.query(query, [nama, email, password], (err, result) => {
            if (err) {
                res.status(500).json({ success: false, message: 'Gagal mendaftar', error: err.message });
            } else {
                res.json({ success: true, message: 'Registrasi berhasil!' });
            }
        });
    });
});

// 2. Login Akun (Sesuai Role User/Admin)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT id, nama, email, role FROM users WHERE email = ? AND password = ?';
    db.query(query, [email, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        
        if (results.length > 0) {
            const user = results[0];
            res.json({
                success: true,
                message: 'Login berhasil!',
                user: {
                    id: user.id,
                    nama: user.nama,
                    email: user.email,
                    role: user.role || 'user'
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Email atau password salah!' });
        }
    });
});

// ==========================================
// 4. MENJALANKAN SERVER
// ==========================================
app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`LITERA Backend API Server Running on port ${PORT}`);
    console.log(`Endpoint Books    : http://localhost:${PORT}/api/books`);
    console.log(`Endpoint Checkout : http://localhost:${PORT}/api/checkout`);
    console.log(`Endpoint Auth     : http://localhost:${PORT}/api/login & /api/register`);
    console.log("==================================================");
});