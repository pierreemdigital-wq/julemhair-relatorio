/* Origem (UTM) — cobertura de origem, receita por source/medium, campanhas, landing pages e reconciliação Meta UTM × pixel */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const N = G.nuvem || {}, K = (G.kpi && G.kpi.cur) || {};
  const n0 = v => (v == null || isNaN(v)) ? 0 : +v;
  const pct = (a, b) => b ? a / b * 100 : null;

  const utm = (N.utm || []).slice().sort((a, b) => n0(b.rev) - n0(a.rev));
  const src = (N.utm_source || []).slice().sort((a, b) => n0(b.rev) - n0(a.rev));
  const camp = (N.utm_campaign || []).slice().sort((a, b) => n0(b.rev) - n0(a.rev));
  const land = (N.landing || []).slice().sort((a, b) => n0(b.rev) - n0(a.rev));
  const rev = n0(N.revenue), paid = n0(N.orders_paid), noUtm = N.no_utm, cov = N.utm_coverage;

  /* família da origem: decide cor e agrupamento */
  const fam = k => { const s = String(k || '').toLowerCase();
    if (/^(meta|facebook|instagram|ig|igshopping|fb)\b/.test(s)) return 'meta';
    if (/^(crm|rd station|link da bio do rd|e-?mail|whatsapp)/.test(s) || /\/\s*(e-?mail|whatsapp)/.test(s)) return 'crm';
    if (/^google/.test(s)) return 'google';
    return 'outros'; };
  const famColor = { meta: U.C.cur, crm: U.C.loja, google: U.C.cost, outros: U.C.prv };
  const famLabel = { meta: 'Meta', crm: 'CRM / e-mail', google: 'Google', outros: 'Outros' };
  const sumBy = (arr, fn) => arr.filter(fn).reduce((s, u) => ({ n: s.n + n0(u.n), rev: s.rev + n0(u.rev) }), { n: 0, rev: 0 });

  /* Meta pela UTM: só o que começa com meta|facebook|instagram, conforme pedido */
  const metaUtm = sumBy(utm, u => /^(meta|facebook|instagram)/i.test(u.k));
  const crmUtm = sumBy(utm, u => fam(u.k) === 'crm');
  const withUtm = sumBy(utm, () => true);
  const revIdent = withUtm.rev;
  const revNoUtm = Math.max(0, rev - revIdent);
  const metaPixel = n0(K.revenue), diff = metaPixel - metaUtm.rev;

  function render() {
    const leadP = `<b>${f.pct(cov)}</b> dos pedidos pagos chegaram com UTM. ${f.num(noUtm)} pedidos (${f.brl(revNoUtm)}) não têm origem registrada: entrada direta, link sem parâmetro ou app. A Meta é a maior origem identificada, com ${f.brl(metaUtm.rev)} em last-click — ${f.pct(pct(metaUtm.rev, revIdent))} da receita com origem.`;
    const kpis = `<div class="kpis">
      ${U.kpi({ l: 'Receita com origem identificada', v: f.brl(revIdent), raw: revIdent, fmt: 'brl', sub: `${f.pct(pct(revIdent, rev))} do faturamento pago`, pri: true })}
      ${U.kpi({ l: 'Pedidos sem UTM', v: f.num(noUtm), raw: noUtm, fmt: 'num', sub: `${f.pct(pct(noUtm, paid))} dos pedidos · ${f.brl(revNoUtm)}` })}
      ${U.kpi({ l: 'Meta pela UTM', v: f.brl(metaUtm.rev), raw: metaUtm.rev, fmt: 'brl', sub: `${f.num(metaUtm.n)} pedidos · source meta, facebook, instagram` })}
      ${U.kpi({ l: 'CRM / e-mail', v: f.brl(crmUtm.rev), raw: crmUtm.rev, fmt: 'brl', sub: `${f.num(crmUtm.n)} pedidos · ticket ${f.brl2(crmUtm.n ? crmUtm.rev / crmUtm.n : null)}` })}
    </div>`;

    const top10 = utm.slice(0, 10).map(u => ({ n: u.k, v: n0(u.rev), c: famColor[fam(u.k)], s: `${f.num(u.n)} ped.` }));
    const landCols = [
      { t: 'Landing page', type: 'txt', k: l => l.k, h: l => `<span class="mono" title="${f.esc(l.k)}">${f.esc(l.k)}</span>` },
      { t: 'Pedidos', r: 1, k: l => n0(l.n), h: l => f.num(l.n) },
      { t: 'Faturamento', r: 1, k: l => n0(l.rev), h: l => `<b>${f.brl(l.rev)}</b>` },
      { t: 'Ticket', r: 1, k: l => n0(l.ticket), h: l => f.brl2(l.ticket) },
    ];
    const g2 = `<div class="g2">
      ${U.card('Receita por origem · top 10', U.chartBox('orBars', 'tall'), '', 'Cor por família: azul Meta (meta, facebook, instagram), verde CRM (e-mail, WhatsApp, RD Station), laranja Google, cinza outros. Source / medium como gravado no pedido; a Meta aparece fragmentada em várias grafias porque as UTMs não seguem um padrão único.')}
      ${U.card('Landing pages · top 12', land.length ? U.table('orLand', landCols, land.slice(0, 12)) : '<div class="empty">Sem dado de landing page.</div>', `<span class="faint">primeira página do pedido</span>`)}
    </div>`;

    const utmCols = [
      { t: 'Source / medium', type: 'txt', k: u => u.k, h: u => `<div class="nm" title="${f.esc(u.k)}">${f.esc(u.k)}</div>` },
      { t: 'Família', c: 1, type: 'txt', k: u => famLabel[fam(u.k)], h: u => U.tag(famLabel[fam(u.k)], fam(u.k) === 'meta' ? 'i' : fam(u.k) === 'crm' ? 'ok' : fam(u.k) === 'google' ? 'at' : 'n') },
      { t: 'Pedidos', r: 1, k: u => n0(u.n), h: u => f.num(u.n) },
      { t: '% pedidos c/ UTM', r: 1, k: u => pct(n0(u.n), withUtm.n) || 0, h: u => f.pct(pct(n0(u.n), withUtm.n)) },
      { t: 'Faturamento', r: 1, k: u => n0(u.rev), h: u => `<b>${f.brl(u.rev)}</b>` },
      { t: '% receita c/ UTM', r: 1, k: u => pct(n0(u.rev), revIdent) || 0, h: u => f.pct(pct(n0(u.rev), revIdent)) },
      { t: 'Ticket', r: 1, k: u => n0(u.ticket), h: u => f.brl2(u.ticket) },
    ];
    const utmCard = U.card('UTM source / medium · completo', `<div class="card-b"><div class="tb"><input class="search" id="orQ" placeholder="Filtrar origem"><span class="cnt">${utm.length} combinações · ${f.num(withUtm.n)} pedidos</span></div></div>` + U.table('orUtm', utmCols, utm), '',
      'Percentuais calculados sobre os pedidos e a receita que têm UTM, não sobre o total da loja.');

    const campCols = [
      { t: 'utm_campaign', type: 'txt', k: c => c.k, h: c => `<div class="nm" title="${f.esc(c.k)}">${f.esc(c.k)}</div>` },
      { t: 'Pedidos', r: 1, k: c => n0(c.n), h: c => f.num(c.n) },
      { t: 'Faturamento', r: 1, k: c => n0(c.rev), h: c => `<b>${f.brl(c.rev)}</b>` },
      { t: 'Ticket', r: 1, k: c => n0(c.ticket), h: c => f.brl2(c.ticket) },
    ];
    const campCard = U.card('UTM campaign · top 20', camp.length ? U.table('orCamp', campCols, camp.slice(0, 20)) : '<div class="empty">Sem utm_campaign registrado.</div>', `<span class="faint">${camp.length} campanhas</span>`,
      '"popup" e "CTA no Link da Bio" são origens próprias (CRM e bio do Instagram), não mídia paga. Nomes entre colchetes são campanhas da Meta com UTM manual.');

    const recon = U.card('Meta pela UTM da loja vs Meta pelo pixel', `<div class="card-b"><div class="kpis">
        ${U.kpi({ l: 'Meta pela UTM (last-click)', v: f.brl(metaUtm.rev), raw: metaUtm.rev, fmt: 'brl', sub: `${f.num(metaUtm.n)} pedidos na Nuvemshop` })}
        ${U.kpi({ l: 'Meta pelo pixel (plataforma)', v: f.brl(metaPixel), raw: metaPixel, fmt: 'brl', sub: `${f.num(K.purchases)} compras atribuídas` })}
        ${U.kpi({ l: 'Diferença', v: f.brl(diff), raw: diff, fmt: 'brl', sub: `${f.x(metaUtm.rev ? metaPixel / metaUtm.rev : null)} · pixel ÷ UTM` })}
        ${U.kpi({ l: 'Cobertura UTM', v: f.pct(cov), raw: cov, fmt: 'pct', sub: `${f.num(noUtm)} pedidos sem origem` })}
      </div></div>`, '',
      `<b>Por que os números não batem.</b> A UTM registra só o último clique que trouxe o pedido; o pixel credita à Meta qualquer compra dentro da janela de atribuição (7 dias após clique, 1 dia após visualização), inclusive quem depois voltou por busca, e-mail ou link direto. Parte dos ${f.num(noUtm)} pedidos sem UTM também passou por anúncio. A verdade está entre os dois: a UTM é o piso, o pixel é o teto.`);

    return `<div class="ph"><div><div class="h1">Origem & cupons</div><div class="h1-sub">Fonte: UTM e landing page gravadas em cada pedido pago da Nuvemshop</div></div></div>`
      + U.lead(`${f.pct(cov, 0)} dos pedidos com UTM; a Meta é ${f.pct(pct(metaUtm.rev, revIdent), 0)} da receita identificada em último clique (${f.brl(metaUtm.rev)}) contra ${f.brl(metaPixel)} que o pixel reivindica.`, leadP, f.pct(cov, 0), 'dos pedidos com UTM')
      + kpis + g2 + utmCard + campCard + recon;
  }

  function mount(host) {
    const top10 = utm.slice(0, 10);
    U.chart('orBars', { type: 'bar', data: { labels: top10.map(u => u.k.length > 34 ? u.k.slice(0, 33) + '…' : u.k), datasets: [{ label: 'Faturamento', data: top10.map(u => n0(u.rev)), backgroundColor: top10.map(u => famColor[fam(u.k)]), borderRadius: 4, barThickness: 16 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { title: i => top10[i[0].dataIndex].k, label: i => ` ${f.brl(i.raw)} · ${f.num(top10[i.dataIndex].n)} pedidos` } } },
        scales: { x: { grid: { color: '#F0F0F3', drawTicks: false }, ticks: U.yBRL.ticks, border: { display: false } }, y: { grid: { display: false }, ticks: { font: { size: 11 }, color: U.C.ink } } } } });
    U.bindSearch(host.querySelector('#orQ'), host.querySelector('#orUtm'));
  }

  window.SEC = window.SEC || {};
  window.SEC.origem = { title: 'Origem & cupons', render, mount, count: () => utm.length };
})();
