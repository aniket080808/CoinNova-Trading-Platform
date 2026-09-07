/**
 * CoinNova — Export Utilities
 * CSV download and PDF-printable statement generation.
 */

export interface ExportTransaction {
  date: string;
  type: string;
  coin?: string;
  symbol?: string;
  amount: number;
  priceUsd: number | null;
  totalUsd: number;
  status: string;
  realizedPnl?: number;
}

/**
 * Generate CSV from transactions and trigger browser download.
 */
export function exportTransactionsToCSV(transactions: ExportTransaction[], filename = "coinnova_statement") {
  const headers = ["Date", "Type", "Coin", "Symbol", "Amount", "Price (USD)", "Total (USD)", "Realized P&L", "Status"];

  const rows = transactions.map((t) => [
    t.date,
    t.type.toUpperCase(),
    t.coin || "—",
    t.symbol?.toUpperCase() || "—",
    t.amount.toFixed(8),
    t.priceUsd != null ? t.priceUsd.toFixed(2) : "—",
    t.totalUsd.toFixed(2),
    t.realizedPnl != null ? t.realizedPnl.toFixed(2) : "—",
    t.status,
  ]);

  // Capital gains summary
  const buys = transactions.filter((t) => t.type === "buy");
  const sells = transactions.filter((t) => t.type === "sell");
  const totalBought = buys.reduce((s, t) => s + t.totalUsd, 0);
  const totalSold = sells.reduce((s, t) => s + t.totalUsd, 0);
  const netRealizedPnl = sells.reduce((s, t) => s + (t.realizedPnl ?? 0), 0);

  const summaryRows = [
    [],
    ["=== CAPITAL GAINS SUMMARY ==="],
    ["Total Bought", "", "", "", "", "", totalBought.toFixed(2)],
    ["Total Sold", "", "", "", "", "", totalSold.toFixed(2)],
    ["Net Realized P&L", "", "", "", "", "", netRealizedPnl.toFixed(2)],
    ["Total Transactions", "", "", "", "", "", String(transactions.length)],
    [`Report Generated: ${new Date().toLocaleString()}`],
  ];

  const csvContent = [headers, ...rows, ...summaryRows]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Open a printable statement window (browser's print-to-PDF).
 */
export function printStatement(transactions: ExportTransaction[], userName: string) {
  const totalBought = transactions.filter((t) => t.type === "buy").reduce((s, t) => s + t.totalUsd, 0);
  const totalSold = transactions.filter((t) => t.type === "sell").reduce((s, t) => s + t.totalUsd, 0);
  const totalDeposited = transactions.filter((t) => t.type === "deposit").reduce((s, t) => s + t.totalUsd, 0);
  const totalWithdrawn = transactions.filter((t) => t.type === "withdraw").reduce((s, t) => s + t.totalUsd, 0);
  const netPnl = transactions.filter((t) => t.type === "sell").reduce((s, t) => s + (t.realizedPnl ?? 0), 0);

  const html = `<!DOCTYPE html>
<html><head>
<title>CoinNova Financial Statement</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a2e; font-size: 12px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; margin-bottom: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 26px; font-weight: 800; background: linear-gradient(135deg, #00d4ff, #7c3aed); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { border: 1px solid #e0e0e0; padding: 12px; border-radius: 8px; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .stat-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .positive { color: #10b981; }
  .negative { color: #ef4444; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f5f5f5; text-align: left; padding: 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ddd; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 11px; }
  tr:hover { background: #fafafa; }
  .footer { margin-top: 24px; text-align: center; color: #999; font-size: 10px; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="header">
  <div><div class="logo">CoinNova</div><div class="subtitle">Financial Statement</div></div>
  <div style="text-align: right;">
    <div><strong>${userName}</strong></div>
    <div style="color: #666;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
    <div style="color: #666;">Transactions: ${transactions.length}</div>
  </div>
</div>
<div class="summary">
  <div class="stat"><div class="stat-label">Total Deposited</div><div class="stat-value">$${totalDeposited.toFixed(2)}</div></div>
  <div class="stat"><div class="stat-label">Total Bought</div><div class="stat-value">$${totalBought.toFixed(2)}</div></div>
  <div class="stat"><div class="stat-label">Total Sold</div><div class="stat-value">$${totalSold.toFixed(2)}</div></div>
  <div class="stat"><div class="stat-label">Total Withdrawn</div><div class="stat-value">$${totalWithdrawn.toFixed(2)}</div></div>
  <div class="stat"><div class="stat-label">Net Realized P&L</div><div class="stat-value ${netPnl >= 0 ? 'positive' : 'negative'}">$${netPnl.toFixed(2)}</div></div>
  <div class="stat"><div class="stat-label">Report Period</div><div class="stat-value" style="font-size: 14px;">All Time</div></div>
</div>
<h2 style="font-size: 14px; margin-bottom: 8px;">Transaction History</h2>
<table>
  <thead><tr><th>Date</th><th>Type</th><th>Coin</th><th>Amount</th><th>Price</th><th>Total</th><th>Status</th></tr></thead>
  <tbody>
    ${transactions.map((t) => `<tr>
      <td>${t.date}</td>
      <td style="text-transform: uppercase; font-weight: 600;">${t.type}</td>
      <td>${t.symbol?.toUpperCase() ?? '—'}</td>
      <td>${t.amount.toFixed(6)}</td>
      <td>${t.priceUsd != null ? '$' + t.priceUsd.toFixed(2) : '—'}</td>
      <td><strong>$${t.totalUsd.toFixed(2)}</strong></td>
      <td>${t.status}</td>
    </tr>`).join('')}
  </tbody>
</table>
<div class="footer">
  This statement is generated by CoinNova for informational purposes only. It does not constitute tax advice.<br/>
  Generated on ${new Date().toLocaleString()} &bull; CoinNova Trading Platform
</div>
</body></html>`;

  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 500);
  }
}
