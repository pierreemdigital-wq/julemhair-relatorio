/* Conta & atividade — quem opera a conta, o que mudou em 30 dias, limites, regras automáticas, páginas, token */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const acc = G.meta?.account || {}, lim = G.meta?.limits || {}, sp = lim.spend || {}, rl = lim.rate_limit || {};
  const act = G.activity || {}, R = G.rules || {}, rules = R.rules || [], soc = G.social?.accounts || {}, accounts = soc.accounts || [];
  const brlC = v => v == null ? null : Number(v) / 100;
  const amountSpent = acc.amount_spent_currency ?? brlC(acc.amount_spent), balance = acc.balance_currency ?? brlC(acc.balance), cap = acc.spend_cap_currency ?? brlC(acc.spend_cap);

  const iso = s => s ? new Date(String(s).replace(/([+-]\d\d)(\d\d)$/, '$1:$2')) : null;
  const dtl = s => { const d = iso(s); if (!d || isNaN(d)) return '—'; return f.dtl(d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })); };
  const dth = s => { const d = iso(s); if (!d || isNaN(d)) return '—'; return dtl(s) + ' ' + d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }); };

  const OBJT = { ADGROUP: 'Anúncio', AD: 'Anúncio', CAMPAIGN: 'Conjunto', CAMPAIGN_GROUP: 'Campanha', ACCOUNT: 'Conta', AUDIENCE: 'Público' };
  const EVT = { first_delivery_event: 'Anúncio começou a exibir', ad_account_billing_charge: 'Cobrança na conta', update_ad_run_status: 'Status de anúncio', update_ad_friendly_name: 'Nome de anúncio', update_ad_creative: 'Criativo de anúncio', update_campaign_name: 'Nome de campanha', update_campaign_budget: 'Orçamento de campanha', update_campaign_run_status: 'Status de campanha', update_ad_set_run_status: 'Status de conjunto', create_ad: 'Anúncio criado', update_ad_set_target_spec: 'Segmentação de conjunto', update_ad_set_optimization_goal: 'Otimização de conjunto', update_ad_set_bid_strategy: 'Estratégia de lance', create_ad_set: 'Conjunto criado', create_campaign_group: 'Campanha criada', update_audience: 'Público atualizado', update_ad_run_status_to_be_set_after_review: 'Status após revisão', update_campaign_schedule: 'Agendamento de campanha', update_ad_set_budget: 'Orçamento de conjunto', update_ad_set_name: 'Nome de conjunto' };
  const TIER = { development_access: 'Desenvolvimento', standard_access: 'Padrão', advanced_access: 'Avançado' };
  const STATUS = { 1: 'Ativa', 2: 'Desativada', 3: 'Não liquidada', 7: 'Em revisão', 9: 'Período de carência', 100: 'Fechada pendente', 101: 'Fechada' };

  function render() {
    const byActor = Object.entries(act.by_actor || {}).sort((a, b) => b[1] - a[1]);
    const byEv = Object.entries(act.by_event_type || {}).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const humans = byActor.filter(([n]) => n !== 'Meta');
    const humanTotal = humans.reduce((s, [, v]) => s + v, 0), total = act.count ?? (act.activities || []).length;
    const lastHuman = (act.activities || []).find(a => a.actor_name !== 'Meta');
    const pctUsed = rl.max_pct_used ?? null;
    const capSet = sp.spend_cap_set === true || (cap != null && cap > 0);

    const kpis = `<div class="kpis six">
      ${U.kpi({ l: 'Gasto acumulado histórico', v: f.brl(amountSpent), raw: amountSpent, fmt: 'brl', sub: `conta criada em ${dtl(acc.created_time)}`, pri: true })}
      ${U.kpi({ l: 'Saldo a pagar', v: f.brl2(balance), raw: balance, fmt: 'brl2', sub: acc.funding_source_details?.display_string ? f.esc(acc.funding_source_details.display_string) : 'pós-pago' })}
      ${U.kpi({ l: 'Limite de gasto', v: capSet ? f.brl(cap) : 'Sem limite', raw: capSet ? cap : '', fmt: 'brl', sub: capSet ? `${f.pct(sp.pct_used)} usado` : 'spend_cap não definido' })}
      ${U.kpi({ l: 'Limite de API usado', v: f.pct(pctUsed, 0), raw: pctUsed, fmt: 'pct', sub: rl.throttled ? 'chamadas sendo limitadas' : `${f.pct(rl.remaining_pct, 0)} disponível` })}
      ${U.kpi({ l: 'Nível de acesso à API', v: TIER[rl.tier] || f.esc(rl.tier || '—'), sub: rl.tier === 'development_access' ? 'volume de chamadas restrito' : 'nível de produção' })}
      ${U.kpi({ l: 'Status da conta', v: STATUS[acc.account_status] || f.esc(acc.account_status_label || '—'), sub: `orçamento mínimo ${f.brl2(acc.min_daily_budget_in_currency ?? brlC(acc.min_daily_budget))}/dia` })}
    </div>`;

    const actCols = [
      { t: 'Data', type: 'txt', k: r => r.event_time, h: r => `<span class="mono">${dth(r.event_time)}</span>` },
      { t: 'Ator', type: 'txt', k: r => r.actor_name, h: r => r.actor_name === 'Meta' ? U.tag('Meta', 'n') : `<b>${f.esc(r.actor_name)}</b>` },
      { t: 'Evento', type: 'txt', k: r => r.translated_event_type || EVT[r.event_type] || r.event_type, h: r => f.esc(EVT[r.event_type] || r.translated_event_type || U.pt(r.event_type)) },
      { t: 'Objeto', type: 'txt', k: r => r.object_name, h: r => `<div class="nm" title="${f.esc(r.object_name)}">${f.esc(r.object_name)}<span class="sub">${U.pt(r.object_type)}${r.extra_data?.old_value != null && r.extra_data?.new_value != null && typeof r.extra_data.new_value !== 'object' ? ` · ${f.esc(String(r.extra_data.old_value))} → ${f.esc(String(r.extra_data.new_value))}` : r.event_type === 'ad_account_billing_charge' && r.extra_data?.new_value ? ` · ${f.brl2(r.extra_data.new_value / 100)}` : ''}</span></div>` },
    ];
    const atividade = U.card('Atividade da conta',
      `<div class="g11">
        <div><div class="lbl">Por ator</div>${U.hbars(byActor.map(([n, v]) => ({ n, v, s: total ? f.pct(v / total * 100, 0) : '' })), f.num)}</div>
        <div><div class="lbl">Por tipo de evento</div>${U.hbars(byEv.map(([k, v]) => ({ n: EVT[k] || k, v })), f.num)}</div>
      </div>
      <div class="tb"><input class="search" id="ctQ" placeholder="Filtrar por objeto, ator ou evento"><span class="cnt">${Math.min(60, (act.activities || []).length)} de ${f.num(total)} eventos</span></div>
      ${U.table('ctAct', actCols, (act.activities || []).slice(0, 60))}`,
      `<span class="faint">${f.dt(act.since)} – ${f.dt(act.until)}</span>`,
      `Os ${f.num(total)} eventos mais recentes retornados pela API. Eventos com ator "Meta" são automáticos: cobrança, revisão e início de exibição.`);

    const pingCount = rules.filter(r => r.execution_spec?.execution_type === 'PING_ENDPOINT').length;
    const ENTITY = { CAMPAIGN: 'campanha', ADSET: 'conjunto', AD: 'anúncio' };
    const TRIG = { METADATA_UPDATE: 'ao editar', METADATA_CREATION: 'ao criar', STATS_CHANGE: 'ao mudar métrica', SCHEDULE: 'agendada' };
    const rCols = [
      { t: 'Regra', type: 'txt', k: r => r.name, h: r => `<div class="nm">${f.esc(r.name)}<span class="sub">${f.esc(r.id)}</span></div>` },
      { t: 'Status', c: 1, type: 'txt', k: r => r.status, h: r => r.status === 'ENABLED' ? U.tag('Ativa', 'ok') : U.tag('Desativada', 'n') },
      { t: 'Gatilho', type: 'txt', k: r => r.evaluation_spec?.trigger?.type || '', h: r => { const e = (r.evaluation_spec?.filters || []).find(x => x.field === 'entity_type'); return `${U.pt(r.evaluation_spec?.trigger?.type || r.evaluation_spec?.evaluation_type)}${e ? ' ' + (ENTITY[e.value] || f.esc(e.value)) : ''}`; } },
      { t: 'Execução', type: 'txt', k: r => r.execution_spec?.execution_type || '', h: r => r.execution_spec?.execution_type === 'PING_ENDPOINT' ? U.tag('Envio a servidor externo', 'at') : U.tag(U.pt(r.execution_spec?.execution_type), 'n') },
      { t: 'Criada', type: 'txt', k: r => r.created_time, h: r => dtl(r.created_time) },
    ];
    const regras = U.card('Regras automáticas',
      (pingCount ? U.alertRow('w', `${f.num(pingCount)} de ${f.num(rules.length)} regras enviam dados da conta a um servidor externo`, `Todas com nome "Madgicx": a ferramenta recebe cada criação e edição de campanha, conjunto e anúncio. Não alteram nada sozinhas, mas a conta continua conectada a um serviço que ${humans.length ? 'não aparece no histórico de atividade' : 'não consta como operador'}.`, 'Se a Madgicx não está mais em uso, revogar o acesso em Configurações do negócio › Integrações e apagar as regras.') : '')
      + (rules.length ? U.table('ctRules', rCols, rules) : '<div class="empty">Nenhuma regra automática na conta.</div>'),
      `<span class="faint">${f.num(R.count ?? rules.length)} regras</span>`);

    const social = U.card('Páginas e Instagram',
      `<div class="grid-list">${accounts.map(a => `<div class="gl"><div class="l">${f.esc(a.alias)}</div><div class="v">@${f.esc(a.instagram?.username || '—')}</div><div class="c">${f.num(a.instagram?.followers_count)} seguidores no Instagram · ${f.num(a.instagram?.media_count)} publicações<br>Página "${f.esc(a.page?.name || '—')}" · ID ${f.esc(a.page?.id || '—')} · ${f.num(a.page?.followers_count)} seguidores</div></div>`).join('') || '<div class="empty">Nenhuma página vinculada.</div>'}</div>`,
      `<span class="faint">${f.num(soc.count ?? accounts.length)} contas</span>`,
      accounts.length >= 2 ? `O perfil pessoal @${f.esc(accounts[1]?.instagram?.username)} tem ${f.num((accounts[1]?.instagram?.followers_count || 0) / (accounts[0]?.instagram?.followers_count || 1), 0)}x a audiência da marca. Anúncios com identidade do perfil pessoal usam essa credibilidade; os públicos de engajamento dele estão desatualizados (ver Públicos salvos).` : '');

    const token = U.card('Acesso à API',
      `<div class="kv">
        <span>Tipo de token</span><b>Token de sistema (Business Manager)</b>
        <span>Válido</span><b>${U.statusDot('ACTIVE')}Sim — extrato gerado em ${f.dtl(G.meta?.generated)}</b>
        <span>Expira</span><b>Não expira (usuário de sistema)</b>
        <span>Aplicativo / versão</span><b>Infinity API · Graph ${f.esc(G.meta?.sources?.graph || '—')}</b>
        <span>Conta de anúncios</span><b class="mono">${f.esc(acc.id || '—')}</b>
        <span>Business Manager</span><b>${f.esc(acc.business?.name || '—')} · ${f.esc(acc.business?.id || '—')}</b>
        <span>Fuso · moeda</span><b>${f.esc(acc.timezone_name || '—')} · ${f.esc(acc.currency || '—')}</b>
      </div>`,
      '', 'O token nunca é exibido nem armazenado neste painel. Tipo e validade inferidos da coleta bem-sucedida; a API não devolve metadados do token neste extrato.');

    return `<div class="ph"><div><div class="h1">Conta & atividade</div><div class="h1-sub">Quem opera a conta, o que mudou nos últimos 30 dias, limites e integrações</div></div></div>
      ${U.lead(`${humans.length === 1 ? f.esc(humans[0][0]) + ' fez' : f.num(humans.length) + ' pessoas fizeram'} ${f.pct(total ? humanTotal / total * 100 : 0, 0)} das ${f.num(total)} alterações dos últimos 30 dias.`,
        `Uma única pessoa opera a conta; o restante são eventos automáticos da Meta (cobrança, revisão, início de exibição). A conta gastou ${f.brl(amountSpent)} desde ${dtl(acc.created_time)}, ${capSet ? 'com limite de ' + f.brl(cap) : 'sem limite de gasto configurado'}, e ainda está no nível de acesso de desenvolvimento da API — ${f.num(rules.length)} regras da Madgicx seguem ativas enviando dados para fora.${lastHuman ? ` Última ação humana: ${dth(lastHuman.event_time)}.` : ''}`,
        f.num(total), 'eventos em 30 dias')}
      ${kpis}
      ${atividade}
      <div class="g11">${regras}${social}</div>
      ${token}`;
  }

  function mount(host) {
    U.bindSearch(host.querySelector('#ctQ'), host.querySelector('#ctAct'));
    host.querySelectorAll('table.tbl').forEach(U.bindSort);
  }

  window.SEC = window.SEC || {};
  window.SEC.conta = { title: 'Conta & atividade', render, mount };
})();
