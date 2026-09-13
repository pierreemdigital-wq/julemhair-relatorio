/* Meta Ads — drill-down campanha → conjunto → anúncio, comparativo em cada nível, painel lateral, comparação múltipla */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const S = { lvl: 'camp', camp: null, adset: null, q: '', filt: 'all' };
  const byId = { camp: new Map(), adset: new Map(), ad: new Map() };
  G.tree.forEach(c => { byId.camp.set(c.id, c); c.adsets.forEach(a => { a.__camp = c; byId.adset.set(a.id, a); a.ads.forEach(x => { x.__adset = a; x.__camp = c; byId.ad.set(x.id, x); }); }); });

  function rowsFor() {
    let list;
    if (S.lvl === 'camp') list = G.tree;
    else if (S.lvl === 'adset') list = S.camp ? S.camp.adsets : G.tree.flatMap(c => c.adsets);
    else list = S.adset ? S.adset.ads : S.camp ? S.camp.adsets.flatMap(a => a.ads) : G.tree.flatMap(c => c.adsets.flatMap(a => a.ads));
    return list.filter(n => n.metrics).filter(n => !S.q || n.name.toLowerCase().includes(S.q))
      .filter(n => S.filt === 'all' || (S.filt === 'good' && n.metrics.cur.roas >= 3) || (S.filt === 'bad' && n.metrics.cur.roas < 2.5) || (S.filt === 'fat' && n.fatigue?.cls === 'fadiga') || (S.filt === 'active' && n.status === 'ACTIVE'));
  }
  const sum = (rows, k, p) => rows.reduce((s, r) => s + ((p ? r.metrics.prv : r.metrics.cur)[k] || 0), 0);

  function render() {
    const rows = rowsFor(), mx = Math.max(...rows.map(r => r.metrics.cur.spend), 1);
    const sp = sum(rows, 'spend'), rv = sum(rows, 'revenue'), pu = sum(rows, 'purchases'), psp = sum(rows, 'spend', 1), prv = sum(rows, 'revenue', 1), ppu = sum(rows, 'purchases', 1);
    const kind = S.lvl === 'camp' ? 'Campanha' : S.lvl === 'adset' ? 'Conjunto' : 'Anúncio';
    const cols = [
      { t: kind, type: 'txt', k: r => r.name, h: r => `<div class="nm lnk" data-open="${f.esc(r.id)}" title="${f.esc(r.name)}">${S.lvl === 'ad' && r.thumb ? U.thumb(r.thumb) : U.statusDot(r.status)}${f.esc(r.name)}${S.lvl !== 'camp' && !S.camp ? `<span class="sub">${f.esc(r.__camp.name)}</span>` : S.lvl === 'ad' && !S.adset ? `<span class="sub">${f.esc(r.__adset.name)}</span>` : ''}</div>${U.bar(r.metrics.cur.spend, mx)}` },
      { t: 'Faturamento', r: 1, k: r => r.metrics.cur.revenue, h: r => `<b>${f.brl(r.metrics.cur.revenue)}</b>${f.dOnly(r.metrics.cur.revenue, r.metrics.prv.revenue) ? `<span class="dl">${f.dOnly(r.metrics.cur.revenue, r.metrics.prv.revenue)}</span>` : ''}` },
      { t: 'Investimento', r: 1, k: r => r.metrics.cur.spend, h: r => `${f.brl(r.metrics.cur.spend)}<span class="dl">${f.dOnly(r.metrics.cur.spend, r.metrics.prv.spend, true)}</span>` },
      { t: 'ROAS', r: 1, k: r => r.metrics.cur.roas, h: r => `${U.roasTag(r.metrics.cur.roas, r.metrics.cur.purchases)}<span class="dl">${f.dOnly(r.metrics.cur.roas, r.metrics.prv.roas)}</span>` },
      { t: 'Compras', r: 1, k: r => r.metrics.cur.purchases, h: r => `${f.num(r.metrics.cur.purchases)}<span class="dl">${f.dOnly(r.metrics.cur.purchases, r.metrics.prv.purchases)}</span>` },
      { t: 'CPA', r: 1, k: r => r.metrics.cur.cpa, h: r => `${f.brl2(r.metrics.cur.cpa)}<span class="dl">${f.dOnly(r.metrics.cur.cpa, r.metrics.prv.cpa, true)}</span>` },
      { t: 'CTR', r: 1, k: r => r.metrics.cur.ctr, h: r => f.pct(r.metrics.cur.ctr, 2) },
      { t: 'Freq.', r: 1, k: r => r.metrics.cur.frequency, h: r => `<span class="${r.metrics.cur.frequency > 5 ? 'd dn' : ''}">${f.num(r.metrics.cur.frequency, 2)}</span>` },
      { t: 'Fadiga', c: 1, type: 'txt', k: r => r.fatigue?.cls || '', h: r => U.fatTag(r.fatigue) },
    ];
    if (S.lvl === 'ad') cols.splice(7, 0, { t: 'Hook', r: 1, k: r => r.video?.hook ?? -1, h: r => r.video ? f.pct(r.video.hook) : '<span class="faint">—</span>' });
    if (S.lvl !== 'ad') cols.push({ t: S.lvl === 'camp' ? 'Conjuntos' : 'Anúncios', r: 1, k: r => (r.adsets || r.ads).length, h: r => `<button class="btn sm" data-drill="${f.esc(r.id)}">${(r.adsets || r.ads).filter(n => n.metrics).length} ›</button>` });
    rows.forEach(r => r.__id = r.id);

    const crumbs = ['<button data-cr="root">Campanhas</button>'];
    if (S.camp) crumbs.push(`<span class="sep">›</span>${S.lvl === 'adset' ? `<span class="cur">${f.esc(S.camp.name)}</span>` : `<button data-cr="camp">${f.esc(S.camp.name)}</button>`}`);
    if (S.adset) crumbs.push(`<span class="sep">›</span><span class="cur">${f.esc(S.adset.name)}</span>`);

    const nLow = rows.filter(r => (r.metrics.cur.purchases || 0) < U.MIN_N).length, nGood = rows.filter(r => r.metrics.cur.roas >= 3.2 && (r.metrics.cur.purchases || 0) >= U.MIN_N).length, nBad = rows.filter(r => r.metrics.cur.roas < 2.0 && (r.metrics.cur.purchases || 0) >= U.MIN_N).length;
    const K = G.kpi || {}, mer = K.mer?.mer ?? K.ecom?.mer, mRoas = K.marginal?.marginal_roas;
    const leadH = S.lvl === 'camp' && !S.camp
      ? `${f.num(rows.length)} campanhas com entrega: ${f.num(nGood)} com ROAS ≥ 3,2x e amostra válida, ${f.num(nBad)} abaixo de 2,0x, ${f.num(nLow)} sem amostra para julgar.`
      : `${f.num(rows.length)} ${kind.toLowerCase()}${rows.length === 1 ? '' : 's'} em ${S.adset ? f.esc(S.adset.name) : S.camp ? f.esc(S.camp.name) : 'toda a conta'}: ${f.num(nGood)} escaláveis, ${f.num(nBad)} para cortar, ${f.num(nLow)} sem amostra.`;
    const leadP = `ROAS da plataforma é atribuição, não verdade: a decisão de verba se toma pelo MER (${U.MER_DEF}) de <b>${f.x(mer)}</b> e pelo ROAS marginal de <b>${f.x(mRoas)}</b>. Linhas com menos de ${U.MIN_N} compras aparecem em cinza (<small>n&lt;${U.MIN_N}</small>): o ROAS delas é ruído — não escalar nem cortar por ele. Use "Ativos" para ver só o que roda hoje e marque até 4 para comparar.`;
    return `<div class="ph"><div><div class="h1">Meta Ads</div><div class="h1-sub">Clique no nome para abrir o detalhe · clique na contagem à direita para descer um nível · marque até 4 para comparar</div></div></div>
    ${U.lead(leadH, leadP, f.x(mer), 'MER · ' + U.MER_DEF)}
    <div class="kpis six">${U.kpiCmp('Faturamento', rv, prv, f.brl, false, true)}${U.kpiCmp('Investimento', sp, psp, f.brl, true)}${U.kpiCmp('ROAS', sp ? rv / sp : 0, psp ? prv / psp : 0, f.x)}${U.kpiCmp('Compras', pu, ppu, f.num)}${U.kpiCmp('CPA', pu ? sp / pu : 0, ppu ? psp / ppu : 0, f.brl2, true)}${U.kpi({ l: 'ROAS marginal', v: f.x(sp - psp ? (rv - prv) / (sp - psp) : 0), sub: 'Δ receita ÷ Δ investimento' })}</div>
    <div class="crumbs" id="mCrumbs"${S.camp ? '' : ' hidden'}>${crumbs.join('')}</div>
    <div class="tabs" id="mTabs"><button data-l="camp" class="${S.lvl === 'camp' ? 'on' : ''}">Campanhas <span class="cnt">${G.tree.filter(c => c.metrics).length}</span></button><button data-l="adset" class="${S.lvl === 'adset' ? 'on' : ''}">Conjuntos <span class="cnt">${(S.camp ? S.camp.adsets : G.tree.flatMap(c => c.adsets)).filter(a => a.metrics).length}</span></button><button data-l="ad" class="${S.lvl === 'ad' ? 'on' : ''}">Anúncios <span class="cnt">${(S.adset ? S.adset.ads : S.camp ? S.camp.adsets.flatMap(a => a.ads) : G.tree.flatMap(c => c.adsets.flatMap(a => a.ads))).filter(x => x.metrics).length}</span></button></div>
    <div class="tb"><input class="search" id="mQ" placeholder="Filtrar por nome" value="${f.esc(S.q)}"><div class="seg" id="mSeg">${[['all', 'Todos'], ['active', 'Ativos'], ['good', 'ROAS ≥ 3,0'], ['bad', 'ROAS < 2,5'], ['fat', 'Em fadiga']].map(([k, t]) => `<button data-f="${k}" class="${S.filt === k ? 'on' : ''}">${t}</button>`).join('')}</div><span class="cnt">${rows.length} ${kind.toLowerCase()}${rows.length === 1 ? '' : 's'} · ${f.brl(sp)}</span></div>
    <div class="card">${rows.length ? U.table('mTbl', cols, rows, { selectable: true }) : '<div class="empty">Nada com entrega neste filtro.</div>'}</div>`;
  }

  function mount(host) {
    const rerender = () => { host.innerHTML = render(); host.querySelectorAll('table.tbl').forEach(U.bindSort); U.countUp(host); U.animateFunnels(host); bind(host); syncCrumb(); };
    function bind(h) {
      h.querySelector('#mQ').addEventListener('input', e => { S.q = e.target.value.toLowerCase(); const tbl = h.querySelector('#mTbl'); if (!tbl) return rerender(); tbl.querySelectorAll('tbody tr').forEach(r => r.style.display = r.textContent.toLowerCase().includes(S.q) ? '' : 'none'); });
      h.querySelector('#mSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.filt = b.dataset.f; rerender(); };
      h.querySelector('#mTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.lvl = b.dataset.l; if (S.lvl === 'camp') { S.camp = null; S.adset = null; } if (S.lvl === 'adset') S.adset = null; rerender(); };
      h.querySelector('#mCrumbs').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.cr === 'root') { S.camp = null; S.adset = null; S.lvl = 'camp'; } else { S.adset = null; S.lvl = 'adset'; } rerender(); };
      h.onclick = e => {
        const d = e.target.closest('[data-drill]'); if (d) { const id = d.dataset.drill; if (S.lvl === 'camp') { S.camp = byId.camp.get(id); S.adset = null; S.lvl = 'adset'; } else { S.adset = byId.adset.get(id); S.camp = S.adset.__camp; S.lvl = 'ad'; } S.q = ''; rerender(); return; }
        const o = e.target.closest('[data-open]'); if (o) { const n = byId[S.lvl].get(o.dataset.open); U.nodePanel(S.lvl === 'camp' ? 'Campanha' : S.lvl === 'adset' ? 'Conjunto' : 'Anúncio', n); return; }
        const c = e.target.closest('.chk'); if (c) { U.toggleSel(c.dataset.sel, byId[S.lvl].get(c.dataset.sel), S.lvl === 'camp' ? 'Campanha' : S.lvl === 'adset' ? 'Conjunto' : 'Anúncio'); }
      };
    }
    /* breadcrumb do topo acompanha o drill-down; botões voltam um nível */
    function syncCrumb() { const parts = ['Meta Ads']; const hs = [() => { S.camp = null; S.adset = null; S.lvl = 'camp'; rerender(); }];
      if (S.camp) { parts.push(S.camp.name); hs.push(() => { S.adset = null; S.lvl = 'adset'; rerender(); }); } if (S.adset) parts.push(S.adset.name); window.APP.setCrumb(parts, hs); }
    bind(host); syncCrumb();
  }
  window.SEC = window.SEC || {};
  window.SEC.meta = { title: 'Meta Ads', render: () => { S.lvl = 'camp'; S.camp = null; S.adset = null; S.q = ''; S.filt = 'all'; return render(); }, mount, count: () => G.tree.filter(c => c.metrics).length, _S: S };
})();
