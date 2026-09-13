/* core.js — formatação, componentes, painel lateral, comparação, ordenação, charts.
   Todas as seções usam SÓ isto. Nada de CSS inline nas seções. */
(function () {
  'use strict';
  const G = window.G;

  /* ---------- formatação pt-BR ---------- */
  const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = {
    brl: (v, d = 0) => v == null || isNaN(v) ? '—' : 'R$ ' + (d ? nf2 : nf0).format(v),
    brl2: v => fmt.brl(v, 2),
    num: (v, d = 0) => v == null || isNaN(v) ? '—' : (d === 2 ? nf2 : d === 1 ? nf1 : nf0).format(v),
    k: v => v == null ? '—' : Math.abs(v) >= 1e6 ? nf1.format(v / 1e6) + ' mi' : Math.abs(v) >= 1e3 ? nf1.format(v / 1e3) + ' mil' : nf0.format(v),
    pct: (v, d = 1) => v == null || isNaN(v) ? '—' : (d ? nf1 : nf0).format(v) + '%',
    x: v => v == null || isNaN(v) ? '—' : nf2.format(v) + 'x',
    dt: s => { if (!s) return ''; const p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1]; },
    dtl: s => { if (!s) return ''; const p = String(s).slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; },
    esc: s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    /* só aceita http(s); qualquer outra coisa (javascript:, data:) vira vazio */
    url: s => /^https?:\/\/[^\s"'<>]+$/i.test(String(s ?? '')) ? fmt.esc(s) : '',
  };
  /* <img> de thumbnail: URLs do fbcdn expiram → onerror troca por placeholder neutro sem poluir o console */
  const PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="8" fill="#E5E5EA"/><path d="M16 44l12-14 9 10 6-6 5 10z" fill="#AEAEB2"/><circle cx="44" cy="22" r="4" fill="#AEAEB2"/></svg>');
  const thumb = (u, cls = 'thumb') => { const s = fmt.url(u); return s ? `<img class="${cls}" src="${s}" alt="" loading="lazy" referrerpolicy="no-referrer" data-ph="1">` : ''; };
  /* delta: inverse=true quando subir é ruim (custos) */
  fmt.delta = (cur, prv, inverse = false, d = 1) => {
    if (prv == null || !prv || cur == null) return { v: null, cls: 'fl', txt: '—' };
    const v = (cur - prv) / Math.abs(prv) * 100;
    const good = inverse ? v < 0 : v > 0;
    return { v, cls: Math.abs(v) < 0.5 ? 'fl' : good ? 'up' : 'dn', txt: (v > 0 ? '+' : v < 0 ? '−' : '') + nf1.format(Math.abs(v)) + '%' };
  };
  fmt.dEl = (d, sub = 'vs anterior') => `<span class="d ${d.cls}">${d.txt}</span>${sub ? `<span class="faint">${sub}</span>` : ''}`;
  fmt.dOnly = (cur, prv, inv) => { const d = fmt.delta(cur, prv, inv); return `<span class="d ${d.cls}">${d.txt}</span>`; };

  /* ---------- componentes ---------- */
  const kpi = o => `<div class="kpi${o.pri ? ' pri' : ''}">
    <div class="kpi-l">${o.l}</div>
    <div class="kpi-v" data-count="${o.raw ?? ''}" data-fmt="${o.fmt ?? ''}" data-d="${o.dec ?? 0}">${o.v}</div>
    <div class="kpi-c">${o.d ? fmt.dEl(o.d, o.sub ?? 'vs anterior') : `<span class="faint">${o.sub ?? ''}</span>`}</div></div>`;
  const kpiCmp = (l, cur, prv, f, inv, pri) => kpi({ l, v: f(cur), raw: cur, fmt: f === fmt.brl ? 'brl' : f === fmt.brl2 ? 'brl2' : f === fmt.x ? 'x' : f === fmt.pct ? 'pct' : f === fmt.k ? 'k' : 'num', d: fmt.delta(cur, prv, inv), sub: 'vs ' + f(prv), pri });

  const tag = (t, cls = 'n', raw = false) => `<span class="tag ${cls}">${raw ? t : fmt.esc(t)}</span>`;
  /* ROAS: com menos de 50 compras a leitura é ruído — etiqueta neutra e aviso. n == null → sem checagem. */
  const MIN_N = 50;
  const roasTag = (r, n) => n != null && n < MIN_N
    ? `<span class="tag n" title="Amostra insuficiente: ${fmt.num(n)} compras (mínimo ${MIN_N}). ROAS não orienta decisão.">${fmt.x(r)} <small>n&lt;${MIN_N}</small></span>`
    : tag(fmt.x(r), r >= 3.2 ? 'ok' : r >= 2.6 ? 'i' : r >= 2.0 ? 'at' : 'bad');
  /* tradução de enums da Meta que chegam crus em G */
  const PT = { ACTIVE: 'Ativa', PAUSED: 'Pausada', CAMPAIGN_PAUSED: 'Pausada (campanha)', ADSET_PAUSED: 'Pausada (conjunto)', WITH_ISSUES: 'Com problemas', ARCHIVED: 'Arquivada', DELETED: 'Excluída', IN_PROCESS: 'Em processamento', PENDING_REVIEW: 'Em revisão', DISAPPROVED: 'Reprovada', PREAPPROVED: 'Pré-aprovada', PENDING_BILLING_INFO: 'Aguardando cobrança', ENABLED: 'Ativa', DISABLED: 'Desativada',
    OUTCOME_SALES: 'Vendas', OUTCOME_LEADS: 'Leads', OUTCOME_TRAFFIC: 'Tráfego', OUTCOME_ENGAGEMENT: 'Engajamento', OUTCOME_AWARENESS: 'Reconhecimento', OUTCOME_APP_PROMOTION: 'Aplicativo', LINK_CLICKS: 'Cliques no link (legado)', ENGAGEMENT: 'Engajamento (legado)', PAGE_LIKES: 'Curtidas na página (legado)', POST_ENGAGEMENT: 'Engajamento com post (legado)', CONVERSIONS: 'Conversões (legado)', MESSAGES: 'Mensagens (legado)', REACH: 'Alcance (legado)', VIDEO_VIEWS: 'Visualizações de vídeo (legado)', LEAD_GENERATION: 'Geração de leads', BRAND_AWARENESS: 'Reconhecimento (legado)', PRODUCT_CATALOG_SALES: 'Vendas do catálogo (legado)', STORE_VISITS: 'Visitas à loja (legado)', APP_INSTALLS: 'Instalações (legado)',
    OFFSITE_CONVERSIONS: 'Conversões no site', VALUE: 'Valor da conversão', PROFILE_VISIT: 'Visitas ao perfil', LANDING_PAGE_VIEWS: 'Visualizações da página', IMPRESSIONS: 'Impressões', THRUPLAY: 'ThruPlay', QUALITY_LEAD: 'Leads qualificados', LEAD: 'Leads',
    LOWEST_COST_WITHOUT_CAP: 'Menor custo', LOWEST_COST_WITH_BID_CAP: 'Limite de lance', COST_CAP: 'Limite de custo', LOWEST_COST_WITH_MIN_ROAS: 'ROAS mínimo',
    PING_ENDPOINT: 'Envio a servidor externo', METADATA_UPDATE: 'ao editar', METADATA_CREATION: 'ao criar', STATS_CHANGE: 'ao mudar métrica', SCHEDULE: 'agendada',
    WEBSITE: 'Site (pixel)', LOOKALIKE: 'Semelhante', CUSTOM: 'Lista de clientes', MULTI_DATA: 'Multi-fonte', IG_BUSINESS: 'Engajamento IG', APP: 'Aplicativo', OFFLINE_CONVERSION: 'Conversão offline',
    female: 'Feminino', male: 'Masculino', unknown: 'Não informado', Unknown: 'Não informado', iphone: 'iPhone', android_smartphone: 'Android (celular)', ipad: 'iPad', android_tablet: 'Android (tablet)', desktop: 'Desktop', other: 'Outro',
    instagram: 'Instagram', facebook: 'Facebook', audience_network: 'Audience Network', threads: 'Threads', messenger: 'Messenger',
    ADGROUP: 'Anúncio', AD: 'Anúncio', CAMPAIGN: 'Conjunto', CAMPAIGN_GROUP: 'Campanha', ACCOUNT: 'Conta', AUDIENCE: 'Público', ADSET: 'Conjunto',
    development_access: 'Desenvolvimento', standard_access: 'Padrão', advanced_access: 'Avançado' };
  const pt = k => k == null || k === '' ? '—' : (PT[k] ?? fmt.esc(String(k).replace(/^OUTCOME_/, '').replace(/_/g, ' ').toLowerCase()));
  const MER_DEF = 'receita da loja ÷ investimento';
  const fatTag = f => !f || !f.cls ? tag('sem dado', 'n') : f.cls === 'fadiga' ? tag('Fadiga', 'bad') : f.cls === 'atencao' ? tag('Atenção', 'at') : tag('Saudável', 'ok');
  const statusDot = s => `<i class="dot ${s === 'ACTIVE' ? 'on' : s === 'PAUSED' || s === 'CAMPAIGN_PAUSED' || s === 'ADSET_PAUSED' ? 'off' : 'warn'}"></i>`;
  const bar = (v, max) => `<div class="bar"><i style="width:${max ? Math.min(100, v / max * 100) : 0}%"></i></div>`;
  const card = (title, body, right = '', note = '') => `<div class="card"><div class="card-h"><span class="h2">${title}</span>${right}</div>${body}${note ? `<p class="note">${note}</p>` : ''}</div>`;
  const chartBox = (id, cls = '') => `<div class="chart ${cls}"><canvas id="${id}"></canvas></div>`;
  const lead = (h, p, sideV, sideL) => `<div class="lead"><div><h3>${h}</h3><p>${p}</p></div>${sideV ? `<div class="lead-side"><div class="v">${sideV}</div><div class="l">${sideL}</div></div>` : ''}</div>`;
  const alertRow = (lvl, t, p, act) => `<div class="al ${lvl}"><i></i><div><h5>${t}</h5><p>${p}</p>${act ? `<p class="act"><b>Ação</b> ${act}</p>` : ''}</div></div>`;

  /* tabela ordenável; cols: [{t, k(row)->value, h(row)->html, r:true, type:'num'|'txt', w}] */
  function table(id, cols, rows, opts = {}) {
    const sel = opts.selectable;
    let h = `<div class="tw"><table class="tbl" id="${id}"><thead><tr>${sel ? '<th class="k"></th>' : ''}`;
    const fluid = cols[0] && cols[0].type === 'txt' && cols.length >= 5 ? 0 : -1; /* 1ª coluna textual absorve a largura restante e trunca; a tabela não estoura */
    cols.forEach((c, i) => h += `<th class="${c.r ? 'r ' : ''}${c.c ? 'c ' : ''}${i === fluid ? 'nmc ' : ''}s" data-i="${i}" data-type="${c.type || 'num'}">${c.t}</th>`);
    h += '</tr></thead><tbody>';
    rows.forEach((r, ri) => {
      h += `<tr data-ri="${ri}"${r.__id ? ` data-id="${fmt.esc(r.__id)}"` : ''}>${sel ? `<td class="k"><span class="chk" data-sel="${fmt.esc(r.__id ?? ri)}"></span></td>` : ''}`;
      cols.forEach((c, i) => { const v = c.k ? c.k(r) : ''; h += `<td class="${c.r ? 'r' : ''}${c.c ? 'c' : ''}${i === fluid ? ' nmc' : ''}" data-v="${fmt.esc(v)}">${c.h ? c.h(r) : fmt.esc(v)}</td>`; });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function bindSort(tbl) {
    if (!tbl || tbl.dataset.sortBound) return; tbl.dataset.sortBound = '1'; /* idempotente: app.js e mount() podem chamar os dois */
    tbl.querySelectorAll('th.s').forEach(th => th.addEventListener('click', () => {
      const ci = [...th.parentNode.children].indexOf(th), type = th.dataset.type;
      const asc = th.classList.contains('on') && !th.classList.contains('asc');
      tbl.querySelectorAll('th').forEach(o => o.classList.remove('on', 'asc'));
      th.classList.add('on'); if (asc) th.classList.add('asc');
      const tb = tbl.tBodies[0], rows = [...tb.rows];
      rows.sort((a, b) => { const va = a.cells[ci].dataset.v, vb = b.cells[ci].dataset.v;
        const c = type === 'txt' ? String(va).localeCompare(String(vb), 'pt-BR') : (+va || 0) - (+vb || 0);
        return asc ? c : -c; });
      rows.forEach(r => tb.appendChild(r));
    }));
  }
  function bindSearch(input, tbl, colIdx = 0) {
    if (!input || !tbl) return;
    input.addEventListener('input', () => { const q = input.value.toLowerCase();
      tbl.querySelectorAll('tbody tr').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
      const cnt = input.closest('.tb')?.querySelector('.cnt'); if (cnt) cnt.textContent = [...tbl.querySelectorAll('tbody tr')].filter(r => r.style.display !== 'none').length + ' itens'; });
  }

  /* funil horizontal */
  function funnel(steps) {
    const mx = steps[0].v || 1;
    let h = '<div class="fn">';
    steps.forEach((s, i) => { const rate = i ? s.v / (steps[i - 1].v || 1) * 100 : null;
      h += `<div class="fn-r"><div class="fn-l">${fmt.esc(s.n)}</div><div class="fn-t"><div class="fn-b" data-w="${Math.max(s.v / mx, .008)}"></div></div><div class="fn-v">${fmt.num(s.v)}</div><div class="fn-p ${rate != null && rate < 40 ? 'low' : ''}">${rate == null ? '' : fmt.pct(rate)}</div></div>`; });
    return h + '</div>';
  }
  function animateFunnels(scope) { requestAnimationFrame(() => scope.querySelectorAll('.fn-b').forEach((b, i) => setTimeout(() => b.style.transform = `scaleX(${b.dataset.w})`, 40 * i))); }
  /* barras horizontais */
  function hbars(items, f = fmt.brl) { const mx = Math.max(...items.map(i => i.v), 1);
    return '<div class="hb">' + items.map(i => `<div class="hb-r"><div class="hb-l" title="${fmt.esc(i.n)}">${fmt.esc(i.n)}</div><div class="hb-t"><div class="hb-b" style="width:${i.v / mx * 100}%${/^#[0-9a-f]{3,8}$/i.test(i.c || '') ? ';background:' + i.c : ''}"></div></div><div class="hb-v">${f(i.v)}${i.s ? ` <span class="faint">${fmt.esc(i.s)}</span>` : ''}</div></div>`).join('') + '</div>'; }

  /* count-up */
  function countUp(scope) {
    scope.querySelectorAll('.kpi-v[data-count]').forEach(el => {
      const t = parseFloat(el.dataset.count); if (isNaN(t)) return;
      const f = el.dataset.fmt, fin = el.textContent, dur = 600; let t0;
      const F = v => f === 'brl' ? fmt.brl(v) : f === 'brl2' ? fmt.brl2(v) : f === 'x' ? fmt.x(v) : f === 'pct' ? fmt.pct(v) : f === 'pct2' ? fmt.pct(v, 2) : f === 'k' ? fmt.k(v) : fmt.num(v, +el.dataset.d || 0);
      const step = ts => { t0 ??= ts; const p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3); el.textContent = p < 1 ? F(t * e) : fin; if (p < 1) requestAnimationFrame(step); };
      el.textContent = F(0); requestAnimationFrame(step);
    });
  }

  /* ---------- Chart.js defaults (Apple-like) ---------- */
  const C = { cur: '#0071E3', prv: '#AEAEB2', loja: '#34C759', cost: '#FF9500', ink: '#1D1D1F', t2: '#6E6E73', ln: '#E5E5EA', neg: '#FF3B30', pal: ['#0071E3', '#34C759', '#FF9500', '#5856D6', '#FF2D55', '#AEAEB2', '#00C7BE', '#A2845E'] };
  const CH = {};
  function chart(id, cfg) { const el = document.getElementById(id); if (!el) return null; if (CH[id]) CH[id].destroy();
    const base = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', padding: 14, color: C.t2, font: { size: 11, family: '-apple-system, Inter, system-ui' } } },
        tooltip: { backgroundColor: '#1D1D1F', padding: 10, cornerRadius: 8, titleFont: { size: 12 }, bodyFont: { size: 12 }, boxWidth: 8, boxHeight: 8, usePointStyle: true } },
      scales: { x: { grid: { display: false }, border: { color: C.ln }, ticks: { color: C.t2, font: { size: 10.5 }, maxRotation: 0, autoSkipPadding: 16 } },
        y: { grid: { color: '#F0F0F3', drawTicks: false }, border: { display: false }, ticks: { color: C.t2, font: { size: 10.5 }, padding: 8, maxTicksLimit: 5 }, beginAtZero: true } },
      animation: { duration: 700, easing: 'easeOutQuart' } };
    cfg.options = deep(deep({}, base), cfg.options || {});
    /* eixos extras (y1, y2…) herdam o limite de 5 ticks e a tipografia */
    Object.entries(cfg.options.scales || {}).forEach(([k, sc]) => { if (k === 'x' || !sc || sc.display === false) return; sc.ticks = Object.assign({ color: C.t2, font: { size: 10.5 }, padding: 8, maxTicksLimit: 5 }, sc.ticks || {}); if (sc.ticks.maxTicksLimit == null) sc.ticks.maxTicksLimit = 5; });
    CH[id] = new Chart(el, cfg); return CH[id]; }
  function deep(a, b) { for (const k in b) a[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) ? deep(a[k] || {}, b[k]) : b[k]; return a; }
  const yBRL = { ticks: { maxTicksLimit: 5, callback: v => 'R$' + (v >= 1000 ? (v / 1000).toLocaleString('pt-BR') + 'k' : v) } };
  const line = (label, data, color, dash, fill) => ({ label, data, borderColor: color, backgroundColor: fill ? color + '14' : 'transparent', fill: !!fill, borderDash: dash ? [4, 4] : [], tension: .3, borderWidth: dash ? 1.5 : 2, pointRadius: 0, pointHoverRadius: 4 });

  /* ---------- painel lateral ---------- */
  const panel = document.getElementById('panel'), pnB = document.getElementById('pnB'), pnLbl = document.getElementById('pnLbl'), main = document.getElementById('main');
  function openPanel(lbl, title, html, after) { pnLbl.innerHTML = `<span class="lbl">${lbl}</span><div class="pn-t" title="${fmt.esc(title)}">${fmt.esc(title)}</div>`; pnB.innerHTML = html; pnB.classList.remove('in'); void pnB.offsetWidth; pnB.classList.add('in'); panel.classList.add('on'); main.classList.add('panel-open'); pnB.scrollTop = 0; countUp(pnB); if (after) requestAnimationFrame(after); }
  function closePanel() { panel.classList.remove('on'); main.classList.remove('panel-open'); }
  document.getElementById('pnX').onclick = closePanel;
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeModal(); } });

  /* painel padrão para um nó da árvore (campanha/adset/ad) */
  function nodePanel(kind, n) {
    if (!n) return;
    const m = n.metrics, c = m?.cur || {}, p = m?.prv || {};
    let h = '';
    if (kind === 'Anúncio' && n.thumb) h += thumb(n.thumb, 'pn-thumb');
    h += '<div class="pn-kpis">' + [['Faturamento', c.revenue, p.revenue, fmt.brl, false], ['Investimento', c.spend, p.spend, fmt.brl, true], ['ROAS', c.roas, p.roas, fmt.x, false], ['Compras', c.purchases, p.purchases, fmt.num, false], ['CPA', c.cpa, p.cpa, fmt.brl2, true], ['CTR', c.ctr, p.ctr, v => fmt.pct(v, 2), false]]
      .map(([l, cv, pv, f, inv]) => `<div class="pn-k"><div class="l">${l}</div><div class="v kpi-v" data-count="${cv ?? ''}" data-fmt="${f === fmt.brl ? 'brl' : f === fmt.brl2 ? 'brl2' : f === fmt.x ? 'x' : f === fmt.num ? 'num' : 'pct2'}">${f(cv)}</div><div class="c">${fmt.dOnly(cv, pv, inv)} <span class="faint">vs ${f(pv)}</span></div></div>`).join('') + '</div>';
    if (m?.series?.length) h += `<div class="pn-sec"><span class="lbl">Faturamento diário · atual vs anterior</span><div class="pn-chart"><canvas id="pnChart"></canvas></div></div>`;
    if (n.fatigue) h += `<div class="pn-sec"><span class="lbl">Fadiga</span><div class="pn-row"><span>Classificação</span><b>${fatTag(n.fatigue)}</b></div><div class="pn-row"><span>Frequência</span><b>${fmt.num(n.fatigue.freq, 2)}</b></div><div class="pn-row"><span>CTR 2ª metade vs 1ª</span><b>${n.fatigue.ctr_delta == null ? '—' : (n.fatigue.ctr_delta > 0 ? '+' : '') + fmt.num(n.fatigue.ctr_delta, 1) + '%'}</b></div>${n.fatigue.cpm_delta != null ? `<div class="pn-row"><span>CPM 2ª metade vs 1ª</span><b>${(n.fatigue.cpm_delta > 0 ? '+' : '') + fmt.num(n.fatigue.cpm_delta, 1)}%</b></div>` : ''}</div>`;
    if (n.video) h += `<div class="pn-sec"><span class="lbl">Vídeo</span><div class="pn-row"><span>Reproduções</span><b>${fmt.num(n.video.plays)}</b></div><div class="pn-row"><span>Hook (25%)</span><b>${fmt.pct(n.video.hook)}</b></div><div class="pn-row"><span>Retenção (100%)</span><b>${fmt.pct(n.video.hold)}</b></div><div class="pn-row"><span>ThruPlay</span><b>${fmt.pct(n.video.thru)}</b></div><div class="pn-row"><span>Tempo médio</span><b>${fmt.num(n.video.avg, 1)}s</b></div></div>`;
    if (n.targeting && Object.keys(n.targeting).length) { const t = n.targeting; h += `<div class="pn-sec"><span class="lbl">Segmentação</span>${t.advantage ? '<div class="pn-row"><span>Advantage+ audience</span><b>ativo</b></div>' : ''}${t.age ? `<div class="pn-row"><span>Idade</span><b>${fmt.esc(t.age)}</b></div>` : ''}${t.geo ? `<div class="pn-row"><span>Local</span><b>${fmt.esc(Object.values(t.geo).flat().slice(0, 4).join(', '))}</b></div>` : ''}${t.custom_audiences ? `<div style="margin-top:6px">${t.custom_audiences.map(a => `<span class="chip">${fmt.esc(a)}</span>`).join('')}</div>` : ''}${t.excluded ? `<div class="pn-row"><span>Excluídos</span><b>${t.excluded.length}</b></div>` : ''}${t.interests ? `<div style="margin-top:6px">${t.interests.slice(0, 8).map(a => `<span class="chip">${fmt.esc(a)}</span>`).join('')}</div>` : ''}</div>`; }
    if (kind !== 'Anúncio') h += `<div class="pn-sec"><span class="lbl">Configuração</span>${n.objective ? `<div class="pn-row"><span>Objetivo</span><b>${pt(n.objective)}</b></div>` : ''}${n.optimization ? `<div class="pn-row"><span>Otimização</span><b>${pt(n.optimization)}</b></div>` : ''}${n.daily_budget != null ? `<div class="pn-row"><span>Orçamento diário</span><b>${fmt.brl2(n.daily_budget)}</b></div>` : ''}${n.bid ? `<div class="pn-row"><span>Lance</span><b>${pt(n.bid)}</b></div>` : ''}<div class="pn-row"><span>Status</span><b>${statusDot(n.status)}${pt(n.status)}</b></div></div>`;
    h += `<div class="pn-rec">${recommend(n, kind)}</div>`;
    openPanel(kind, n.name, h, () => { if (!m?.series?.length) return;
      chart('pnChart', { type: 'line', data: { labels: m.series.map(s => fmt.dt(s.date)), datasets: [line('Atual', m.series.map(s => s.rev), C.cur, false, true), line('Anterior', m.series.map(s => s.p_rev), C.prv, true)] },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } } }); });
  }
  function recommend(n, kind) {
    const c = n.metrics?.cur, p = n.metrics?.prv; if (!c) return 'Sem entrega no período.';
    if (c.purchases < 50) return `<b>Amostra insuficiente.</b> ${fmt.num(c.purchases)} compras no período — abaixo de 50, qualquer leitura de ROAS é ruído. Manter e reavaliar com mais volume.`;
    if (n.fatigue?.cls === 'fadiga') return `<b>Fadiga confirmada.</b> Frequência ${fmt.num(n.fatigue.freq, 1)} com CTR caindo ${fmt.num(Math.abs(n.fatigue.ctr_delta), 0)}%. Renovar criativo antes de qualquer aumento de verba.`;
    const dr = p?.roas ? (c.roas - p.roas) / p.roas * 100 : 0;
    if (c.roas >= 3.2 && dr >= -5) return `<b>Escalar com cautela.</b> ROAS ${fmt.x(c.roas)} estável. Aumento de até 20% no orçamento, medindo ROAS marginal em 7 dias.`;
    if (c.roas >= 2.6) return `<b>Manter.</b> ROAS ${fmt.x(c.roas)}${dr < -10 ? `, mas caiu ${fmt.num(Math.abs(dr), 0)}% vs anterior — observar.` : ' dentro da faixa.'}`;
    if (c.roas >= 2.0) return `<b>Revisar.</b> ROAS ${fmt.x(c.roas)} abaixo da média da conta (${fmt.x(G.kpi.cur.roas)}). Testar novo criativo ou público antes de cortar.`;
    return `<b>Cortar ou reconstruir.</b> ROAS ${fmt.x(c.roas)} com ${fmt.num(c.purchases)} compras — cada real investido volta ${fmt.brl2(c.roas)}.`;
  }

  /* ---------- comparação (checkbox + modal) ---------- */
  const SEL = new Map(); const fab = document.getElementById('fab'), fabTxt = document.getElementById('fabTxt'), ov = document.getElementById('ov'), mdB = document.getElementById('mdB');
  function toggleSel(id, node, kind) { if (SEL.has(id)) SEL.delete(id); else if (SEL.size < 4) SEL.set(id, { node, kind }); else return;
    document.querySelectorAll(`.chk[data-sel="${id}"]`).forEach(c => c.classList.toggle('on', SEL.has(id)));
    document.querySelectorAll(`tr[data-id="${id}"]`).forEach(r => r.classList.toggle('sel', SEL.has(id)));
    fabTxt.textContent = SEL.size + (SEL.size === 1 ? ' selecionado' : ' selecionados'); fab.classList.toggle('on', SEL.size >= 2); }
  function clearSel() { SEL.forEach((_, id) => { document.querySelectorAll(`.chk[data-sel="${id}"]`).forEach(c => c.classList.remove('on')); document.querySelectorAll(`tr[data-id="${id}"]`).forEach(r => r.classList.remove('sel')); }); SEL.clear(); fab.classList.remove('on'); }
  document.getElementById('fabX').onclick = clearSel;
  document.getElementById('fabGo').onclick = () => openCompare([...SEL.values()]);
  function openCompare(items) {
    /* 5º campo = exige amostra mínima (50 compras) para concorrer a "melhor" */
    const rows = [['Faturamento', n => n.metrics?.cur.revenue, fmt.brl, 1], ['Investimento', n => n.metrics?.cur.spend, fmt.brl, 0], ['ROAS', n => n.metrics?.cur.roas, fmt.x, 1, 1], ['ROAS anterior', n => n.metrics?.prv.roas, fmt.x, 0], ['Compras', n => n.metrics?.cur.purchases, fmt.num, 1], ['CPA', n => n.metrics?.cur.cpa, fmt.brl2, -1, 1], ['Ticket', n => n.metrics?.cur.ticket, fmt.brl2, 1], ['CTR', n => n.metrics?.cur.ctr, v => fmt.pct(v, 2), 1], ['CPM', n => n.metrics?.cur.cpm, fmt.brl2, -1], ['Frequência', n => n.metrics?.cur.frequency, v => fmt.num(v, 2), -1], ['Fadiga', n => n.fatigue?.cls, v => v ? fatTag({ cls: v }) : '—', 0], ['Hook (vídeo)', n => n.video?.hook, fmt.pct, 1], ['Retenção (vídeo)', n => n.video?.hold, fmt.pct, 1]];
    let h = '<table class="cmp"><thead><tr><th>Métrica</th>' + items.map(i => `<th title="${fmt.esc(i.node.name)}">${fmt.esc(i.node.name)}</th>`).join('') + '</tr></thead><tbody>';
    const ok = i => (items[i].node.metrics?.cur.purchases || 0) >= MIN_N;
    rows.forEach(([l, k, f, dir, needN]) => { const vals = items.map(i => k(i.node)); const nums = vals.map(v => typeof v === 'number' ? v : null);
      let best = -1; if (dir) { const valid = nums.map((v, i) => [v, i]).filter(x => x[0] != null && (!needN || ok(x[1]))); if (valid.length > 1) best = valid.reduce((a, b) => (dir > 0 ? b[0] > a[0] : b[0] < a[0]) ? b : a)[1]; }
      h += `<tr><td>${l}</td>${vals.map((v, i) => `<td class="${i === best ? 'best' : ''}${needN && !ok(i) ? ' faint' : ''}" ${needN && !ok(i) ? 'title="Amostra insuficiente (menos de 50 compras)"' : ''}>${v == null ? '—' : f(v)}${needN && !ok(i) && v != null ? ' <small>n&lt;50</small>' : ''}</td>`).join('')}</tr>`; });
    const low = items.filter((_, i) => !ok(i)).length;
    mdB.innerHTML = h + '</tbody></table>' + (low ? `<p class="note">${low === items.length ? 'Nenhum' : low} ${low === 1 ? 'item tem' : 'itens têm'} menos de 50 compras: ROAS e CPA aparecem, mas não concorrem a "melhor". Vencedor só com amostra mínima.</p>` : ''); document.getElementById('mdT').textContent = `Comparação · ${items.length} ${items[0].kind.toLowerCase()}s`; ov.classList.add('on'); }
  function closeModal() { ov.classList.remove('on'); }
  document.getElementById('mdX').onclick = closeModal; ov.addEventListener('click', e => { if (e.target === ov) closeModal(); });

  window.UI = { fmt, thumb, PLACEHOLDER, kpi, kpiCmp, tag, roasTag, pt, PT, MIN_N, MER_DEF, fatTag, statusDot, bar, card, chartBox, lead, alertRow, table, bindSort, bindSearch, funnel, animateFunnels, hbars, countUp, chart, C, CH, yBRL, line, openPanel, closePanel, nodePanel, recommend, toggleSel, clearSel, openCompare, SEL };
})();
