const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const midtransClient = require('midtrans-client');

const app = express();
const PORT = 3000;

// Middleware (Limit 25mb untuk foto Base64 buku & logo)
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// ==========================================
// KONFIGURASI MIDTRANS SANDBOX
// ==========================================
const snap = new midtransClient.Snap({
    isProduction: false,
    // Pastikan Server Key & Client Key diambil langsung dari Midtrans Sandbox > Settings > Access Keys
    serverKey: 'SB-Mid-server-GIJP43zbjB80mcujA7FDk10E',
    clientKey: 'Mid-client-ynHTTuKeGHRedSFJ'
});

// ==========================================
// 1. KONFIGURASI KONEKSI DATABASE MYSQL (POOL MODE - ANTI ECONNRESET)
// ==========================================
const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'litera_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Gagal terhubung ke MySQL:', err);
    } else {
        console.log('Berhasil terhubung ke Database MySQL Litera (Pool Mode)!');
        connection.release();
        seedInitialBooks();
        initWebSettingsTable();
    }
});

// Seeding Otomatis: Isi 9 buku bawaan ke tabel books jika tabel masih kosong
function seedInitialBooks() {
    db.query('SELECT COUNT(*) AS count FROM books', (err, results) => {
        if (!err && results[0].count === 0) {
            const initialBooks = [
                ["Risalah Kebangkitan - Penalaran terhadap Realitas Akhirat", "Badiuzzaman Said Nursi", "Agama", "Grade B+ (Layak Baca)", 50000, 4.8, "../foto/risalah kebangkitan.jpeg", "Judul: Risalah Kebangkitan – Penalaran terhadap Realitas Akhirat\nPenulis: Badiuzzaman Said Nursi (Risalah Nur Press)\nKondisi Fisik: Grade B+ (Layak Baca / Pre-loved Good Condition)\nDetail: Sudut cover kanan atas & bawah sedikit berlekuk/aus pemakaian wajar.", 1, "READY"],
                ["Namaku Alam", "Leila S. Chudori", "Fiksi", "Grade A (Mulus)", 65000, 4.9, "../foto/namaku alam.jpeg", "Judul: Namaku Alam\nPenulis: Leila S. Chudori (Penerbit KPG)\nKondisi Fisik: Grade A (Pre-loved Like New / Mulus Original)", 1, "READY"],
                ["Animal Farm (Republik Hewan)", "George Orwell", "Fiksi", "Grade A (Mulus)", 45000, 4.7, "../foto/animal farm.jpeg", "Judul: Animal Farm (Republik Hewan)\nPenulis: George Orwell (Gramedia Pustaka Utama)\nKondisi Fisik: Grade A (Mulus Original)", 1, "READY"],
                ["Angel & Demon", "Helena Abidin, Suhartono C., Timoteus T.", "Bisnis", "Grade A (Mulus)", 50000, 4.6, "../foto/angel & demon.jpeg", "Judul: Angel & Demon\nPenulis: Helena Abidin, Suhartono Chandra, Timoteus Talip (Grasindo)\nCatatan: National Bestseller.", 1, "READY"],
                ["Filsafat Sains - Dari Newton, Einstein hingga Sains-Data", "Dimitri Mahayana", "Filsafat", "Grade B (Layak)", 50000, 4.5, "../foto/filsafat sains.jpeg", "Judul: Filsafat Sains – Dari Newton, Einstein hingga Sains-Data\nPenulis: Dimitri Mahayana\nKondisi Fisik: Grade B", 1, "READY"],
                ["Filosofi Teras - Filsafat Yunani-Romawi Kuno", "Henry Manampiring", "Filsafat", "Grade A (Mulus)", 55000, 5.0, "../foto/filosofi teras.jpeg", "Judul: Filosofi Teras\nPenulis: Henry Manampiring\nCatatan: National Best Seller Stoisisme Modern.", 1, "READY"],
                ["Tentang Kamu", "Tere Liye", "Fiksi", "Grade B+ (Layak)", 50000, 4.8, "../foto/tentang kamu.jpeg", "Judul: Tentang Kamu\nPenulis: Tere Liye\nKondisi Fisik: Grade B+ (Preloved Bagus).", 1, "READY"],
                ["Pulang", "Leila S. Chudori", "Fiksi", "Grade A (Mulus)", 60000, 4.9, "../foto/pulang.jpeg", "Judul: Pulang\nPenulis: Leila S. Chudori (Penerbit KPG)\nKondisi Fisik: Grade A (Mulus Original).", 1, "READY"],
                ["Hujan", "Tere Liye", "Fiksi", "Grade A (Mulus)", 50000, 4.9, "../foto/hujan.jpeg", "Judul: Hujan\nPenulis: Tere Liye (Gramedia Pustaka Utama)\nKondisi Fisik: Grade A (Mulus Original).", 1, "READY"]
            ];

            const sql = 'INSERT INTO books (title, author, category, grade, price, rating, img, description, stock, status) VALUES ?';
            db.query(sql, [initialBooks], (errInsert) => {
                if (errInsert) console.error('Gagal seeding buku awal:', errInsert);
                else console.log('9 Buku katalog awal berhasil disinkronkan ke MySQL!');
            });
        }
    });
}

// Inisialisasi Otomatis Tabel web_settings
function initWebSettingsTable() {
    db.query(`
        CREATE TABLE IF NOT EXISTS web_settings (
            id INT PRIMARY KEY DEFAULT 1,
            nama_organisasi VARCHAR(255) DEFAULT 'LITERA',
            tagline VARCHAR(255) DEFAULT 'Digital Library & Hub',
            copyright_text VARCHAR(255) DEFAULT '© 2026 LITERA. All Rights Reserved.',
            no_telp VARCHAR(50),
            email VARCHAR(100),
            alamat TEXT,
            logo LONGTEXT,
            favicon LONGTEXT,
            link_facebook VARCHAR(255) DEFAULT 'https://facebook.com',
            link_instagram VARCHAR(255) DEFAULT 'https://instagram.com',
            link_tiktok VARCHAR(255) DEFAULT 'https://tiktok.com',
            link_youtube VARCHAR(255) DEFAULT 'https://youtube.com',
            link_linkedin VARCHAR(255),
            link_maps VARCHAR(255),
            smtp_host VARCHAR(100),
            smtp_port INT,
            smtp_user VARCHAR(100),
            smtp_password VARCHAR(255),
            smtp_from_email VARCHAR(150)
        )
    `, () => {
        db.query(`INSERT IGNORE INTO web_settings (id, nama_organisasi, tagline, copyright_text) VALUES (1, 'LITERA', 'Digital Library & Hub', '© 2026 LITERA. All Rights Reserved.')`);
    });
}

// ==========================================
// 2. ROUTE / ENDPOINT API UNTUK BUKU (CRUD)
// ==========================================
app.get('/api/books', (req, res) => {
    db.query('SELECT * FROM books ORDER BY id DESC', (err, results) => {
        if (err) {
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true, books: results, data: results });
        }
    });
});

app.post('/api/books', (req, res) => {
    const { title, author, category, grade, price, rating, img, desc, description } = req.body;
    const bookDesc = description || desc || '';

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
        bookDesc
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error MySQL Query:', err);
            return res.status(500).json({ success: false, message: 'Gagal menambah buku: ' + err.message });
        }
        res.json({ success: true, message: 'Buku berhasil ditambahkan!', id: result.insertId });
    });
});

app.put('/api/books/:id', (req, res) => {
    const bookId = req.params.id;
    const { title, author, category, grade, price, rating, img, desc, description } = req.body;
    const bookDesc = description || desc || '';

    const query = `
        UPDATE books 
        SET title = ?, author = ?, category = ?, grade = ?, price = ?, rating = ?, img = ?, description = ?
        WHERE id = ?
    `;

    const values = [
        title,
        author,
        category,
        grade,
        Number(price) || 0,
        parseFloat(rating) || 4.8,
        img,
        bookDesc,
        bookId
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Error saat mengupdate buku:', err);
            return res.status(500).json({ success: false, message: 'Gagal memperbarui buku: ' + err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Buku tidak ditemukan di database' });
        }
        res.json({ success: true, message: 'Buku berhasil diperbarui di database MySQL!' });
    });
});

app.delete('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    const query = 'DELETE FROM books WHERE id = ?';
    db.query(query, [bookId], (err) => {
        if (err) {
            console.error('Error saat menghapus buku:', err);
            return res.status(500).json({ success: false, message: 'Gagal menghapus buku dari database' });
        }
        res.json({ success: true, message: 'Buku berhasil dihapus dari database MySQL!' });
    });
});

// ==========================================
// 3. ROUTE / ENDPOINT API UNTUK CHECKOUT & MIDTRANS
// ==========================================
app.post('/api/midtrans-token', async (req, res) => {
    try {
        const orderId = req.body.orderId || req.body.order_id || `LITERA-${Date.now()}`;
        const rawAmount = req.body.totalAmount || req.body.gross_amount || req.body.total_price;
        const grossAmount = Math.round(Number(rawAmount));
        const customerName = req.body.customerName || req.body.customer_name || 'Pembeli Litera';
        const customerPhone = req.body.customerPhone || req.body.customer_phone || '08123456789';
        const customerEmail = req.body.customerEmail || req.body.customer_email || 'pembeli@litera.com';

        if (!grossAmount || isNaN(grossAmount) || grossAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Nominal tagihan tidak valid.'
            });
        }

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: grossAmount
            },
            customer_details: {
                first_name: customerName,
                phone: customerPhone,
                email: customerEmail
            }
        };

        const transaction = await snap.createTransaction(parameter);
        res.json({
            success: true,
            token: transaction.token,
            redirect_url: transaction.redirect_url
        });
    } catch (error) {
        console.error('Midtrans Error Detail:', error.ApiResponse || error.message);
        res.status(500).json({
            success: false,
            message: 'Gagal membuat transaksi Midtrans: ' + error.message
        });
    }
});

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
app.post('/api/register', async (req, res) => {
    const { nama, email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (results.length > 0) {
            return res.status(400).json({ success: false, message: 'Email sudah terdaftar!' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const query = 'INSERT INTO users (nama, email, password, role) VALUES (?, ?, ?, "user")';
            db.query(query, [nama, email, hashedPassword], (err) => {
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
// 5. ROUTE / ENDPOINT API PENGATURAN WEBSITE & FOOTER
// ==========================================
app.get('/api/settings', (req, res) => {
    db.query('SELECT * FROM web_settings WHERE id = 1', (err, results) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, settings: results[0] || {} });
    });
});

app.post('/api/settings', (req, res) => {
    const {
        nama_organisasi, tagline, copyright_text, no_telp, email, alamat,
        logo, favicon, link_facebook, link_instagram, link_tiktok, link_youtube,
        link_linkedin, link_maps, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_email
    } = req.body;

    const sql = `
        UPDATE web_settings SET 
            nama_organisasi = ?, tagline = ?, copyright_text = ?, no_telp = ?, email = ?, alamat = ?,
            logo = COALESCE(NULLIF(?, ''), logo),
            favicon = COALESCE(NULLIF(?, ''), favicon),
            link_facebook = ?, link_instagram = ?, link_tiktok = ?, link_youtube = ?,
            link_linkedin = ?, link_maps = ?, smtp_host = ?, smtp_port = ?, smtp_user = ?,
            smtp_password = COALESCE(NULLIF(?, ''), smtp_password),
            smtp_from_email = ?
        WHERE id = 1
    `;

    const values = [
        nama_organisasi, tagline || 'Digital Library & Hub', copyright_text || '© 2026 LITERA. All Rights Reserved.',
        no_telp, email, alamat, logo || '', favicon || '',
        link_facebook, link_instagram, link_tiktok, link_youtube,
        link_linkedin, link_maps, smtp_host, smtp_port || 587, smtp_user,
        smtp_password || '', smtp_from_email
    ];

    db.query(sql, values, (err) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, message: 'Pengaturan Footer & Website berhasil disimpan ke MySQL!' });
    });
});

// ==========================================
// 6. MENJALANKAN SERVER (IPv4 & IPv6 READY)
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log("==================================================");
    console.log(`LITERA Backend API Server Running on port ${PORT}`);
    console.log(`Endpoint Books    : http://127.0.0.1:${PORT}/api/books`);
    console.log(`Endpoint Settings : http://127.0.0.1:${PORT}/api/settings`);
    console.log(`Endpoint Checkout : http://127.0.0.1:${PORT}/api/checkout`);
    console.log(`Endpoint Midtrans : http://127.0.0.1:${PORT}/api/midtrans-token`);
    console.log(`Endpoint Auth     : http://127.0.0.1:${PORT}/api/login & /api/register`);
    console.log("==================================================");
});