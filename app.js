/* app.js — navegação, breadcrumb, rotas. Seções registram-se em window.SEC[nome] = {title, group, render(host), mount(host)} */
(function () {
  'use strict';
  const U = window.UI, SEC = window.SEC = window.SEC || {};
  const NAV = [
    ['Visão', [['resumo', 'Resumo executivo'], ['plano', 'Plano de ação']]],
    ['Mídia paga', [['meta', 'Meta Ads'], ['google-ads', 'Google Ads'], ['criativos', 'Criativos & vídeo'], ['fadiga', 'Fadiga'], ['plataformas', 'Plataformas'], ['publico', 'Público & horários']]],
    ['Loja', [['loja', 'Vendas & produtos'], ['origem', 'Origem & cupons'], ['influenciadoras', 'Influenciadoras'], ['ga4', 'GA4']]],
    ['Infraestrutura', [['rastreamento', 'Rastreamento'], ['publicos', 'Públicos salvos'], ['auditoria', 'Auditoria estrutural'], ['conta', 'Conta & atividade']]],
  ];
  const safeCount = id => { try { return SEC[id]?.count ? SEC[id].count() : null; } catch (e) { return null; } };
  const nav = document.getElementById('nav');
  nav.innerHTML = NAV.map(([g, items]) => `<div class="nav-g">${g}</div>` + items.map(([id, t]) => { const c = safeCount(id); return `<div class="nav-i" data-s="${id}">${t}${c != null ? `<span class="cnt">${U.fmt.esc(c)}</span>` : ''}</div>`; }).join('')).join('');
  const titles = Object.fromEntries(NAV.flatMap(([, i]) => i));

  const view = document.getElementById('view'), crumb = document.getElementById('crumb');
  let current = null;
  /* card de erro elegante: a seção falhou, mas o resto do painel continua vivo */
  function errorCard(id, err) {
    console.warn(`[painel] seção "${id}" falhou:`, err);
    return `<div class="card sec-error"><div class="card-h"><span class="h2">Esta seção não pôde ser exibida</span></div>
      <p class="note">Os dados necessários para <b>${U.fmt.esc(titles[id] || id)}</b> não estão disponíveis neste extrato. As demais seções continuam funcionando.</p>
      <p class="note faint mono">${U.fmt.esc(err && err.message ? err.message : String(err))}</p></div>`;
  }
  function go(id, sub, push) {
    if (!SEC[id]) id = 'resumo';
    current = id;
    U.closePanel(); U.clearSel();
    view.innerHTML = `<div class="page" id="pg-${id}"></div>`;
    const host = view.firstElementChild;
    let ok = true;
    try { host.innerHTML = SEC[id].render(sub) || ''; }
    catch (e) { ok = false; host.innerHTML = errorCard(id, e); }
    document.querySelectorAll('.nav-i').forEach(n => n.classList.toggle('on', n.dataset.s === id));
    setCrumb([titles[id]]);
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (ok) {
      try {
        host.querySelectorAll('table.tbl').forEach(U.bindSort);
        if (SEC[id].mount) SEC[id].mount(host, sub);
        U.countUp(host); U.animateFunnels(host);
      } catch (e) { host.insertAdjacentHTML('afterbegin', errorCard(id, e)); }
    }
    const want = '#' + id + (sub ? '/' + sub : '');
    if (location.hash !== want) history[push ? 'pushState' : 'replaceState'](null, '', want); /* clique no menu entra no histórico; carga inicial/hashchange não duplica */
  }
  function setCrumb(parts, handlers) {
    crumb.innerHTML = parts.map((p, i) => i < parts.length - 1 ? `<button data-ci="${i}">${U.fmt.esc(p)}</button><span class="sep">›</span>` : `<span>${U.fmt.esc(p)}</span>`).join('');
    crumb.querySelectorAll('button').forEach(b => b.onclick = () => handlers?.[+b.dataset.ci]?.());
  }
  const side = document.getElementById('side'), menuBtn = document.getElementById('btnMenu'), navOv = document.getElementById('navOv');
  function setMenu(open) { side.classList.toggle('mobile-on', open); navOv.classList.toggle('on', open); menuBtn?.setAttribute('aria-expanded', String(open)); }
  menuBtn?.addEventListener('click', () => setMenu(!side.classList.contains('mobile-on')));
  navOv?.addEventListener('click', () => setMenu(false));
  document.addEventListener('click', e => {
    const n = e.target.closest('.nav-i'); if (n) { setMenu(false); go(n.dataset.s, undefined, true); return; }
    if (e.target.closest('#btnPrint')) { window.print(); return; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  /* thumbnails do fbcdn expiram (URLs assinadas): troca por placeholder neutro no erro de carga */
  document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.dataset.ph && t.src !== U.PLACEHOLDER) { t.src = U.PLACEHOLDER; t.classList.add('ph'); } }, true);
  window.addEventListener('hashchange', () => { const [id, sub] = location.hash.slice(1).split('/'); if (id !== current) go(id, sub); });
  window.APP = { go, setCrumb, titles };
  const [id, sub] = location.hash.slice(1).split('/');
  go(id || 'resumo', sub);
  window.__READY = true; window.__READY_AT = Date.now();
})();
