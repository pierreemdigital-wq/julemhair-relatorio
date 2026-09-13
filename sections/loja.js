/* Loja — vendas & produtos (Nuvemshop): faturamento pago, pedidos, produtos, página de produto, storefront e gateway */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const N = G.nuvem || {}, E = (G.kpi && G.kpi.ecom) || {}, K = (G.kpi && G.kpi.cur) || {};
  const n0 = v => (v == null || isNaN(v)) ? 0 : +v;
  const div = (a, b) => b ? a / b : null;

  const rev = n0(N.revenue), paid = n0(N.orders_paid), total = n0(N.orders_total);
  const ticket = N.ticket != null ? N.ticket : div(rev, paid);
  const payRate = div(paid, total) != null ? paid / total * 100 : null;
  const metaRev = n0(K.revenue), gap = rev - metaRev, gapPct = div(gap, rev) != null ? gap / rev * 100 : null;
  const products = (N.products || []).filter(p => n0(p.rev) > 0).slice().sort((a, b) => n0(b.rev) - n0(a.rev));
  const top = products.slice(0, 20), mxRev = Math.max(...top.map(p => n0(p.rev)), 1);
  const lp = (N.products || []).filter(p => n0(p.lp_entries) > 0).sort((a, b) => n0(b.lp_entries) - n0(a.lp_entries));
  const st = N.status || {}, sf = N.storefront || {}, gw = N.gateway || {};
  const stLabel = { paid: 'Pago', voided: 'Cancelado', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial', authorized: 'Autorizado', pending: 'Pendente' };
  const sfLabel = { mobile: 'Mobile', store: 'Desktop', form: 'Manual (formulário)' };

  function perfil(p) {
    const s = n0(p.solo_rate), i = products.indexOf(p);
    if (i === 0) return U.tag('Carro-chefe', 'i');
    if (s > 60) return U.tag('Porta de entrada', 'ok');
    if (s < 25) return U.tag('Complemento', 'n');
    return U.tag('Misto', 'n');
  }
  function lpRead(p) {
    const c = n0(p.lp_conv), e = n0(p.lp_entries), o = n0(p.orders);
    if (c > 150) return `${f.num(o)} pedidos para ${f.num(e)} entradas na página: o produto é comprado majoritariamente por quem chega por outra porta (home, coleção, outro produto). A página não é o gargalo.`;
    if (c >= 100) return `Pedidos e entradas na página se equivalem. O item converte no próprio fluxo e recebe pouca venda cruzada.`;
    return `${f.num(e)} entradas geraram ${f.num(o)} pedidos com o item: a página recebe mais visita direta do que converte. Candidata a revisão de oferta, prova social e preço.`;
  }

  function render() {
    const leadP = `A loja registrou <b>${f.brl(rev)}</b> em ${f.num(paid)} pedidos pagos. A Meta atribui ${f.brl(metaRev)} a si — ${gapPct == null ? '—' : gapPct >= 0 ? `${f.pct(gapPct)} da receita real sem crédito de plataforma` : `${f.pct(Math.abs(gapPct))} <b>acima</b> do que a loja de fato faturou`}. MER (${U.MER_DEF}) de <b>${f.x(E.mer)}</b>: cada real investido em mídia corresponde a ${f.brl2(E.mer)} de faturamento total — é este número, não o ROAS da plataforma, que diz se a mídia paga a conta.`;
    const kpis = `<div class="kpis six">
      ${U.kpi({ l: 'Faturamento pago', v: f.brl(rev), raw: rev, fmt: 'brl', sub: `${f.brl(E.rev_per_day)} / dia`, pri: true })}
      ${U.kpi({ l: 'Pedidos pagos', v: f.num(paid), raw: paid, fmt: 'num', sub: `${f.num(E.orders_per_day, 1)} / dia` })}
      ${U.kpi({ l: 'Ticket médio', v: f.brl2(ticket), raw: ticket, fmt: 'brl2', sub: `Meta: ${f.brl2(K.ticket)}` })}
      ${U.kpi({ l: 'Taxa de pagamento', v: f.pct(payRate), raw: payRate, fmt: 'pct', sub: `${f.num(paid)} de ${f.num(total)} pedidos` })}
      ${U.kpi({ l: 'CAC blended', v: f.brl2(E.cac_blended), raw: E.cac_blended, fmt: 'brl2', sub: `mídia ÷ pedidos pagos · ${f.pct(E.spend_share_of_rev)} da receita` })}
      ${U.kpi({ l: 'Conversão sobre PageView', v: f.pct(E.conv_rate_pv, 2), raw: E.conv_rate_pv, fmt: 'pct', sub: `proxy: pedidos ÷ ${f.k(E.pixel_pv_30d)} PageViews do pixel` })}
    </div>`;

    const statusRows = Object.entries(st).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<span>${stLabel[k] || f.esc(k)}</span><b class="num">${f.num(v)} <span class="faint">${f.pct(total ? v / total * 100 : null)}</span></b>`).join('');
    const g2 = `<div class="g2">
      ${U.card('Receita diária · loja vs Meta', U.chartBox('ljLine'), `<span class="faint">${f.dt(G.daily[0]?.date)} – ${f.dt(G.daily[G.daily.length - 1]?.date)}</span>`, 'Verde: pedidos pagos na Nuvemshop por dia. Azul: receita que a Meta atribui às campanhas no mesmo dia. Dias em que o azul supera o verde são dias em que a plataforma atribui mais do que a loja faturou.')}
      ${U.card('Status dos pedidos', U.chartBox('ljStatus', 'short') + `<div class="card-b"><div class="kv">${statusRows}</div></div>`, `<span class="faint">${f.num(total)} pedidos</span>`)}
    </div>`;

    const cols = [
      { t: 'Produto', type: 'txt', k: p => p.name, h: p => `<div class="nm" title="${f.esc(p.name)}">${f.esc(p.name)}</div>${U.bar(n0(p.rev), mxRev)}` },
      { t: 'Faturamento', r: 1, k: p => n0(p.rev), h: p => `<b>${f.brl(p.rev)}</b>` },
      { t: '% receita', r: 1, k: p => div(n0(p.rev), rev) * 100 || 0, h: p => f.pct(rev ? n0(p.rev) / rev * 100 : null) },
      { t: 'Unidades', r: 1, k: p => n0(p.qty), h: p => f.num(p.qty) },
      { t: 'Pedidos', r: 1, k: p => n0(p.orders), h: p => f.num(p.orders) },
      { t: 'Preço', r: 1, k: p => n0(p.price), h: p => f.brl2(p.price) },
      { t: 'Un/pedido', r: 1, k: p => n0(p.units_per_order), h: p => f.num(p.units_per_order, 2) },
      { t: 'Vendido sozinho', r: 1, k: p => n0(p.solo_rate), h: p => f.pct(p.solo_rate) },
      { t: 'Perfil', c: 1, type: 'txt', k: p => perfil(p).replace(/<[^>]+>/g, ''), h: p => perfil(p) },
    ];
    const tbl = U.card('Produtos · top 20 por faturamento', `<div class="card-b"><div class="tb"><input class="search" id="ljQ" placeholder="Filtrar produto"><span class="cnt">${top.length} de ${products.length} produtos com venda · catálogo ${f.num(N.catalog_size)}</span></div></div>` + U.table('ljTbl', cols, top),
      '', '<b>Perfil</b>: Carro-chefe = maior faturamento. Porta de entrada = vendido sozinho em mais de 60% dos pedidos (o cliente entra por ele). Complemento = sozinho em menos de 25% (entra no carrinho junto de outro item). Misto = entre os dois.');

    const lpCols = [
      { t: 'Produto', type: 'txt', k: p => p.name, h: p => `<div class="nm" title="${f.esc(p.name)}">${f.esc(p.name)}</div>` },
      { t: 'Entradas pela página', r: 1, k: p => n0(p.lp_entries), h: p => f.num(p.lp_entries) },
      { t: 'Pedidos com o item', r: 1, k: p => n0(p.orders), h: p => f.num(p.orders) },
      { t: 'Pedidos ÷ entradas', r: 1, k: p => n0(p.lp_conv), h: p => `<span class="${n0(p.lp_conv) < 100 ? 'd dn' : 'd up'}">${f.pct(p.lp_conv, 0)}</span>` },
      { t: 'Leitura', type: 'txt', k: p => n0(p.lp_conv), h: p => `<span class="muted wrap">${lpRead(p)}</span>` },
    ];
    const lpCard = U.card('Eficiência da página de produto', lp.length ? U.table('ljLp', lpCols, lp) : '<div class="empty">Sem dado de landing page por produto.</div>', `<span class="faint">${lp.length} produtos com entrada direta</span>`,
      'Entradas = pedidos cuja primeira página visitada foi a página do produto. Taxa acima de 100% significa que o item é comprado por mais gente do que a que entrou por ele; abaixo de 100%, a página recebe tráfego que não fecha com aquele item.');

    const sfTotal = Object.values(sf).reduce((s, v) => s + n0(v), 0), gwTotal = Object.values(gw).reduce((s, v) => s + n0(v), 0);
    const sfItems = Object.entries(sf).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ n: sfLabel[k] || k, v: n0(v), s: f.pct(sfTotal ? v / sfTotal * 100 : null) }));
    const gwItems = Object.entries(gw).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ n: k === 'not-provided' ? 'Não informado' : k === 'multiple' ? 'Múltiplos' : k, v: n0(v), s: f.pct(gwTotal ? v / gwTotal * 100 : null) }));
    const mobPct = sfTotal ? n0(sf.mobile) / sfTotal * 100 : null;
    const bottom = `<div class="g11">
      ${U.card('Canal de compra', `<div class="card-b">${U.hbars(sfItems, f.num)}</div>`, `<span class="faint">${f.pct(mobPct, 0)} mobile</span>`, `${f.pct(mobPct)} dos pedidos vêm do celular. Toda decisão de página, checkout e criativo deve ser validada primeiro em tela pequena.`)}
      ${U.card('Gateway de pagamento', `<div class="card-b">${U.hbars(gwItems, f.num)}</div>`, `<span class="faint">${f.num(gwTotal)} pedidos</span>`, `${f.num(gw['Pedido com 100% de desconto'])} pedidos com 100% de desconto: brindes e vales de parceira que entram no total de pedidos mas não no faturamento.`)}
    </div>`;

    return `<div class="ph"><div><div class="h1">Vendas & produtos</div><div class="h1-sub">Fonte: Nuvemshop · pedidos pagos no período · ${f.dt(G.meta?.period?.since)} – ${f.dt(G.meta?.period?.until)}</div></div></div>`
      + U.lead(`Loja faturou ${f.brl(rev)} em ${f.num(paid)} pedidos pagos; a Meta atribui ${f.brl(metaRev)} — MER ${f.x(E.mer)}.`, leadP, f.x(E.mer), 'MER · ' + U.MER_DEF)
      + kpis + g2 + tbl + lpCard + bottom;
  }

  function mount(host) {
    const D = G.daily || [];
    U.chart('ljLine', { type: 'line', data: { labels: D.map(d => f.dt(d.date)), datasets: [U.line('Loja (pedidos pagos)', D.map(d => n0(d.loja_rev)), U.C.loja, false, true), U.line('Meta (atribuído)', D.map(d => n0(d.rev)), U.C.cur, false, false)] },
      options: { scales: { y: U.yBRL } } });
    const ent = Object.entries(st).sort((a, b) => b[1] - a[1]);
    const stColor = { paid: U.C.loja, voided: U.C.neg, refunded: U.C.cost, partially_refunded: '#FFC66D', authorized: U.C.cur };
    U.chart('ljStatus', { type: 'doughnut', data: { labels: ent.map(([k]) => stLabel[k] || k), datasets: [{ data: ent.map(([, v]) => v), backgroundColor: ent.map(([k]) => stColor[k] || U.C.prv), borderWidth: 2, borderColor: '#fff' }] },
      options: { cutout: '68%', plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } }, interaction: { mode: 'nearest', intersect: true } } });
    U.bindSearch(host.querySelector('#ljQ'), host.querySelector('#ljTbl'));
  }

  window.SEC = window.SEC || {};
  window.SEC.loja = { title: 'Vendas & produtos', render, mount, count: () => products.length };
})();
