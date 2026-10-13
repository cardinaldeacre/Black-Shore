import { Hono } from 'hono';
import { getTransaksiByBulan, getSummary } from '../lib/db';
import type { Bindings } from '../index';

export const spreadsheetRoutes = new Hono<{ Bindings: Bindings }>();

spreadsheetRoutes.get('/', async (c) => {
    const bulan = c.req.query('bulan') ?? new Date().toISOString().slice(0, 7);

    const [transaksi, summary] = await Promise.all([
        getTransaksiByBulan(c.env.black_shore_db, bulan),
        getSummary(c.env.black_shore_db, bulan),
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

    const rows = transaksi
        .map(
            (t, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${formatTanggal(t.tanggal)}</td>
        <td>${escapeHtml(t.deskripsi)}</td>
        <td>${escapeHtml(t.kategori ?? '-')}</td>
        <td class="amount ${t.tipe === 'masuk' ? 'in' : 'out'}">
          ${t.tipe === 'masuk' ? '+' : '-'} ${formatRupiah(t.jumlah)}
        </td>
      </tr>`
        )
        .join('');

    const emptyRow = `
    <tr>
      <td colspan="5" class="empty">Belum ada transaksi bulan ini</td>
    </tr>`;

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keuangan ${bulanLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      background: #0f0f1a;
      color: #e0e0e8;
      padding: 16px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid #2a2a3a;
    }
    .header h2 {
      font-size: 15px;
      font-weight: 600;
      color: #a78bfa;
    }
    .header .count {
      font-size: 11px;
      color: #6b6b80;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .card {
      background: #1a1a2a;
      border-radius: 8px;
      padding: 10px 12px;
      border: 1px solid #2a2a3a;
    }
    .card .label {
      font-size: 10px;
      color: #6b6b80;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .card .value {
      font-size: 14px;
      font-weight: 600;
    }
    .card.in .value { color: #4ade80; }
    .card.out .value { color: #f87171; }
    .card.balance .value { color: #a78bfa; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #1a1a2a;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #6b6b80;
      padding: 10px 12px;
      background: #15151f;
      border-bottom: 1px solid #2a2a3a;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #22222e;
      font-size: 12px;
    }
    tr:last-child td { border-bottom: none; }
    td.num { color: #6b6b80; width: 32px; }
    td.amount {
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    td.amount.in { color: #4ade80; }
    td.amount.out { color: #f87171; }
    td.empty {
      text-align: center;
      color: #6b6b80;
      padding: 24px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="header">
    <h2>💰 Keuangan ${bulanLabel}</h2>
    <span class="count">${summary.jumlahTransaksi} transaksi</span>
  </div>

  <div class="summary">
    <div class="card in">
      <div class="label">Masuk</div>
      <div class="value">${formatRupiah(summary.totalMasuk)}</div>
    </div>
    <div class="card out">
      <div class="label">Keluar</div>
      <div class="value">${formatRupiah(summary.totalKeluar)}</div>
    </div>
    <div class="card balance">
      <div class="label">Saldo</div>
      <div class="value">${formatRupiah(summary.saldo)}</div>
    </div>
  </div>

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
