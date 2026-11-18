const klienBasisData = require('./config/database');
const bcrypt = require('bcrypt'); // Kita perlu bcrypt untuk hash password

async function inisialisasiAdmin() {
    console.log("Mengecek ketersediaan Admin...");
    try {
        const { data: adminAda, error: errCek } = await klienBasisData
            .from('pengguna')
            .select('*')
            .or('username.eq.admin,peran.eq.Superadmin,peran.eq.Admin')
            .limit(1);

        if (errCek && errCek.code !== '42P01') { // 42P01 is table does not exist
            console.error("Gagal mengecek:", errCek);
            return;
        }

        if (!adminAda || adminAda.length === 0) {
            console.log("Admin belum ada, membuat akun Admin default...");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin', salt);

            const { error: errInsert } = await klienBasisData
                .from('pengguna')
                .insert([{
                    nama: 'Administrator',
                    username: 'admin',
                    email: 'admin@manado.go.id',
                    kata_sandi: hashedPassword,
                    peran: 'Superadmin',
                    bidang: 'Administrator Sistem'
                }]);
            
            if (errInsert) {
                console.error("Gagal membuat admin:", errInsert);
            } else {
                console.log("Admin berhasil dibuat! Username: admin | Pass: admin");
            }
        } else {
            console.log("Admin sudah ada di database.");
        }
    } catch (e) {
        console.error("Terjadi kesalahan (mungkin tabel belum dibuat di Supabase SQL Editor?):", e.message);
    }
}

inisialisasiAdmin();
