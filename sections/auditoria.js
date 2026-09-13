/* Auditoria estrutural — orçamento retido em campanhas pausadas, nomenclatura, objetivos legados, hierarquia sem entrega */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const ST = G.structure || {}, tot = ST.totals || {}, byS = tot.campaigns_by_status || {};
  const pwb = ST.paused_with_budget || { items: [] }, nm = ST.naming || { non_compliant_items: [] }, leg = ST.legacy_objectives || { items: [] }, cwa = ST.campaigns_without_active_adset || { items: [] }, awa = ST.adsets_without_active_ad || { items: [] };
  const OBJ = { OUTCOME_SALES: 'Vendas', OUTCOME_LEADS: 'Leads', OUTCOME_TRAFFIC: 'Tráfego', OUTCOME_ENGAGEMENT: 'Engajamento', OUTCOME_AWARENESS: 'Reconhecimento', OUTCOME_APP_PROMOTION: 'Aplicativo', LINK_CLICKS: 'Cliques no link (legado)', ENGAGEMENT: 'Engajamento (legado)', PAGE_LIKES: 'Curtidas na página (legado)', POST_ENGAGEMENT: 'Engajamento com post (legado)', CONVERSIONS: 'Conversões (legado)', MESSAGES: 'Mensagens (legado)' };
  const cents = v => (v || 0) / 100;

  /* objetivos: união de campanhas com entrega (G.tree) e itens com objetivo legado */
  const objMap = new Map();
  (G.tree || []).forEach(c => objMap.set(c.id, c.objective));
  (leg.items || []).forEach(c => { if (!objMap.has(c.campaign_id)) objMap.set(c.campaign_id, c.objective); });
  const objCount = {}; objMap.forEach(o => { objCount[o] = (objCount[o] || 0) + 1; });
  const objItems = Object.entries(objCount).sort((a, b) => b[1] - a[1]);

  const S = { tab: 'naming' };
  const TABS = [['naming', 'Nomenclatura fora do padrão'], ['legacy', 'Objetivos legados'], ['noadset', 'Sem conjunto ativo'], ['noad', 'Conjuntos sem anúncio']];
  const nameCell = r => `<div class="nm" title="${f.esc(r.name)}">${U.statusDot(r.status)}${f.esc(r.name)}<span class="sub">${f.esc(r.campaign_id || r.adset_id || '')}</span></div>`;
  const stTag = s => s === 'ACTIVE' ? U.tag('Ativa', 'ok') : U.tag('Pausada', 'n');

  function tabTable() {
    let rows, cols;
    if (S.tab === 'naming') { rows = nm.non_compliant_items || []; cols = [{ t: 'Campanha', type: 'txt', k: r => r.name, h: nameCell }, { t: 'Status', c: 1, type: 'txt', k: r => r.status, h: r => stTag(r.status) }, { t: 'Problema', type: 'txt', k: r => diag(r.name), h: r => `<span class="muted">${diag(r.name)}</span>` }]; }
    else if (S.tab === 'legacy') { rows = leg.items || []; cols = [{ t: 'Campanha', type: 'txt', k: r => r.name, h: nameCell }, { t: 'Objetivo', type: 'txt', k: r => r.objective, h: r => U.tag(U.pt(r.objective), 'at') }, { t: 'Status', c: 1, type: 'txt', k: r => r.status, h: r => stTag(r.status) }]; }
    else if (S.tab === 'noadset') { rows = cwa.items || []; cols = [{ t: 'Campanha', type: 'txt', k: r => r.name, h: nameCell }, { t: 'Status', c: 1, type: 'txt', k: r => r.status, h: r => stTag(r.status) }, { t: 'Conjuntos', r: 1, k: r => r.adsets_total, h: r => f.num(r.adsets_total) + ' (nenhum ativo)' }]; }
    else { rows = awa.items || []; cols = [{ t: 'Conjunto', type: 'txt', k: r => r.name, h: nameCell }, { t: 'Status', c: 1, type: 'txt', k: r => r.status, h: r => stTag(r.status) }, { t: 'Orçamento/dia', r: 1, k: r => cents(r.daily_budget), h: r => f.brl2(cents(r.daily_budget)) }, { t: 'Anúncios', r: 1, k: r => r.ads_total, h: r => f.num(r.ads_total) + ' (nenhum ativo)' }]; }
    const N = { naming: (nm.non_compliant_items || []).length, legacy: (leg.items || []).length, noadset: (cwa.items || []).length, noad: (awa.items || []).length };
    const desc = { naming: `Padrão atual da conta: ${nm.compliant ?? '—'} campanhas começam com Cn; ${nm.non_compliant ?? '—'} não seguem nenhum padrão.`, legacy: 'Objetivos anteriores ao Outcome-Driven (ODAX). Não recebem novas otimizações e distorcem o relatório por objetivo.', noadset: 'Campanhas sem nenhum conjunto ativo: existem, mas não podem entregar.', noad: 'Conjuntos sem nenhum anúncio ativo. Os ativos com orçamento consomem nada e ocupam a estrutura.' };
    return `<div class="tabs" id="adTabs">${TABS.map(([k, l]) => `<button data-t="${k}" class="${S.tab === k ? 'on' : ''}">${l} <span class="cnt">${N[k]}</span></button>`).join('')}</div>
      <div class="tb"><input class="search" id="adQ" placeholder="Filtrar por nome"><span class="muted">${desc[S.tab]}</span><span class="cnt">${rows.length} itens</span></div>
      ${rows.length ? U.table('adTbl', cols, rows) : '<div class="empty">Nada nesta categoria.</div>'}`;
  }
  function diag(n) {
    if (/^Post do Instagram|^Publicação/i.test(n)) return 'Impulsionamento automático, sem nome';
    if (/^Novo objetivo|configurações recomendadas/i.test(n)) return 'Nome gerado pelo Gerenciador';
    if (/cópia/i.test(n)) return 'Cópia sem renomear';
    if (/^TESTE|^\[LIVE\]|^\[PED\]/i.test(n)) return 'Prefixo sem código sequencial';
    if (!/_|\|/.test(n)) return 'Sem separador de campos';
    return 'Sem código Cn e sem objetivo no nome';
  }

  function render() {
    S.tab = 'naming';
    const items = (pwb.items || []).slice().sort((a, b) => (b.daily_budget_total || 0) - (a.daily_budget_total || 0)).slice(0, 30);
    const mx = Math.max(...items.map(i => cents(i.daily_budget_total)), 1);
    const stuck = pwb.daily_budget_stuck_brl ?? cents(pwb.daily_budget_stuck_cents);
    const active = byS.ACTIVE ?? 0, paused = byS.PAUSED ?? 0, camps = tot.campaigns ?? active + paused;
    const activeSpend = (G.kpi?.cur?.spend || 0) / 30;
    const kpis = `<div class="kpis six">
      ${U.kpi({ l: 'Campanhas', v: f.num(camps), raw: camps, sub: `${f.num(tot.adsets)} conjuntos · ${f.num(tot.ads)} anúncios` })}
      ${U.kpi({ l: 'Ativas', v: f.num(active), raw: active, sub: camps ? f.pct(active / camps * 100) + ' da conta' : '' })}
      ${U.kpi({ l: 'Orçamento retido / dia', v: f.brl(stuck), raw: stuck, fmt: 'brl', sub: `em ${f.num(pwb.count)} campanhas pausadas`, pri: true })}
      ${U.kpi({ l: 'Nomenclatura no padrão', v: f.pct(nm.score_pct), raw: nm.score_pct, fmt: 'pct', sub: `${f.num(nm.compliant)} de ${f.num(camps)} campanhas` })}
      ${U.kpi({ l: 'Objetivos legados', v: f.num(leg.count ?? (leg.items || []).length), raw: leg.count, sub: (leg.watched || []).map(w => OBJ[w]?.replace(' (legado)', '') || f.esc(w)).join(', ') })}
      ${U.kpi({ l: 'Sem conjunto ativo', v: f.num(cwa.count ?? (cwa.items || []).length), raw: cwa.count, sub: `${f.num(awa.count)} conjuntos sem anúncio ativo` })}
    </div>`;
    const graf = `<div class="g2">
      ${U.card('Orçamento retido por campanha pausada', U.table('adStuck', [
        { t: 'Campanha', type: 'txt', k: r => r.name, h: r => `<div class="nm" title="${f.esc(r.name)}">${f.esc(r.name)}</div>${U.bar(cents(r.daily_budget_total), mx)}` },
        { t: 'Orç. campanha', r: 1, k: r => cents(r.campaign_daily_budget), h: r => r.campaign_daily_budget ? f.brl2(cents(r.campaign_daily_budget)) : '<span class="faint">—</span>' },
        { t: 'Orç. conjuntos', r: 1, k: r => cents(r.adsets_daily_budget), h: r => r.adsets_daily_budget ? f.brl2(cents(r.adsets_daily_budget)) : '<span class="faint">—</span>' },
        { t: 'Total / dia', r: 1, k: r => cents(r.daily_budget_total), h: r => `<b>${f.brl2(cents(r.daily_budget_total))}</b>` },
      ], items), `<span class="faint">top ${items.length} de ${f.num(pwb.count)}</span>`,
        `Orçamento configurado que não gasta hoje, mas volta a rodar se alguém reativar por engano. A soma (${f.brl(stuck)}/dia) é ${activeSpend ? f.x(stuck / activeSpend) : '—'} o investimento diário real da conta (${f.brl(activeSpend)}/dia).`)}
      <div>
        ${U.card('Ativas × pausadas', U.chartBox('adDonut'), `<span class="faint">${f.num(camps)} campanhas</span>`)}
        ${U.card('Campanhas por objetivo', U.chartBox('adObj'), `<span class="faint">${f.num(objMap.size)} com objetivo conhecido</span>`, 'Considera campanhas com entrega no período e as de objetivo legado. Campanhas pausadas sem entrega não trazem objetivo no extrato.')}
      </div>
    </div>`;
    const EX = [
      ['TESTE [GPT] [11-09] | VENDAS | ABO | Kit Queridinhos | Raquel', 'VENDAS_KIT-QUERIDINHOS_ABO-TESTE-RAQUEL_2026-09-11'],
      ['[LIVE] [11-09] venda', 'VENDAS_LIVE_AMPLO_2026-09-11'],
      ['[PED] NOVA-2 | RETARGETING | Visitantes 180D não-compradores', 'VENDAS_CATALOGO_RETARGET-VISITANTES-180D_[DATA-DE-CRIAÇÃO]'],
    ];
    const names = new Set([...(nm.non_compliant_items || []), ...(cwa.items || [])].map(i => i.name));
    const ex = EX.filter(e => names.has(e[0]));
    const pad = U.card('Padrão recomendado',
      `<div class="kv">
        <span>Formato</span><b class="mono">[OBJETIVO]_[PRODUTO]_[PÚBLICO]_[DATA]</b>
        <span>Objetivo</span><b>VENDAS · LEADS · TRAFEGO · LIVE — o que a campanha otimiza, não a tática</b>
        <span>Produto</span><b>STICK, KIT-CACHOS, NUTRIFRIZZ, CATALOGO — o que está sendo vendido</b>
        <span>Público</span><b>AMPLO, ADV+, RETARGET-180D, LAL-1PCT-COMPRADORES — quem vê</b>
        <span>Data</span><b>AAAA-MM-DD de criação; permite ordenar e saber a idade sem abrir</b>
      </div>
      ${ex.length ? `<div class="tw"><table class="tbl"><thead><tr><th>Hoje</th><th>Renomeada</th></tr></thead><tbody>${ex.map(([a, b]) => `<tr><td><div class="nm" title="${f.esc(a)}">${f.esc(a)}</div></td><td class="mono">${f.esc(b)}</td></tr>`).join('')}</tbody></table></div>` : ''}`,
      '', 'Separador fixo "_" entre campos e "-" dentro do campo. Sem espaços, sem "cópia", sem nome de quem criou — isso vai no histórico de atividade, não no nome. Conjuntos seguem [PÚBLICO]_[POSICIONAMENTO]; anúncios seguem [FORMATO]_[GANCHO]_[VERSÃO].');
    return `<div class="ph"><div><div class="h1">Auditoria estrutural</div><div class="h1-sub">Higiene da conta: orçamento retido, nomenclatura, objetivos legados e hierarquia sem entrega</div></div></div>
      ${U.lead(`${f.brl(stuck)} por dia configurados em ${f.num(pwb.count)} campanhas pausadas.`, `A conta tem ${f.num(camps)} campanhas e só ${f.num(active)} rodam. As outras ${f.num(paused)} carregam orçamento, nomes sem padrão (${f.pct(nm.score_pct)} seguem regra) e ${f.num(leg.count)} objetivos legados. Nada disso gasta hoje, mas cada reativação acidental custa até ${f.brl(stuck)} em 24 h e o relatório por objetivo fica ilegível.`, f.brl(stuck), 'retido por dia')}
      ${kpis}
      ${graf}
      <div class="card" id="adCard">${tabTable()}</div>
      ${pad}`;
  }

  function mount(host) {
    const active = byS.ACTIVE ?? 0, paused = byS.PAUSED ?? 0;
    U.chart('adDonut', { type: 'doughnut', data: { labels: ['Ativas', 'Pausadas'], datasets: [{ data: [active, paused], backgroundColor: [U.C.cur, U.C.prv], borderWidth: 0, hoverOffset: 4 }] },
      options: { cutout: '70%', scales: { x: { display: false }, y: { display: false } }, interaction: { mode: 'nearest', intersect: true } } });
    U.chart('adObj', { type: 'bar', data: { labels: objItems.map(([k]) => U.pt(k)), datasets: [{ data: objItems.map(([, v]) => v), backgroundColor: objItems.map(([k]) => /legado/.test(OBJ[k] || '') || !/^OUTCOME_/.test(k) ? U.C.cost : U.C.cur), borderRadius: 4, barThickness: 14 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: '#F0F0F3' }, ticks: { precision: 0 } }, y: { grid: { display: false } } } } });
    const card = host.querySelector('#adCard');
    const wire = () => { const tbl = card.querySelector('#adTbl'); U.bindSort(tbl); U.bindSearch(card.querySelector('#adQ'), tbl); card.querySelector('#adTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.tab = b.dataset.t; card.innerHTML = tabTable(); wire(); }; };
    wire();
    U.bindSort(host.querySelector('#adStuck'));
  }

  window.SEC = window.SEC || {};
  window.SEC.auditoria = { title: 'Auditoria estrutural', render, mount, count: () => pwb.count || 0 };
})();
