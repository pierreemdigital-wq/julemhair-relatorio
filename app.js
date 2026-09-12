/* Raio-X Operação — Ju Leme Hair | motor de render */
(function () {
  'use strict';
  var D = window.RX;
  var CH = {}; // instâncias Chart.js

  /* ---------- formatação ---------- */
  function brl(n, d) { d = d || 0; return 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function k(n) { n = n || 0; if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + 'M'; if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',') + 'k'; return n.toLocaleString('pt-BR'); }
  function num(n, d) { d = d == null ? 0 : d; return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function pct(n, d) { d = d == null ? 1 : d; return (n || 0).toFixed(d).replace('.', ',') + '%'; }
  function x(n) { return (n || 0).toFixed(2).replace('.', ',') + 'x'; }
  function dt(s) { var p = String(s).split('-'); return p[2] + '/' + p[1]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* delta: retorna {v, cls, arrow, txt}. inverse=true -> subir é ruim */
  function delta(cur, prv, inverse) {
    if (!prv) return { v: null, cls: 'flat', txt: '—' };
    var v = (cur - prv) / prv * 100;
    var good = inverse ? v < 0 : v > 0;
    return { v: v, cls: Math.abs(v) < 0.5 ? 'flat' : (good ? 'up' : 'down'), txt: (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%' };
  }
  function dEl(d) { return '<span class="delta ' + d.cls + '">' + (d.cls === 'up' ? '▲' : d.cls === 'down' ? '▼' : '') + ' ' + d.txt + '</span>'; }

  /* ---------- semáforo ROAS ---------- */
  function roasCls(r) { return r >= 3.2 ? 'good' : r >= 2.6 ? 'ok' : r >= 2.0 ? 'warn' : 'bad'; }
  function pill(txt, cls) { return '<span class="pill ' + cls + '">' + txt + '</span>'; }

  /* ---------- KPI card ---------- */
  function kpi(o) {
    return '<div class="kpi' + (o.hero ? ' hero' : '') + '">' +
      '<div class="kpi-lbl">' + o.label + '</div>' +
      '<div class="kpi-val" data-count="' + (o.raw != null ? o.raw : '') + '" data-fmt="' + (o.fmt || '') + '">' + o.value + '</div>' +
      '<div class="kpi-foot">' + (o.delta ? dEl(o.delta) : '') + (o.sub ? '<span class="kpi-sub">' + o.sub + '</span>' : '') + '</div>' +
      '</div>';
  }

  /* ---------- tabela genérica ordenável ---------- */
  function table(id, cols, rows) {
    var h = '<div class="tbl-wrap"><table class="tbl" id="' + id + '"><thead><tr>';
    cols.forEach(function (c, i) {
      h += '<th class="' + (c.align || '') + ' sortable" data-col="' + i + '" data-type="' + (c.type || 'num') + '">' + c.t + '<span class="sort-ind"></span></th>';
    });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>';
      r.forEach(function (cell, i) { h += '<td class="' + (cols[i].align || '') + '" data-v="' + (cell.v != null ? cell.v : '') + '">' + cell.h + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* ---------- barra proporcional ---------- */
  function bar(v, max, cls) {
    return '<div class="bar"><div class="bar-fill ' + (cls || '') + '" style="width:' + (max ? (v / max * 100) : 0).toFixed(1) + '%"></div></div>';
  }

  /* ============ SEÇÃO: RESUMO EXECUTIVO ============ */
  function secResumo() {
    var c = D.kpi.cur, p = D.kpi.prv;
    var dSpend = c.spend - p.spend, dRev = c.rev - p.rev;
    var marginal = dSpend ? dRev / dSpend : 0;

    var h = '<div class="sec-head"><div><h2>Resumo Executivo</h2><p class="sec-sub">' + dt(D.periodo.cur.since) + ' a ' + dt(D.periodo.cur.until) + ' · comparado com ' + dt(D.periodo.prv.since) + ' a ' + dt(D.periodo.prv.until) + '</p></div></div>';

    /* veredito */
    h += '<div class="verdict ' + (marginal < 1.5 ? 'crit' : marginal < 2.5 ? 'warn' : 'good') + '">' +
      '<div class="verdict-tag">Diagnóstico principal</div>' +
      '<h3>Escala sem retorno: o investimento cresceu ' + pct((c.spend / p.spend - 1) * 100) + ' e a receita apenas ' + pct((c.rev / p.rev - 1) * 100) + '.</h3>' +
      '<p>Os <strong>' + brl(dSpend) + '</strong> adicionais investidos neste período geraram <strong>' + brl(dRev) + '</strong> de receita incremental — um <strong>ROAS marginal de ' + x(marginal) + '</strong>. ' +
      'Na prática, cada real extra voltou ' + brl(marginal, 2) + '. O ROAS médio caiu de ' + x(p.roas) + ' para ' + x(c.roas) + ' e a frequência subiu de ' + num(p.freq, 2) + ' para ' + num(c.freq, 2) + ', sinal clássico de saturação da audiência atual.</p>' +
      '</div>';

    /* KPIs — faturamento primeiro */
    h += '<div class="kpi-grid">' +
      kpi({ label: 'Faturamento', value: brl(c.rev), raw: c.rev, fmt: 'brl', delta: delta(c.rev, p.rev), hero: true, sub: 'vs ' + brl(p.rev) }) +
      kpi({ label: 'Investimento', value: brl(c.spend), raw: c.spend, fmt: 'brl', delta: delta(c.spend, p.spend, true), sub: 'vs ' + brl(p.spend) }) +
      kpi({ label: 'ROAS', value: x(c.roas), raw: c.roas, fmt: 'x', delta: delta(c.roas, p.roas), sub: 'vs ' + x(p.roas) }) +
      kpi({ label: 'Compras', value: num(c.pur), raw: c.pur, fmt: 'num', delta: delta(c.pur, p.pur), sub: 'vs ' + num(p.pur) }) +
      '</div>';

    h += '<div class="kpi-grid sm">' +
      kpi({ label: 'ROAS marginal', value: x(marginal), delta: null, sub: 'retorno do R$ incremental' }) +
      kpi({ label: 'CPA', value: brl(c.cpa, 2), raw: c.cpa, fmt: 'brl2', delta: delta(c.cpa, p.cpa, true), sub: 'vs ' + brl(p.cpa, 2) }) +
      kpi({ label: 'Ticket médio', value: brl(c.ticket, 2), raw: c.ticket, fmt: 'brl2', delta: delta(c.ticket, p.ticket), sub: 'vs ' + brl(p.ticket, 2) }) +
      kpi({ label: 'Frequência', value: num(c.freq, 2), raw: c.freq, fmt: 'dec2', delta: delta(c.freq, p.freq, true), sub: 'vs ' + num(p.freq, 2) }) +
      '</div>';

    h += '<div class="kpi-grid sm">' +
      kpi({ label: 'CTR', value: pct(c.ctr, 2), raw: c.ctr, fmt: 'pct2', delta: delta(c.ctr, p.ctr), sub: 'vs ' + pct(p.ctr, 2) }) +
      kpi({ label: 'CPC', value: brl(c.cpc, 2), raw: c.cpc, fmt: 'brl2', delta: delta(c.cpc, p.cpc, true), sub: 'vs ' + brl(p.cpc, 2) }) +
      kpi({ label: 'CPM', value: brl(c.cpm, 2), raw: c.cpm, fmt: 'brl2', delta: delta(c.cpm, p.cpm, true), sub: 'vs ' + brl(p.cpm, 2) }) +
      kpi({ label: 'Alcance', value: k(c.reach), raw: c.reach, fmt: 'k', delta: delta(c.reach, p.reach), sub: 'vs ' + k(p.reach) }) +
      '</div>';

    /* gráfico duplo */
    h += '<div class="grid-2">' +
      '<div class="card"><div class="card-h"><h4>Receita e investimento por dia</h4>' +
      '<div class="seg" id="segSerie"><button class="seg-b active" data-s="rev">Receita</button><button class="seg-b" data-s="roas">ROAS</button><button class="seg-b" data-s="pur">Compras</button></div></div>' +
      '<div class="chart"><canvas id="chSerie"></canvas></div>' +
      '<p class="note">Linha sólida = período atual. Linha pontilhada = período anterior alinhado por dia.</p></div>' +
      '<div class="card"><div class="card-h"><h4>Funil de conversão</h4></div><div id="funil"></div></div>' +
      '</div>';

    /* alertas estruturais */
    var a = D.audit;
    h += '<div class="card"><div class="card-h"><h4>Alertas que exigem ação</h4></div><div class="alerts">' +
      alert('crit', 'Orçamento parado em campanhas pausadas', brl(a.budget_preso_total) + '/dia distribuídos em ' + a.budget_preso_count + ' campanhas pausadas. Esse orçamento não é gasto, mas polui o planejamento e mascara a capacidade real da conta.', 'Arquivar as campanhas encerradas e zerar o orçamento das demais.') +
      alert('crit', 'Escala com retorno decrescente', 'ROAS marginal de ' + x(marginal) + ' no incremento de verba. A conta está pagando mais caro pelo mesmo cliente (CPM ' + dEl(delta(c.cpm, p.cpm, true)) + ', frequência ' + num(c.freq, 2) + ').', 'Congelar o orçamento no patamar anterior e priorizar criativo novo antes de reescalar.') +
      alert('warn', a.link_clicks_count + ' campanhas com objetivo LINK_CLICKS', 'Incluindo ' + a.boosted_posts + ' publicações impulsionadas do Instagram. Esse objetivo não otimiza para compra e não credita receita no pixel.', 'Migrar o que tem intenção comercial para OUTCOME_SALES; o resto vira verba de topo medida à parte.') +
      alert('warn', 'Padrão de nomenclatura em ' + pct(a.naming_score, 0), 'Apenas ' + a.naming_ok + ' de ' + a.total + ' campanhas seguem um prefixo identificável. Convivem pelo menos quatro convenções diferentes na mesma conta.', 'Adotar [OBJETIVO]_[PRODUTO]_[PÚBLICO]_[DATA] e renomear a partir das ativas.') +
      '</div></div>';
    return h;
  }
  function alert(lvl, t, body, act) {
    return '<div class="alert ' + lvl + '"><div class="alert-dot"></div><div><h5>' + t + '</h5><p>' + body + '</p>' +
      '<p class="alert-act"><strong>Ação:</strong> ' + act + '</p></div></div>';
  }

  /* ============ SEÇÃO: META ADS ============ */
  var DRILL = { camp: null, adset: null };

  function secMeta() {
    var h = '<div class="sec-head"><div><h2>Meta Ads</h2><p class="sec-sub">Clique em uma campanha para abrir seus conjuntos, e em um conjunto para ver os anúncios</p></div></div>';
    h += '<div id="drillBar"></div>';
    h += '<div class="tabs" id="tabsMeta">' +
      '<button class="tab active" data-lvl="camp">Campanhas <b>' + D.campaigns.length + '</b></button>' +
      '<button class="tab" data-lvl="adset">Conjuntos <b>' + D.adsets.length + '</b></button>' +
      '<button class="tab" data-lvl="ad">Anúncios <b>' + D.ads.length + '</b></button>' +
      '</div>';
    h += '<div class="toolbar"><input type="search" id="qMeta" placeholder="Filtrar por nome…" autocomplete="off">' +
      '<div class="seg" id="segRoas"><button class="seg-b active" data-f="all">Todas</button><button class="seg-b" data-f="good">ROAS ≥ 3,0</button><button class="seg-b" data-f="bad">ROAS &lt; 2,5</button></div>' +
      '<span class="tool-count" id="cntMeta"></span></div>';
    h += '<div id="metaBody"></div>';
    return h;
  }

  function renderDrillBar() {
    var el = document.getElementById('drillBar'); if (!el) return;
    if (!DRILL.camp && !DRILL.adset) { el.innerHTML = ''; return; }
    var h = '<div class="drill"><span class="drill-k">Filtrando por</span>';
    if (DRILL.camp) h += '<button class="drill-chip" data-clear="camp">Campanha: <b>' + esc(DRILL.camp) + '</b> <span>&times;</span></button>';
    if (DRILL.adset) h += '<button class="drill-chip" data-clear="adset">Conjunto: <b>' + esc(DRILL.adset) + '</b> <span>&times;</span></button>';
    h += '<button class="drill-clear" data-clear="all">Limpar tudo</button></div>';
    el.innerHTML = h;
  }

  function renderMetaLevel(lvl, q, filt) {
    q = (q || '').toLowerCase(); filt = filt || 'all';
    var rows, cols, host = document.getElementById('metaBody');
    renderDrillBar();
    function keep(r) {
      if (q && r.name.toLowerCase().indexOf(q) < 0) return false;
      if (filt === 'good' && r.roas < 3.0) return false;
      if (filt === 'bad' && r.roas >= 2.5) return false;
      if (lvl !== 'camp' && DRILL.camp && r.campaign !== DRILL.camp) return false;
      if (lvl === 'ad' && DRILL.adset && r.adset !== DRILL.adset) return false;
      return true;
    }
    if (lvl === 'camp') {
      var list = D.campaigns.filter(keep), mx = Math.max.apply(null, list.map(function (r) { return r.spend; }).concat([1]));
      cols = [{ t: 'Campanha', type: 'txt' }, { t: 'Objetivo', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'ROAS', align: 'r' }, { t: 'vs ant.', align: 'r' }, { t: 'Compras', align: 'r' }, { t: 'CPA', align: 'r' }, { t: 'Freq.', align: 'r' }, { t: 'Leitura', type: 'txt' }];
      rows = list.map(function (r) {
        var d = r.is_new ? null : delta(r.roas, r.p_roas);
        var read = r.is_new ? pill('Nova', 'neu') : (r.roas >= 3.2 ? pill('Escalar', 'good') : r.roas >= 2.6 ? pill('Manter', 'ok') : r.roas >= 2.0 ? pill('Revisar', 'warn') : pill('Cortar', 'bad'));
        if (r.pur === 0) read = pill('Sem compra', 'bad');
        return [
          { v: r.name, h: '<div class="cell-name drillable" data-go-adset="' + esc(r.name) + '" title="Ver conjuntos desta campanha"><span>' + esc(r.name) + ' <i class="go">›</i></span>' + bar(r.spend, mx) + '</div>' },
          { v: r.objective, h: '<span class="obj">' + esc((r.objective || '').replace('OUTCOME_', '')) + '</span>' },
          { v: r.spend, h: brl(r.spend) }, { v: r.rev, h: '<b>' + brl(r.rev) + '</b>' },
          { v: r.roas, h: pill(x(r.roas), roasCls(r.roas)) },
          { v: d ? d.v : -999, h: d ? dEl(d) : '<span class="delta flat">nova</span>' },
          { v: r.pur, h: num(r.pur) }, { v: r.cpa, h: brl(r.cpa, 2) },
          { v: r.freq, h: '<span class="' + (r.freq > 5 ? 'hot' : '') + '">' + num(r.freq, 2) + '</span>' },
          { v: 0, h: read }];
      });
      host.innerHTML = table('tCamp', cols, rows);
      document.getElementById('cntMeta').textContent = list.length + ' de ' + D.campaigns.length + ' campanhas · ' + brl(list.reduce(function (s, r) { return s + r.spend; }, 0)) + ' investidos';
    } else if (lvl === 'adset') {
      var la = D.adsets.filter(keep), mxa = Math.max.apply(null, la.map(function (r) { return r.spend; }).concat([1]));
      cols = [{ t: 'Conjunto', type: 'txt' }, { t: 'Campanha', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'ROAS', align: 'r' }, { t: 'Compras', align: 'r' }, { t: 'CPA', align: 'r' }, { t: 'CTR', align: 'r' }, { t: 'Freq.', align: 'r' }];
      rows = la.map(function (r) {
        return [{ v: r.name, h: '<div class="cell-name drillable" data-go-ad="' + esc(r.name) + '" data-camp="' + esc(r.campaign) + '" title="Ver anúncios deste conjunto"><span>' + esc(r.name) + ' <i class="go">›</i></span>' + bar(r.spend, mxa) + '</div>' },
        { v: r.campaign, h: '<span class="dim">' + esc(r.campaign) + '</span>' },
        { v: r.spend, h: brl(r.spend) }, { v: r.rev, h: '<b>' + brl(r.rev) + '</b>' },
        { v: r.roas, h: pill(x(r.roas), roasCls(r.roas)) }, { v: r.pur, h: num(r.pur) },
        { v: r.cpa, h: brl(r.cpa, 2) }, { v: r.ctr, h: pct(r.ctr, 2) },
        { v: r.freq, h: '<span class="' + (r.freq > 5 ? 'hot' : '') + '">' + num(r.freq, 2) + '</span>' }];
      });
      host.innerHTML = table('tAdset', cols, rows);
      document.getElementById('cntMeta').textContent = la.length + ' de ' + D.adsets.length + ' conjuntos';
    } else {
      var ld = D.ads.filter(keep), mxd = Math.max.apply(null, ld.map(function (r) { return r.spend; }).concat([1]));
      cols = [{ t: 'Anúncio', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'ROAS', align: 'r' }, { t: 'Compras', align: 'r' }, { t: 'CPA', align: 'r' }, { t: 'CTR', align: 'r' }, { t: 'Hook', align: 'r' }, { t: 'Retenção', align: 'r' }];
      rows = ld.map(function (r) {
        return [{ v: r.name, h: '<div class="cell-name"><span title="' + esc(r.name) + '">' + esc(r.name) + '</span>' + bar(r.spend, mxd) + '</div>' },
        { v: r.spend, h: brl(r.spend) }, { v: r.rev, h: '<b>' + brl(r.rev) + '</b>' },
        { v: r.roas, h: pill(x(r.roas), roasCls(r.roas)) }, { v: r.pur, h: num(r.pur) },
        { v: r.cpa, h: brl(r.cpa, 2) }, { v: r.ctr, h: pct(r.ctr, 2) },
        { v: r.hook, h: r.is_video ? pct(r.hook) : '<span class="dim">—</span>' },
        { v: r.hold, h: r.is_video ? pct(r.hold) : '<span class="dim">—</span>' }];
      });
      host.innerHTML = table('tAd', cols, rows);
      document.getElementById('cntMeta').textContent = ld.length + ' de ' + D.ads.length + ' anúncios';
    }
    bindSort(host.querySelector('table'));
  }

  /* ============ SEÇÃO: CRIATIVOS / VÍDEO ============ */
  function secCriativo() {
    var vids = D.ads.filter(function (a) { return a.is_video && a.plays >= 1000; });
    var tot = vids.reduce(function (s, a) { return s + a.spend; }, 0);
    var trev = vids.reduce(function (s, a) { return s + a.rev; }, 0);
    var avgHook = vids.reduce(function (s, a) { return s + a.hook * a.spend; }, 0) / (tot || 1);
    var avgHold = vids.reduce(function (s, a) { return s + a.hold * a.spend; }, 0) / (tot || 1);

    var h = '<div class="sec-head"><div><h2>Criativos e vídeo</h2><p class="sec-sub">' + vids.length + ' anúncios em vídeo com mais de mil reproduções</p></div></div>';
    h += '<div class="kpi-grid">' +
      kpi({ label: 'Faturamento em vídeo', value: brl(trev), hero: true, sub: pct(trev / D.kpi.cur.rev * 100, 0) + ' da receita total' }) +
      kpi({ label: 'Investido em vídeo', value: brl(tot), sub: pct(tot / D.kpi.cur.spend * 100, 0) + ' do investimento' }) +
      kpi({ label: 'ROAS do vídeo', value: x(trev / (tot || 1)), sub: 'média ponderada' }) +
      kpi({ label: 'Reproduções', value: k(vids.reduce(function (s, a) { return s + a.plays; }, 0)), sub: 'total do período' }) +
      '</div>';
    h += '<div class="kpi-grid sm">' +
      kpi({ label: 'Hook rate médio', value: pct(avgHook), sub: 'assistiram 25% · ponderado por verba' }) +
      kpi({ label: 'Retenção até o fim', value: pct(avgHold), sub: 'assistiram 100%' }) +
      kpi({ label: 'Criativos ROAS ≥ 3,0', value: num(vids.filter(function (a) { return a.roas >= 3; }).length), sub: 'de ' + vids.length + ' analisados' }) +
      kpi({ label: 'Criativos ROAS < 2,0', value: num(vids.filter(function (a) { return a.roas < 2; }).length), sub: 'candidatos a corte' }) +
      '</div>';

    h += '<div class="grid-2"><div class="card"><div class="card-h"><h4>Retenção do vídeo · top 6 por verba</h4></div><div class="chart"><canvas id="chRet"></canvas></div>' +
      '<p class="note">Percentual das reproduções que alcança cada marca do vídeo. Queda forte entre 25% e 50% indica promessa inicial que o corpo do vídeo não sustenta.</p></div>' +
      '<div class="card"><div class="card-h"><h4>Hook rate × ROAS</h4></div><div class="chart"><canvas id="chScatter"></canvas></div>' +
      '<p class="note">Cada ponto é um criativo; o tamanho reflete a verba. Alto hook com baixo ROAS = atenção que não converte.</p></div></div>';

    var mx = Math.max.apply(null, vids.map(function (a) { return a.spend; }).concat([1]));
    var cols = [{ t: 'Criativo', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'ROAS', align: 'r' }, { t: 'Compras', align: 'r' }, { t: 'CTR', align: 'r' }, { t: 'Plays', align: 'r' }, { t: 'Hook', align: 'r' }, { t: '50%', align: 'r' }, { t: 'Fim', align: 'r' }, { t: 'Tempo médio', align: 'r' }, { t: 'Leitura', type: 'txt' }];
    var rows = vids.sort(function (a, b) { return b.spend - a.spend; }).map(function (r) {
      var read = r.roas >= 3.2 ? pill('Escalar', 'good') : (r.hook >= 15 && r.roas < 2.2 ? pill('Atenção sem venda', 'warn') : (r.hook < 6 && r.roas < 2.5 ? pill('Refazer abertura', 'warn') : r.roas < 2.0 ? pill('Cortar', 'bad') : pill('Manter', 'ok')));
      return [{ v: r.name, h: '<div class="cell-name"><span title="' + esc(r.name) + '">' + esc(r.name) + '</span>' + bar(r.spend, mx) + '</div>' },
      { v: r.spend, h: brl(r.spend) }, { v: r.rev, h: '<b>' + brl(r.rev) + '</b>' },
      { v: r.roas, h: pill(x(r.roas), roasCls(r.roas)) }, { v: r.pur, h: num(r.pur) },
      { v: r.ctr, h: pct(r.ctr, 2) }, { v: r.plays, h: k(r.plays) },
      { v: r.hook, h: pct(r.hook) }, { v: r.p50 / (r.plays || 1) * 100, h: pct(r.p50 / (r.plays || 1) * 100) },
      { v: r.hold, h: pct(r.hold) }, { v: r.avgwatch, h: num(r.avgwatch, 0) + 's' }, { v: 0, h: read }];
    });
    h += '<div class="card"><div class="card-h"><h4>Todos os criativos em vídeo</h4><input type="search" id="qVid" placeholder="Filtrar…" autocomplete="off"></div><div id="vidBody">' + table('tVid', cols, rows) + '</div></div>';
    return h;
  }

  /* ============ SEÇÃO: PLATAFORMAS ============ */
  function secPlataforma() {
    var cur = D.platforms.cur, prv = {};
    D.platforms.prv.forEach(function (p) { prv[p.publisher_platform] = p; });
    var tot = cur.reduce(function (s, p) { return s + p.spend; }, 0);
    var h = '<div class="sec-head"><div><h2>Plataformas e posicionamentos</h2><p class="sec-sub">Onde a verba foi entregue e o que cada superfície devolveu</p></div></div>';

    h += '<div class="plat-grid">';
    cur.forEach(function (p) {
      var o = prv[p.publisher_platform] || {}, pr = o.spend ? o.rev / o.spend : 0;
      var d = pr ? delta(p.roas, pr) : null;
      h += '<div class="plat"><div class="plat-top"><span class="plat-name">' + esc(p.publisher_platform.replace('_', ' ')) + '</span>' + pill(x(p.roas), roasCls(p.roas)) + '</div>' +
        '<div class="plat-share">' + pct(p.spend / tot * 100) + ' da verba</div>' + bar(p.spend, tot) +
        '<div class="plat-rows"><div><span>Investimento</span><b>' + brl(p.spend) + '</b></div>' +
        '<div><span>Faturamento</span><b>' + brl(p.rev) + '</b></div>' +
        '<div><span>Compras</span><b>' + num(p.pur) + '</b></div>' +
        '<div><span>CPA</span><b>' + brl(p.cpa, 2) + '</b></div>' +
        '<div><span>vs anterior</span><b>' + (d ? dEl(d) : '—') + '</b></div></div></div>';
    });
    h += '</div>';

    h += '<div class="grid-2"><div class="card"><div class="card-h"><h4>Distribuição da verba</h4></div><div class="chart"><canvas id="chPlat"></canvas></div></div>' +
      '<div class="card"><div class="card-h"><h4>Investimento × ROAS por posicionamento</h4></div><div class="chart"><canvas id="chPos"></canvas></div>' +
      '<p class="note">Barras = verba investida (eixo esquerdo). Pontos = ROAS (eixo direito).</p></div></div>';

    var mx = Math.max.apply(null, D.positions.map(function (p) { return p.spend; }).concat([1]));
    var cols = [{ t: 'Posicionamento', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: '% verba', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'ROAS', align: 'r' }, { t: 'Compras', align: 'r' }, { t: 'CPA', align: 'r' }, { t: 'CTR', align: 'r' }];
    var rows = D.positions.map(function (p) {
      return [{ v: p.publisher_platform + p.platform_position, h: '<div class="cell-name"><span>' + esc(p.publisher_platform) + ' · <b>' + esc(p.platform_position.replace(/_/g, ' ')) + '</b></span>' + bar(p.spend, mx) + '</div>' },
      { v: p.spend, h: brl(p.spend) }, { v: p.spend / tot, h: pct(p.spend / tot * 100) },
      { v: p.rev, h: '<b>' + brl(p.rev) + '</b>' }, { v: p.roas, h: pill(x(p.roas), roasCls(p.roas)) },
      { v: p.pur, h: num(p.pur) }, { v: p.cpa, h: p.pur ? brl(p.cpa, 2) : '<span class="dim">—</span>' }, { v: p.ctr, h: pct(p.ctr, 2) }];
    });
    h += '<div class="card"><div class="card-h"><h4>Todos os posicionamentos</h4></div>' + table('tPos', cols, rows) + '</div>';
    return h;
  }

  /* ============ SEÇÃO: PÚBLICO ============ */
  function secPublico() {
    var dem = D.demographics.filter(function (d) { return d.spend > 200; });
    var tot = dem.reduce(function (s, d) { return s + d.spend; }, 0);
    var fem = dem.filter(function (d) { return d.gender === 'female'; }).reduce(function (s, d) { return s + d.spend; }, 0);
    var h = '<div class="sec-head"><div><h2>Público e dispositivo</h2><p class="sec-sub">Quem compra, em qual aparelho e em qual estado</p></div></div>';

    var best = dem.slice().sort(function (a, b) { return b.roas - a.roas; })[0];
    var worst = dem.slice().filter(function (d) { return d.spend > 5000; }).sort(function (a, b) { return a.roas - b.roas; })[0];
    h += '<div class="kpi-grid">' +
      kpi({ label: 'Público feminino', value: pct(fem / tot * 100, 0), hero: true, sub: 'da verba investida' }) +
      kpi({ label: 'Faixa mais rentável', value: best.age, sub: x(best.roas) + ' · ' + brl(best.spend) }) +
      kpi({ label: 'Faixa menos rentável', value: worst.age, sub: x(worst.roas) + ' · ' + brl(worst.spend) }) +
      kpi({ label: 'Concentração mobile', value: pct(D.devices.filter(function (d) { return /phone|iphone|android_s/.test(d.impression_device); }).reduce(function (s, d) { return s + d.spend; }, 0) / D.devices.reduce(function (s, d) { return s + d.spend; }, 0) * 100, 1), sub: 'iPhone + Android' }) +
      '</div>';

    h += '<div class="grid-2"><div class="card"><div class="card-h"><h4>Investimento e ROAS por faixa etária</h4></div><div class="chart"><canvas id="chDemo"></canvas></div></div>' +
      '<div class="card"><div class="card-h"><h4>Dispositivo de impressão</h4></div><div class="chart"><canvas id="chDev"></canvas></div></div></div>';

    var mx = Math.max.apply(null, dem.map(function (d) { return d.spend; }).concat([1]));
    var cols = [{ t: 'Gênero', type: 'txt' }, { t: 'Idade', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: '% verba', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'ROAS', align: 'r' }, { t: 'Compras', align: 'r' }, { t: 'CPA', align: 'r' }];
    var rows = dem.map(function (d) {
      return [{ v: d.gender, h: d.gender === 'female' ? 'Feminino' : d.gender === 'male' ? 'Masculino' : 'Não informado' },
      { v: d.age, h: '<div class="cell-name"><span><b>' + d.age + '</b></span>' + bar(d.spend, mx) + '</div>' },
      { v: d.spend, h: brl(d.spend) }, { v: d.spend / tot, h: pct(d.spend / tot * 100) },
      { v: d.rev, h: '<b>' + brl(d.rev) + '</b>' }, { v: d.roas, h: pill(x(d.roas), roasCls(d.roas)) },
      { v: d.pur, h: num(d.pur) }, { v: d.cpa, h: brl(d.cpa, 2) }];
    });
    h += '<div class="card"><div class="card-h"><h4>Faixa etária e gênero</h4></div>' + table('tDemo', cols, rows) + '</div>';

    var rtot = D.regions.reduce(function (s, r) { return s + r.spend; }, 0);
    var rmx = Math.max.apply(null, D.regions.map(function (r) { return r.spend; }).concat([1]));
    var rcols = [{ t: 'Estado', type: 'txt' }, { t: 'Investimento', align: 'r' }, { t: '% verba', align: 'r' }, { t: 'Impressões', align: 'r' }, { t: 'Cliques', align: 'r' }, { t: 'CTR', align: 'r' }];
    var rrows = D.regions.slice(0, 15).map(function (r) {
      return [{ v: r.region, h: '<div class="cell-name"><span>' + esc(r.region) + '</span>' + bar(r.spend, rmx) + '</div>' },
      { v: r.spend, h: brl(r.spend) }, { v: r.spend / rtot, h: pct(r.spend / rtot * 100) },
      { v: r.imp, h: k(r.imp) }, { v: r.clk, h: k(r.clk) }, { v: r.ctr, h: pct(r.ctr, 2) }];
    });
    h += '<div class="card"><div class="card-h"><h4>Distribuição geográfica · top 15</h4></div>' + table('tReg', rcols, rrows) +
      '<p class="note">A API não devolve receita atribuída por região neste recorte; a leitura geográfica fica limitada a investimento e tráfego.</p></div>';
    return h;
  }


  /* ============ SEÇÃO: LOJA (NUVEMSHOP) ============ */
  function secLoja() {
    var N = D.nuvem, R = D.recon;
    var h = '<div class="sec-head"><div><h2>Loja · Nuvemshop</h2><p class="sec-sub">' + num(N.orders_total) + ' pedidos registrados no período · fonte: API da loja</p></div></div>';

    h += '<div class="kpi-grid">' +
      kpi({ label: 'Faturamento pago', value: brl(N.revenue), raw: N.revenue, fmt: 'brl', hero: true, sub: num(N.orders_paid) + ' pedidos confirmados' }) +
      kpi({ label: 'Ticket médio', value: brl(N.ticket, 2), raw: N.ticket, fmt: 'brl2', sub: 'por pedido pago' }) +
      kpi({ label: 'Taxa de pagamento', value: pct(N.orders_paid / N.orders_total * 100), sub: num(N.orders_total - N.orders_paid) + ' não concluídos' }) +
      kpi({ label: 'MER', value: x(R.mer), sub: 'receita da loja ÷ verba Meta' }) +
      '</div>';

    /* reconciliação */
    h += '<div class="verdict ' + (Math.abs(R.gap_rev_pct) > 10 ? 'crit' : 'good') + '">' +
      '<div class="verdict-tag">Reconciliação Meta × Loja</div>' +
      '<h3>O Meta reporta ' + pct(Math.abs(R.gap_rev_pct)) + ' a ' + (R.gap_rev < 0 ? 'menos' : 'mais') + ' do que a loja registrou.</h3>' +
      '<p>A plataforma atribui <strong>' + brl(R.meta_rev) + '</strong> em ' + num(R.meta_pur) + ' compras; a loja confirmou <strong>' + brl(R.loja_rev) + '</strong> em ' + num(R.loja_pur) + ' pedidos pagos — diferença de ' + brl(Math.abs(R.gap_rev)) + '. ' +
      (R.gap_rev < 0
        ? 'A subnotificação é coerente com a ausência de CAPI e de webhook da loja: parte das compras acontece sem que o evento volte ao Meta, então a otimização trabalha com menos sinal do que existe de fato.'
        : 'O excesso reportado indica dupla contagem ou janela de atribuição creditando vendas que a loja não confirmou.') +
      ' Por isso o <strong>MER de ' + x(R.mer) + '</strong> — receita real da loja sobre a verba investida — é a régua mais confiável que o ROAS de plataforma.</p></div>';

    /* produtos */
    var prods = N.products.slice(0, 14), mxp = Math.max.apply(null, prods.map(function (p) { return p.rev; }).concat([1]));
    var cols = [{ t: 'Produto', type: 'txt' }, { t: 'Faturamento', align: 'r' }, { t: '% receita', align: 'r' }, { t: 'Unidades', align: 'r' }, { t: 'Pedidos', align: 'r' }, { t: 'Preço', align: 'r' }, { t: 'Un./pedido', align: 'r' }, { t: 'Vendido sozinho', align: 'r' }, { t: 'Perfil', type: 'txt' }];
    var rows = prods.map(function (p) {
      var perfil = p.solo_rate > 60 ? pill('Porta de entrada', 'ok') : p.solo_rate < 25 ? pill('Complemento', 'neu') : pill('Misto', 'neu');
      if (p.rev === N.products[0].rev) perfil = pill('Carro-chefe', 'good');
      return [{ v: p.name, h: '<div class="cell-name"><span title="' + esc(p.name) + '">' + esc(p.name) + '</span>' + bar(p.rev, mxp) + '</div>' },
      { v: p.rev, h: '<b>' + brl(p.rev) + '</b>' }, { v: p.rev / N.revenue, h: pct(p.rev / N.revenue * 100) },
      { v: p.qty, h: num(p.qty) }, { v: p.orders, h: num(p.orders) }, { v: p.price, h: brl(p.price, 2) },
      { v: p.units_per_order, h: num(p.units_per_order, 2) },
      { v: p.solo_rate, h: pct(p.solo_rate) }, { v: 0, h: perfil }];
    });
    h += '<div class="grid-2"><div class="card"><div class="card-h"><h4>Concentração de receita por produto</h4></div><div class="chart"><canvas id="chProd"></canvas></div>' +
      '<p class="note">Os três primeiros produtos respondem por ' + pct(N.products.slice(0, 3).reduce(function (s, p) { return s + p.rev; }, 0) / N.revenue * 100) + ' do faturamento da loja.</p></div>' +
      '<div class="card"><div class="card-h"><h4>Receita diária da loja</h4></div><div class="chart"><canvas id="chLojaDia"></canvas></div></div></div>';
    h += '<div class="card"><div class="card-h"><h4>Produtos mais vendidos</h4></div>' + table('tProd', cols, rows) +
      '<p class="note">“Vendido sozinho” indica o percentual de pedidos em que o produto foi o único item. Percentual alto caracteriza porta de entrada; percentual baixo indica item que entra como complemento de cesta.</p></div>';

    /* conversão por página de produto */
    var withLp = N.products.filter(function (p) { return p.lp_entries; }).sort(function (a, b) { return b.lp_conv - a.lp_conv; });
    if (withLp.length) {
      var ccols = [{ t: 'Produto', type: 'txt' }, { t: 'Entradas pela página', align: 'r' }, { t: 'Pedidos com o item', align: 'r' }, { t: 'Taxa de conversão', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'Leitura', type: 'txt' }];
      var mxc = Math.max.apply(null, withLp.map(function (p) { return p.lp_conv; }).concat([1]));
      var crows = withLp.map(function (p) {
        var read = p.lp_conv >= 140 ? pill('Converte acima da média', 'good') : p.lp_conv >= 90 ? pill('Dentro do esperado', 'ok') : pill('Página perde venda', 'warn');
        return [{ v: p.name, h: '<div class="cell-name"><span>' + esc(p.name) + '</span>' + bar(p.lp_conv, mxc) + '</div>' },
        { v: p.lp_entries, h: num(p.lp_entries) }, { v: p.orders, h: num(p.orders) },
        { v: p.lp_conv, h: pill(pct(p.lp_conv), p.lp_conv >= 140 ? 'good' : p.lp_conv >= 90 ? 'ok' : 'warn') },
        { v: p.rev, h: brl(p.rev) }, { v: 0, h: read }];
      });
      h += '<div class="card"><div class="card-h"><h4>Eficiência da página de produto</h4></div>' + table('tConv', ccols, crows) +
        '<p class="note">Razão entre pedidos que contêm o produto e sessões que entraram pela página dele. Acima de 100% significa que o produto também é comprado por quem chegou por outra porta — sinal de item que a cesta puxa. Abaixo de 90%, a página recebe visita e não fecha.</p></div>';
    }
    return h;
  }

  /* ============ SEÇÃO: ORIGEM E CUPONS ============ */
  function secOrigem() {
    var N = D.nuvem;
    var h = '<div class="sec-head"><div><h2>Origem e cupons</h2><p class="sec-sub">De onde vêm os pedidos pagos e o que os cupons movimentam</p></div></div>';

    var metaUtm = N.utm.filter(function (u) { return /^(meta|facebook|instagram)/i.test(u.k); }).reduce(function (s, u) { return s + u.rev; }, 0);
    h += '<div class="kpi-grid">' +
      kpi({ label: 'Receita com origem identificada', value: brl(N.utm.reduce(function (s, u) { return s + u.rev; }, 0)), hero: true, sub: pct(N.utm_coverage) + ' dos pedidos pagos' }) +
      kpi({ label: 'Pedidos sem UTM', value: num(N.no_utm), sub: pct(N.no_utm / N.orders_paid * 100) + ' sem origem rastreada' }) +
      kpi({ label: 'Receita atribuída a Meta', value: brl(metaUtm), sub: pct(metaUtm / N.revenue * 100) + ' do faturamento' }) +
      kpi({ label: 'Códigos de cupom ativos', value: num(N.coupon_codes), sub: num(N.coupon_orders) + ' pedidos usaram cupom' }) +
      '</div>';

    var ucols = [{ t: 'Origem / mídia', type: 'txt' }, { t: 'Pedidos', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: '% receita', align: 'r' }, { t: 'Ticket médio', align: 'r' }];
    var mxu = Math.max.apply(null, N.utm.map(function (u) { return u.rev; }).concat([1]));
    var urows = N.utm.map(function (u) {
      return [{ v: u.k, h: '<div class="cell-name"><span title="' + esc(u.k) + '">' + esc(u.k) + '</span>' + bar(u.rev, mxu) + '</div>' },
      { v: u.n, h: num(u.n) }, { v: u.rev, h: '<b>' + brl(u.rev) + '</b>' },
      { v: u.rev / N.revenue, h: pct(u.rev / N.revenue * 100) }, { v: u.ticket, h: brl(u.ticket, 2) }];
    });
    h += '<div class="grid-2"><div class="card"><div class="card-h"><h4>Receita por origem</h4></div><div class="chart"><canvas id="chUtm"></canvas></div></div>' +
      '<div class="card"><div class="card-h"><h4>Páginas de entrada mais rentáveis</h4></div>' +
      table('tLand', [{ t: 'Página', type: 'txt' }, { t: 'Pedidos', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'Ticket', align: 'r' }],
        N.landing.slice(0, 10).map(function (l) {
          return [{ v: l.k, h: '<span class="mono">' + esc(l.k) + '</span>' }, { v: l.n, h: num(l.n) },
          { v: l.rev, h: '<b>' + brl(l.rev) + '</b>' }, { v: l.ticket, h: brl(l.ticket, 2) }];
        })) + '</div></div>';
    h += '<div class="card"><div class="card-h"><h4>UTM source / medium</h4></div>' + table('tUtm', ucols, urows) +
      '<p class="note">Origem capturada na primeira visita do cliente (customer_visit). Pedidos sem UTM incluem tráfego direto, aplicativos e navegação que perdeu o parâmetro no caminho.</p></div>';

    var ccols = [{ t: 'Campanha (UTM)', type: 'txt' }, { t: 'Pedidos', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'Ticket médio', align: 'r' }];
    var mxc = Math.max.apply(null, N.utm_campaign.map(function (u) { return u.rev; }).concat([1]));
    h += '<div class="card"><div class="card-h"><h4>Campanhas por UTM</h4></div>' +
      table('tUtmC', ccols, N.utm_campaign.map(function (u) {
        return [{ v: u.k, h: '<div class="cell-name"><span title="' + esc(u.k) + '">' + esc(u.k) + '</span>' + bar(u.rev, mxc) + '</div>' },
        { v: u.n, h: num(u.n) }, { v: u.rev, h: '<b>' + brl(u.rev) + '</b>' }, { v: u.ticket, h: brl(u.ticket, 2) }];
      })) + '</div>';

    /* cupons */
    var cup = N.coupons.slice(0, 25), mxk = Math.max.apply(null, cup.map(function (c) { return c.rev; }).concat([1]));
    var kcols = [{ t: 'Cupom', type: 'txt' }, { t: 'Pedidos', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: 'Ticket médio', align: 'r' }, { t: 'Desconto', align: 'r' }, { t: 'Regra', type: 'txt' }];
    var krows = cup.map(function (c) {
      return [{ v: c.code, h: '<div class="cell-name"><span class="mono"><b>' + esc(c.code) + '</b></span>' + bar(c.rev, mxk) + '</div>' },
      { v: c.n, h: num(c.n) }, { v: c.rev, h: '<b>' + brl(c.rev) + '</b>' },
      { v: c.ticket, h: brl(c.ticket, 2) }, { v: c.disc, h: brl(c.disc) },
      { v: 0, h: '<span class="obj">' + esc(c.value) + (c.type === 'percentage' ? '%' : ' R$') + '</span>' }];
    });
    var topc = N.coupons[0];
    h += '<div class="card"><div class="card-h"><h4>Cupons mais usados</h4></div>' + table('tCup', kcols, krows) +
      '<p class="note">' + num(N.coupon_orders) + ' de ' + num(N.orders_paid) + ' pedidos pagos (' + pct(N.coupon_orders / N.orders_paid * 100) + ') usaram cupom, com ' + brl(N.coupon_disc) + ' concedidos em desconto. ' +
      'O código <strong>' + esc(topc.code) + '</strong> sozinho responde por ' + num(topc.n) + ' pedidos e ' + brl(topc.rev) + '. ' +
      'A maior parte dos ' + num(N.coupon_codes) + ' códigos é de parceria com influenciadora, o que os torna a métrica mais direta de retorno por parceria.</p></div>';
    return h;
  }

  /* ============ SEÇÃO: AUDITORIA ============ */
  function secAuditoria() {
    var a = D.audit;
    var h = '<div class="sec-head"><div><h2>Auditoria estrutural</h2><p class="sec-sub">Higiene da conta: ' + a.total + ' campanhas inventariadas</p></div></div>';
    h += '<div class="kpi-grid">' +
      kpi({ label: 'Orçamento parado', value: brl(a.budget_preso_total), hero: true, sub: a.budget_preso_count + ' campanhas pausadas com verba' }) +
      kpi({ label: 'Campanhas ativas', value: num(a.status.ACTIVE || 0), sub: 'de ' + a.total + ' na conta' }) +
      kpi({ label: 'Nomenclatura', value: pct(a.naming_score, 0), sub: a.naming_ok + ' campanhas em padrão' }) +
      kpi({ label: 'Objetivo LINK_CLICKS', value: num(a.link_clicks_count), sub: 'sem otimização para compra' }) +
      '</div>';

    h += '<div class="grid-2"><div class="card"><div class="card-h"><h4>Situação das campanhas</h4></div><div class="chart"><canvas id="chStatus"></canvas></div></div>' +
      '<div class="card"><div class="card-h"><h4>Objetivos configurados</h4></div><div class="chart"><canvas id="chObj"></canvas></div>' +
      '<p class="note">LINK_CLICKS e ENGAGEMENT não otimizam para compra: a entrega busca cliques ou interações, não receita.</p></div></div>';

    var cols = [{ t: 'Campanha pausada', type: 'txt' }, { t: 'Objetivo', type: 'txt' }, { t: 'Orçamento diário', align: 'r' }, { t: 'Parada desde', type: 'txt', align: 'r' }];
    var mx = Math.max.apply(null, a.budget_preso.map(function (b) { return b.budget; }).concat([1]));
    var rows = a.budget_preso.map(function (b) {
      return [{ v: b.name, h: '<div class="cell-name"><span title="' + esc(b.name) + '">' + esc(b.name) + '</span>' + bar(b.budget, mx, 'bad') + '</div>' },
      { v: b.objective, h: '<span class="obj">' + esc((b.objective || '').replace('OUTCOME_', '')) + '</span>' },
      { v: b.budget, h: '<b>' + brl(b.budget, 2) + '</b>' }, { v: b.since, h: b.since }];
    });
    h += '<div class="card"><div class="card-h"><h4>Orçamento retido — 20 maiores</h4></div>' + table('tPreso', cols, rows) +
      '<p class="note">Campanha pausada não gasta, mas mantém o orçamento reservado no planejamento e distorce a leitura de capacidade da conta. Campanha sazonal encerrada deve ser arquivada, não apenas pausada.</p></div>';

    h += '<div class="card"><div class="card-h"><h4>Convenções de nomenclatura em uso</h4></div><div class="pad">' +
      '<p class="para">A conta opera hoje com pelo menos quatro padrões simultâneos, o que impede qualquer leitura automatizada por produto, público ou etapa de funil:</p>' +
      '<div class="chips">' + a.naming_bad_sample.map(function (n) { return '<code>' + esc(n) + '</code>'; }).join('') + '</div>' +
      '<p class="para"><strong>Padrão recomendado:</strong> <code>[OBJETIVO]_[PRODUTO]_[PÚBLICO]_[DATA]</code> — por exemplo <code>VENDAS_KITFAIXA_LLK1_2609</code>. Com ele, qualquer corte por produto ou público passa a ser extraível direto do nome, sem depender de memória de quem montou.</p>' +
      '</div></div>';
    return h;
  }

  /* ============ SEÇÃO: RASTREAMENTO ============ */
  function secTrack() {
    var c = D.kpi.cur;
    var h = '<div class="sec-head"><div><h2>Rastreamento e atribuição</h2><p class="sec-sub">Integridade do sinal que alimenta a otimização</p></div></div>';

    h += '<div class="status-grid">' +
      st('good', 'Pixel do navegador', D.account.pixel_name, 'ID ' + D.account.pixel_id, 'Último evento: ' + D.account.pixel_last_fired.slice(0, 16).replace('T', ' às ')) +
      st('warn', 'Conversions API', 'Não confirmada', 'Envio servidor→Meta', 'Sem CAPI, perdas por bloqueio de cookie e iOS ficam invisíveis na otimização.') +
      st('bad', 'Webhook da loja', 'Não configurado', 'Nuvemshop → API', 'Compras confirmadas no checkout não retornam ao Meta como evento de servidor.') +
      st('good', 'Conta de anúncios', D.account.name, D.account.id, 'Status ativo · moeda ' + D.account.currency) +
      '</div>';

    var N = D.nuvem, R = D.recon;
    h += '<div class="kpi-grid sm">' +
      kpi({ label: 'Cobertura de UTM', value: pct(N.utm_coverage), sub: num(N.no_utm) + ' pedidos sem origem' }) +
      kpi({ label: 'Divergência Meta × Loja', value: pct(Math.abs(R.gap_rev_pct)), sub: brl(Math.abs(R.gap_rev)) + ' ' + (R.gap_rev < 0 ? 'não reportados' : 'a mais') }) +
      kpi({ label: 'MER real', value: x(R.mer), sub: 'receita da loja ÷ verba' }) +
      kpi({ label: 'Pedidos com cupom', value: pct(N.coupon_orders / N.orders_paid * 100), sub: num(N.coupon_codes) + ' códigos em uso' }) +
      '</div>';

    h += '<div class="card"><div class="card-h"><h4>Funil medido pelo pixel</h4></div><div id="funil2"></div>' +
      '<p class="note">Percentuais calculados sobre a etapa imediatamente anterior. A queda entre clique e visualização de página revela perda antes mesmo do site carregar.</p></div>';

    /* reconciliação lado a lado */
    h += '<div class="card"><div class="card-h"><h4>Meta × Loja: a mesma venda vista por duas fontes</h4></div><div class="recon">' +
      '<div class="recon-col"><div class="recon-src">Relatado pelo Meta</div>' +
      '<div class="recon-v">' + brl(R.meta_rev) + '</div><div class="recon-s">' + num(R.meta_pur) + ' compras atribuídas</div></div>' +
      '<div class="recon-gap"><div class="recon-arrow">' + (R.gap_rev < 0 ? '−' : '+') + pct(Math.abs(R.gap_rev_pct)) + '</div><div class="recon-s">' + brl(Math.abs(R.gap_rev)) + '</div></div>' +
      '<div class="recon-col"><div class="recon-src">Confirmado pela loja</div>' +
      '<div class="recon-v">' + brl(R.loja_rev) + '</div><div class="recon-s">' + num(R.loja_pur) + ' pedidos pagos</div></div>' +
      '</div><p class="note">A loja é a fonte de verdade para receita. A diferença mede o quanto o Meta enxerga da operação — e é exatamente esse sinal que alimenta a otimização do algoritmo.</p></div>';

    /* origem dos pedidos */
    var topUtm = N.utm.slice(0, 6), mxu = Math.max.apply(null, topUtm.map(function (u) { return u.rev; }).concat([1]));
    h += '<div class="card"><div class="card-h"><h4>Origem dos pedidos pagos</h4></div>' +
      table('tTrkUtm', [{ t: 'Origem / mídia', type: 'txt' }, { t: 'Pedidos', align: 'r' }, { t: 'Faturamento', align: 'r' }, { t: '% receita', align: 'r' }],
        topUtm.map(function (u) {
          return [{ v: u.k, h: '<div class="cell-name"><span>' + esc(u.k) + '</span>' + bar(u.rev, mxu) + '</div>' },
          { v: u.n, h: num(u.n) }, { v: u.rev, h: '<b>' + brl(u.rev) + '</b>' }, { v: u.rev / N.revenue, h: pct(u.rev / N.revenue * 100) }];
        })) +
      '<p class="note">Lista completa na seção Origem e cupons. ' + pct(100 - N.utm_coverage) + ' dos pedidos chegam sem parâmetro de origem e ficam fora de qualquer leitura de canal.</p></div>';

    var lpLoss = c.clk ? (1 - c.lp / c.clk) * 100 : 0;
    h += '<div class="card"><div class="card-h"><h4>Leitura dos gargalos</h4></div><div class="alerts">' +
      alert(lpLoss > 30 ? 'crit' : 'warn', 'Perda entre clique e carregamento da página', 'Foram ' + num(c.clk) + ' cliques para ' + num(c.lp) + ' visualizações de página — <strong>' + pct(lpLoss) + '</strong> não chegaram a carregar o site. Costuma ser velocidade de carregamento, redirecionamento ou clique acidental.', 'Medir o tempo de carregamento no 4G e revisar redirecionamentos da página de destino.') +
      alert('warn', 'Checkout abandonado', num(c.atc) + ' adições ao carrinho resultaram em ' + num(c.ic) + ' inícios de checkout (' + pct(c.ic / (c.atc || 1) * 100) + ') e ' + num(c.pur) + ' compras (' + pct(c.pur / (c.ic || 1) * 100) + ' do checkout).', 'Recuperação de carrinho por e-mail e WhatsApp nas primeiras horas, com frete visível antes do checkout.') +
      alert(D.nuvem.utm_coverage < 90 ? 'warn' : 'info', 'Cobertura de UTM em ' + pct(D.nuvem.utm_coverage),
        num(D.nuvem.no_utm) + ' pedidos pagos (' + pct(100 - D.nuvem.utm_coverage) + ') chegaram sem parâmetro de origem, somando ' + brl(D.nuvem.revenue * (100 - D.nuvem.utm_coverage) / 100) + ' sem canal identificado. Parte é tráfego direto legítimo, parte é link publicado sem marcação.',
        'Padronizar UTM em todo link publicado — bio, e-mail, WhatsApp e parcerias — com utm_source e utm_campaign obrigatórios.') +
      alert('crit', 'Sinal de conversão incompleto', 'Sem CAPI e sem webhook da loja, o Meta otimiza apenas com o que o navegador consegue enviar. Em compras via iPhone — ' + pct(D.devices.filter(function (d) { return d.impression_device === 'iphone'; }).reduce(function (s, d) { return s + d.spend; }, 0) / D.devices.reduce(function (s, d) { return s + d.spend; }, 0) * 100, 0) + ' da verba desta conta — a perda de sinal é a regra, não a exceção.', 'Ativar CAPI com deduplicação por event_id e ligar o webhook de pedido pago da loja.') +
      '</div></div>';
    return h;
  }
  function st(lvl, t, v, sub, note) {
    return '<div class="stat ' + lvl + '"><div class="stat-top"><span class="stat-dot"></span><span class="stat-t">' + t + '</span></div>' +
      '<div class="stat-v">' + esc(v) + '</div><div class="stat-sub">' + esc(sub) + '</div><p class="stat-note">' + note + '</p></div>';
  }

  /* ============ SEÇÃO: PLANO ============ */
  function secPlano() {
    var c = D.kpi.cur, p = D.kpi.prv, a = D.audit;
    var marginal = (c.spend - p.spend) ? (c.rev - p.rev) / (c.spend - p.spend) : 0;
    var ig = D.platforms.cur.filter(function (x) { return x.publisher_platform === 'instagram'; })[0] || {};
    var fb = D.platforms.cur.filter(function (x) { return x.publisher_platform === 'facebook'; })[0] || {};
    var worstC = D.campaigns.filter(function (x) { return x.spend > 3000; }).sort(function (x, y) { return x.roas - y.roas; })[0];
    var reels = D.positions.filter(function (x) { return x.platform_position === 'instagram_reels'; })[0] || {};
    var stories = D.positions.filter(function (x) { return x.platform_position === 'instagram_stories'; })[0] || {};

    var h = '<div class="sec-head"><div><h2>Plano de ação</h2><p class="sec-sub">Prioridades ordenadas por impacto sobre o resultado</p></div></div>';
    var items = [
      { n: 1, sev: 'crit', t: 'Congelar a escala até o ROAS marginal voltar acima de 2,0x',
        w: 'O incremento de ' + brl(c.spend - p.spend) + ' devolveu ' + brl(c.rev - p.rev) + ' — ROAS marginal de ' + x(marginal) + '. A conta está comprando receita a preço de custo.',
        d: 'Retornar o investimento diário ao patamar do período anterior (≈ ' + brl(p.spend / 30) + '/dia) e manter por 7 dias, medindo ROAS e CPA na janela 7d-clique/1d-visualização.',
        m: 'ROAS marginal semanal e CPA' },
      { n: 2, sev: 'crit', t: 'Liberar ' + brl(a.budget_preso_total) + '/dia retidos em campanhas pausadas',
        w: a.budget_preso_count + ' campanhas pausadas mantêm orçamento diário reservado, distorcendo o planejamento de verba.',
        d: 'Arquivar as campanhas sazonais encerradas e zerar o orçamento das que permanecerão pausadas. Começar pelas cinco maiores da tabela de auditoria.',
        m: 'Orçamento retido igual a zero' },
      { n: 3, sev: 'crit', t: 'Fechar o rastreamento: CAPI e webhook da loja',
        w: 'Com ' + pct(D.devices.filter(function (d) { return d.impression_device === 'iphone'; }).reduce(function (s, d) { return s + d.spend; }, 0) / D.devices.reduce(function (s, d) { return s + d.spend; }, 0) * 100, 0) + ' da verba entregue em iPhone, o sinal só de navegador subnotifica conversão e piora a otimização.',
        d: 'Ativar Conversions API com deduplicação por event_id e ligar o webhook de pedido pago da Nuvemshop no endpoint já publicado.',
        m: 'Qualidade da correspondência de eventos acima de 7,0' },
      { n: 4, sev: 'warn', t: 'Renovar criativo antes de reabrir verba',
        w: 'A frequência subiu para ' + num(c.freq, 2) + ' e o CPM ' + pct((c.cpm / p.cpm - 1) * 100) + '. A audiência atual já viu o que existe.',
        d: 'Subir de três a cinco vídeos novos por semana em conjunto de teste isolado, com corte por hook rate abaixo de 8% em 72 horas.',
        m: 'Frequência abaixo de 4,5 e hook rate acima de 12%' },
      { n: 5, sev: 'warn', t: 'Testar aumento controlado no Facebook',
        w: 'Facebook entrega ' + x(fb.roas) + ' contra ' + x(ig.roas) + ' do Instagram, mas recebe apenas ' + pct(fb.spend / (fb.spend + ig.spend) * 100) + ' da verba entre as duas.',
        d: 'Elevar a participação do Facebook de ' + pct(fb.spend / (fb.spend + ig.spend) * 100, 0) + ' para 12% da verba durante 14 dias, sem tocar no Instagram. Reverter se o ROAS cair abaixo de 2,6x.',
        m: 'ROAS do Facebook mantido acima de 2,8x' },
      { n: 6, sev: 'warn', t: 'Corrigir os ' + a.link_clicks_count + ' objetivos de LINK_CLICKS',
        w: a.boosted_posts + ' publicações impulsionadas otimizam para clique, não para compra, e não creditam receita.',
        d: 'Migrar as que têm intenção comercial para OUTCOME_SALES com evento de compra; manter o restante como verba de topo, medida separadamente.',
        m: 'Zero campanhas de LINK_CLICKS no bloco de venda' },
      { n: 7, sev: 'info', t: 'Revisar Reels do Instagram',
        w: 'Reels consome ' + brl(reels.spend) + ' com ' + x(reels.roas) + ', abaixo de Stories (' + x(stories.roas) + ') e do Feed.',
        d: 'Cortar Reels dos conjuntos de aquisição por duas semanas e redistribuir para Feed e Stories, medindo o efeito no CPA total.',
        m: 'CPA da conta estável ou em queda após a redistribuição' },
      { n: 8, sev: 'info', t: 'Reavaliar a campanha ' + (worstC ? worstC.name.slice(0, 34) : ''),
        w: worstC ? brl(worstC.spend) + ' investidos a ' + x(worstC.roas) + ', abaixo da média da conta.' : '',
        d: 'Pausar os conjuntos com ROAS abaixo de 2,0x e reconstruir com os criativos de melhor hook rate identificados na seção de vídeo.',
        m: 'ROAS da campanha acima de 2,6x em 14 dias' }
    ];
    h += '<div class="plan">';
    items.forEach(function (i) {
      h += '<div class="plan-item ' + i.sev + '"><div class="plan-n">' + i.n + '</div><div class="plan-body">' +
        '<h4>' + i.t + '</h4>' +
        '<div class="plan-row"><span class="plan-k">Por quê</span><p>' + i.w + '</p></div>' +
        '<div class="plan-row"><span class="plan-k">Como</span><p>' + i.d + '</p></div>' +
        '<div class="plan-row"><span class="plan-k">Indicador</span><p>' + i.m + '</p></div>' +
        '</div></div>';
    });
    return h + '</div>';
  }

  /* ============ FUNIL ============ */
  function renderFunil(host) {
    var c = D.kpi.cur;
    var steps = [{ n: 'Impressões', v: c.imp }, { n: 'Cliques', v: c.clk }, { n: 'Página carregada', v: c.lp }, { n: 'Produto visto', v: c.vc }, { n: 'Carrinho', v: c.atc }, { n: 'Checkout', v: c.ic }, { n: 'Compra', v: c.pur }];
    var h = '<div class="funnel">';
    steps.forEach(function (s, i) {
      var w = Math.max(s.v / steps[0].v * 100, 1.2);
      var rate = i ? s.v / steps[i - 1].v * 100 : 100;
      h += '<div class="fn-row"><div class="fn-lbl">' + s.n + '</div>' +
        '<div class="fn-track"><div class="fn-bar" data-w="' + w.toFixed(2) + '" style="width:0"></div><span class="fn-v">' + num(s.v) + '</span></div>' +
        '<div class="fn-rate ' + (i && rate < 50 ? 'low' : '') + '">' + (i ? pct(rate) : '—') + '</div></div>';
    });
    host.innerHTML = h + '</div>';
    requestAnimationFrame(function () {
      host.querySelectorAll('.fn-bar').forEach(function (b, i) {
        setTimeout(function () { b.style.width = b.dataset.w + '%'; }, i * 70);
      });
    });
  }

  /* ============ CHARTS ============ */
  var C = { ink: '#111827', dim: '#6B7280', line: '#E5E7EB', blue: '#2563EB', navy: '#1E3A8A', teal: '#0D9488', amber: '#D97706', red: '#DC2626', slate: '#94A3B8' };
  function gopts(extra) {
    var o = {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 11, family: 'Inter' }, color: C.dim, padding: 14 } },
        tooltip: { backgroundColor: '#111827', padding: 10, cornerRadius: 6, titleFont: { size: 12, family: 'Inter' }, bodyFont: { size: 12, family: 'Inter' }, displayColors: true, boxWidth: 8, boxHeight: 8, usePointStyle: true }
      },
      scales: { x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' }, color: C.dim, maxRotation: 0, autoSkipPadding: 14 }, border: { color: C.line } },
                y: { grid: { color: C.line, drawTicks: false }, ticks: { font: { size: 10, family: 'Inter' }, color: C.dim, padding: 8 }, border: { display: false }, beginAtZero: true } },
      animation: { duration: 700, easing: 'easeOutQuart' }
    };
    return extra ? deep(o, extra) : o;
  }
  function deep(a, b) { for (var k in b) { a[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])) ? deep(a[k] || {}, b[k]) : b[k]; } return a; }
  function mk(id, cfg) { var el = document.getElementById(id); if (!el) return; if (CH[id]) CH[id].destroy(); CH[id] = new Chart(el, cfg); return CH[id]; }

  function chartSerie(metric) {
    var cur = D.daily.cur, prv = D.daily.prv;
    var n = Math.max(cur.length, prv.length);
    var labels = cur.map(function (d) { return dt(d.date); });
    function val(arr, i) { var d = arr[i]; if (!d) return null; return metric === 'rev' ? d.rev : metric === 'roas' ? d.roas : d.pur; }
    var mname = metric === 'rev' ? 'Receita' : metric === 'roas' ? 'ROAS' : 'Compras';
    var ds = [
      { label: mname + ' · atual', data: cur.map(function (_, i) { return val(cur, i); }), borderColor: C.blue, backgroundColor: 'rgba(37,99,235,.07)', fill: metric === 'rev', tension: .32, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 },
      { label: mname + ' · anterior', data: cur.map(function (_, i) { return val(prv, i); }), borderColor: C.slate, borderDash: [4, 4], fill: false, tension: .32, borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4 }
    ];
    if (metric === 'rev') ds.push({ label: 'Investimento · atual', data: cur.map(function (d) { return d.spend; }), borderColor: C.amber, fill: false, tension: .32, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 });
    mk('chSerie', { type: 'line', data: { labels: labels, datasets: ds },
      options: gopts({ scales: { y: { ticks: { callback: function (v) { return metric === 'roas' ? v.toFixed(1).replace('.', ',') + 'x' : metric === 'pur' ? v : 'R$' + (v / 1000) + 'k'; } } } },
        plugins: { tooltip: { callbacks: { label: function (ctx) { var v = ctx.parsed.y; return ctx.dataset.label + ': ' + (metric === 'roas' ? x(v) : metric === 'pur' ? num(v) : brl(v)); } } } } }) });
  }

  function chartsResumo() { chartSerie('rev'); renderFunil(document.getElementById('funil')); }

  function chartsCriativo() {
    var vids = D.ads.filter(function (a) { return a.is_video && a.plays >= 1000; }).sort(function (a, b) { return b.spend - a.spend; });
    var top = vids.slice(0, 6);
    var pal = [C.blue, C.teal, C.amber, C.navy, C.red, C.slate];
    mk('chRet', { type: 'line',
      data: { labels: ['Início', '25%', '50%', '75%', '100%'],
        datasets: top.map(function (a, i) {
          return { label: (a.name.match(/\[([A-Z\-]+)\]/) ? RegExp.$1 : a.name.slice(0, 16)),
            data: [100, a.plays ? a.p25 / a.plays * 100 : 0, a.plays ? a.p50 / a.plays * 100 : 0, a.plays ? a.p75 / a.plays * 100 : 0, a.hold],
            borderColor: pal[i], backgroundColor: pal[i], fill: false, tension: .3, borderWidth: 2, pointRadius: 3 };
        }) },
      options: gopts({ scales: { y: { ticks: { callback: function (v) { return v + '%'; } } } },
        plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + pct(c.parsed.y); } } } } }) });

    mk('chScatter', { type: 'bubble',
      data: { datasets: [{ label: 'Criativos em vídeo',
        data: vids.map(function (a) { return { x: a.hook, y: a.roas, r: Math.max(4, Math.sqrt(a.spend) / 14), _n: a.name, _s: a.spend }; }),
        backgroundColor: vids.map(function (a) { return a.roas >= 3.2 ? 'rgba(13,148,136,.55)' : a.roas >= 2.6 ? 'rgba(37,99,235,.5)' : a.roas >= 2 ? 'rgba(217,119,6,.5)' : 'rgba(220,38,38,.5)'; }),
        borderColor: 'rgba(255,255,255,.9)', borderWidth: 1 }] },
      options: gopts({ plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function (c) { var d = c.raw; return [d._n.slice(0, 44), 'Hook ' + pct(d.x) + ' · ROAS ' + x(d.y), 'Verba ' + brl(d._s)]; } } } },
        scales: { x: { title: { display: true, text: 'Hook rate (assistiram 25%)', font: { size: 11, family: 'Inter' }, color: C.dim }, grid: { color: C.line }, ticks: { callback: function (v) { return v + '%'; } } },
                  y: { title: { display: true, text: 'ROAS', font: { size: 11, family: 'Inter' }, color: C.dim }, ticks: { callback: function (v) { return v.toFixed(1).replace('.', ',') + 'x'; } } } } }) });
  }

  function chartsPlataforma() {
    var cur = D.platforms.cur;
    mk('chPlat', { type: 'doughnut',
      data: { labels: cur.map(function (p) { return p.publisher_platform.replace('_', ' '); }),
        datasets: [{ data: cur.map(function (p) { return p.spend; }), backgroundColor: [C.blue, C.navy, C.teal, C.amber, C.slate], borderWidth: 2, borderColor: '#fff' }] },
      options: gopts({ cutout: '62%', scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { callbacks: { label: function (c) { var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0); return c.label + ': ' + brl(c.parsed) + ' (' + pct(c.parsed / t * 100) + ')'; } } } } }) });

    var pos = D.positions.filter(function (p) { return p.spend > 500; }).slice(0, 8);
    mk('chPos', { type: 'bar',
      data: { labels: pos.map(function (p) { return p.platform_position.replace(/_/g, ' ').replace('instagram ', '').replace('facebook ', 'FB '); }),
        datasets: [{ type: 'bar', label: 'Investimento', data: pos.map(function (p) { return p.spend; }), backgroundColor: 'rgba(37,99,235,.75)', borderRadius: 3, yAxisID: 'y', order: 2 },
                   { type: 'line', label: 'ROAS', data: pos.map(function (p) { return p.roas; }), borderColor: C.amber, backgroundColor: C.amber, yAxisID: 'y1', tension: .3, borderWidth: 2, pointRadius: 4, order: 1, fill: false }] },
      options: gopts({ scales: { y: { position: 'left', ticks: { callback: function (v) { return 'R$' + (v / 1000) + 'k'; } } },
          y1: { position: 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: function (v) { return v.toFixed(1).replace('.', ',') + 'x'; }, font: { size: 10, family: 'Inter' }, color: C.dim }, border: { display: false } },
          x: { ticks: { maxRotation: 40, minRotation: 0, font: { size: 9 } } } },
        plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + (c.dataset.yAxisID === 'y1' ? x(c.parsed.y) : brl(c.parsed.y)); } } } } }) });
  }

  function chartsPublico() {
    var dem = D.demographics.filter(function (d) { return d.gender === 'female' && d.spend > 200; }).sort(function (a, b) { return a.age.localeCompare(b.age); });
    mk('chDemo', { type: 'bar',
      data: { labels: dem.map(function (d) { return d.age; }),
        datasets: [{ type: 'bar', label: 'Investimento', data: dem.map(function (d) { return d.spend; }), backgroundColor: 'rgba(30,58,138,.78)', borderRadius: 3, yAxisID: 'y', order: 2 },
                   { type: 'line', label: 'ROAS', data: dem.map(function (d) { return d.roas; }), borderColor: C.amber, backgroundColor: C.amber, yAxisID: 'y1', tension: .3, borderWidth: 2, pointRadius: 4, order: 1, fill: false }] },
      options: gopts({ scales: { y: { ticks: { callback: function (v) { return 'R$' + (v / 1000) + 'k'; } } },
          y1: { position: 'right', grid: { display: false }, beginAtZero: true, ticks: { callback: function (v) { return v.toFixed(1).replace('.', ',') + 'x'; }, font: { size: 10, family: 'Inter' }, color: C.dim }, border: { display: false } } },
        plugins: { tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + (c.dataset.yAxisID === 'y1' ? x(c.parsed.y) : brl(c.parsed.y)); } } } } }) });

    var dev = D.devices.filter(function (d) { return d.spend > 50; });
    mk('chDev', { type: 'doughnut',
      data: { labels: dev.map(function (d) { return d.impression_device.replace(/_/g, ' '); }),
        datasets: [{ data: dev.map(function (d) { return d.spend; }), backgroundColor: [C.navy, C.teal, C.amber, C.slate, C.red], borderWidth: 2, borderColor: '#fff' }] },
      options: gopts({ cutout: '62%', scales: { x: { display: false }, y: { display: false } },
        plugins: { tooltip: { callbacks: { label: function (c) { var t = c.dataset.data.reduce(function (a, b) { return a + b; }, 0); return c.label + ': ' + brl(c.parsed) + ' (' + pct(c.parsed / t * 100) + ')'; } } } } }) });
  }

  function chartsAuditoria() {
    var s = D.audit.status, o = D.audit.objectives;
    mk('chStatus', { type: 'doughnut',
      data: { labels: Object.keys(s).map(function (x) { return x === 'ACTIVE' ? 'Ativas' : 'Pausadas'; }), datasets: [{ data: Object.values(s), backgroundColor: [C.teal, C.slate], borderWidth: 2, borderColor: '#fff' }] },
      options: gopts({ cutout: '62%', scales: { x: { display: false }, y: { display: false } } }) });
    var ks = Object.keys(o).sort(function (a, b) { return o[b] - o[a]; });
    mk('chObj', { type: 'bar',
      data: { labels: ks.map(function (x) { return x.replace('OUTCOME_', ''); }),
        datasets: [{ label: 'Campanhas', data: ks.map(function (x) { return o[x]; }),
          backgroundColor: ks.map(function (x) { return x === 'OUTCOME_SALES' ? 'rgba(13,148,136,.8)' : x === 'LINK_CLICKS' ? 'rgba(220,38,38,.75)' : 'rgba(148,163,184,.75)'; }), borderRadius: 3 }] },
      options: gopts({ indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { grid: { color: C.line } }, y: { grid: { display: false } } } }) });
  }


  function chartsLoja() {
    var N = D.nuvem, top = N.products.slice(0, 8);
    mk('chProd', { type: 'bar',
      data: { labels: top.map(function (p) { return p.name.length > 26 ? p.name.slice(0, 25) + '…' : p.name; }),
        datasets: [{ label: 'Faturamento', data: top.map(function (p) { return p.rev; }),
          backgroundColor: top.map(function (_, i) { return i === 0 ? 'rgba(30,58,138,.85)' : 'rgba(37,99,235,.6)'; }), borderRadius: 3 }] },
      options: gopts({ indexAxis: 'y', plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return brl(c.parsed.x); } } } },
        scales: { x: { grid: { color: C.line }, ticks: { callback: function (v) { return 'R$' + (v / 1000) + 'k'; } } },
                  y: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } } } }) });

    mk('chLojaDia', { type: 'line',
      data: { labels: N.daily.map(function (d) { return dt(d.date); }),
        datasets: [{ label: 'Receita da loja', data: N.daily.map(function (d) { return d.rev; }),
          borderColor: C.teal, backgroundColor: 'rgba(13,148,136,.08)', fill: true, tension: .32, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4 }] },
      options: gopts({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return brl(c.parsed.y); } } } },
        scales: { y: { ticks: { callback: function (v) { return 'R$' + (v / 1000) + 'k'; } } } } }) });
  }

  function chartsOrigem() {
    var u = D.nuvem.utm.slice(0, 8);
    mk('chUtm', { type: 'bar',
      data: { labels: u.map(function (o) { return o.k.length > 26 ? o.k.slice(0, 25) + '…' : o.k; }),
        datasets: [{ label: 'Faturamento', data: u.map(function (o) { return o.rev; }),
          backgroundColor: u.map(function (o) { return /^meta|^facebook|^instagram/i.test(o.k) ? 'rgba(37,99,235,.78)' : /crm|rd station|email/i.test(o.k) ? 'rgba(13,148,136,.7)' : 'rgba(148,163,184,.7)'; }),
          borderRadius: 3 }] },
      options: gopts({ indexAxis: 'y', plugins: { legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return brl(c.parsed.x) + ' · ' + num(u[c.dataIndex].n) + ' pedidos'; } } } },
        scales: { x: { grid: { color: C.line }, ticks: { callback: function (v) { return 'R$' + (v / 1000) + 'k'; } } },
                  y: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } } } }) });
  }

  /* ============ ORDENAÇÃO ============ */
  function bindSort(tbl) {
    if (!tbl) return;
    tbl.querySelectorAll('th.sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        var ci = +th.dataset.col, type = th.dataset.type, asc = th.classList.contains('asc');
        tbl.querySelectorAll('th').forEach(function (o) { o.classList.remove('asc', 'desc'); });
        th.classList.add(asc ? 'desc' : 'asc');
        var tb = tbl.tBodies[0], rows = [].slice.call(tb.rows);
        rows.sort(function (a, b) {
          var va = a.cells[ci].dataset.v, vb = b.cells[ci].dataset.v;
          if (type === 'txt') return String(va).localeCompare(String(vb), 'pt-BR');
          return (+va || 0) - (+vb || 0);
        });
        if (asc) rows.reverse();
        rows.forEach(function (r) { tb.appendChild(r); });
      });
    });
  }

  /* ============ CONTADORES ============ */
  function animateCounts(scope) {
    scope.querySelectorAll('.kpi-val[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count); if (isNaN(target)) return;
      var fmt = el.dataset.fmt, t0 = null, dur = 900, final = el.textContent;
      function fm(v) {
        switch (fmt) { case 'brl': return brl(v); case 'brl2': return brl(v, 2); case 'x': return x(v);
          case 'num': return num(v); case 'pct2': return pct(v, 2); case 'dec2': return num(v, 2); case 'k': return k(v); default: return num(v); }
      }
      function step(ts) { if (!t0) t0 = ts; var p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
        el.textContent = p < 1 ? fm(target * e) : final; if (p < 1) requestAnimationFrame(step); }
      el.textContent = fm(0); requestAnimationFrame(step);
    });
  }

  /* ============ ROTEAMENTO ============ */
  var SEC = {
    resumo: { t: 'Resumo executivo', r: secResumo, c: chartsResumo },
    meta: { t: 'Meta Ads', r: secMeta, c: function () { renderMetaLevel(DRILL.adset ? 'ad' : DRILL.camp ? 'adset' : 'camp', '', 'all'); } },
    criativo: { t: 'Criativos e vídeo', r: secCriativo, c: chartsCriativo },
    plataforma: { t: 'Plataformas', r: secPlataforma, c: chartsPlataforma },
    publico: { t: 'Público', r: secPublico, c: chartsPublico },
    loja: { t: 'Loja · Nuvemshop', r: secLoja, c: chartsLoja },
    origem: { t: 'Origem e cupons', r: secOrigem, c: chartsOrigem },
    auditoria: { t: 'Auditoria estrutural', r: secAuditoria, c: chartsAuditoria },
    track: { t: 'Rastreamento', r: secTrack, c: function () { renderFunil(document.getElementById('funil2')); } },
    plano: { t: 'Plano de ação', r: secPlano, c: null }
  };

  function go(id) {
    if (!SEC[id]) id = 'resumo';
    var host = document.getElementById('view');
    host.innerHTML = '<div class="sec">' + SEC[id].r() + '</div>';
    document.querySelectorAll('.nav-i').forEach(function (n) { n.classList.toggle('on', n.dataset.s === id); });
    document.getElementById('crumb').textContent = SEC[id].t;
    window.scrollTo({ top: 0, behavior: 'instant' });
    host.querySelectorAll('table').forEach(bindSort);
    if (SEC[id].c) SEC[id].c();
    animateCounts(host);
    revealOnScroll(host);
    if (location.hash.slice(1) !== id) history.replaceState(null, '', '#' + id);
  }

  function revealOnScroll(scope) {
    var els = scope.querySelectorAll('.card, .kpi, .plan-item, .plat, .stat, .alert');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e, i) { if (e.isIntersecting) { setTimeout(function () { e.target.classList.add('in'); }, Math.min(i * 40, 200)); io.unobserve(e.target); } });
    }, { threshold: .06, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ============ EVENTOS GLOBAIS (delegação) ============ */
  document.addEventListener('click', function (ev) {
    var n = ev.target.closest('.nav-i');
    if (n) { go(n.dataset.s);
      if (window.innerWidth <= 860) { document.getElementById('side').classList.remove('open');
        var b = document.getElementById('backdrop'); if (b) b.classList.remove('on'); }
      return; }
    var sb = ev.target.closest('#segSerie .seg-b');
    if (sb) { sb.parentNode.querySelectorAll('.seg-b').forEach(function (b) { b.classList.remove('active'); }); sb.classList.add('active'); chartSerie(sb.dataset.s); return; }
    var tb = ev.target.closest('#tabsMeta .tab');
    if (tb) { setLevel(tb.dataset.lvl); return; }
    var dc = ev.target.closest('[data-go-adset]');
    if (dc) { DRILL.camp = dc.dataset.goAdset; DRILL.adset = null; setLevel('adset'); return; }
    var da = ev.target.closest('[data-go-ad]');
    if (da) { DRILL.camp = da.dataset.camp || DRILL.camp; DRILL.adset = da.dataset.goAd; setLevel('ad'); return; }
    var cl = ev.target.closest('[data-clear]');
    if (cl) {
      var w = cl.dataset.clear;
      if (w === 'all') { DRILL.camp = null; DRILL.adset = null; setLevel('camp'); }
      else if (w === 'camp') { DRILL.camp = null; DRILL.adset = null; setLevel('camp'); }
      else { DRILL.adset = null; setLevel('adset'); }
      return;
    }
    var rb = ev.target.closest('#segRoas .seg-b');
    if (rb) { rb.parentNode.querySelectorAll('.seg-b').forEach(function (b) { b.classList.remove('active'); }); rb.classList.add('active');
      renderMetaLevel(document.querySelector('#tabsMeta .tab.active').dataset.lvl, document.getElementById('qMeta').value, rb.dataset.f); return; }
    var mb = ev.target.closest('#menuBtn');
    if (mb) { var op = document.getElementById('side').classList.toggle('open');
      var bd = document.getElementById('backdrop'); if (bd) bd.classList.toggle('on', op); return; }
    if (ev.target.id === 'backdrop') { document.getElementById('side').classList.remove('open'); ev.target.classList.remove('on'); return; }
    if (ev.target.closest('#prtBtn')) { window.print(); return; }
  });
  document.addEventListener('input', function (ev) {
    if (ev.target.id === 'qMeta') renderMetaLevel(document.querySelector('#tabsMeta .tab.active').dataset.lvl, ev.target.value, document.querySelector('#segRoas .seg-b.active').dataset.f);
    if (ev.target.id === 'qVid') {
      var q = ev.target.value.toLowerCase();
      document.querySelectorAll('#tVid tbody tr').forEach(function (r) { r.style.display = r.cells[0].dataset.v.toLowerCase().indexOf(q) >= 0 ? '' : 'none'; });
    }
  });
  window.addEventListener('hashchange', function () { go(location.hash.slice(1) || 'resumo'); });

  function setLevel(lvl) {
    var tabs = document.querySelectorAll('#tabsMeta .tab');
    tabs.forEach(function (b) { b.classList.toggle('active', b.dataset.lvl === lvl); });
    var qe = document.getElementById('qMeta'); if (qe) qe.value = '';
    var seg = document.querySelector('#segRoas .seg-b.active');
    renderMetaLevel(lvl, '', seg ? seg.dataset.f : 'all');
  }

  /* ============ BOOT ============ */
  function boot() {
    var p = D.periodo;
    document.getElementById('perLabel').textContent = dt(p.cur.since) + ' – ' + dt(p.cur.until) + ' / 2026';
    document.getElementById('acctLabel').textContent = D.account.name;
    go(location.hash.slice(1) || 'resumo');
    window.__RX_READY = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  /* expõe para teste */
  window.__RX = { go: go, SEC: SEC, renderMetaLevel: renderMetaLevel, setLevel: setLevel, DRILL: DRILL, D: D, CH: CH };
})();
