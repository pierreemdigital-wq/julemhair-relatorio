/* GA4 — Google Analytics: sessões, receita atribuída, canais de tráfego, tempo real */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const D = G.ga4 || { period: {}, realtime: {}, totals: {}, daily: [], channels: [] };
  const n = v => (v == null || isNaN(v)) ? 0 : +v;

  const daily = D.daily || [];
  const channels = (D.channels || []).slice().sort((a, b) => n(b.revenue) - n(a.revenue));
  const totSessions = n(D.totals?.sessions) || daily.reduce((s, d) => s + n(d.sessions), 0);
  const totRevenue = n(D.totals?.revenue) || daily.reduce((s, d) => s + n(d.revenue), 0);
  const totChannelSessions = channels.reduce((s, c) => s + n(c.sessions), 0);

  function leadText() {
    if (!daily.length) return ['Sem dados de GA4 no período.', 'A ingestão pode não ter rodado ainda ou a propriedade não retornou linhas.'];
    const top = channels[0];
    const h = `${f.num(totSessions)} sessões geraram ${f.brl(totRevenue)} em receita atribuída pelo GA4 no período.`;
    const p = top
      ? `O canal <b>${f.esc(top.source)} / ${f.esc(top.medium)}</b> lidera com ${f.brl(top.revenue)} (${f.pct(totChannelSessions ? n(top.sessions) / totChannelSessions * 100 : 0)} das sessões mapeadas). Esse dado é o comportamento no site — a receita confirmada de venda é a da Nuvemshop.`
      : '';
    return [h, p];
  }

  function realtimeCard() {
    const r = D.realtime || {};
    if (!r.active_users && r.active_users !== 0) return '';
    return U.card('Tempo real', `<div class="grid-list">
      <div class="gl"><div class="l">Usuários ativos agora</div><div class="v">${f.num(r.active_users)}</div></div>
      <div class="gl"><div class="l">Pageviews (30min)</div><div class="v">${f.num(r.page_views)}</div></div>
      <div class="gl"><div class="l">Eventos (30min)</div><div class="v">${f.num(r.events)}</div></div>
    </div>`, `<span class="cnt">${f.dtl(r.snapshot_date)}</span>`, 'Snapshot da última coleta (realtime GA4, janela de ~30 minutos).');
  }

  function channelTable() {
    const mx = Math.max(...channels.map(c => n(c.revenue)), 1);
    const cols = [
      { t: 'Origem / mídia', type: 'txt', k: r => `${r.source} / ${r.medium}`, h: r => `<div class="nm">${f.esc(r.source)} <span class="faint">/</span> ${f.esc(r.medium)}</div>${U.bar(n(r.revenue), mx)}` },
      { t: 'Sessões', r: 1, k: r => n(r.sessions), h: r => f.num(r.sessions) },
      { t: 'Receita', r: 1, k: r => n(r.revenue), h: r => `<b>${f.brl(r.revenue)}</b>` },
      { t: '% receita', r: 1, k: r => totRevenue ? n(r.revenue) / totRevenue * 100 : 0, h: r => f.pct(totRevenue ? n(r.revenue) / totRevenue * 100 : 0) },
    ];
    return U.table('ga4Tbl', cols, channels);
  }

  function render() {
    const [h, p] = leadText();
    return `<div class="ph"><div><div class="h1">GA4 · Comportamento no site</div><div class="h1-sub">Sessões, canais e receita atribuída · ${f.dt(D.period?.since)} – ${f.dt(D.period?.until)}</div></div></div>
    ${U.lead(h, p, f.num(totSessions), 'sessões no período')}
    ${realtimeCard()}
    <div class="g2">
      ${U.card('Sessões × receita por dia', U.chartBox('ga4Daily', 'tall'))}
      ${U.card('Receita por canal', U.chartBox('ga4Donut', 'tall'))}
    </div>
    ${U.card('Todos os canais', channelTable(), `<span class="cnt">${channels.length} canais</span>`, 'Origem/mídia conforme o GA4 (sessionSource/sessionMedium). Ordene clicando no cabeçalho.')}
    <p class="note">Fonte: Google Analytics 4, propriedade ${f.esc(D.property_name || '')} (${f.esc(D.property_id || '')}). ${f.esc(D.note || '')}</p>`;
  }

  function mount() {
    U.chart('ga4Daily', {
      data: {
        labels: daily.map(d => f.dt(d.date)),
        datasets: [
          { type: 'bar', label: 'Sessões', data: daily.map(d => n(d.sessions)), backgroundColor: U.C.cur, borderRadius: 4, maxBarThickness: 36, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Receita', data: daily.map(d => n(d.revenue)), borderColor: U.C.loja, backgroundColor: U.C.loja, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: .3, yAxisID: 'y2', order: 1 },
        ],
      },
      options: {
        scales: {
          y: { ticks: { maxTicksLimit: 5 } },
          y2: { position: 'right', grid: { display: false }, border: { display: false }, beginAtZero: true, ticks: { color: U.C.t2, font: { size: 10.5 }, callback: v => f.k(v) } },
        },
        plugins: { tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y2' ? ` Receita ${f.brl(c.raw)}` : ` Sessões ${f.num(c.raw)}` } } },
      },
    });
    const top = channels.slice(0, 8);
    U.chart('ga4Donut', {
      type: 'doughnut',
      data: { labels: top.map(c => `${c.source}/${c.medium}`), datasets: [{ data: top.map(c => n(c.revenue)), backgroundColor: top.map((_, i) => U.C.pal[i % U.C.pal.length]), borderWidth: 2, borderColor: '#FFFFFF', hoverOffset: 4 }] },
      options: { cutout: '62%', scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { callbacks: { label: c => ` ${f.brl(c.raw)} · ${f.pct(totRevenue ? c.raw / totRevenue * 100 : 0)}` } } } },
    });
  }

  window.SEC = window.SEC || {};
  window.SEC.ga4 = { title: 'GA4', render, mount, count: () => channels.length };
})();
