/* Rastreamento — pixel, CAPI, webhook, UTM, funil pixel × insights, janelas de atribuição, reconciliação Meta × Loja */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const P = G.pixel || {}, info = P.info || {}, health = P.health || {}, pf = P.funnel || {}, daily = P.daily || {};
  const attr = G.kpi?.attr || {}, ecom = G.kpi?.ecom || {}, mer = G.kpi?.mer || {}, cur = G.kpi?.cur || {}, fun = G.funnel || {};
  const utmCov = typeof G.nuvem?.utm_coverage === 'number' ? G.nuvem.utm_coverage : null;

  const EV = { PageView: 'Visualização de página', ViewContent: 'Visualização de produto', AddToCart: 'Adição ao carrinho', InitiateCheckout: 'Início de checkout', AddPaymentInfo: 'Dados de pagamento', Purchase: 'Compra', ViewCategory: 'Visualização de categoria', Search: 'Busca', CompleteRegistration: 'Cadastro', Contact: 'Contato', Lead: 'Lead' };
  const ST = { impressions: 'Impressões', clicks: 'Cliques', landing_page_view: 'Visualização de página', view_content: 'Visualização de produto', add_to_cart: 'Adição ao carrinho', initiate_checkout: 'Início de checkout', purchase: 'Compra' };
  const WIN = { '1d_click': '1 dia após clique', '7d_click': '7 dias após clique', '1d_view': '1 dia após visualização', '7d_view': '7 dias após visualização', '28d_click': '28 dias após clique' };

  const iso = s => s ? new Date(String(s).replace(/([+-]\d\d)(\d\d)$/, '$1:$2')) : null;
  const dth = s => { const d = iso(s); if (!d || isNaN(d)) return '—'; return f.dtl(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })) + ' ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }); };
  const ago = s => { if (s == null) return '—'; if (s < 60) return `há ${s}s`; if (s < 3600) return `há ${Math.round(s / 60)} min`; return `há ${f.num(s / 3600, 1)} h`; };

  const gapPct = ecom.gap_pct != null ? Math.abs(ecom.gap_pct) : null;
  const gapRev = ecom.gap_rev != null ? Math.abs(ecom.gap_rev) : null;
  const storeRev = mer.store_revenue ?? null, metaRev = cur.revenue ?? null, spend = cur.spend ?? attr.spend ?? null;

  const gl = (l, v, c, dot) => `<div class="gl"><div class="l">${l}</div><div class="v">${dot ? U.statusDot(dot) : ''}${v}</div><div class="c">${c}</div></div>`;

  function render() {
    const pixelOk = health.status === 'ok';
    const status = `<div class="grid-list">
      ${gl('Pixel', f.esc(info.name || '—'), `ID ${f.esc(info.id || '—')} · último disparo ${dth(info.last_fired_time)} (${ago(info.seconds_since_last_fire)})<br>Correspondência automática ${info.enable_automatic_matching ? `ativa · ${(info.automatic_matching_fields || []).length} campos` : 'desativada'}`, pixelOk ? 'ACTIVE' : 'X')}
      ${gl('API de Conversões (CAPI)', 'Não confirmada', 'Nenhum evento identificado como servidor. Sem CAPI, iOS e bloqueadores de cookie ficam fora da atribuição.', 'X')}
      ${gl('Webhook Nuvemshop', 'Não configurado', 'Pedidos pagos não chegam à Meta pelo servidor. A compra só conta se o pixel do navegador disparar.', 'PAUSED')}
      ${gl('Cobertura de UTM', utmCov == null ? '—' : f.pct(utmCov), utmCov == null ? 'G.nuvem.utm_coverage não informado' : `${f.pct(100 - utmCov)} dos pedidos chegam sem origem identificada`, utmCov == null ? 'X' : utmCov >= 90 ? 'ACTIVE' : 'X')}
    </div>`;

    const pxSteps = (pf.steps || []).map(s => ({ n: EV[s.event] || s.event, v: s.count || 0 }));
    const inSteps = (fun.steps || []).filter(s => s.step !== 'impressions' && s.step !== 'clicks').map(s => ({ n: ST[s.step] || s.step, v: s.value || 0 }));
    const funis = `<div class="g11">
      ${U.card('Funil do pixel', pxSteps.length ? U.funnel(pxSteps) : '<div class="empty">Sem dados do pixel.</div>', `<span class="faint">${pf.days || 30} dias · todo o site</span>`, 'Todos os visitantes da loja, de qualquer origem. Base para a taxa de conversão real do site: ' + f.pct(ecom.conv_rate_pv, 2) + ' de página vista para compra.')}
      ${U.card('Funil atribuído (Insights)', inSteps.length ? U.funnel(inSteps) : '<div class="empty">Sem dados de Insights.</div>', `<span class="faint">${f.dt(fun.period?.since)} – ${f.dt(fun.period?.until)} · só Meta</span>`, 'Apenas o que a Meta consegue atribuir aos anúncios. A diferença entre os dois funis é o que o rastreamento perde, não o que a loja deixa de vender.')}
    </div>`;

    const wins = attr.windows || {}, def = attr.default || {};
    const wRows = [{ __k: 'default', n: 'Padrão da conta', sub: '7 dias após clique + 1 dia após visualização', ...def, available: true, isDef: true }]
      .concat(['1d_click', '7d_click', '1d_view', '28d_click', '7d_view'].filter(k => wins[k]).map(k => ({ __k: k, n: WIN[k] || k, sub: k, ...wins[k] })));
    const wCols = [
      { t: 'Janela', type: 'txt', k: r => r.n, h: r => `<div class="nm">${r.isDef ? '<b>' + f.esc(r.n) + '</b>' : f.esc(r.n)}<span class="sub">${f.esc(r.sub)}</span></div>` },
      { t: 'Compras', r: 1, k: r => r.available ? r.purchases : -1, h: r => r.available ? f.num(r.purchases) : '<span class="faint">—</span>' },
      { t: 'Receita', r: 1, k: r => r.available ? r.revenue : -1, h: r => r.available ? f.brl(r.revenue) : '<span class="faint">—</span>' },
      { t: 'ROAS', r: 1, k: r => r.available ? r.roas : -1, h: r => r.available ? U.roasTag(r.roas, r.purchases) : U.tag('descontinuada', 'n') },
      { t: 'CPA', r: 1, k: r => r.available ? r.cpa : -1, h: r => r.available ? f.brl2(r.cpa) : '<span class="faint">—</span>' },
      { t: 'vs padrão', r: 1, k: r => r.revenue_vs_default_pct ?? 0, h: r => r.isDef ? '<span class="faint">referência</span>' : r.available && r.revenue_vs_default_pct != null ? `<span class="d ${r.revenue_vs_default_pct < -0.5 ? 'dn' : 'fl'}">${(r.revenue_vs_default_pct > 0 ? '+' : '−') + f.num(Math.abs(r.revenue_vs_default_pct), 1)}%</span>` : '<span class="faint">—</span>' },
    ];
    const janelas = U.card('Janelas de atribuição', U.table('rxWin', wCols, wRows), `<span class="faint">investimento ${f.brl(attr.spend)}</span>`,
      `Só clique em 7 dias explica ${wins['7d_click']?.available ? f.pct(100 + (wins['7d_click'].revenue_vs_default_pct || 0)) : '—'} da receita padrão; o resto vem de visualização em 1 dia. A janela de 7 dias após visualização foi descontinuada pela Meta e não retorna dados — comparar com relatórios antigos que a usavam infla o histórico.`);

    const alerts = health.alerts || [];
    const c24 = health.counts_24h || {};
    const saude = U.card('Saúde do pixel',
      (alerts.length ? alerts.map(a => U.alertRow(a.severity === 'critical' || a.severity === 'error' ? 'c' : a.severity === 'warning' ? 'w' : 'i', f.esc(a.title || a.type || 'Alerta'), f.esc(a.message || a.msg || ''))).join('')
        : U.alertRow('i', 'Sem alertas nas últimas 24 h', f.esc(health.summary || 'Pixel disparando, funil completo e taxas dentro do esperado.')))
      + `<div class="grid-list">
        ${gl('Disparos · 2 h', f.num(health.fires_last_2h), 'eventos recebidos nas últimas duas horas')}
        ${gl('Compra ÷ checkout · 24 h', f.pct((health.purchase_over_checkout || 0) * 100), `${f.num(c24.Purchase)} compras de ${f.num(c24.InitiateCheckout)} checkouts`)}
        ${gl('Compra ÷ página vista · 30 d', f.pct((pf.rates?.purchase_over_pageview || 0) * 100, 2), `${f.num(pf.steps?.[5]?.count)} compras de ${f.k(pf.steps?.[0]?.count)} páginas`)}
        ${gl('Eventos ausentes', (pf.missing_events || []).length ? f.esc(pf.missing_events.join(', ')) : 'Nenhum', 'dos 6 eventos padrão de e-commerce')}
      </div>`,
      `<span class="faint">${U.statusDot(health.status === 'ok' ? 'ACTIVE' : 'X')}${health.status === 'ok' ? 'operando' : f.esc(health.status || '—')}</span>`,
      'Verificações de dados avançadas (da_checks) não retornadas pela API neste extrato. Outros eventos em 30 dias: ' + Object.entries(pf.other_events || {}).map(([k, v]) => `${EV[k] || f.esc(k)} ${f.num(v)}`).join(' · ') + '.');

    const grafico = U.card('Eventos diários do pixel', U.chartBox('rxDaily'), `<span class="faint">${daily.days || '—'} dias · páginas à esquerda, carrinho e compra à direita</span>`, 'Queda simultânea nas três linhas indica problema de site ou pixel. Queda só em compra com carrinho estável indica checkout ou pagamento.');

    const recon = U.card('Reconciliação Meta × Loja',
      U.hbars([{ n: 'Loja confirmado', v: storeRev || 0, c: U.C.loja }, { n: 'Meta atribuído', v: metaRev || 0, c: U.C.cur }, { n: 'Investimento Meta', v: spend || 0, c: U.C.cost }], f.brl)
      + `<div class="kv">
        <span>Receita não atribuída</span><b>${gapRev == null ? '—' : f.brl(gapRev)} ${gapPct == null ? '' : `<span class="d dn">${f.pct(gapPct)}</span>`}</b>
        <span>Participação da Meta na loja</span><b>${f.pct(ecom.meta_share_of_store)}</b>
        <span>MER (${U.MER_DEF})</span><b>${f.x(ecom.mer ?? mer.mer)}</b>
        <span>ROAS atribuído</span><b>${f.x(cur.roas)}</b>
        <span>Investimento ÷ receita da loja</span><b>${f.pct(ecom.spend_share_of_rev)}</b>
        <span>Ticket loja · Meta</span><b>${f.brl2(ecom.aov_loja)} · ${f.brl2(ecom.aov_meta)}</b>
      </div>`,
      `<span class="faint">${f.dt(attr.period?.since)} – ${f.dt(attr.period?.until)}</span>`,
      'A diferença de ' + (gapPct == null ? '—' : f.pct(gapPct)) + ' entre loja e Meta mistura tráfego orgânico, influenciadoras e compras que a Meta não conseguiu ligar ao anúncio. Com CAPI e webhook a parcela de rastreamento perdido cai e o ROAS atribuído sobe sem mudar nada na mídia.');

    return `<div class="ph"><div><div class="h1">Rastreamento</div><div class="h1-sub">Pixel, API de Conversões, webhook da loja, UTM e janelas de atribuição</div></div></div>
      ${U.lead('A Meta enxerga ' + (ecom.meta_share_of_store != null ? f.pct(ecom.meta_share_of_store) : '—') + ' da receita da loja. O resto não está sendo atribuído.',
        `A loja confirmou ${f.brl(storeRev)} no período; a Meta atribuiu ${f.brl(metaRev)}. ${gapRev == null ? '' : `São ${f.brl(gapRev)} sem origem clara.`} O pixel do navegador está saudável, mas é a única fonte: sem API de Conversões e sem webhook da Nuvemshop, toda compra em iOS ou com bloqueador de cookies escapa do relatório e o ROAS reportado fica abaixo do real.`,
        gapPct == null ? null : f.pct(gapPct), 'receita não atribuída')}
      <div class="card">${status}</div>
      ${funis}
      <div class="g2">${janelas}${recon}</div>
      ${grafico}
      ${saude}`;
  }

  function mount(host) {
    const s = daily.series || {}, labels = (daily.dates || []).map(f.dt);
    if (labels.length) U.chart('rxDaily', {
      type: 'line',
      data: { labels, datasets: [
        Object.assign(U.line('Visualização de página', s.PageView || [], U.C.prv, false, false), { yAxisID: 'y' }),
        Object.assign(U.line('Adição ao carrinho', s.AddToCart || [], U.C.cur, false, false), { yAxisID: 'y1' }),
        Object.assign(U.line('Compra', s.Purchase || [], U.C.loja, false, true), { yAxisID: 'y1' }),
      ] },
      options: { scales: { y: { position: 'left', ticks: { callback: v => f.k(v) } }, y1: { position: 'right', beginAtZero: true, grid: { display: false }, border: { display: false }, ticks: { color: U.C.t2, font: { size: 10.5 }, padding: 8, callback: v => f.k(v) } } } },
    });
    U.bindSort(host.querySelector('#rxWin'));
  }

  window.SEC = window.SEC || {};
  window.SEC.rastreamento = { title: 'Rastreamento', render, mount };
})();
