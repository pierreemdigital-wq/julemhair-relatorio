/* Criativos & vídeo — biblioteca ociosa, hook/retenção, curva de retenção, hook × ROAS, tabela de vídeos e de criativos */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const adById = new Map();
  (G.tree || []).forEach(c => (c.adsets || []).forEach(a => (a.ads || []).forEach(x => { x.__adset = a; x.__camp = c; adById.set(x.id, x); })));

  const lib = G.library || {}, V = G.video || {}, vids = (V.items || []).filter(v => v && (v.spend || 0) > 0 || (v && v.plays > 0));
  const pctOf = (a, b) => b ? a / b * 100 : null;
  const hookPct = v => v.hook_rate != null ? v.hook_rate * 100 : pctOf(v.p25, v.plays);
  const holdPct = v => v.hold_rate != null ? v.hold_rate * 100 : pctOf(v.p100, v.plays);
  const revOf = v => { const n = adById.get(v.ad_id); const r = n?.metrics?.cur?.revenue; return r != null ? r : (v.spend != null && v.roas != null ? v.spend * v.roas : null); };

  /* leitura por vídeo */
  function leitura(v) {
    const h = hookPct(v), r = v.roas, p = v.purchases || 0;
    if (h == null || (v.plays || 0) < 1000) return { t: 'Sem base', c: 'n', o: 5 };
    if (h >= 15 && r != null && r < 2.2) return { t: 'Atenção: prende, não vende', c: 'at', o: 2 };
    if (r != null && r >= 3.2 && p >= 10) return { t: 'Escalar', c: 'ok', o: 0 };
    if (h < 6) return { t: 'Refazer abertura', c: 'at', o: 3 };
    if (r != null && r < 2.0 && (v.spend || 0) >= 300) return { t: 'Cortar', c: 'bad', o: 4 };
    return { t: 'Manter', c: 'i', o: 1 };
  }

  /* agregados ponderados por investimento */
  const wsum = (arr, k) => arr.reduce((s, v) => s + (k(v) != null && v.spend ? k(v) * v.spend : 0), 0);
  const wden = (arr, k) => arr.reduce((s, v) => s + (k(v) != null && v.spend ? v.spend : 0), 0);
  const wavg = (arr, k) => { const d = wden(arr, k); return d ? wsum(arr, k) / d : null; };
  const spendV = vids.reduce((s, v) => s + (v.spend || 0), 0);
  const revV = vids.reduce((s, v) => s + (revOf(v) || 0), 0);
  const hookAvg = wavg(vids, hookPct), holdAvg = wavg(vids, holdPct), roasV = spendV ? revV / spendV : null;

  const top6 = [...vids].filter(v => v.plays >= 1000).sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 6);
  const bub = vids.filter(v => (v.plays || 0) >= 1000 && v.roas != null && hookPct(v) != null);
  const cre = [...((G.creatives && G.creatives.creatives) || [])].sort((a, b) => (b.spend || 0) - (a.spend || 0)).slice(0, 40);

  function render() {
    const idle = lib.idle_pct != null ? lib.idle_pct * 100 : null, idleN = lib.creatives_idle ?? (lib.creatives_total != null && lib.creatives_used != null ? lib.creatives_total - lib.creatives_used : null);
    const withSale = vids.filter(v => (v.purchases || 0) > 0).length;
    const strong = vids.filter(v => hookPct(v) >= 15 && v.plays >= 1000).length;
    const leadP = `${f.num(lib.creatives_total)} criativos na biblioteca, <b>${f.num(lib.creatives_used)}</b> receberam entrega nos últimos ${lib.period?.days ?? 30} dias. ${idleN != null ? `Os outros ${f.num(idleN)} são custo de produção parado: nenhum teste, nenhuma leitura de hook, nenhum aprendizado. ` : ''}Dos ${f.num(V.count ?? vids.length)} vídeos com entrega, ${f.num(withSale)} venderam e apenas ${f.num(strong)} prendem 15% ou mais da audiência nos primeiros 3 segundos. A conta gira com poucos criativos e muitos deles com abertura fraca.`;

    const cols = [
      { t: 'Vídeo', type: 'txt', k: r => r.ad_name, h: r => { const n = adById.get(r.ad_id); return `<div class="nm lnk" data-ad="${f.esc(r.ad_id)}" title="${f.esc(r.ad_name)}">${n?.thumb ? U.thumb(n.thumb) : ''}${f.esc(r.ad_name)}<span class="sub">${f.esc(r.campaign_name || '')}</span></div>`; } },
      { t: 'Investimento', r: 1, k: r => r.spend, h: r => f.brl(r.spend) },
      { t: 'Faturamento', r: 1, k: r => revOf(r) ?? -1, h: r => `<b>${f.brl(revOf(r))}</b>` },
      { t: 'ROAS', r: 1, k: r => r.roas ?? -1, h: r => r.roas != null ? U.roasTag(r.roas, r.purchases || 0) : '<span class="faint">—</span>' },
      { t: 'Compras', r: 1, k: r => r.purchases, h: r => f.num(r.purchases) },
      { t: 'Plays', r: 1, k: r => r.plays, h: r => f.num(r.plays) },
      { t: 'Hook', r: 1, k: r => hookPct(r) ?? -1, h: r => { const h = hookPct(r); return `<span class="${h != null && h >= 15 ? 'd up' : h != null && h < 6 ? 'd dn' : ''}">${f.pct(h)}</span>`; } },
      { t: '50%', r: 1, k: r => pctOf(r.p50, r.plays) ?? -1, h: r => f.pct(pctOf(r.p50, r.plays)) },
      { t: 'Retenção', r: 1, k: r => holdPct(r) ?? -1, h: r => f.pct(holdPct(r)) },
      { t: 'Leitura', c: 1, type: 'txt', k: r => leitura(r).o, h: r => { const l = leitura(r); return U.tag(l.t, l.c); } },
    ];
    const rowsV = [...vids].sort((a, b) => (b.spend || 0) - (a.spend || 0));

    const creCols = [
      { t: 'Criativo', type: 'txt', k: r => r.creative_name, h: r => `<div class="nm" title="${f.esc(r.creative_name)}">${r.thumbnail_url ? U.thumb(r.thumbnail_url) : ''}${f.esc(r.creative_name)}</div>` },
      { t: 'Anúncios', r: 1, k: r => r.ads_count, h: r => f.num(r.ads_count) },
      { t: 'Investimento', r: 1, k: r => r.spend, h: r => f.brl(r.spend) },
      { t: 'Faturamento', r: 1, k: r => r.revenue, h: r => `<b>${f.brl(r.revenue)}</b>` },
      { t: 'ROAS', r: 1, k: r => r.roas ?? -1, h: r => r.roas != null ? U.roasTag(r.roas, r.purchases || 0) : '<span class="faint">—</span>' },
      { t: 'Compras', r: 1, k: r => r.purchases, h: r => f.num(r.purchases) },
      { t: 'CTR', r: 1, k: r => r.ctr, h: r => f.pct(r.ctr, 2) },
      { t: 'Hook', r: 1, k: r => r.hook_rate != null ? r.hook_rate * 100 : -1, h: r => r.plays ? f.pct(r.hook_rate != null ? r.hook_rate * 100 : null) : '<span class="faint">—</span>' },
      { t: 'Retenção', r: 1, k: r => r.retention != null ? r.retention * 100 : -1, h: r => r.plays ? f.pct(r.retention != null ? r.retention * 100 : null) : '<span class="faint">—</span>' },
      { t: 'ΔCTR', r: 1, k: r => r.ctr_drop_pct != null ? -r.ctr_drop_pct * 100 : 0, h: r => r.ctr_drop_pct == null ? '<span class="faint">—</span>' : (() => { const d = -r.ctr_drop_pct * 100; return `<span class="d ${d < -15 ? 'dn' : d > 0.5 ? 'up' : 'fl'}">${(d > 0 ? '+' : d < 0 ? '−' : '') + f.num(Math.abs(d), 1)}%</span>`; })() },
      { t: 'Fadiga', c: 1, type: 'txt', k: r => r.fatigue ? 'fadiga' : 'ok', h: r => r.fatigue ? U.tag('Fadiga', 'bad') : U.tag('Saudável', 'ok') },
    ];
    const cs = G.creatives?.summary || {};

    return `<div class="ph"><div><div class="h1">Criativos &amp; vídeo</div><div class="h1-sub">Período ${f.dt(V.period?.since)} – ${f.dt(V.period?.until)} · hook = 25% do vídeo ÷ reproduções · retenção = 100% ÷ reproduções</div></div></div>
    ${U.lead('Biblioteca ociosa: ' + (idle != null ? f.pct(idle, 0) : '—') + ' dos criativos nunca rodaram no período', leadP, idle != null ? f.num(idleN) : '—', 'criativos sem entrega')}
    <div class="kpis">
      ${U.kpi({ l: 'Vídeos com entrega', v: f.num(V.count ?? vids.length), raw: V.count ?? vids.length, fmt: 'num', sub: `${f.num(withSale)} com venda · ${f.brl(spendV)} investidos` })}
      ${U.kpi({ l: 'Hook médio (ponderado)', v: f.pct(hookAvg), raw: hookAvg, fmt: 'pct', sub: hookAvg != null ? (hookAvg >= 15 ? 'acima da referência de 15%' : 'referência: 15% assistem até 25%') : 'sem reproduções' })}
      ${U.kpi({ l: 'Retenção média (ponderada)', v: f.pct(holdAvg), raw: holdAvg, fmt: 'pct', sub: 'assistiram até o fim' })}
      ${U.kpi({ l: 'ROAS dos vídeos', v: f.x(roasV), raw: roasV, fmt: 'x', sub: `conta: ${f.x(G.kpi?.cur?.roas)}`, pri: true })}
    </div>
    <div class="g2">
      ${U.card('Curva de retenção · 6 vídeos de maior investimento', U.chartBox('crRet'), '', 'Cada linha é a fração das reproduções que chegou a 25, 50, 75 e 100% do vídeo. Queda forte entre 0 e 25% é problema de abertura; queda entre 75 e 100% é normal.')}
      ${U.card('Hook × ROAS · raio = investimento', U.chartBox('crBub'), '', `${f.num(bub.length)} vídeos com 1.000+ reproduções. Canto superior direito é onde a conta deveria concentrar verba: prende e vende.`)}
    </div>
    <div class="tb"><input class="search" id="crQ" placeholder="Filtrar vídeo ou campanha"><span class="cnt">${rowsV.length} vídeos · CTR e tempo médio no detalhe</span></div>
    <div class="card">${rowsV.length ? U.table('crTbl', cols, rowsV) : '<div class="empty">Nenhum vídeo com entrega no período.</div>'}</div>
    ${U.card('Criativos · top 40 por investimento', cre.length ? U.table('crCre', creCols, cre) : '<div class="empty">Sem criativos agregados.</div>', `<span class="faint">${f.num(cs.creatives)} criativos · ${f.num(cs.ads)} anúncios · ROAS ${f.x(cs.roas)}</span>`, 'Um criativo pode estar em vários anúncios. ΔCTR compara a 2ª metade do período com a 1ª. Fadiga segue a regra da conta: frequência acima de ' + f.num(G.creatives?.fatigue_rule?.frequency_gt, 1) + ' e CTR caindo mais de ' + f.pct((G.creatives?.fatigue_rule?.ctr_drop_gt || 0) * 100, 0) + '.')}`;
  }

  function mount(host) {
    U.bindSearch(host.querySelector('#crQ'), host.querySelector('#crTbl'));
    host.addEventListener('click', e => { const o = e.target.closest('[data-ad]'); if (!o) return; const n = adById.get(o.dataset.ad); if (n) U.nodePanel('Anúncio', n); });

    const short = s => { s = String(s || ''); const m = s.match(/\[([^\]]+)\]\s*\|\s*([^{|]+)/); return (m ? m[2] : s).trim().slice(0, 34); };
    if (top6.length) U.chart('crRet', { type: 'line',
      data: { labels: ['Início', '25%', '50%', '75%', '100%'], datasets: top6.map((v, i) => Object.assign(U.line(short(v.ad_name), [100, pctOf(v.p25, v.plays), pctOf(v.p50, v.plays), pctOf(v.p75, v.plays), pctOf(v.p100, v.plays)].map(x => x == null ? 0 : +x.toFixed(2)), U.C.pal[i % U.C.pal.length]), { tension: .25, pointRadius: 2 })) },
      options: { scales: { y: { max: 100, ticks: { callback: v => v + '%' } } }, plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${f.pct(c.parsed.y)}` } } } } });

    if (bub.length) { const mxS = Math.max(...bub.map(v => v.spend || 0), 1);
      const col = v => { const l = leitura(v); return l.c === 'ok' ? U.C.loja : l.c === 'bad' ? U.C.neg : l.c === 'at' ? U.C.cost : U.C.cur; };
      U.chart('crBub', { type: 'bubble',
        data: { datasets: [{ label: 'Vídeos', data: bub.map(v => ({ x: +hookPct(v).toFixed(2), y: +v.roas.toFixed(2), r: 4 + Math.sqrt((v.spend || 0) / mxS) * 22, n: v.ad_name, s: v.spend })), backgroundColor: bub.map(v => col(v) + '59'), borderColor: bub.map(col), borderWidth: 1 }] },
        options: { interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false }, tooltip: { callbacks: { title: it => short(it[0].raw.n), label: c => [` Hook ${f.pct(c.raw.x)} · ROAS ${f.x(c.raw.y)}`, ` Investimento ${f.brl(c.raw.s)}`] } } },
          scales: { x: { title: { display: true, text: 'Hook (% que passa de 25%)', color: U.C.t2, font: { size: 10.5 } }, ticks: { callback: v => v + '%' }, grid: { display: false } }, y: { title: { display: true, text: 'ROAS', color: U.C.t2, font: { size: 10.5 } }, ticks: { callback: v => f.x(v) } } } } }); }
  }
  window.SEC = window.SEC || {};
  window.SEC.criativos = { title: 'Criativos & vídeo', render, mount, count: () => vids.length };
})();
