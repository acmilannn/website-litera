document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    fetchLandingCatalog();
});

// 1. Cek Apakah User Sudah Login
function checkUserSession() {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    const authContainer = document.getElementById('auth-buttons');

    if (token) {
        // Jika User Sudah Login, Ubah Navbar Landing Page Secara Dinamis
        authContainer.innerHTML = `
            <a href="${userRole === 'admin' ? '/dashboardadmin.html' : '/cart.html'}" class="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary">
                ${userRole === 'admin' ? 'Dashboard Admin' : '🛒 Keranjang'}
            </a>
            <button onclick="logout()" class="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                Keluar
            </button>
        `;
    }
}

// 2. Load Katalog dari Database Backend (API /api/books)
async function fetchLandingCatalog() {
    const grid = document.getElementById('landing-catalog-grid');

    try {
        const response = await fetch('/api/books');
        
        if (!response.ok) {
            throw new Error('Gagal mengambil data dari server');
        }

        const books = await response.json();
        grid.innerHTML = ''; // Clear loading

        if (!books || books.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-8">Belum ada buku yang tersedia.</div>`;
            return;
        }

        // Tampilkan 8 buku terbaru saja untuk Landing Page Guest
        const featuredBooks = books.slice(0, 8);

        featuredBooks.forEach(book => {
            const formattedPrice = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                maximumFractionDigits: 0
            }).format(book.price || 0);

            const card = document.createElement('div');
            card.className = "bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition flex flex-col justify-between";
            card.innerHTML = `
                <div>
                    <div class="h-48 bg-gray-100 relative overflow-hidden">
                        <img src="${book.cover_image || '/images/default-book.jpg'}" alt="${book.title}" class="w-full h-full object-cover">
                        <span class="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded text-gray-700">
                            ${book.category || 'Kuliah'}
                        </span>
                    </div>
                    <div class="p-4">
                        <h3 class="font-bold text-gray-800 text-sm md:text-base line-clamp-1 mb-1" title="${book.title}">${book.title}</h3>
                        <p class="text-xs text-gray-500 mb-2">${book.author || 'Penulis Tidak Diketahui'}</p>
                        <p class="text-base font-extrabold text-primary mb-3">${formattedPrice}</p>
                    </div>
                </div>
                <div class="p-4 pt-0 grid grid-cols-2 gap-2">
                    <button onclick="requireLogin('add-to-cart')" class="w-full py-2 bg-blue-50 text-primary text-xs font-semibold rounded-lg hover:bg-blue-100 transition">
                        + Keranjang
                    </button>
                    <button onclick="requireLogin('buy-now')" class="w-full py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition">
                        Beli
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error katalog landing page:', error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-8">Gagal memuat katalog buku. Pastikan server API berjalan.</div>`;
    }
}

// 3. Kontrol Modal Autentikasi Guest
function requireLogin(actionType) {
    const token = localStorage.getItem('token');
    
    // Jika user sudah login, langsung izinkan transaksi / navigasi
    if (token) {
        window.location.href = '/catalog.html';
        return;
    }

    // Jika Guest, tampilkan Pop-Up Modal Login
    const modal = document.getElementById('login-modal');
    const msg = document.getElementById('modal-message');

    if (actionType === 'titip-buku') {
        msg.textContent = "Silakan masuk ke akun Anda terlebih dahulu untuk mendaftarkan dan menjual buku bekas Anda.";
    } else {
        msg.textContent = "Anda perlu masuk ke akun LITERA untuk menambahkan buku ke keranjang atau melakukan pembelian.";
    }

    modal.classList.remove('hidden');
}

function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
}

function logout() {
    localStorage.clear();
    window.location.reload();
}