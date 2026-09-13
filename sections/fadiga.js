/* Fadiga — regra da conta, contagem por estado, tabela conjuntos/anúncios, scatter frequência × ΔCTR */
(function () {
  const U = window.UI, f = U.fmt, G = window.G, FT = G.fatigue || {};
  const S = { tab: 'adsets', filt: 'all' };
  const nodes = { adsets: new Map(), ads: new Map() };
  (G.tree || []).forEach(c => (c.adsets || []).forEach(a => { a.__camp = c; nodes.adsets.set(a.id, a); (a.ads || []).forEach(x => { x.__adset = a; x.__camp = c; nodes.ads.set(x.id, x); }); }));

  const ORD = { fadiga: 0, atencao: 1, saudavel: 2, sem_base: 3 };
  const LBL = { fadiga: 'Fadiga', atencao: 'Atenção', saudavel: 'Saudável', sem_base: 'Sem base' };
  const CLS = { fadiga: 'bad', atencao: 'at', saudavel: 'ok', sem_base: 'n' };
  const COL = { fadiga: U.C.neg, atencao: U.C.cost, saudavel: U.C.loja, sem_base: U.C.prv };
  const items = k => ((FT[k] && FT[k].items) || []).filter(i => i && i.id);
  const countBy = k => { const o = { fadiga: 0, atencao: 0, saudavel: 0, sem_base: 0 }; items(k).forEach(i => { o[i.status] = (o[i.status] || 0) + 1; }); return o; };
  const cA = countBy('adsets'), cD = countBy('ads');
  const sorted = k => [...items(k)].sort((a, b) => (ORD[a.status] ?? 9) - (ORD[b.status] ?? 9) || (b.spend || 0) - (a.spend || 0));
  const dTxt = v => v == null ? '<span class="faint">—</span>' : `<span class="d ${v < -15 ? 'dn' : v > 0.5 ? 'up' : 'fl'}">${(v > 0 ? '+' : v < 0 ? '−' : '') + f.num(Math.abs(v), 1)}%</span>`;
  const dTxtInv = v => v == null ? '<span class="faint">—</span>' : `<span class="d ${v > 20 ? 'dn' : v < -0.5 ? 'up' : 'fl'}">${(v > 0 ? '+' : v < 0 ? '−' : '') + f.num(Math.abs(v), 1)}%</span>`;
  const stTag = s => U.tag(LBL[s] || 'Sem dado', CLS[s] || 'n');

  function tableHtml() {
    const kind = S.tab === 'adsets' ? 'Conjunto' : 'Anúncio';
    const rows = sorted(S.tab).filter(r => S.filt === 'all' || r.status === S.filt);
    const mx = Math.max(...rows.map(r => r.spend || 0), 1);
    const cols = [
      { t: kind, type: 'txt', k: r => r.name, h: r => { const n = nodes[S.tab].get(r.id); return `<div class="nm lnk" data-open="${f.esc(r.id)}" title="${f.esc(r.name)}">${n?.thumb ? U.thumb(n.thumb) : n ? U.statusDot(n.status) : ''}${f.esc(r.name)}${n?.__camp ? `<span class="sub">${f.esc(n.__camp.name)}</span>` : ''}</div>`; } },
      { t: 'Invest.', r: 1, k: r => r.spend, h: r => f.brl(r.spend) },
      { t: 'Freq.', r: 1, k: r => r.frequency, h: r => `<span class="${r.frequency > 5 ? 'd dn' : r.frequency > 3.5 ? 'd fl' : ''}">${f.num(r.frequency, 2)}</span>` },
      { t: 'CTR 1ª', r: 1, k: r => r.ctr_previous ?? -1, h: r => f.pct(r.ctr_previous, 2) },
      { t: 'CTR 2ª', r: 1, k: r => r.ctr_current ?? -1, h: r => f.pct(r.ctr_current, 2) },
      { t: 'ΔCTR', r: 1, k: r => r.ctr_delta_pct ?? -999, h: r => dTxt(r.ctr_delta_pct) },
      { t: 'CPM 1ª', r: 1, k: r => r.cpm_previous ?? -1, h: r => f.brl2(r.cpm_previous) },
      { t: 'CPM 2ª', r: 1, k: r => r.cpm_current ?? -1, h: r => f.brl2(r.cpm_current) },
      { t: 'ΔCPM', r: 1, k: r => r.cpm_delta_pct ?? -999, h: r => dTxtInv(r.cpm_delta_pct) },
      { t: 'ROAS', r: 1, k: r => r.roas ?? -1, h: r => { const n = nodes[S.tab].get(r.id); const p = n?.metrics?.cur?.purchases; return r.roas != null ? U.roasTag(r.roas, p ?? 0) : '<span class="faint">—</span>'; } },
      { t: 'Estado', c: 1, type: 'txt', k: r => ORD[r.status] ?? 9, h: r => stTag(r.status) },
    ];
    const cnt = S.tab === 'adsets' ? cA : cD;
    return `<div class="tabs" id="ftTabs"><button data-t="adsets" class="${S.tab === 'adsets' ? 'on' : ''}">Conjuntos <span class="cnt">${items('adsets').length}</span></button><button data-t="ads" class="${S.tab === 'ads' ? 'on' : ''}">Anúncios <span class="cnt">${items('ads').length}</span></button></div>
    <div class="tb"><div class="seg" id="ftSeg">${[['all', 'Todos'], ['fadiga', `Fadiga ${cnt.fadiga}`], ['atencao', `Atenção ${cnt.atencao}`], ['saudavel', `Saudável ${cnt.saudavel}`], ['sem_base', `Sem base ${cnt.sem_base}`]].map(([k, t]) => `<button data-f="${k}" class="${S.filt === k ? 'on' : ''}">${t}</button>`).join('')}</div><span class="cnt">${rows.length} ${kind.toLowerCase()}${rows.length === 1 ? '' : 's'} · ${f.brl(rows.reduce((s, r) => s + (r.spend || 0), 0))}</span></div>
    <div class="card">${rows.length ? U.table('ftTbl', cols, rows) : '<div class="empty">Nada neste estado.</div>'}</div>`;
  }

  function render() {
    const R = FT.rule || {};
    const spendA = items('adsets').reduce((s, r) => s + (r.spend || 0), 0);
    const spendAt = items('adsets').filter(r => r.status === 'atencao' || r.status === 'fadiga').reduce((s, r) => s + (r.spend || 0), 0);
    const h3 = cA.fadiga ? `${f.num(cA.fadiga)} conjunto${cA.fadiga === 1 ? '' : 's'} em fadiga confirmada e ${f.num(cA.atencao)} em atenção` : `Nenhum conjunto em fadiga confirmada; ${f.num(cA.atencao)} conjuntos e ${f.num(cD.atencao)} anúncios pedem atenção`;
    const p = `Regra da conta — <b>fadiga</b>: ${f.esc(R.fadiga || '—')}. <b>Atenção</b>: ${f.esc(R.atencao || '—')}. <b>Sem base</b>: ${f.esc(R.sem_base || '—')}. Conjuntos: ${f.num(cA.saudavel)} saudáveis, ${f.num(cA.atencao)} em atenção, ${f.num(cA.fadiga)} em fadiga, ${f.num(cA.sem_base)} sem base. Anúncios: ${f.num(cD.saudavel)} saudáveis, ${f.num(cD.atencao)} em atenção, ${f.num(cD.fadiga)} em fadiga, ${f.num(cD.sem_base)} sem base. ${spendA ? `Os conjuntos em atenção ou fadiga concentram <b>${f.pct(spendAt / spendA * 100, 0)}</b> do investimento — é onde a renovação de criativo tem retorno mais rápido.` : ''}`;
    const k = (l, v, cls, sub) => U.kpi({ l, v: `<span class="${cls}">${f.num(v)}</span>`, raw: v, fmt: 'num', sub });
    return `<div class="ph"><div><div class="h1">Fadiga</div><div class="h1-sub">Frequência e queda de CTR entre a 1ª e a 2ª metade do período · clique no nome para abrir o detalhe</div></div></div>
    ${U.lead(h3, p, spendA ? f.pct(spendAt / spendA * 100, 0) : '—', 'do investimento em atenção ou fadiga')}
    <div class="kpis six">
      ${U.kpi({ l: 'Conjuntos saudáveis', v: f.num(cA.saudavel), raw: cA.saudavel, fmt: 'num', sub: `de ${f.num(items('adsets').length)} · ${f.num(cA.sem_base)} sem base` })}
      ${U.kpi({ l: 'Conjuntos em atenção', v: f.num(cA.atencao), raw: cA.atencao, fmt: 'num', sub: 'freq. > 3,5 ou ΔCTR < −15%' })}
      ${U.kpi({ l: 'Conjuntos em fadiga', v: f.num(cA.fadiga), raw: cA.fadiga, fmt: 'num', sub: 'freq. > 5 e ΔCTR < −15%', pri: cA.fadiga > 0 })}
      ${U.kpi({ l: 'Anúncios saudáveis', v: f.num(cD.saudavel), raw: cD.saudavel, fmt: 'num', sub: `de ${f.num(items('ads').length)} · ${f.num(cD.sem_base)} sem base` })}
      ${U.kpi({ l: 'Anúncios em atenção', v: f.num(cD.atencao), raw: cD.atencao, fmt: 'num', sub: 'freq. > 3,5 ou ΔCTR < −15%' })}
      ${U.kpi({ l: 'Anúncios em fadiga', v: f.num(cD.fadiga), raw: cD.fadiga, fmt: 'num', sub: 'freq. > 5 e ΔCTR < −15%', pri: cD.fadiga > 0 })}
    </div>
    ${U.card('Frequência × ΔCTR', U.chartBox('ftSc', 'tall'), `<span class="seg" id="ftScSeg"><button data-s="adsets" class="on">Conjuntos</button><button data-s="ads">Anúncios</button></span>`, 'Cada ponto é um conjunto ou anúncio com base de comparação. A área sombreada (frequência acima de 5 e CTR caindo mais de 15%) é o quadrante de fadiga. Pontos à direita da linha vertical já ultrapassaram frequência 5: mesmo com CTR estável, o público está saturando.')}
    <div id="ftTable">${tableHtml()}</div>`;
  }

  function scatter(kind) {
    const pts = items(kind).filter(r => r.ctr_delta_pct != null && r.frequency != null);
    const groups = ['fadiga', 'atencao', 'saudavel'].map(s => ({ label: LBL[s], data: pts.filter(r => r.status === s).map(r => ({ x: +r.frequency.toFixed(2), y: +r.ctr_delta_pct.toFixed(1), n: r.name, s: r.spend })), backgroundColor: COL[s] + '80', borderColor: COL[s], borderWidth: 1, pointRadius: 4, pointHoverRadius: 6 }));
    const xs = pts.map(p => p.frequency), ys = pts.map(p => p.ctr_delta_pct);
    const xMax = Math.max(6, Math.ceil(Math.max(...xs, 0) + .5)), yMin = Math.min(-30, Math.floor(Math.min(...ys, 0) / 10) * 10), yMax = Math.max(30, Math.ceil(Math.max(...ys, 0) / 10) * 10);
    const zones = { id: 'ftZones', beforeDatasetsDraw(ch) { const { ctx, chartArea: A, scales: { x, y } } = ch; if (!A) return;
      const x5 = x.getPixelForValue(5), y15 = y.getPixelForValue(-15);
      ctx.save(); ctx.fillStyle = 'rgba(255,59,48,.06)'; ctx.fillRect(x5, y15, A.right - x5, A.bottom - y15);
      ctx.strokeStyle = U.C.ln; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x5, A.top); ctx.lineTo(x5, A.bottom); ctx.moveTo(A.left, y15); ctx.lineTo(A.right, y15); ctx.stroke();
      ctx.setLineDash([]); ctx.fillStyle = U.C.t2; ctx.font = '10.5px -apple-system, Inter, system-ui'; ctx.textAlign = 'right'; ctx.fillText('Fadiga', A.right - 6, A.bottom - 8); ctx.restore(); } };
    U.chart('ftSc', { type: 'scatter', data: { datasets: groups }, plugins: [zones],
      options: { interaction: { mode: 'nearest', intersect: true }, plugins: { tooltip: { callbacks: { title: it => String(it[0].raw.n).slice(0, 48), label: c => [` Frequência ${f.num(c.raw.x, 2)} · ΔCTR ${(c.raw.y > 0 ? '+' : '') + f.num(c.raw.y, 1)}%`, ` Investimento ${f.brl(c.raw.s)}`] } } },
        scales: { x: { min: 0, max: xMax, title: { display: true, text: 'Frequência no período', color: U.C.t2, font: { size: 10.5 } }, grid: { display: false } }, y: { min: yMin, max: yMax, beginAtZero: false, title: { display: true, text: 'ΔCTR 2ª metade vs 1ª', color: U.C.t2, font: { size: 10.5 } }, ticks: { callback: v => (v > 0 ? '+' : '') + v + '%' } } } } });
  }

  function mount(host) {
    const wrap = host.querySelector('#ftTable');
    const rerender = () => { wrap.innerHTML = tableHtml(); wrap.querySelectorAll('table.tbl').forEach(U.bindSort); };
    host.addEventListener('click', e => {
      const t = e.target.closest('#ftTabs button'); if (t) { S.tab = t.dataset.t; S.filt = 'all'; rerender(); return; }
      const s = e.target.closest('#ftSeg button'); if (s) { S.filt = s.dataset.f; rerender(); return; }
      const sc = e.target.closest('#ftScSeg button'); if (sc) { host.querySelectorAll('#ftScSeg button').forEach(b => b.classList.toggle('on', b === sc)); scatter(sc.dataset.s); return; }
      const o = e.target.closest('[data-open]'); if (o) { const n = nodes[S.tab].get(o.dataset.open); if (n) U.nodePanel(S.tab === 'adsets' ? 'Conjunto' : 'Anúncio', n); }
    });
    scatter('adsets');
  }
  window.SEC = window.SEC || {};
  window.SEC.fadiga = { title: 'Fadiga', render: () => { S.tab = 'adsets'; S.filt = 'all'; return render(); }, mount, count: () => cA.fadiga + cD.fadiga };
})();
