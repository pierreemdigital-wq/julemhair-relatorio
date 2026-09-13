/* Público & horários — demografia (idade × gênero), dispositivos, regiões, hora do dia */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const BK = G.breakdown || {};
  const AG = BK.agegender || { items: [], totals: {} }, DV = BK.device || { items: [], totals: {} }, RG = BK.region || { items: [], totals: {} }, HR = BK.hourly || { items: [], totals: {} };
  const n = v => (v == null || isNaN(v)) ? 0 : +v;
  const tot = n(AG.totals.spend) || AG.items.reduce((s, i) => s + n(i.spend), 0);
  const share = v => tot ? n(v) / tot * 100 : 0;

  const GEN = { female: 'Feminino', male: 'Masculino', unknown: 'Não informado' };
  const DEV = { iphone: 'iPhone', android_smartphone: 'Android (celular)', ipad: 'iPad', android_tablet: 'Android (tablet)', desktop: 'Desktop', other: 'Outro' };
  const gen = k => GEN[k] || f.esc(k || '—');
  const dev = k => DEV[k] || f.esc(String(k || '—').replace(/_/g, ' '));
  const region = s => f.esc(String(s || '—').replace(' (state)', '').replace('Federal District', 'Distrito Federal').replace('Unknown', 'Não informado'));
  const AGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

  /* ---- demografia ---- */
  const ag = AG.items.filter(i => n(i.spend) > 0);
  const byGen = k => ag.filter(i => i.gender === k).reduce((s, i) => s + n(i.spend), 0);
  const femPct = share(byGen('female'));
  const byAge = AGES.map(a => { const rows = ag.filter(i => i.age === a); const sp = rows.reduce((s, i) => s + n(i.spend), 0), rv = rows.reduce((s, i) => s + n(i.rev), 0), pu = rows.reduce((s, i) => s + n(i.pur), 0);
    const fem = rows.find(i => i.gender === 'female'); return { age: a, spend: sp, rev: rv, pur: pu, roas: sp ? rv / sp : 0, fem }; }).filter(a => a.spend > 0);
  const MIN_SP = 5000;
  const elig = byAge.filter(a => a.spend > MIN_SP);
  const best = elig.length ? elig.reduce((a, b) => b.roas > a.roas ? b : a) : null;
  const worst = elig.length ? elig.reduce((a, b) => b.roas < a.roas ? b : a) : null;
  const top = byAge.length ? byAge.reduce((a, b) => b.spend > a.spend ? b : a) : null;

  /* ---- dispositivos ---- */
  const dv = DV.items.filter(i => n(i.spend) > 0).sort((a, b) => n(b.spend) - n(a.spend));
  const dvTot = dv.reduce((s, i) => s + n(i.spend), 0);
  const mobile = dv.filter(i => /iphone|android_smartphone|mobile|phone/.test(i.impression_device)).reduce((s, i) => s + n(i.spend), 0);
  const mobPct = dvTot ? mobile / dvTot * 100 : 0;

  /* ---- horários ---- */
  const hours = HR.items.map(i => { const k = String(i.hourly_stats_aggregated_by_advertiser_time_zone || ''); const h = parseInt(k.slice(0, 2), 10); return { h: isNaN(h) ? -1 : h, ...i }; }).filter(i => i.h >= 0).sort((a, b) => a.h - b.h);
  const hmax = Math.max(...hours.map(i => n(i.rev)), 1);
  const hTotSp = hours.reduce((s, i) => s + n(i.spend), 0);
  const MIN_H = 2500; /* volume mínimo por hora */
  const hElig = hours.filter(i => n(i.spend) >= MIN_H && n(i.pur) >= 50);
  const hSorted = [...hElig].sort((a, b) => n(b.roas) - n(a.roas));
  const hBest = hSorted.slice(0, 3), hWorst = hSorted.slice(-3).reverse();
  const hh = h => String(h).padStart(2, '0') + 'h';

  /* ---- regiões ---- */
  const rg = RG.items.filter(i => n(i.spend) > 0).sort((a, b) => n(b.spend) - n(a.spend)).slice(0, 15);
  const rgMax = Math.max(...rg.map(i => n(i.spend)), 1);
  const rgHasRev = RG.items.some(i => n(i.rev) > 0);

  function leadText() {
    if (!ag.length) return ['Sem breakdown demográfico no período.', 'age × gender não retornou linhas com investimento.'];
    const h = `Público é ${f.pct(femPct, 0)} feminino; ${top ? `${top.age} concentra ${f.pct(share(top.spend), 0)} da verba com ROAS ${f.x(top.roas)}` : ''}${worst && worst !== top ? `, enquanto ${worst.age} devolve ${f.x(worst.roas)}` : ''}.`;
    const p = `${worst ? `A faixa ${worst.age} recebe ${f.brl(worst.spend)} (${f.pct(share(worst.spend))} da verba) com CPA ${f.brl2(worst.pur ? worst.spend / worst.pur : null)}${best ? ` contra ${f.brl2(best.pur ? best.spend / best.pur : null)} em ${best.age}` : ''}. ` : ''}Mobile responde por ${f.pct(mobPct, 0)} do investimento; a página precisa ser julgada no celular, não no desktop.`;
    return [h, p];
  }

  function demoTable() {
    const rows = ag.slice().sort((a, b) => n(b.spend) - n(a.spend));
    const mx = Math.max(...rows.map(r => n(r.spend)), 1);
    const cols = [
      { t: 'Faixa · gênero', type: 'txt', k: r => `${r.age} ${gen(r.gender)}`, h: r => `<div class="nm">${f.esc(r.age === 'Unknown' ? 'Não informada' : r.age)} <span class="faint">·</span> ${gen(r.gender)}</div>${U.bar(n(r.spend), mx)}` },
      { t: 'Investimento', r: 1, k: r => n(r.spend), h: r => f.brl(r.spend) },
      { t: '% verba', r: 1, k: r => share(r.spend), h: r => f.pct(share(r.spend)) },
      { t: 'Faturamento', r: 1, k: r => n(r.rev), h: r => `<b>${f.brl(r.rev)}</b>` },
      { t: 'ROAS', r: 1, k: r => n(r.roas), h: r => n(r.pur) && n(r.spend) ? U.roasTag(n(r.roas), n(r.pur)) : '<span class="faint">—</span>' },
      { t: 'Compras', r: 1, k: r => n(r.pur), h: r => f.num(r.pur) },
      { t: 'CPA', r: 1, k: r => n(r.cpa), h: r => n(r.pur) ? f.brl2(r.cpa) : '<span class="faint">—</span>' },
      { t: 'CTR', r: 1, k: r => n(r.ctr), h: r => f.pct(r.ctr, 2) },
      { t: 'CPM', r: 1, k: r => n(r.cpm), h: r => f.brl2(r.cpm) },
    ];
    return U.table('pbDemo', cols, rows);
  }

  function hourTable() {
    const cols = [
      { t: 'Hora', k: r => r.h, h: r => `<span class="mono">${hh(r.h)}–${hh(r.h + 1 > 23 ? 0 : r.h + 1)}</span>` },
      { t: 'Investimento', r: 1, k: r => n(r.spend), h: r => `${f.brl(r.spend)}${U.bar(n(r.spend), Math.max(...hours.map(i => n(i.spend)), 1))}` },
      { t: 'Faturamento', r: 1, k: r => n(r.rev), h: r => `<b>${f.brl(r.rev)}</b>` },
      { t: 'ROAS', r: 1, k: r => n(r.roas), h: r => n(r.pur) ? U.roasTag(n(r.roas), n(r.pur)) : '<span class="faint">—</span>' },
      { t: 'Compras', r: 1, k: r => n(r.pur), h: r => f.num(r.pur) },
      { t: 'CPA', r: 1, k: r => n(r.cpa), h: r => n(r.pur) ? f.brl2(r.cpa) : '<span class="faint">—</span>' },
      { t: 'CTR', r: 1, k: r => n(r.ctr), h: r => f.pct(r.ctr, 2) },
    ];
    return U.table('pbHour', cols, hours);
  }

  function heat() {
    if (!hours.length) return '<div class="empty">Sem breakdown por hora.</div>';
    const cells = Array.from({ length: 24 }, (_, h) => hours.find(i => i.h === h) || { h, spend: 0, rev: 0, pur: 0, roas: 0 });
    return `<div class="card-b"><div class="heat">${cells.map(c => `<i data-h="${c.h}" data-i="${(n(c.rev) / hmax).toFixed(3)}" title="${hh(c.h)} · investimento ${f.brl(c.spend)} · faturamento ${f.brl(c.rev)} · ROAS ${f.x(n(c.roas))} · ${f.num(c.pur)} compras"></i>`).join('')}</div><div class="heat-l">${cells.map(c => `<span>${String(c.h).padStart(2, '0')}</span>`).join('')}</div></div>`;
  }

  function hourNote() {
    if (!hElig.length) return 'Nenhuma hora atingiu o volume mínimo para leitura de ROAS.';
    const li = a => a.map(i => `<b>${hh(i.h)}</b> ${f.x(i.roas)} (${f.num(i.pur)} compras)`).join(' · ');
    return `Melhores horas por ROAS: ${li(hBest)}. Piores: ${li(hWorst)}. Considerando só horas com ao menos ${f.brl(MIN_H)} investidos e 50 compras (${hElig.length} de ${hours.length}). Fuso da conta: ${f.esc(G.meta && G.meta.account && G.meta.account.timezone_name || '—')}.`;
  }

  function regionTable() {
    const cols = [
      { t: 'Região', type: 'txt', k: r => region(r.region), h: r => `<div class="nm">${region(r.region)}</div>${U.bar(n(r.spend), rgMax)}` },
      { t: 'Investimento', r: 1, k: r => n(r.spend), h: r => f.brl(r.spend) },
      { t: '% verba', r: 1, k: r => share(r.spend), h: r => f.pct(share(r.spend)) },
      { t: 'Impressões', r: 1, k: r => n(r.impressions), h: r => f.num(r.impressions) },
      { t: 'Alcance', r: 1, k: r => n(r.reach), h: r => f.num(r.reach) },
      { t: 'Cliques', r: 1, k: r => n(r.clicks), h: r => f.num(r.clicks) },
      { t: 'CTR', r: 1, k: r => n(r.ctr), h: r => f.pct(r.ctr, 2) },
      { t: 'CPM', r: 1, k: r => n(r.cpm), h: r => f.brl2(r.cpm) },
    ];
    if (rgHasRev) cols.push({ t: 'ROAS', r: 1, k: r => n(r.roas), h: r => n(r.pur) ? U.roasTag(n(r.roas), n(r.pur)) : '<span class="faint">—</span>' });
    return U.table('pbReg', cols, rg);
  }

  function render() {
    const [h, p] = leadText();
    return `<div class="ph"><div><div class="h1">Público & horários</div><div class="h1-sub">Quem vê, em que aparelho, onde e a que hora · ${f.dt(AG.period && AG.period.since)} – ${f.dt(AG.period && AG.period.until)}</div></div></div>
    ${U.lead(h, p, top ? f.x(top.roas) : '', top ? `ROAS ${top.age}` : '')}
    <div class="kpis">
      ${U.kpi({ l: 'Público feminino', v: f.pct(femPct), raw: femPct, fmt: 'pct', sub: `${f.brl(byGen('female'))} de ${f.brl(tot)} investidos` })}
      ${U.kpi({ l: 'Faixa mais rentável', v: best ? best.age : '—', sub: best ? `ROAS ${f.x(best.roas)} · ${f.num(best.pur)} compras · ${f.pct(share(best.spend))} da verba` : 'sem faixa acima de R$ 5 mil' })}
      ${U.kpi({ l: 'Faixa menos rentável', v: worst ? worst.age : '—', sub: worst ? `ROAS ${f.x(worst.roas)} · ${f.num(worst.pur)} compras · ${f.pct(share(worst.spend))} da verba` : 'sem faixa acima de R$ 5 mil' })}
      ${U.kpi({ l: 'Mobile', v: f.pct(mobPct), raw: mobPct, fmt: 'pct', sub: `iPhone ${f.pct(dvTot ? n((dv.find(i => i.impression_device === 'iphone') || {}).spend) / dvTot * 100 : 0, 0)} · Android ${f.pct(dvTot ? n((dv.find(i => i.impression_device === 'android_smartphone') || {}).spend) / dvTot * 100 : 0, 0)}` })}
    </div>
    <div class="g2">
      ${U.card('Investimento × ROAS por faixa etária', U.chartBox('pbAge', 'tall'), '<span class="cnt">só público feminino</span>', `Barras: investimento (eixo esquerdo). Linha: ROAS (eixo direito). Masculino soma ${f.pct(share(byGen('male')))} da verba e não muda a leitura.`)}
      ${U.card('Dispositivos', U.chartBox('pbDev', 'tall'), '', `Tablet e desktop somam ${f.pct(dvTot ? dv.filter(i => !/iphone|android_smartphone/.test(i.impression_device)).reduce((s, i) => s + n(i.spend), 0) / dvTot * 100 : 0, 2)} — sem volume para leitura.`)}
    </div>
    ${U.card('Horários', heat() + hourTable(), `<span class="cnt">intensidade por faturamento</span>`, hourNote())}
    ${U.card('Demografia completa', demoTable(), `<span class="cnt">${ag.length} combinações</span>`, `Faixas com menos de 50 compras aparecem em cinza (n<50): ROAS instável, não deve orientar decisão.`)}
    ${U.card('Regiões · top 15 por investimento', regionTable(), `<span class="cnt">${RG.items.filter(i => n(i.spend) > 0).length} regiões com entrega</span>`, rgHasRev ? '' : 'A Meta não atribui receita nem compras no breakdown por região para esta conta (janela de atribuição não suportada). Leia só entrega: investimento, impressões, cliques e CTR. Para rentabilidade por estado, cruzar com pedidos da loja por UF.')}`;
  }

  function mount(host) {
    /* heatmap: intensidade proporcional ao faturamento da hora */
    host.querySelectorAll('.heat i').forEach(el => { const a = Math.max(.08, parseFloat(el.dataset.i) || 0); el.style.background = `rgba(0,113,227,${a.toFixed(3)})`; });

    const fem = AGES.map(a => ag.find(i => i.age === a && i.gender === 'female') || { spend: 0, roas: 0, pur: 0 });
    U.chart('pbAge', {
      data: { labels: AGES, datasets: [
        { type: 'bar', label: 'Investimento', data: fem.map(i => n(i.spend)), backgroundColor: U.C.cur, borderRadius: 4, maxBarThickness: 44, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'ROAS', data: fem.map(i => n(i.roas)), borderColor: U.C.loja, backgroundColor: U.C.loja, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: .3, yAxisID: 'y2', order: 1 },
      ] },
      options: { scales: { y: U.yBRL, y2: { position: 'right', grid: { display: false }, border: { display: false }, beginAtZero: true, ticks: { color: U.C.t2, font: { size: 10.5 }, callback: v => f.x(v) } } },
        plugins: { tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y2' ? ` ROAS ${f.x(c.raw)} · ${f.num(fem[c.dataIndex].pur)} compras` : ` ${c.dataset.label} ${f.brl(c.raw)}` } } } },
    });
    U.chart('pbDev', {
      type: 'doughnut',
      data: { labels: dv.map(i => dev(i.impression_device)), datasets: [{ data: dv.map(i => n(i.spend)), backgroundColor: dv.map((_, i) => U.C.pal[i % U.C.pal.length]), borderWidth: 2, borderColor: '#FFFFFF', hoverOffset: 4 }] },
      options: { cutout: '62%', interaction: { mode: 'nearest', intersect: true }, scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { callbacks: { label: c => ` ${f.brl(c.raw)} · ${f.pct(dvTot ? c.raw / dvTot * 100 : 0)} · ROAS ${f.x(n(dv[c.dataIndex].roas))}` } } } },
    });
  }

  window.SEC = window.SEC || {};
  window.SEC.publico = { title: 'Público & horários', render, mount };
})();
