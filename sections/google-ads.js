/* Google Ads — campanhas, investimento, keywords e search terms de maior custo */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const D = G.google_ads || { campaigns: [], totals: {}, top_keywords: [], top_search_terms: [] };
  const n = v => (v == null || isNaN(v)) ? 0 : +v;

  const campaigns = (D.campaigns || []).slice().sort((a, b) => n(b.daily_budget_brl) - n(a.daily_budget_brl));
  const active = campaigns.filter(c => c.status === 'ENABLED');
  const paused = campaigns.filter(c => c.status === 'PAUSED');
  const totals = D.totals || {};
  const keywords = (D.top_keywords || []).slice().sort((a, b) => n(b.cost_brl) - n(a.cost_brl));
  const searchTerms = (D.top_search_terms || []).slice().sort((a, b) => n(b.cost_brl) - n(a.cost_brl));

  const STATUS_PT = { ENABLED: 'Ativa', PAUSED: 'Pausada', REMOVED: 'Removida' };
  const CH_PT = { SHOPPING: 'Shopping', SEARCH: 'Pesquisa', DEMAND_GEN: 'Demand Gen', PERFORMANCE_MAX: 'Performance Max', DISPLAY: 'Display', VIDEO: 'Vídeo' };
  const st = s => STATUS_PT[s] || s || '—';
  const ch = c => CH_PT[c] || (c || '—').replace(/_/g, ' ');

  function leadText() {
    if (!campaigns.length) return ['Sem campanhas de Google Ads no período.', ''];
    const h = `${active.length} ${active.length === 1 ? 'campanha ativa' : 'campanhas ativas'} de ${campaigns.length} totais, somando ${f.brl(totals.cost_brl)} investidos nos últimos dias.`;
    const p = paused.length
      ? `${paused.length} ${paused.length === 1 ? 'campanha pausada' : 'campanhas pausadas'} sem investimento no período — revisar se algum orçamento continua reservado sem uso.`
      : '';
    return [h, p];
  }

  function campaignCards() {
    const mx = Math.max(...campaigns.map(c => n(c.daily_budget_brl)), 1);
    return '<div class="grid-list">' + campaigns.map(c => `<div class="gl">
      <div class="l">${U.statusDot(c.status === 'ENABLED' ? 'ACTIVE' : 'PAUSED')}${f.esc(c.name)}</div>
      <div class="v">${f.brl2(c.daily_budget_brl)} <span class="faint">/dia</span></div>
      <div class="c">${ch(c.channel_type)} · ${st(c.status)}</div>
      ${U.bar(n(c.daily_budget_brl), mx)}</div>`).join('') + '</div>';
  }

  function keywordTable(rows, id) {
    const mx = Math.max(...rows.map(r => n(r.cost_brl)), 1);
    const label = id === 'gadsKwTbl' ? 'keyword' : 'search_term';
    const cols = [
      { t: label === 'keyword' ? 'Palavra-chave' : 'Termo de pesquisa', type: 'txt', k: r => r[label], h: r => `<div class="nm">${f.esc(r[label])}</div>${U.bar(n(r.cost_brl), mx)}` },
      { t: 'Cliques', r: 1, k: r => n(r.clicks), h: r => f.num(r.clicks) },
      { t: 'Custo', r: 1, k: r => n(r.cost_brl), h: r => `<b>${f.brl(r.cost_brl)}</b>` },
      { t: 'Conversões', r: 1, k: r => n(r.conversions), h: r => f.num(r.conversions, 1) },
    ];
    return U.table(id, cols, rows);
  }

  function render() {
    const [h, p] = leadText();
    return `<div class="ph"><div><div class="h1">Google Ads</div><div class="h1-sub">Campanhas, investimento e termos de pesquisa · conta ${f.esc(D.account_name || '')}</div></div></div>
    ${U.lead(h, p, f.brl(totals.cost_brl), 'investido')}
    ${U.card('Campanhas', campaignCards(), `<span class="cnt">${campaigns.length} campanhas</span>`, 'Orçamento diário em reais. Campanhas pausadas aparecem em cinza.')}
    <div class="g2">
      ${U.card('Distribuição de orçamento', U.chartBox('gadsDonut', 'tall'))}
      ${U.card('Top palavras-chave por custo', keywordTable(keywords.slice(0, 10), 'gadsKwTbl'), `<span class="cnt">${totals.keywords_tracked || keywords.length} rastreadas</span>`)}
    </div>
    ${U.card('Top termos de pesquisa por custo', keywordTable(searchTerms.slice(0, 15), 'gadsStTbl'), '', 'Termos reais digitados pelos usuários que geraram clique — útil para achar palavras negativas e novas oportunidades.')}
    <p class="note">Fonte: Google Ads API v25 (Explorer Access). Conta ${f.esc(D.account_id || '')}, gerenciada via MCC ${f.esc(D.manager?.name || '')} (${f.esc(D.manager?.id || '')}).</p>`;
  }

  function mount() {
    U.chart('gadsDonut', {
      type: 'doughnut',
      data: { labels: campaigns.map(c => c.name), datasets: [{ data: campaigns.map(c => n(c.daily_budget_brl)), backgroundColor: campaigns.map((_, i) => U.C.pal[i % U.C.pal.length]), borderWidth: 2, borderColor: '#FFFFFF', hoverOffset: 4 }] },
      options: { cutout: '62%', scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { callbacks: { label: c => ` ${f.brl2(c.raw)}/dia` } } } },
    });
  }

  window.SEC = window.SEC || {};
  window.SEC['google-ads'] = { title: 'Google Ads', render, mount, count: () => campaigns.length };
})();
