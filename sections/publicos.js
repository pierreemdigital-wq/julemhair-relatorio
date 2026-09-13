/* Públicos salvos — inventário, uso real em conjuntos ativos, órfãos, pequenos, desatualizados */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const A = G.audiences || {}, sm = A.summary || {}, th = A.thresholds || {};
  const TYPE = { WEBSITE: 'Site (pixel)', LOOKALIKE: 'Semelhante', CUSTOM: 'Lista de clientes', MULTI_DATA: 'Multi-fonte', IG_BUSINESS: 'Engajamento IG', ENGAGEMENT: 'Engajamento', APP: 'Aplicativo', OFFLINE_CONVERSION: 'Conversão offline' };

  /* índice único de públicos conhecidos */
  const ALL = new Map();
  ['undeliverable', 'operation_not_normal', 'too_small', 'orphans'].forEach(k => (A[k] || []).forEach(a => { if (!ALL.has(a.id)) ALL.set(a.id, a); }));
  /* nomes de públicos usados nos conjuntos ativos (targeting) para inferir nomes que não vieram no inventário */
  const tNames = new Set(); (G.tree || []).forEach(c => (c.adsets || []).forEach(a => { if (a.status === 'ACTIVE') (a.targeting?.custom_audiences || []).forEach(n => tNames.add(n.trim())); }));
  const inUse = (A.in_use || []).map(u => {
    const known = ALL.get(u.audience_id);
    return { ...(known || { id: u.audience_id, name: null, subtype: null, size_lower: null, size_upper: null, delivery_status: null, operation_status: null }), __adsets: u.adsets || [], __inferred: !known };
  });
  const knownNames = new Set(inUse.filter(x => x.name).map(x => x.name.trim()));
  const leftover = [...tNames].filter(n => !knownNames.has(n));
  inUse.forEach(x => { if (!x.name) x.name = leftover.length === 1 ? leftover[0] : 'Público ' + x.id; });

  const S = { tab: 'orphans' };
  const TABS = [['orphans', 'Órfãos', 'Existem na conta e não aparecem em nenhum conjunto ativo.'], ['too_small', 'Pequenos', `Abaixo de ${f.num(th.min_size || 1000)} pessoas ou tamanho não estimado pela Meta.`], ['operation_not_normal', 'Desatualizados', 'Operação fora do normal: sem uso há 30 dias, ou semelhante que falhou ao ser criado.'], ['in_use', 'Em uso', 'Presentes em conjuntos ativos hoje.']];

  const size = a => a.size_lower == null ? '—' : a.size_lower < 0 ? '<span class="faint">não estimado</span>' : a.size_lower === a.size_upper ? f.k(a.size_lower) : f.k(a.size_lower) + ' – ' + f.k(a.size_upper);
  const delTag = d => !d ? U.tag('—', 'n') : d.code === 200 ? U.tag('Pronto', 'ok') : d.code === 300 ? U.tag('Muito pequeno', 'bad') : U.tag('Código ' + d.code, 'at');
  const opTag = o => !o ? U.tag('—', 'n') : o.code === 200 ? U.tag('Normal', 'ok') : o.code === 450 ? U.tag('Desatualizado', 'at') : o.code === 433 ? U.tag('Falhou', 'bad') : U.tag('Código ' + o.code, 'at');

  function rows() { return S.tab === 'in_use' ? inUse : (A[S.tab] || []); }
  function tableHtml() {
    const rs = rows();
    const cols = [
      { t: 'Público', type: 'txt', k: r => r.name, h: r => `<div class="nm" title="${f.esc(r.name)}">${f.esc(r.name)}<span class="sub">${f.esc(r.id)}${r.__inferred ? ' · nome inferido pelo conjunto' : ''}</span></div>` },
      { t: 'Tipo', type: 'txt', k: r => r.subtype || '', h: r => r.subtype ? U.tag(U.pt(r.subtype), 'n') : '<span class="faint">—</span>' },
      { t: 'Tamanho', r: 1, k: r => r.size_upper ?? -2, h: size },
      { t: 'Entrega', c: 1, k: r => r.delivery_status?.code ?? 0, h: r => delTag(r.delivery_status) },
      { t: 'Operação', c: 1, k: r => r.operation_status?.code ?? 0, h: r => opTag(r.operation_status) },
    ];
    if (S.tab === 'in_use') cols.push({ t: 'Usado em', r: 1, k: r => r.__adsets.length, h: r => `<b>${r.__adsets.length}</b> conjunto${r.__adsets.length === 1 ? '' : 's'}<span class="sub" title="${f.esc(r.__adsets.map(a => a.name).join(' · '))}">${f.esc(r.__adsets[0]?.name || '')}${r.__adsets.length > 1 ? ' +' + (r.__adsets.length - 1) : ''}</span>` });
    else if (S.tab === 'operation_not_normal') cols.push({ t: 'Motivo', type: 'txt', k: r => r.operation_status?.description || '', h: r => `<span class="muted" title="${f.esc(r.operation_status?.description || '')}">${f.esc((r.operation_status?.description || '').slice(0, 70))}${(r.operation_status?.description || '').length > 70 ? '…' : ''}</span>` });
    const t = TABS.find(x => x[0] === S.tab);
    return `<div class="tabs" id="auTabs">${TABS.map(([k, l]) => `<button data-t="${k}" class="${S.tab === k ? 'on' : ''}">${l} <span class="cnt">${k === 'in_use' ? inUse.length : (A[k] || []).length}</span></button>`).join('')}</div>
      <div class="tb"><input class="search" id="auQ" placeholder="Filtrar por nome"><span class="muted">${t ? t[2] : ''}</span><span class="cnt">${rs.length} itens</span></div>
      ${rs.length ? U.table('auTbl', cols, rs) : '<div class="empty">Nenhum público nesta categoria.</div>'}`;
  }

  function render() {
    S.tab = 'orphans';
    const total = sm.total_audiences ?? ALL.size, used = sm.audiences_in_active_adsets ?? inUse.length, orph = sm.orphans ?? (A.orphans || []).length, undel = sm.undeliverable ?? (A.undeliverable || []).length;
    const lk = [...ALL.values()].filter(a => a.subtype === 'LOOKALIKE'), lkFail = lk.filter(a => a.operation_status?.code === 433).length;
    const lista = [...ALL.values()].find(a => a.subtype === 'CUSTOM');
    const stale = (A.operation_not_normal || []).filter(a => a.operation_status?.code === 450).length;
    const kpis = `<div class="kpis">
      ${U.kpi({ l: 'Públicos na conta', v: f.num(total), raw: total, sub: `${f.num(sm.active_adsets_scanned)} conjuntos ativos verificados` })}
      ${U.kpi({ l: 'Em uso em conjuntos ativos', v: f.num(used), raw: used, sub: `${f.num(sm.healthy_and_in_use)} saudável e em uso`, pri: true })}
      ${U.kpi({ l: 'Órfãos', v: f.num(orph), raw: orph, sub: total ? f.pct(orph / total * 100) + ' do total sem uso' : '' })}
      ${U.kpi({ l: 'Com problema de entrega', v: f.num(undel), raw: undel, sub: `${f.num(sm.operation_not_normal)} com operação fora do normal` })}
    </div>`;
    const leitura = U.card('Leitura e ações',
      U.alertRow('w', `Arquivar os ${f.num(orph)} públicos órfãos`, `Nenhum deles entra em conjunto ativo. Ficam no seletor, confundem quem monta campanha e escondem os ${f.num(used)} que importam. Públicos de site com janela curta (7, 14, 15 dias) se reconstroem sozinhos quando forem necessários.`, 'Marcar como arquivado no Gerenciador de Públicos, mantendo apenas os três em uso e a Lista de Clientes.')
      + U.alertRow('c', 'Atualizar a lista de clientes e os públicos de engajamento', `${lista ? `"${f.esc(lista.name)}" tem ${size(lista)} pessoas e está parada.` : 'Não há lista de clientes ativa.'} ${f.num(stale)} públicos estão marcados como desatualizados pela Meta — sem uso há mais de 30 dias. A base da Nuvemshop cresce ${f.num(G.kpi?.ecom?.orders_per_day)} pedidos por dia e nada disso entra nos públicos.`, 'Exportar compradores 180 dias da Nuvemshop (e-mail, telefone, nome) e subir como lista de clientes com atualização semanal.')
      + U.alertRow('i', 'Recriar o semelhante 1% a partir de compradores 180 dias', `${f.num(lkFail)} de ${f.num(lk.length)} semelhantes falharam na criação (código 433) porque a fonte era pequena demais. Os cinco semelhantes do pixel que existem têm 1,4–1,7 mi de pessoas cada, mas nenhum está em conjunto ativo.`, 'Fonte: lista de clientes atualizada (compradores 180 dias). Um semelhante 1% Brasil, testado em conjunto próprio contra o Advantage+ atual.'),
      '', 'Tamanho "20" é o valor que a Meta devolve quando o público é pequeno ou o número está oculto; não é o tamanho real.');
    return `<div class="ph"><div><div class="h1">Públicos salvos</div><div class="h1-sub">Inventário de públicos personalizados e semelhantes contra o que os conjuntos ativos realmente usam</div></div></div>
      ${U.lead(`${f.num(total)} públicos salvos, ${f.num(used)} em uso.`, `Dos ${f.num(total)} públicos da conta, só ${f.num(used)} entram em conjuntos ativos — todos no mesmo conjunto de retargeting. Os outros ${f.num(orph)} ocupam espaço, ${f.num(undel)} nem podem entregar e os semelhantes de compradores nunca foram recriados desde que falharam.`, f.num(used) + ' de ' + f.num(total), 'em uso')}
      ${kpis}
      <div class="card" id="auCard">${tableHtml()}</div>
      ${leitura}`;
  }

  function mount(host) {
    const card = host.querySelector('#auCard');
    const wire = () => { const tbl = card.querySelector('#auTbl'); U.bindSort(tbl); U.bindSearch(card.querySelector('#auQ'), tbl); card.querySelector('#auTabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.tab = b.dataset.t; card.innerHTML = tableHtml(); wire(); }; };
    wire();
  }

  window.SEC = window.SEC || {};
  window.SEC.publicos = { title: 'Públicos salvos', render, mount, count: () => sm.orphans ?? 0 };
})();
