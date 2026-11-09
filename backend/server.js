const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // Pustaka enkripsi password

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

// [DELETE] Menghapus buku dari Database MySQL berdasarkan ID
app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    const query = 'DELETE FROM books WHERE id = ?';
    db.query(query, [bookId], (err, result) => {
        if (err) {
            console.error('Error saat menghapus buku:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus buku dari database' });
        }
        res.json({ success: true, message: 'Buku berhasil dihapus dari database MySQL!' });
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
// 4. ROUTE / ENDPOINT API UNTUK PENGGUNA (AUTH BCRYPT)
// ==========================================

// 1. Registrasi Akun Baru (Password Di-hash)
app.post('/api/register', async (req, res) => {
    const { nama, email, password } = req.body;

    // Cek apakah email sudah terdaftar
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
        }

        try {
            // Enkripsi password menggunakan bcrypt salt rounds 10
            const hashedPassword = await bcrypt.hash(password, 10);

            // Simpan pengguna baru dengan password ter-hash
            const query = 'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, "user")';
            db.query(query, [nama, email, hashedPassword], (err, result) => {
                if (err) {
                    res.status(500).json({ success: false, message: 'Gagal mendaftar', error: err.message });
                } else {
                    res.json({ success: true, message: 'Registrasi berhasil!' });
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Gagal melakukan enkripsi password' });
        }
    });
});

// 2. Login Akun (Verifikasi Password Ter-hash secara Asinkron)
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email dan password wajib diisi!' });
    }

    const query = 'SELECT id, nama, email, password, role FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database Error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(401).json({ success: false, message: 'Email atau password salah!' });
        }

        const user = results[0];

        // Gunakan callback bcrypt.compare agar koneksi tidak menggantung
        bcrypt.compare(password, user.password, (bcryptErr, isMatch) => {
            if (bcryptErr) {
                console.error('Bcrypt Error:', bcryptErr);
                return res.status(500).json({ success: false, message: 'Gagal memverifikasi kata sandi' });
            }

            if (isMatch) {
                return res.json({
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
                return res.status(401).json({ success: false, message: 'Email atau password salah!' });
            }
        });
    });
});
// ==========================================
// 5. MENJALANKAN SERVER
// ==========================================
app.listen(PORT, () => {
    console.log("==================================================");
    console.log(`LITERA Backend API Server Running on port ${PORT}`);
    console.log(`Endpoint Books    : http://localhost:${PORT}/api/books`);
    console.log(`Endpoint Checkout : http://localhost:${PORT}/api/checkout`);
    console.log(`Endpoint Auth     : http://localhost:${PORT}/api/login & /api/register`);
    console.log("==================================================");
});