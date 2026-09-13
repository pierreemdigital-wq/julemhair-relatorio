/* Plano de ação — dez decisões priorizadas por impacto em reais. Tudo calculado de window.G no render. */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const n0 = v => (v == null || isNaN(v)) ? null : v;
  const safeDiv = (a, b) => (a == null || !b) ? null : a / b;
  const days = (G.daily && G.daily.length) || 30;

  function item(i, lvl, title, why, how, ind) {
    return `<div class="pl ${lvl}"><div class="pl-n">${i}</div><div><h4>${title}</h4>
      <div class="pl-r"><span class="k">Por quê</span><p>${why}</p></div>
      <div class="pl-r"><span class="k">Como</span><p>${how}</p></div>
      <div class="pl-r"><span class="k">Indicador</span><p>${ind}</p></div></div></div>`;
  }
  const bySpend = (a, b) => (b.spend || 0) - (a.spend || 0);
  const findPlat = k => (G.breakdown?.platform?.items || []).find(i => i.publisher_platform === k) || {};
  const findPos = (p, k) => (G.breakdown?.position?.items || []).find(i => i.publisher_platform === p && i.platform_position === k) || {};

  function render() {
    const c = G.kpi?.cur || {}, p = G.kpi?.prv || {}, mg = G.kpi?.marginal || {}, ec = G.kpi?.ecom || {};
    const curDay = safeDiv(c.spend, days), prvDay = safeDiv(p.spend, days);

    /* 2 — pausadas com orçamento */
    const pwb = G.structure?.paused_with_budget || {}; const stuck = n0(pwb.daily_budget_stuck_brl);
    const top5 = (pwb.items || []).slice().sort((a, b) => (b.daily_budget_total || 0) - (a.daily_budget_total || 0)).slice(0, 5);
    const top5Sum = top5.reduce((s, i) => s + (i.daily_budget_total || 0), 0) / 100;

    /* 3 — rastreamento */
    const iph = (G.breakdown?.device?.items || []).find(i => i.impression_device === 'iphone') || {};
    const gap = n0(ec.gap_pct), gapRev = n0(ec.gap_rev);

    /* 4 — públicos */
    const au = G.audiences?.summary || {};

    /* 5 — criativo */
    const lib = G.library || {}; const idlePct = lib.idle_pct != null ? lib.idle_pct * 100 : null;
    const fatItems = (G.fatigue?.adsets?.items || []).filter(i => i.status === 'fadiga' || i.status === 'atencao').sort(bySpend);
    const nFad = fatItems.filter(i => i.status === 'fadiga').length, nAt = fatItems.filter(i => i.status === 'atencao').length;
    const fatSpend = fatItems.reduce((s, i) => s + (i.spend || 0), 0);

    /* 6 — plataformas */
    const fb = findPlat('facebook'), ig = findPlat('instagram');
    const fbTarget = fb.share_spend_pct != null ? fb.share_spend_pct + 6 : null;
    const fbTargetBRL = fbTarget != null && c.spend ? c.spend * fbTarget / 100 / days : null;

    /* 7 — objetivos legados */
    const leg = G.structure?.legacy_objectives || {}; const legItems = leg.items || [];
    const legObj = legItems.reduce((a, i) => { a[i.objective] = (a[i.objective] || 0) + 1; return a; }, {});
    const legTxt = Object.entries(legObj).map(([k, v]) => `${v} ${U.pt(k)}`).join(', ');

    /* 8 — regras */
    const rules = G.rules || {}; const rl = rules.rules || [];
    const rulesOn = rl.filter(r => r.status === 'ENABLED').length;
    const ping = rules.by_execution_type?.PING_ENDPOINT;
    const ruleNames = [...new Set(rl.map(r => r.name))];
    const ruleUpd = rl.map(r => r.updated_time).filter(Boolean).sort().pop();

    /* 9 — UTM */
    const nv = G.nuvem || {}; const noUtm = n0(nv.no_utm), cov = n0(nv.utm_coverage);
    const noUtmPct = cov != null ? 100 - cov : (noUtm != null && nv.orders_paid ? noUtm / nv.orders_paid * 100 : null);
    const noUtmRev = noUtmPct != null && nv.revenue ? nv.revenue * noUtmPct / 100 : null;

    /* 10 — reels */
    const reels = findPos('instagram', 'instagram_reels'), feed = findPos('instagram', 'feed'), sto = findPos('instagram', 'instagram_stories');
    const reelsLoss = reels.spend && feed.roas && reels.roas != null ? reels.spend * (feed.roas - reels.roas) : null;

    const items = [
      item(1, 'c', `Congelar a escala até o ROAS marginal passar de 2,0x`,
        `O investimento subiu ${f.dOnly(c.spend, p.spend, true)} (${f.brl(mg.delta_spend)}) e trouxe ${f.brl(mg.delta_revenue)} a mais em receita: <b>ROAS marginal de ${f.x(mg.marginal_roas)}</b> — cada real novo voltou ${f.brl2(mg.marginal_roas)}. A frequência foi a ${f.num(c.frequency, 2)} (era ${f.num(p.frequency, 2)}) e o ROAS da conta caiu de ${f.x(p.roas)} para ${f.x(c.roas)}.`,
        `Voltar o investimento diário para a faixa do período anterior, <b>${f.brl(prvDay)}/dia</b> (hoje ${f.brl(curDay)}/dia), sem cortar os conjuntos que sustentam volume. Só retomar aumento de verba quando o ROAS marginal de 7 dias estiver acima de 2,0x com frequência abaixo de 5.`,
        `ROAS marginal 7 dias > 2,0x · frequência < 5,0 · ROAS da conta ≥ ${f.x(p.roas)}.`),

      item(2, 'c', `Liberar ${f.brl(stuck)}/dia de orçamento preso em campanhas pausadas`,
        `<b>${f.num(pwb.count)} campanhas pausadas</b> ainda carregam orçamento diário configurado, somando ${f.brl(stuck)}/dia. Qualquer reativação acidental — por regra, por automação ou por clique — dispara gasto sem controle. As 5 maiores concentram ${f.brl(top5Sum)}/dia: ${top5.map(i => `<b>${f.esc(i.name)}</b> (${f.brl(i.daily_budget_total / 100)})`).join(', ')}.`,
        `Zerar o orçamento das pausadas que não voltam; arquivar as que têm mais de 90 dias sem entrega. Para as que podem voltar, mover para orçamento de campanha (CBO) e deixar o valor documentado no nome.`,
        `Campanhas pausadas com orçamento: ${f.num(pwb.count)} → 0 · orçamento preso: ${f.brl(stuck)} → R$ 0.`),

      item(3, 'c', `Fechar o rastreamento com CAPI e webhook de pedido`,
        `O Meta atribui <b>${f.pct(ec.meta_share_of_store)}</b> do faturamento da loja; ${gap != null ? f.pct(Math.abs(gap)) : '—'} (${f.brl(gapRev != null ? Math.abs(gapRev) : null)}) não tem origem confirmada. ${f.pct(iph.share_spend_pct)} do investimento está em iPhone, onde o pixel sozinho perde eventos por bloqueio de rastreamento — o algoritmo otimiza com menos compras do que realmente acontecem.`,
        `Ativar a API de Conversões a partir do webhook de pedido pago da Nuvemshop, com deduplicação por event_id contra o pixel. Enviar email, telefone e external_id com hash. Validar no Gerenciador de Eventos até a qualidade de correspondência do Purchase ficar acima de 7.`,
        `Diferença Meta × loja: ${gap != null ? f.pct(Math.abs(gap)) : '—'} → < 5% · qualidade de correspondência do Purchase ≥ 7 · deduplicação ≥ 95%.`),

      item(4, 'w', `Limpar os públicos salvos e recriar o lookalike de compradores 180 dias`,
        `De <b>${f.num(au.total_audiences)} públicos</b>, ${f.num(au.orphans)} são órfãos (não estão em nenhum conjunto ativo), ${f.num(au.too_small)} são pequenos demais para entregar e ${f.num(au.operation_not_normal)} estão desatualizados. Apenas ${f.num(au.healthy_and_in_use)} está saudável e em uso, em ${f.num(au.audiences_in_active_adsets)} públicos usados por ${f.num(au.active_adsets_scanned)} conjuntos ativos.`,
        `Arquivar os ${f.num(au.orphans)} órfãos. Recriar a base de compradores 180D a partir do pixel + lista de clientes da loja e gerar lookalike 1% e 1–3% BR. Excluir compradores 30D dos conjuntos de aquisição.`,
        `Públicos saudáveis em uso: ${f.num(au.healthy_and_in_use)} → ≥ 5 · órfãos: ${f.num(au.orphans)} → 0 · lookalike 180D ativo em conjunto de aquisição.`),

      item(5, 'w', `Renovar criativo: ${idlePct != null ? f.pct(idlePct, 0) : '—'} da biblioteca está ociosa e ${f.num(fatItems.length)} conjuntos pedem troca`,
        `A conta tem <b>${f.num(lib.creatives_total)} criativos</b> na biblioteca e usou ${f.num(lib.creatives_used)} nos últimos ${f.num(lib.period?.days || days)} dias. ${nFad ? `${f.num(nFad)} conjuntos em fadiga e ` : 'Nenhum conjunto em fadiga confirmada, mas '}${f.num(nAt)} em atenção (CTR caindo com frequência subindo), concentrando ${f.brl(fatSpend)} de investimento. ${fatItems.length ? `Os maiores: ${fatItems.slice(0, 3).map(i => `<b>${f.esc(i.name)}</b> (freq. ${f.num(i.frequency, 1)}, CTR ${i.ctr_delta_pct > 0 ? '+' : ''}${f.num(i.ctr_delta_pct, 0)}%)`).join(', ')}.` : ''}`,
        `Produzir 6 a 8 peças novas por semana com ângulos distintos (prova, demonstração, antes e depois, oferta), começando pelos ${f.num(Math.min(3, fatItems.length))} conjuntos acima. Desligar anúncio com frequência > 6 e CTR 20% abaixo da primeira metade do período.`,
        `Conjuntos em atenção ou fadiga: ${f.num(fatItems.length)} → ≤ 3 · CTR da conta ≥ ${f.pct(p.ctr, 2)} (hoje ${f.pct(c.ctr, 2)}).`),

      item(6, 'w', `Testar o Facebook com +6 pontos de participação na verba`,
        `O Instagram recebe <b>${f.pct(ig.share_spend_pct)}</b> do investimento com ROAS ${f.x(ig.roas)}; o Facebook fica com ${f.pct(fb.share_spend_pct)} e entrega ROAS ${f.x(fb.roas)}, CPA ${f.brl2(fb.cpa)} contra ${f.brl2(ig.cpa)} e CPM ${f.brl2(fb.cpm)} contra ${f.brl2(ig.cpm)}. ${f.num(fb.pur)} compras é amostra suficiente para leitura.`,
        `Subir a participação do Facebook de ${f.pct(fb.share_spend_pct)} para ${fbTarget != null ? f.pct(fbTarget) : '—'} (cerca de ${f.brl(fbTargetBRL)}/dia) por 14 dias, em posicionamento manual, com os 5 anúncios de melhor ROAS do Instagram adaptados ao feed.`,
        `ROAS Facebook ≥ ${f.x(ig.roas)} após o aumento · CPA Facebook < ${f.brl2(ig.cpa)} · participação ${fbTarget != null ? f.pct(fbTarget) : '—'} mantida.`),

      item(7, 'i', `Arquivar ${f.num(leg.count)} campanhas com objetivo legado`,
        `${f.num(leg.count)} campanhas usam objetivos anteriores ao ODAX (${legTxt || '—'}), todas ${legItems.every(i => i.status === 'PAUSED') ? 'pausadas' : 'com status misto'}. Poluem relatórios, contam no limite de campanhas da conta e, se reativadas, otimizam para clique e não para compra.`,
        `Arquivar as ${f.num(leg.count)}. Se algum criativo ainda serve, recriar dentro de campanha com objetivo Vendas e otimização para Compra.`,
        `Campanhas com objetivo legado: ${f.num(leg.count)} → 0.`),

      item(8, 'i', `Revisar as ${f.num(rules.count)} regras automatizadas da Madgicx`,
        `As ${f.num(rules.count)} regras da conta (${ruleNames.map(f.esc).join(' e ') || '—'}) são do tipo <b>envio a servidor externo</b>: disparam a cada criação ou edição de campanha, conjunto e anúncio para um servidor externo. ${f.num(rulesOn)} ativas, última alteração em ${ruleUpd ? f.dtl(ruleUpd) : '—'}. Nenhuma pausa, escala ou protege orçamento — só sincronizam dados com a ferramenta.`,
        `Confirmar se a Madgicx ainda é usada. Se não, desativar as ${f.num(rules.count)} regras e revogar o acesso do app no Business Manager. Se sim, criar regras nativas de proteção: pausar conjunto com CPA > ${f.brl(c.cpa ? c.cpa * 1.5 : null)} em 3 dias e ROAS < 1,5x com mais de R$ 1.000 gastos.`,
        `Regras sem dono: ${f.num(rulesOn)} → 0 · regra de proteção de CPA ativa.`),

      item(9, 'i', `Padronizar UTM: ${noUtmPct != null ? f.pct(noUtmPct, 0) : '—'} dos pedidos chegam sem origem`,
        `<b>${f.num(noUtm)} de ${f.num(nv.orders_paid)} pedidos pagos</b> não têm UTM — cobertura de ${f.pct(cov)}. É cerca de ${f.brl(noUtmRev)} de faturamento que não pode ser atribuído a nenhum canal, o que distorce o MER (${U.MER_DEF}: ${f.x(ec.mer)}) e a comparação entre Meta, CRM e influenciadoras.`,
        `Aplicar utm_source/utm_medium/utm_campaign obrigatórios em todo link: parâmetros dinâmicos no Meta ({{campaign.name}}, {{adset.name}}, {{ad.name}}), padrão fixo para email, link da bio e cupons de influenciadora. Bloquear publicação de link sem UTM.`,
        `Cobertura de UTM: ${f.pct(cov)} → ≥ 95% · pedidos sem origem: ${f.num(noUtm)} → < 230/mês.`),

      item(10, 'i', `Realocar o Reels do Instagram para feed e stories`,
        `O Reels recebeu <b>${f.brl(reels.spend)}</b> e entregou ROAS ${f.x(reels.roas)}, abaixo do feed (${f.x(feed.roas)}) e dos stories (${f.x(sto.roas)}). ${f.num(reels.pur)} compras dão base para a leitura. Ao ROAS do feed, o mesmo investimento teria gerado ${f.brl(reelsLoss)} a mais.`,
        `Manter o Reels apenas com criativos verticais nativos (gancho nos 2 primeiros segundos). Nos conjuntos com posicionamento automático, verificar se o algoritmo está empurrando peças de feed para o Reels; se sim, excluir o posicionamento por 14 dias e medir.`,
        `ROAS Reels ≥ ${f.x(feed.roas)} ou participação do Reels no investimento abaixo de 8%.`),
    ];

    const dont = U.card('O que não fazer agora',
      U.alertRow('w', 'Não escalar a conta', `ROAS marginal de ${f.x(mg.marginal_roas)} significa que o último ${f.brl(mg.delta_spend)} investido voltou praticamente o mesmo em receita. Escalar antes de corrigir criativo e rastreamento só amplia o prejuízo marginal.`)
      + U.alertRow('w', 'Não criar público novo antes de limpar os existentes', `${f.num(au.orphans)} públicos órfãos e ${f.num(au.operation_not_normal)} desatualizados já disputam o mesmo espaço. Público novo em cima de base suja repete a sobreposição e a frequência de ${f.num(c.frequency, 1)}.`)
      + U.alertRow('w', 'Não julgar criativo com menos de 50 compras', `Abaixo de 50 compras, a variação de ROAS é ruído estatístico. Desligar ou escalar por esse número significa decidir no acaso — esperar volume ou olhar CTR e hook rate como sinais antecipados.`),
      '', 'Três decisões que parecem óbvias e pioram o resultado enquanto os itens 1 a 3 não estiverem fechados.');

    return `<div class="ph"><div><div class="h1">Plano de ação</div><div class="h1-sub">Período ${f.dt(G.meta?.period?.since)} – ${f.dt(G.meta?.period?.until)} · comparado com ${f.dt(G.meta?.previous?.since)} – ${f.dt(G.meta?.previous?.until)}</div></div></div>
    ${U.lead(`Três vazamentos antes de escalar: ROAS marginal ${f.x(mg.marginal_roas)}, ${f.brl(stuck)}/dia presos em pausadas e ${gap != null ? f.pct(Math.abs(gap), 0) : '—'} da receita sem atribuição.`, `Dez decisões ordenadas por impacto em reais. As três primeiras protegem dinheiro que já está saindo: escala sem retorno marginal, ${f.brl(stuck)}/dia parados em campanhas pausadas e ${gap != null ? f.pct(Math.abs(gap), 0) : '—'} do faturamento sem atribuição. As demais recuperam eficiência em público, criativo, plataforma e medição.`, f.brl(stuck), 'por dia recuperável em pausadas')}
    <div class="plan">${items.join('')}</div>
    ${dont}`;
  }

  function mount(host) {
    /* nomes de campanha que existem na árvore abrem o painel lateral */
    const byName = new Map(G.tree.map(c => [c.name, c]));
    host.querySelectorAll('.pl-r p b').forEach(b => {
      const n = byName.get(b.textContent); if (!n) return;
      b.classList.add('lnk'); b.addEventListener('click', () => U.nodePanel('Campanha', n));
    });
  }

  window.SEC = window.SEC || {};
  window.SEC.plano = { title: 'Plano de ação', render, mount, count: () => 10 };
})();
