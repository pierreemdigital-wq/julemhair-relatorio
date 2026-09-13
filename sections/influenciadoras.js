/* Influenciadoras — cupons por parceira: separação institucional × parceira × vale de envio, ranking, concentração e cruzamento com a campanha C6 Colab */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const N = G.nuvem || {};
  const n0 = v => (v == null || isNaN(v)) ? 0 : +v;
  const pct = (a, b) => b ? a / b * 100 : null;

  /* ---- classificação por heurística ----
     sistema      : códigos gerados pela plataforma (CB-xxxx, DRAFT-ORDER-, EDIT-ORDER-, CUPOMCASHUNICO) — não são cupons de marketing
     vale         : NOMEJUHAIR100 / 100NOMEJUHAIR — desconto absoluto de R$ 100 usado 1x: produto enviado à parceira (seeding), não venda gerada por ela
     institucional: código sem nome próprio, formado por palavra genérica de campanha (boas-vindas, carrinho, madrugada, VIP, pix, volta, brinde, frete, marca)
     parceira     : todo o resto — padrão NOME5, NOMEJUHAIR, NOME + número ou nome isolado */
  const INST = /^(BEMVINDA|JULEME|MADRUGA|CARRINHO|CART|VIP|VOLTEI|PIXDAY|PRAVOCE|TOUCA|TEMBRINDE|BRINDE|FRETEGRATIS|CUPOM|PROMO|DESCONTO|BLACK|NATAL|LIVE|KIT)/i;
  const cls = c => {
    const k = String(c.code || '').toUpperCase();
    if (/^(CB-|DRAFT-ORDER|EDIT-ORDER|CUPOMCASHUNICO)/.test(k)) return 'sistema';
    if (/JUHAIR100$|^100[A-Z]+JUHAIR$|HAIR100$/.test(k)) return 'vale';
    if (INST.test(k)) return 'institucional';
    return 'parceira';
  };
  const all = (N.coupons || []).map(c => Object.assign({}, c, { grp: cls(c) }));
  const by = g => all.filter(c => c.grp === g).sort((a, b) => n0(b.rev) - n0(a.rev));
  const P = by('parceira'), I = by('institucional'), V = by('vale'), SYS = by('sistema');
  const agg = arr => arr.reduce((s, c) => ({ n: s.n + n0(c.n), rev: s.rev + n0(c.rev), disc: s.disc + n0(c.disc) }), { n: 0, rev: 0, disc: 0 });
  const aP = agg(P), aI = agg(I), aV = agg(V), aS = agg(SYS);
  const paid = n0(N.orders_paid), rev = n0(N.revenue), ticketGeral = N.ticket != null ? N.ticket : (paid ? rev / paid : null);
  const ticketP = aP.n ? aP.rev / aP.n : null;
  const cupOrders = n0(N.coupon_orders), cupShare = pct(cupOrders, paid);
  const bem = all.find(c => c.code === 'BEMVINDA5');
  const c6 = (G.tree || []).find(c => /Colab Influenciadoras/i.test(c.name)) || null;
  const c6m = c6 && c6.metrics ? c6.metrics.cur : null, c6p = c6 && c6.metrics ? c6.metrics.prv : null;
  const top5 = agg(P.slice(0, 5)), cauda = P.filter(c => n0(c.n) < 5);

  const cupCols = (total, mx) => [
    { t: 'Cupom', type: 'txt', k: c => c.code, h: c => `<div class="nm mono" title="${f.esc(c.code)}">${f.esc(c.code)}</div>${U.bar(n0(c.rev), mx)}` },
    { t: 'Regra', c: 1, type: 'txt', k: c => c.type, h: c => `<span class="muted">${c.type === 'percentage' ? f.num(+c.value, 0) + '%' : c.type === 'absolute' ? f.brl(+c.value) : f.esc(c.type || '—')}</span>` },
    { t: 'Pedidos', r: 1, k: c => n0(c.n), h: c => f.num(c.n) },
    { t: 'Faturamento', r: 1, k: c => n0(c.rev), h: c => `<b>${f.brl(c.rev)}</b>` },
    { t: 'Ticket', r: 1, k: c => n0(c.ticket), h: c => f.brl2(c.ticket) },
    { t: 'Desconto', r: 1, k: c => n0(c.disc), h: c => f.brl2(c.disc) },
    { t: 'Receita líquida', r: 1, k: c => n0(c.rev) - n0(c.disc), h: c => f.brl(n0(c.rev) - n0(c.disc)) },
    { t: '% do grupo', r: 1, k: c => pct(n0(c.rev), total) || 0, h: c => f.pct(pct(n0(c.rev), total)) },
  ];

  function render() {
    const leadP = `<b>${f.pct(cupShare, 0)}</b> dos pedidos pagos (${f.num(cupOrders)}) usaram cupom. O maior é <b>BEMVINDA5</b>, boas-vindas do site, com ${f.num(bem?.n)} pedidos — não é influenciadora. Retirando institucionais e códigos de sistema, ${f.num(P.length)} códigos de parceira geraram ${f.brl(aP.rev)} em ${f.num(aP.n)} pedidos, ${f.pct(pct(aP.rev, rev))} do faturamento da loja.`;
    const kpis = `<div class="kpis">
      ${U.kpi({ l: 'Receita via cupom de parceira', v: f.brl(aP.rev), raw: aP.rev, fmt: 'brl', sub: `${f.pct(pct(aP.rev, rev))} do faturamento pago · ${f.num(P.length)} códigos`, pri: true })}
      ${U.kpi({ l: 'Pedidos com cupom de parceira', v: f.num(aP.n), raw: aP.n, fmt: 'num', sub: `${f.pct(pct(aP.n, cupOrders))} dos pedidos com cupom` })}
      ${U.kpi({ l: 'Ticket parceiras vs geral', v: f.brl2(ticketP), raw: ticketP, fmt: 'brl2', d: f.delta(ticketP, ticketGeral), sub: `vs ${f.brl2(ticketGeral)} geral` })}
      ${U.kpi({ l: 'Desconto concedido', v: f.brl2(aP.disc), raw: aP.disc, fmt: 'brl2', sub: `${f.pct(pct(aP.disc, aP.rev))} da receita via parceira` })}
    </div>`;

    const rank = U.card('Ranking de parceiras · top 30', `<div class="card-b"><div class="tb"><input class="search" id="inQ" placeholder="Filtrar código"><span class="cnt">${Math.min(30, P.length)} de ${P.length} códigos · ${f.brl(aP.rev)}</span></div></div>` + U.table('inTbl', cupCols(aP.rev, Math.max(...P.map(c => n0(c.rev)), 1)), P.slice(0, 30)), '',
      '<b>Regra de classificação.</b> Parceira: código com nome próprio (padrão NOME5, NOMEJUHAIR, NOME + número). Institucional: palavra genérica de campanha sem nome próprio (BEMVINDA, JULEME, MADRUGA, CARRINHO, CART, VIP, VOLTEI, PIXDAY, PRAVOCE, TOUCA, BRINDE, FRETEGRATIS). Vale de envio: NOMEJUHAIR100 — R$ 100 absolutos usados 1x, produto enviado à parceira, não venda gerada por ela. Sistema: CB-, DRAFT-ORDER, EDIT-ORDER. Receita líquida = faturamento − desconto. % do grupo = participação sobre a receita do próprio grupo.');

    const g2 = `<div class="g2">
      ${U.card('Top 12 parceiras por faturamento', U.chartBox('inBars', 'tall'), '', 'Barra = faturamento bruto dos pedidos com o código. O desconto de 5% médio é pequeno; o custo real da parceria (cachê, produto enviado) não está na loja.')}
      ${U.card('Vales de envio (seeding)', `<div class="card-b"><div class="kv"><span>Códigos</span><b class="num">${f.num(V.length)}</b><span>Pedidos</span><b class="num">${f.num(aV.n)}</b><span>Receita registrada</span><b class="num">${f.brl2(aV.rev)}</b><span>Valor em produto enviado</span><b class="num">${f.brl2(aV.disc)}</b><span>Códigos de sistema</span><b class="num">${f.num(SYS.length)} · ${f.num(aS.n)} pedidos</b></div></div>`, '', `${f.num(V.length)} parceiras receberam produto via vale NOMEJUHAIR100 no período. É o funil de recrutamento: cada vale deveria virar um código NOME5 ativo nas semanas seguintes. Hoje só ${f.num(V.filter(v => P.some(p => p.code.replace(/5$|JUHAIR$/, '') === v.code.replace(/JUHAIR100$|^100|HAIR100$/g, ''))).length)} dos vales têm código de venda correspondente na lista.`)}
    </div>`;

    const inst = U.card('Institucionais', U.table('inInst', cupCols(aI.rev, Math.max(...I.map(c => n0(c.rev)), 1)), I), `<span class="faint">${f.num(I.length)} códigos · ${f.num(aI.n)} pedidos · ${f.brl(aI.rev)}</span>`,
      `BEMVINDA5 responde por ${f.pct(pct(n0(bem?.rev), aI.rev), 0)} do grupo: é o desconto padrão do pop-up de e-mail, não uma ação promocional. Ticket dos institucionais ${f.brl2(aI.n ? aI.rev / aI.n : null)} vs ${f.brl2(ticketP)} das parceiras.`);

    const c6Txt = c6m ? `A campanha <b>${f.esc(c6.name)}</b> investiu ${f.brl(c6m.spend)} e a Meta atribui a ela ${f.brl(c6m.revenue)} (ROAS ${f.x(c6m.roas)}, ${f.num(c6m.purchases)} compras${c6p && c6p.spend ? `, investimento ${f.dOnly(c6m.spend, c6p.spend, true)} vs anterior` : ''}). Na loja, os códigos de parceira somam ${f.brl(aP.rev)} em ${f.num(aP.n)} pedidos. São medidas diferentes do mesmo esforço: a campanha anuncia o conteúdo da parceira, o cupom captura quem digitou o código.` : 'Campanha C6 Colab Influenciadoras não encontrada em G.tree.';
    const leitura = U.card('Leitura', `
      ${U.alertRow(pct(top5.rev, aP.rev) > 50 ? 'w' : 'i', `Top 5 parceiras concentram ${f.pct(pct(top5.rev, aP.rev), 0)} da receita via parceira`, `${P.slice(0, 5).map(c => c.code).join(', ')} somam ${f.brl(top5.rev)} de ${f.brl(aP.rev)}. As demais ${f.num(P.length - 5)} parceiras dividem ${f.brl(aP.rev - top5.rev)}.`, 'Negociar contrato recorrente com as 5 e definir meta mínima de pedidos por código para renovar as demais.')}
      ${U.alertRow(cauda.length > P.length / 2 ? 'w' : 'i', `${f.num(cauda.length)} parceiras com menos de 5 pedidos`, `${f.pct(pct(cauda.length, P.length), 0)} dos ${f.num(P.length)} códigos ativos geraram ${f.brl(agg(cauda).rev)} juntos (${f.pct(pct(agg(cauda).rev, aP.rev))} do grupo). Cauda longa: custo de envio de produto e gestão sem retorno mensurável.`, 'Encerrar códigos sem pedido há 60 dias; concentrar seeding em perfis com histórico de conversão.')}
      ${U.alertRow('i', 'Cruzar cupom com a campanha C6 Colab do Meta', c6Txt, c6m ? `Marcar cada anúncio da C6 com o código da parceira que aparece nele e comparar pedidos por cupom × compras atribuídas, anúncio a anúncio. Onde o cupom fecha e o pixel não, a atribuição está subestimada; onde o pixel fecha e o cupom não, a criadora não está convertendo o próprio público.` : '')}
    `);

    return `<div class="ph"><div><div class="h1">Influenciadoras</div><div class="h1-sub">Cupons por parceira · ${f.num(N.coupon_codes)} códigos usados em ${f.num(cupOrders)} pedidos pagos · Nuvemshop</div></div></div>`
      + U.lead(`${f.num(P.length)} códigos de parceira geraram ${f.brl(aP.rev)} (${f.pct(pct(aP.rev, rev), 0)} da loja); top 5 concentram ${f.pct(pct(top5.rev, aP.rev), 0)} e ${f.num(cauda.length)} têm menos de 5 pedidos.`, leadP, f.brl(aP.rev), 'via cupom de parceira')
      + kpis + rank + g2 + inst + leitura;
  }

  function mount(host) {
    const t12 = P.slice(0, 12);
    U.chart('inBars', { type: 'bar', data: { labels: t12.map(c => c.code), datasets: [{ label: 'Faturamento', data: t12.map(c => n0(c.rev)), backgroundColor: U.C.cur, borderRadius: 4, barThickness: 16 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: i => ` ${f.brl(i.raw)} · ${f.num(t12[i.dataIndex].n)} pedidos · ticket ${f.brl2(t12[i.dataIndex].ticket)}` } } },
        scales: { x: { grid: { color: '#F0F0F3', drawTicks: false }, ticks: U.yBRL.ticks, border: { display: false } }, y: { grid: { display: false }, ticks: { font: { size: 11, family: 'ui-monospace, SF Mono, Menlo, monospace' }, color: U.C.ink } } } } });
    U.bindSearch(host.querySelector('#inQ'), host.querySelector('#inTbl'));
  }

  window.SEC = window.SEC || {};
  window.SEC.influenciadoras = { title: 'Influenciadoras', render, mount, count: () => P.length };
})();
