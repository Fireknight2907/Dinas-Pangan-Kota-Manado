import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────
// Sub-komponen: Kartu berita tunggal
// ─────────────────────────────────────────────
function KartuInformasi({ item, onDetail }) {
    const tanggal = new Date(item.dibuat_pada).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const badgeWarna = {
        'Berita': '#2563eb',
        'Pengumuman': '#d97706',
        'Tips Gizi': '#16a34a',
        'Umum': '#6b7280',
    };

    return (
        <div className="kartu-informasi" onClick={() => onDetail(item)}>
            {item.gambar_url && (
                <img src={item.gambar_url} alt={item.judul} className="kartu-gambar" />
            )}
            <div className="kartu-isi">
                <span
                    className="kartu-badge"
                    style={{ background: badgeWarna[item.kategori] || '#6b7280' }}
                >
                    {item.kategori || 'Umum'}
                </span>
                <h3 className="kartu-judul">{item.judul}</h3>
                <p className="kartu-preview">
                    {item.konten.length > 120 ? item.konten.substring(0, 120) + '...' : item.konten}
                </p>
                <div className="kartu-meta">
                    <span>📅 {tanggal}</span>
                    {item.pengguna && <span>✍️ {item.pengguna.nama}</span>}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Sub-komponen: Modal detail informasi
// ─────────────────────────────────────────────
function ModalDetail({ item, onTutup }) {
    if (!item) return null;

    const tanggal = new Date(item.dibuat_pada).toLocaleDateString('id-ID', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    return (
        <div className="modal-overlay" onClick={onTutup}>
            <div className="modal-kotak" onClick={e => e.stopPropagation()}>
                <button className="modal-tutup" onClick={onTutup}>✕</button>
                {item.gambar_url && (
                    <img src={item.gambar_url} alt={item.judul} className="modal-gambar" />
                )}
                <div className="modal-isi">
                    <span className="kartu-badge" style={{ marginBottom: '8px', display: 'inline-block' }}>
                        {item.kategori || 'Umum'}
                    </span>
                    <h2>{item.judul}</h2>
                    <p className="modal-meta">
                        📅 {tanggal}
                        {item.pengguna && <span> · ✍️ {item.pengguna.nama}</span>}
                    </p>
                    <hr />
                    <div className="modal-konten">
                        {item.konten.split('\n').map((baris, i) => (
                            <p key={i}>{baris}</p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// KOMPONEN UTAMA: Halaman Informasi Pangan (Publik)
// ─────────────────────────────────────────────
export default function InformasiPangan() {
    const [daftarInfo, setDaftarInfo] = useState([]);
    const [memuat, setMemuat] = useState(true);
    const [error, setError] = useState(null);
    const [itemDipilih, setItemDipilih] = useState(null);
    const [filterKategori, setFilterKategori] = useState('Semua');
    const [kataPencarian, setKataPencarian] = useState('');

    const kategoriList = ['Semua', 'Berita', 'Pengumuman', 'Tips Gizi', 'Umum'];

    useEffect(() => {
        ambilData();
    }, []);

    const ambilData = async () => {
        try {
            setMemuat(true);
            const respon = await fetch(`${API_URL}/api/informasi-pangan`);
            const json = await respon.json();
            if (json.sukses) {
                setDaftarInfo(json.data);
            } else {
                setError(json.pesan);
            }
        } catch (err) {
            setError('Gagal memuat data. Pastikan server backend berjalan.');
        } finally {
            setMemuat(false);
        }
    };

    const dataDisaring = daftarInfo.filter(item => {
        const cocokkategori = filterKategori === 'Semua' || item.kategori === filterKategori;
        const cocokPencarian = item.judul.toLowerCase().includes(kataPencarian.toLowerCase())
            || item.konten.toLowerCase().includes(kataPencarian.toLowerCase());
        return cocokkategori && cocokPencarian;
    });

    return (
        <div className="halaman-informasi">
            <div className="info-header">
                <h1>📰 Informasi Pangan</h1>
                <p>Berita, pengumuman, dan informasi terkini seputar pangan Kota Manado</p>
            </div>

            {/* Filter & Pencarian */}
            <div className="info-kontrol">
                <input
                    type="text"
                    placeholder="🔍 Cari informasi..."
                    value={kataPencarian}
                    onChange={e => setKataPencarian(e.target.value)}
                    className="input-pencarian"
                />
                <div className="filter-kategori">
                    {kategoriList.map(kat => (
                        <button
                            key={kat}
                            className={`btn-filter ${filterKategori === kat ? 'aktif' : ''}`}
                            onClick={() => setFilterKategori(kat)}
                        >
                            {kat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Konten */}
            {memuat && <div className="status-pesan">⏳ Memuat data...</div>}
            {error && <div className="status-pesan error">⚠️ {error}</div>}
            {!memuat && !error && dataDisaring.length === 0 && (
                <div className="status-pesan">📭 Belum ada informasi pangan.</div>
            )}

            <div className="grid-informasi">
                {dataDisaring.map(item => (
                    <KartuInformasi key={item.id} item={item} onDetail={setItemDipilih} />
                ))}
            </div>

            {/* Modal Detail */}
            <ModalDetail item={itemDipilih} onTutup={() => setItemDipilih(null)} />
        </div>
    );
}
