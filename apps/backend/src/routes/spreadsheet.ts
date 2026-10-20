import { Hono } from 'hono';
import { getTransaksiByBulan, getSummary } from '../lib/db';
import type { Bindings } from '../index';

export const spreadsheetRoutes = new Hono<{ Bindings: Bindings }>();

spreadsheetRoutes.get('/', async (c) => {
  const bulan = c.req.query('bulan') ?? new Date().toISOString().slice(0, 7);
  const userId = c.req.query('userId') ?? '';

  if (!userId || userId === 'guest') {
    return c.html(`
      <div style="font-family: sans-serif; padding: 20px; color: #f87171; text-align: center;">
        <h3>Akses Ditolak</h3>
        <p>User tidak valid. Silakan login kembali.</p>
      </div>
    `);
  }

  const db = c.env.black_shore_db;

  const [transaksi, summary] = await Promise.all([
    getTransaksiByBulan(db, bulan, userId),
    getSummary(db, bulan, userId),
  ]);

  const formatRupiah = (n: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);

  const formatTanggal = (iso: string) =>
    new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const [year, month] = bulan.split('-');
  const bulanLabel = new Date(Number(year), Number(month) - 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  // Tambahkan data-label agar CSS mobile bisa membaca nama kolom
  const rows = transaksi
    .map(
      (t, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td data-label="Tanggal" class="date">${formatTanggal(t.tanggal)}</td>
        <td data-label="Deskripsi" class="desc">${escapeHtml(t.deskripsi)}</td>
        <td data-label="Kategori" class="category"><span class="badge">${escapeHtml(t.kategori ?? '-')}</span></td>
        <td data-label="Jumlah" class="amount ${t.tipe === 'masuk' ? 'in' : 'out'}">
          ${t.tipe === 'masuk' ? '+' : '-'} ${formatRupiah(t.jumlah)}
        </td>
      </tr>`
    )
    .join('');

  const emptyRow = `
    <tr>
      <td colspan="5" class="empty">Tidak ada transaksi di bulan ini. Bersih! ✨</td>
    </tr>`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Keuangan ${bulanLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #020617; /* slate-950 */
      color: #f8fafc; /* slate-50 */
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #020617; }
    ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #475569; }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #1e293b; /* slate-800 */
    }
    .header h2 {
      font-size: 16px;
      font-weight: 700;
      color: #22d3ee; /* cyan-400 */
      letter-spacing: -0.02em;
    }
    .header .count {
      font-size: 11px;
      color: #94a3b8; /* slate-400 */
      background: #0f172a; /* slate-900 */
      padding: 4px 8px;
      border-radius: 12px;
      border: 1px solid #1e293b;
    }

    /* Summary Grid */
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
      margin-bottom: 20px;
    }
    .card {
      background: #0f172a; /* slate-900 */
      border-radius: 10px;
      padding: 12px;
      border: 1px solid #1e293b;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .card .label {
      font-size: 10px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .card .value {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    .card.in .value { color: #34d399; /* emerald-400 */ }
    .card.out .value { color: #fb7185; /* rose-400 */ }
    .card.balance .value { color: #22d3ee; /* cyan-400 */ }

    /* Desktop Table */
    .table-container {
      background: #0f172a;
      border-radius: 10px;
      border: 1px solid #1e293b;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
      padding: 12px 14px;
      background: #0b1120;
      border-bottom: 1px solid #1e293b;
      font-weight: 600;
    }
    td {
      padding: 12px 14px;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
      color: #e2e8f0;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #1e293b; }
    
    td.num { color: #64748b; width: 40px; font-variant-numeric: tabular-nums; }
    td.date { color: #cbd5e1; white-space: nowrap; }
    td.desc { font-weight: 500; }
    
    .badge {
      background: #1e293b;
      color: #94a3b8;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      text-transform: capitalize;
    }

    td.amount {
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    td.amount.in { color: #34d399; }
    td.amount.out { color: #fb7185; }
    td.empty {
      text-align: center;
      color: #64748b;
      padding: 32px;
    }

    /* Mobile Responsive Card Layout */
    @media (max-width: 600px) {
      .table-container { background: transparent; border: none; }
      table, thead, tbody, th, td, tr { display: block; }
      thead { display: none; } /* Sembunyikan header tabel di mobile */
      
      tr {
        background: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 10px;
        margin-bottom: 12px;
        padding: 12px;
      }
      tr:hover td { background: transparent; }
      
      td {
        border-bottom: none;
        padding: 6px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      td.num { display: none; } /* Sembunyikan nomor urut */
      
      /* Render nama kolom menggunakan data-label */
      td::before {
        content: attr(data-label);
        font-size: 10px;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.05em;
        margin-right: 16px;
      }
      
      td.desc { font-size: 14px; text-align: right; }
      td.amount { font-size: 14px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>💰 Rekap ${bulanLabel}</h2>
    <span class="count">${summary.jumlahTransaksi} Trx</span>
  </div>

  <div class="summary">
    <div class="card in">
      <div class="label">Pemasukan</div>
      <div class="value">${formatRupiah(summary.totalMasuk)}</div>
    </div>
    <div class="card out">
      <div class="label">Pengeluaran</div>
      <div class="value">${formatRupiah(summary.totalKeluar)}</div>
    </div>
    <div class="card balance">
      <div class="label">Sisa Saldo</div>
      <div class="value">${formatRupiah(summary.saldo)}</div>
    </div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Tanggal</th>
          <th>Deskripsi</th>
          <th>Kategori</th>
          <th style="text-align: right;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${transaksi.length > 0 ? rows : emptyRow}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  return c.html(html);
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}