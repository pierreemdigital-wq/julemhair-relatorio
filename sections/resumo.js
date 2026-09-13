/* Resumo executivo — veredito do período, KPIs com comparativo, receita diária Meta × loja, funil, reconciliação e alertas estruturais */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const K = G.kpi || {}, cur = K.cur || {}, prv = K.prv || {}, ecom = K.ecom || {}, marg = K.marginal || {}, mer = K.mer || {};
  const n = v => (v == null || isNaN(v) ? null : v);
  const pctAbs = (a, b) => (b ? Math.abs((a - b) / b * 100) : null);

  /* ---------- números do veredito ---------- */
  const dSpend = pctAbs(cur.spend, prv.spend), dRev = pctAbs(cur.revenue, prv.revenue);
  const spendUp = (cur.spend || 0) >= (prv.spend || 0), revUp = (cur.revenue || 0) >= (prv.revenue || 0);
  const mRoas = n(marg.marginal_roas ?? ecom.roas_marginal);
  const merV = n(mer.mer ?? ecom.mer);
  const lojaRev = n(mer.store_revenue ?? G.nuvem?.revenue);
  const gapPct = n(ecom.gap_pct);

  /* ---------- séries diárias ---------- */
  const D = Array.isArray(G.daily) ? G.daily : [];
  const MODES = {
    rev: { t: 'Receita', y: U.yBRL, s: [['Receita Meta · atual', d => d.rev], ['Receita Meta · anterior', d => d.p_rev], ['Receita da loja', d => d.loja_rev]] },
    roas: { t: 'ROAS', y: { ticks: { callback: v => f.num(v, 1) + 'x' } }, s: [['ROAS Meta · atual', d => d.roas], ['ROAS Meta · anterior', d => d.p_roas], ['MER diário · loja ÷ verba', d => d.spend ? d.loja_rev / d.spend : null]] },
    pur: { t: 'Compras', y: {}, s: [['Compras Meta · atual', d => d.pur], ['Compras Meta · anterior', d => d.p_pur], ['Pedidos pagos da loja', d => d.loja_orders]] },
  };
  function drawChart(mode) {
    const m = MODES[mode] || MODES.rev, colors = [U.C.cur, U.C.prv, U.C.loja];
    const pick = fn => D.map(d => { const v = fn(d); return v == null || isNaN(v) ? null : +v; });
    U.chart('rsChart', { type: 'line', data: { labels: D.map(d => f.dt(d.date)), datasets: m.s.map(([l, fn], i) => U.line(l, pick(fn), colors[i], i === 1, i === 0)) },
      options: { scales: { y: m.y }, plugins: { tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${mode === 'rev' ? f.brl(c.parsed.y) : mode === 'roas' ? f.x(c.parsed.y) : f.num(c.parsed.y)}` } } } } });
  }

  /* ---------- funil ---------- */
  const STEP = { impressions: 'Impressões', clicks: 'Cliques', landing_page_view: 'Visualizações de página', view_content: 'Visualizações de produto', add_to_cart: 'Adições ao carrinho', initiate_checkout: 'Inícios de checkout', purchase: 'Compras' };
  const funnelSteps = (G.funnel?.steps || []).map(s => ({ n: STEP[s.step] || s.step, v: +s.value || 0 }));

  /* ---------- alertas ---------- */
  function alerts() {
    const S = G.structure || {}, pw = S.paused_with_budget || {}, A = G.audiences?.summary || {}, L = G.library || {}, R = G.rules || {}, N = S.naming || {};
    const idle = L.idle_pct == null ? null : L.idle_pct <= 1 ? L.idle_pct * 100 : L.idle_pct;
    const rulesOn = Array.isArray(R.rules) ? R.rules.filter(r => r.status === 'ENABLED').length : (R.count ?? null);
    const madgicx = Array.isArray(R.rules) ? R.rules.filter(r => /madgicx/i.test(r.name || '')).length : 0;
    const rows = [];
    if (pw.count != null) rows.push(U.alertRow('c', `${f.brl(pw.daily_budget_stuck_brl)}/dia presos em ${f.num(pw.count)} campanhas pausadas`,
      `Orçamento diário configurado que não roda. Não gasta, mas polui a conta, distorce qualquer leitura de verba planejada e é reativado com um clique errado.`,
      `Arquivar as ${f.num(pw.count)} campanhas pausadas há mais de 30 dias e zerar o orçamento das que ficarem.`));
    if (A.total_audiences != null) rows.push(U.alertRow('c', `${f.num(A.orphans)} de ${f.num(A.total_audiences)} públicos salvos sem uso`,
      `Só ${f.num(A.audiences_in_active_adsets)} público${A.audiences_in_active_adsets === 1 ? '' : 's'} em conjuntos ativos; ${f.num(A.undeliverable)} sem entrega e ${f.num(A.too_small)} abaixo do tamanho mínimo. A segmentação de hoje não usa a base construída.`,
      `Reconstruir 4 públicos-base (compradores 180d, carrinho 30d, visitantes 30d, engajados 90d) e excluir compradores das campanhas de aquisição.`));
    if (idle != null) rows.push(U.alertRow('w', `${f.pct(idle, 0)} da biblioteca de criativos ociosa`,
      `${f.num(L.creatives_used)} de ${f.num(L.creatives_total)} criativos rodaram nos últimos ${L.period?.days || 30} dias. O volume de produção não vira teste.`,
      `Definir rotina de 6 a 8 criativos novos por semana, com teste controlado e critério de corte em 3 dias.`));
    if (rulesOn != null) rows.push(U.alertRow('w', `${f.num(rulesOn)} regras automáticas ativas${madgicx ? ` · ${f.num(madgicx)} da Madgicx` : ''}`,
      `Regras externas pausam e criam anúncios sem passar pela operação. Toda mudança que a Madgicx faz aparece no histórico como se fosse a equipe.`,
      `Desativar as regras que não têm dono nomeado e manter só as documentadas em playbook.`));
    if (N.score_pct != null) rows.push(U.alertRow('i', `Nomenclatura em ${f.pct(N.score_pct, 0)} de conformidade`,
      `${f.num(N.non_compliant)} de ${f.num((N.compliant || 0) + (N.non_compliant || 0))} campanhas fora do padrão. Sem nome padronizado, não há relatório automático confiável.`,
      `Renomear as ${f.num(S.totals?.campaigns_by_status?.ACTIVE)} campanhas ativas esta semana; arquivar as demais.`));
    return rows.join('') || '<div class="empty">Sem alertas estruturais no período.</div>';
  }

  /* ---------- render ---------- */
  function render() {
    const per = G.meta?.period, pper = G.meta?.previous;
    const lead = U.lead(
      `Investimento ${spendUp ? 'subiu' : 'caiu'} ${f.pct(dSpend)} e a receita ${revUp ? 'subiu' : 'caiu'} ${f.pct(dRev)}. Cada real adicional voltou ${mRoas == null ? '—' : f.x(mRoas)}.`,
      `ROAS marginal de <b>${mRoas == null ? '—' : f.x(mRoas)}</b> significa que os <b>${f.brl(marg.delta_spend)}</b> a mais de verba trouxeram <b>${f.brl(marg.delta_revenue)}</b> a mais de receita — o incremento não pagou a si mesmo. A frequência foi de ${f.num(prv.frequency, 2)} para <b>${f.num(cur.frequency, 2)}</b>, CPM subiu ${f.pct(pctAbs(cur.cpm, prv.cpm))} e o ticket caiu ${f.pct(pctAbs(cur.ticket, prv.ticket))}: a conta está saturando o mesmo público com os mesmos criativos. Antes de escalar, trocar criativo e público.`,
      merV == null ? '' : f.x(merV), 'MER · ' + U.MER_DEF);

    const kp = `<div class="kpis">${U.kpiCmp('Faturamento', cur.revenue, prv.revenue, f.brl, false, true)}${U.kpiCmp('Investimento', cur.spend, prv.spend, f.brl, true)}${U.kpiCmp('ROAS', cur.roas, prv.roas, f.x)}${U.kpiCmp('Compras', cur.purchases, prv.purchases, f.num)}</div>`;
    const ks = `<div class="kpis six">${U.kpiCmp('CPA', cur.cpa, prv.cpa, f.brl2, true)}${U.kpiCmp('Ticket', cur.ticket, prv.ticket, f.brl2)}${U.kpiCmp('CTR', cur.ctr, prv.ctr, v => f.pct(v, 2))}${U.kpiCmp('CPC', cur.cpc, prv.cpc, f.brl2, true)}${U.kpiCmp('CPM', cur.cpm, prv.cpm, f.brl2, true)}${U.kpiCmp('Frequência', cur.frequency, prv.frequency, v => f.num(v, 2), true)}</div>`;
    const ke = `<div class="ph sub"><div><div class="h2">E-commerce</div><div class="h1-sub">Loja como fonte de verdade · ${f.num(G.nuvem?.orders_paid)} pedidos pagos · ${f.brl(lojaRev)}</div></div></div>
      <div class="kpis">${U.kpi({ l: 'MER', v: f.x(merV), raw: merV, fmt: 'x', sub: U.MER_DEF })}${U.kpi({ l: 'CAC blended', v: f.brl2(ecom.cac_blended), raw: n(ecom.cac_blended), fmt: 'brl2', sub: 'verba ÷ pedidos pagos da loja' })}${U.kpi({ l: 'Verba sobre receita', v: f.pct(ecom.spend_share_of_rev), raw: n(ecom.spend_share_of_rev), fmt: 'pct', sub: 'parte da receita da loja que vai para mídia' })}${U.kpi({ l: 'Pedidos por dia', v: f.num(ecom.orders_per_day, 1), raw: n(ecom.orders_per_day), fmt: 'num', dec: 1, sub: `${f.brl(ecom.rev_per_day)} de receita por dia` })}</div>`;

    const seg = `<div class="seg" id="rsSeg"><button data-m="rev" class="on">Receita</button><button data-m="roas">ROAS</button><button data-m="pur">Compras</button></div>`;
    const g2 = `<div class="g2">${U.card('Últimos 30 dias · Meta × loja', U.chartBox('rsChart'), seg, `Linha cheia: período atual (${f.dt(per?.since)} – ${f.dt(per?.until)}). Tracejada: mesmo dia do período anterior (${f.dt(pper?.since)} – ${f.dt(pper?.until)}). Verde: dado confirmado pela loja.`)}${U.card('Funil do período', funnelSteps.length ? U.funnel(funnelSteps) : '<div class="empty">Sem dados de funil.</div>', '', `Percentual à direita é a taxa sobre a etapa anterior. Conversão total impressão → compra: ${f.pct(G.funnel?.overall_conversion_pct, 3)}.`)}</div>`;

    const rec = `<div class="card-b"><div class="g11">${U.kpi({ l: 'Atribuído pelo Meta', v: f.brl(cur.revenue), raw: cur.revenue, fmt: 'brl', sub: `${f.num(cur.purchases)} compras · janela padrão da conta` })}${U.kpi({ l: 'Confirmado pela loja', v: f.brl(lojaRev), raw: lojaRev, fmt: 'brl', sub: `${f.num(G.nuvem?.orders_paid)} pedidos pagos` })}</div>
      <div class="kv"><span>Diferença</span><b>${f.brl(ecom.gap_rev)} <span class="d ${gapPct != null && gapPct < 0 ? 'dn' : 'up'}">${gapPct == null ? '—' : (gapPct > 0 ? '+' : '−') + f.pct(Math.abs(gapPct))}</span> · o Meta enxerga ${f.pct(ecom.meta_share_of_store)} da receita da loja</b><span>Ticket</span><b>Meta ${f.brl2(ecom.aov_meta)} · loja ${f.brl2(ecom.aov_loja)}</b></div></div>`;
    const alHtml = alerts(), alN = (alHtml.match(/class="al /g) || []).length;
    const g11 = `<div class="g11">${U.card('Meta × Loja', rec, '', 'A loja é a fonte de verdade. A diferença é o que o Meta não enxerga sem CAPI: pedidos de quem clicou há mais de 7 dias, viu sem clicar, trocou de aparelho ou bloqueou o pixel. Decisão de verba se toma pelo MER, não pelo ROAS.')}${U.card('Alertas estruturais', alHtml, U.tag(`${alN} ${alN === 1 ? 'item' : 'itens'}`, 'n'))}</div>`;

    return `<div class="ph"><div><div class="h1">Resumo executivo</div><div class="h1-sub">Meta Ads e Nuvemshop · ${f.dt(per?.since)} – ${f.dt(per?.until)} vs ${f.dt(pper?.since)} – ${f.dt(pper?.until)}</div></div></div>${lead}${kp}${ks}${ke}${g2}${g11}`;
  }

  function mount(host) {
    drawChart('rev');
    const seg = host.querySelector('#rsSeg');
    if (seg) seg.onclick = e => { const b = e.target.closest('button'); if (!b) return; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); drawChart(b.dataset.m); };
  }

  window.SEC = window.SEC || {};
  window.SEC.resumo = { title: 'Resumo executivo', render, mount };
})();
