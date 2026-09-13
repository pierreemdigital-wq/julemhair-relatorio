/* Plataformas & posicionamentos — distribuição de verba por plataforma, combo spend × ROAS por posicionamento, tabela completa, leitura */
(function () {
  const U = window.UI, f = U.fmt, G = window.G;
  const B = (G.breakdown && G.breakdown.platform) || { items: [], totals: {} };
  const P = (G.breakdown && G.breakdown.position) || { items: [], totals: {} };
  const n = v => (v == null || isNaN(v)) ? 0 : +v;

  const PLAT = { instagram: 'Instagram', facebook: 'Facebook', audience_network: 'Audience Network', threads: 'Threads', messenger: 'Messenger', unknown: 'Desconhecido' };
  const POS = { feed: 'Feed', instagram_stories: 'Stories', instagram_reels: 'Reels', facebook_reels: 'Reels', facebook_stories: 'Stories', instagram_explore_grid_home: 'Explorar (grade)', instagram_explore: 'Explorar', instream_video: 'Vídeo in-stream', rewarded_video: 'Vídeo recompensado', threads_feed: 'Feed', an_classic: 'Banner clássico', facebook_reels_overlay: 'Reels (sobreposição)', marketplace: 'Marketplace', instagram_lead_gen_multi_submit: 'Formulário de lead', facebook_profile_feed: 'Feed de perfil', facebook_notification: 'Notificação', search: 'Busca', instagram_search: 'Busca', right_hand_column: 'Coluna direita', biz_disco_feed: 'Feed de descoberta', instagram_profile_feed: 'Feed de perfil', unknown: 'Desconhecido' };
  const pl = k => PLAT[k] || f.esc(String(k || '—').replace(/_/g, ' '));
  const po = k => POS[k] || f.esc(String(k || '—').replace(/_/g, ' '));

  const items = B.items.filter(i => n(i.spend) > 0).sort((a, b) => n(b.spend) - n(a.spend));
  const tot = n(B.totals.spend) || items.reduce((s, i) => s + n(i.spend), 0);
  const totRev = n(B.totals.revenue) || items.reduce((s, i) => s + n(i.rev), 0);
  const share = i => tot ? n(i.spend) / tot * 100 : 0;
  const posItems = P.items.filter(i => n(i.spend) > 0).sort((a, b) => n(b.spend) - n(a.spend));
  const byKey = (k, list) => list.find(i => i.publisher_platform === k);
  const ig = byKey('instagram', items), fb = byKey('facebook', items), an = byKey('audience_network', items);
  const pos = (p, k) => P.items.find(i => i.publisher_platform === p && i.platform_position === k);
  const igFeed = pos('instagram', 'feed'), igSt = pos('instagram', 'instagram_stories'), igRe = pos('instagram', 'instagram_reels');

  function leadText() {
    if (!ig) return ['Sem entrega por plataforma no período.', 'O breakdown por publisher_platform não retornou linhas com investimento.'];
    const h = `Instagram concentra ${f.pct(share(ig), 0)} da verba com ROAS ${f.x(ig.roas)}${fb ? `; Facebook entrega ${f.x(fb.roas)} com ${f.pct(share(fb), 0)}` : ''}.`;
    const p = fb
      ? `Com ${f.num(fb.pur)} compras e CPA ${f.brl2(fb.cpa)} (Instagram: ${f.brl2(ig.cpa)}), o Facebook tem amostra suficiente para justificar teste de realocação. ${igRe && igFeed ? `Dentro do Instagram, Reels rende ${f.x(igRe.roas)} contra ${f.x(igFeed.roas)} no Feed e ${f.x(igSt ? igSt.roas : null)} nos Stories.` : ''}`
      : 'Não há linha de Facebook com investimento no período.';
    return [h, p];
  }

  function platCards() {
    return '<div class="grid-list">' + items.map(i => `<div class="gl"><div class="l">${pl(i.publisher_platform)}</div><div class="v">${f.pct(share(i))} <span class="faint">da verba</span></div><div class="c">${f.brl(i.spend)} · fat. ${f.brl(i.rev)}</div><div class="c">ROAS ${f.x(i.roas)} · ${f.num(i.pur)} compras · CPA ${f.brl2(i.cpa)}</div>${U.bar(n(i.spend), tot)}</div>`).join('') + '</div>';
  }

  function posTable() {
    const mx = Math.max(...posItems.map(i => n(i.spend)), 1);
    const cols = [
      { t: 'Plataforma · posição', type: 'txt', k: r => pl(r.publisher_platform) + ' ' + po(r.platform_position), h: r => `<div class="nm">${pl(r.publisher_platform)} <span class="faint">·</span> ${po(r.platform_position)}</div>${U.bar(n(r.spend), mx)}` },
      { t: 'Investimento', r: 1, k: r => n(r.spend), h: r => f.brl(r.spend) },
      { t: '% verba', r: 1, k: r => share(r), h: r => f.pct(share(r)) },
      { t: 'Faturamento', r: 1, k: r => n(r.rev), h: r => `<b>${f.brl(r.rev)}</b>` },
      { t: 'ROAS', r: 1, k: r => n(r.roas), h: r => n(r.pur) ? U.roasTag(n(r.roas), n(r.pur)) : '<span class="faint">—</span>' },
      { t: 'Compras', r: 1, k: r => n(r.pur), h: r => f.num(r.pur) },
      { t: 'CPA', r: 1, k: r => n(r.cpa), h: r => n(r.pur) ? f.brl2(r.cpa) : '<span class="faint">—</span>' },
      { t: 'CTR', r: 1, k: r => n(r.ctr), h: r => f.pct(r.ctr, 2) },
    ];
    return U.table('plTbl', cols, posItems);
  }

  function reading() {
    const rows = [];
    if (fb && ig) {
      const better = n(fb.roas) > n(ig.roas);
      rows.push(U.alertRow(better ? 'w' : 'i', `Facebook ${better ? 'subalocado' : 'sem vantagem clara'}: ${f.pct(share(fb))} da verba com ROAS ${f.x(fb.roas)}`,
        `${f.num(fb.pur)} compras e CPA ${f.brl2(fb.cpa)} contra ${f.brl2(ig.cpa)} no Instagram. CTR ${f.pct(fb.ctr, 2)} vs ${f.pct(ig.ctr, 2)}. A distribuição hoje é decidida pelo Advantage+ placements, não pela rentabilidade observada.`,
        better ? `Testar um conjunto com posicionamento manual só Facebook (Feed + Reels) com 10% da verba por 14 dias e comparar CPA.` : `Manter placements automáticos; reavaliar quando o Facebook passar de 500 compras.`));
    }
    if (igRe && igFeed && igSt) {
      const ref = Math.min(n(igFeed.roas), n(igSt.roas));
      const below = n(igRe.roas) < ref;
      rows.push(U.alertRow(below ? 'w' : 'i', `Reels ${below ? 'abaixo de' : 'em linha com'} Feed e Stories: ${f.x(igRe.roas)} vs ${f.x(igFeed.roas)} e ${f.x(igSt.roas)}`,
        `Reels consome ${f.pct(share(igRe))} da verba (${f.brl(igRe.spend)}) com CPA ${f.brl2(igRe.cpa)}, ${f.pct(n(igFeed.cpa) ? (n(igRe.cpa) / n(igFeed.cpa) - 1) * 100 : null, 0)} acima do Feed. CTR ${f.pct(igRe.ctr, 2)} indica que o criativo atual não foi pensado para o formato vertical em tela cheia.`,
        below ? `Produzir 3 criativos nativos de Reels (gancho nos 2 primeiros segundos, sem texto de Feed) antes de ampliar o posicionamento.` : ''));
    }
    if (an) {
      rows.push(U.alertRow('i', `Audience Network irrelevante: ${f.pct(share(an), 2)} da verba`,
        `${f.brl2(an.spend)} investidos, ${f.num(an.pur)} compras. O ROAS ${f.x(an.roas)} não é lido: amostra pequena demais para qualquer decisão. CTR ${f.pct(an.ctr, 1)} é típico de cliques acidentais em apps.`,
        `Excluir Audience Network nos conjuntos com posicionamento manual; nos automáticos, ignorar.`));
    } else rows.push(U.alertRow('i', 'Audience Network sem entrega', 'Nenhuma linha com investimento no período.'));
    return rows.join('');
  }

  function render() {
    const [h, p] = leadText();
    return `<div class="ph"><div><div class="h1">Plataformas & posicionamentos</div><div class="h1-sub">Onde a verba é entregue e o que cada posicionamento devolve · ${f.dt(B.period && B.period.since)} – ${f.dt(B.period && B.period.until)}</div></div></div>
    ${U.lead(h, p, ig ? f.x(tot ? totRev / tot : 0) : '', 'ROAS da conta')}
    ${U.card('Por plataforma', `<div class="card-b">${platCards()}</div>`, `<span class="cnt">${items.length} com entrega · ${f.brl(tot)}</span>`, 'Share calculado sobre o investimento total do período. Breakdown por plataforma não traz período anterior; comparativo não disponível.')}
    <div class="g2">
      ${U.card('Investimento × ROAS por posicionamento', U.chartBox('plCombo', 'tall'), '<span class="cnt">top 8 por investimento</span>', 'Barras: investimento (eixo esquerdo). Linha: ROAS (eixo direito). Posicionamentos com menos de 30 compras têm ROAS instável.')}
      ${U.card('Distribuição de verba', U.chartBox('plDonut', 'tall'))}
    </div>
    ${U.card('Todos os posicionamentos', posTable(), `<span class="cnt">${posItems.length} com entrega</span>`, 'ROAS e CPA omitidos quando não há compra atribuída; em cinza (n<50) quando a amostra não permite leitura. Ordene clicando no cabeçalho.')}
    ${U.card('Leitura', reading())}`;
  }

  function mount(host) {
    const top = posItems.slice(0, 8);
    const SH = { instagram: 'IG', facebook: 'FB', audience_network: 'AN', threads: 'Threads' };
    U.chart('plCombo', {
      data: {
        labels: top.map(i => `${SH[i.publisher_platform] || pl(i.publisher_platform)} · ${po(i.platform_position)}`),
        datasets: [
          { type: 'bar', label: 'Investimento', data: top.map(i => n(i.spend)), backgroundColor: U.C.cur, borderRadius: 4, maxBarThickness: 36, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'ROAS (≥ 30 compras)', data: top.map(i => n(i.pur) >= 30 ? n(i.roas) : null), borderColor: U.C.loja, backgroundColor: U.C.loja, borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, tension: .3, spanGaps: false, yAxisID: 'y2', order: 1 },
        ],
      },
      options: {
        scales: {
          x: { ticks: { autoSkip: false, font: { size: 10 }, callback: function (v) { const l = this.getLabelForValue(v); return l.length > 16 ? l.slice(0, 15) + '…' : l; } } },
          y: U.yBRL,
          y2: { position: 'right', grid: { display: false }, border: { display: false }, beginAtZero: true, ticks: { color: U.C.t2, font: { size: 10.5 }, callback: v => f.x(v) } },
        },
        plugins: { tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y2' ? ` ROAS ${f.x(c.raw)}` : ` ${c.dataset.label} ${f.brl(c.raw)}` } } },
      },
    });
    U.chart('plDonut', {
      type: 'doughnut',
      data: { labels: items.map(i => pl(i.publisher_platform)), datasets: [{ data: items.map(i => n(i.spend)), backgroundColor: items.map((_, i) => U.C.pal[i % U.C.pal.length]), borderWidth: 2, borderColor: '#FFFFFF', hoverOffset: 4 }] },
      options: { cutout: '62%', interaction: { mode: 'nearest', intersect: true }, scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { callbacks: { label: c => ` ${f.brl(c.raw)} · ${f.pct(tot ? c.raw / tot * 100 : 0)}` } } } },
    });
  }

  window.SEC = window.SEC || {};
  window.SEC.plataformas = { title: 'Plataformas', render, mount, count: () => items.length };
})();
