import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────
// Komponen: Form tambah/edit informasi pangan
// ─────────────────────────────────────────────
function FormInformasi({ itemEdit, token, onSelesai }) {
    const [form, setForm] = useState({
        judul: '',
        konten: '',
        kategori: 'Umum',
        gambar_url: '',
    });
    const [memuat, setMemuat] = useState(false);
    const [pesan, setPesan] = useState(null);

    useEffect(() => {
        if (itemEdit) {
            setForm({
                judul: itemEdit.judul || '',
                konten: itemEdit.konten || '',
                kategori: itemEdit.kategori || 'Umum',
                gambar_url: itemEdit.gambar_url || '',
            });
        } else {
            setForm({ judul: '', konten: '', kategori: 'Umum', gambar_url: '' });
        }
        setPesan(null);
    }, [itemEdit]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMemuat(true);
        setPesan(null);

        try {
            const metode = itemEdit ? 'PUT' : 'POST';
            const url = itemEdit
                ? `${API_URL}/api/informasi-pangan/${itemEdit.id}`
                : `${API_URL}/api/informasi-pangan`;

            const respon = await fetch(url, {
                method: metode,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            });

            const json = await respon.json();
            if (json.sukses) {
                setPesan({ tipe: 'sukses', teks: json.pesan });
                if (!itemEdit) setForm({ judul: '', konten: '', kategori: 'Umum', gambar_url: '' });
                onSelesai();
            } else {
                setPesan({ tipe: 'error', teks: json.pesan });
            }
        } catch (err) {
            setPesan({ tipe: 'error', teks: 'Gagal menghubungi server.' });
        } finally {
            setMemuat(false);
        }
    };

    return (
        <form className="form-admin" onSubmit={handleSubmit}>
            <h3>{itemEdit ? '✏️ Edit Informasi' : '➕ Tambah Informasi Baru'}</h3>

            {pesan && (
                <div className={`pesan-form ${pesan.tipe}`}>
                    {pesan.teks}
                </div>
            )}

            <div className="form-grup">
                <label>Judul *</label>
                <input
                    type="text"
                    value={form.judul}
                    onChange={e => setForm({ ...form, judul: e.target.value })}
                    placeholder="Masukkan judul informasi"
                    required
                />
            </div>

            <div className="form-grup">
                <label>Kategori</label>
                <select
                    value={form.kategori}
                    onChange={e => setForm({ ...form, kategori: e.target.value })}
                >
                    <option value="Umum">Umum</option>
                    <option value="Berita">Berita</option>
                    <option value="Pengumuman">Pengumuman</option>
                    <option value="Tips Gizi">Tips Gizi</option>
                </select>
            </div>

            <div className="form-grup">
                <label>URL Gambar (opsional)</label>
                <input
                    type="text"
                    value={form.gambar_url}
                    onChange={e => setForm({ ...form, gambar_url: e.target.value })}
                    placeholder="https://contoh.com/gambar.jpg"
                />
            </div>

            <div className="form-grup">
                <label>Konten / Isi *</label>
                <textarea
                    value={form.konten}
                    onChange={e => setForm({ ...form, konten: e.target.value })}
                    placeholder="Tulis isi informasi di sini..."
                    rows={8}
                    required
                />
            </div>

            <div className="form-aksi">
                {itemEdit && (
                    <button type="button" className="btn-batal" onClick={onSelesai}>
                        Batal
                    </button>
                )}
                <button type="submit" className="btn-simpan" disabled={memuat}>
                    {memuat ? '⏳ Menyimpan...' : itemEdit ? '💾 Simpan Perubahan' : '📤 Publikasikan'}
                </button>
            </div>
        </form>
    );
}

// ─────────────────────────────────────────────
// KOMPONEN UTAMA: Panel Admin - Kelola Informasi Pangan
// ─────────────────────────────────────────────
export default function AdminInformasiPangan({ token }) {
    const [daftarInfo, setDaftarInfo] = useState([]);
    const [memuat, setMemuat] = useState(true);
    const [itemEdit, setItemEdit] = useState(null);
    const [sedangHapus, setSedangHapus] = useState(null);

    useEffect(() => {
        ambilData();
    }, []);

    const ambilData = async () => {
        try {
            setMemuat(true);
            const respon = await fetch(`${API_URL}/api/informasi-pangan`);
            const json = await respon.json();
            if (json.sukses) setDaftarInfo(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setMemuat(false);
        }
    };

    const hapusItem = async (id) => {
        if (!window.confirm('Yakin ingin menghapus informasi ini?')) return;
        setSedangHapus(id);
        try {
            const respon = await fetch(`${API_URL}/api/informasi-pangan/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const json = await respon.json();
            if (json.sukses) {
                setDaftarInfo(prev => prev.filter(i => i.id !== id));
            } else {
                alert('Gagal hapus: ' + json.pesan);
            }
        } catch (err) {
            alert('Terjadi kesalahan saat menghapus.');
        } finally {
            setSedangHapus(null);
        }
    };

    return (
        <div className="admin-panel-informasi">
            <h2>📋 Kelola Informasi Pangan</h2>

            {/* Form Tambah / Edit */}
            <FormInformasi
                itemEdit={itemEdit}
                token={token}
                onSelesai={() => { setItemEdit(null); ambilData(); }}
            />

            {/* Tabel Daftar Informasi */}
            <div className="tabel-wrapper">
                <h3>📂 Daftar Informasi Terpublikasi ({daftarInfo.length})</h3>
                {memuat ? (
                    <p>⏳ Memuat...</p>
                ) : daftarInfo.length === 0 ? (
                    <p>Belum ada data informasi pangan.</p>
                ) : (
                    <table className="tabel-admin">
                        <thead>
                            <tr>
                                <th>Judul</th>
                                <th>Kategori</th>
                                <th>Penulis</th>
                                <th>Tanggal</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daftarInfo.map(item => (
                                <tr key={item.id}>
                                    <td>{item.judul}</td>
                                    <td>
                                        <span className="badge-tabel">{item.kategori || 'Umum'}</span>
                                    </td>
                                    <td>{item.pengguna?.nama || '-'}</td>
                                    <td>
                                        {new Date(item.dibuat_pada).toLocaleDateString('id-ID')}
                                    </td>
                                    <td>
                                        <button
                                            className="btn-edit"
                                            onClick={() => setItemEdit(item)}
                                        >
                                            ✏️
                                        </button>
                                        <button
                                            className="btn-hapus"
                                            onClick={() => hapusItem(item.id)}
                                            disabled={sedangHapus === item.id}
                                        >
                                            {sedangHapus === item.id ? '...' : '🗑️'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
