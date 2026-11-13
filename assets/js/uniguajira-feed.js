(() => {
  const endpoint = "https://vdrosxnfafwkuuniipgf.supabase.co/functions/v1/uniguajira-feed";
  const grid = document.querySelector("#actualityGrid");
  const status = document.querySelector("#actualityStatus");
  const refresh = document.querySelector("#refreshActuality");
  const filters = [...document.querySelectorAll("[data-filter]")];
  let items = [];
  let active = "all";
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const safeUrl = value => {
    try { const u = new URL(value); return u.protocol === "https:" && u.hostname === "uniguajira.edu.co" ? u.href : ""; }
    catch { return ""; }
  };
  function render() {
    const list = active === "all" ? items : items.filter(item =>
      active === "news" ? item.type === "Noticia" : item.type === "Evento"
    );
    if (!list.length) {
      grid.innerHTML = '<div class="panel" style="padding:18px">No hay publicaciones disponibles en esta categoría por ahora.</div>';
      return;
    }
    grid.innerHTML = list.map(item => {
      const url = safeUrl(item.url);
      if (!url) return "";
      const image = safeUrl(item.image);
      return '<article class="actuality-card">' +
        (image ? '<img src="' + escapeHtml(image) + '" alt="" loading="lazy">' : '') +
        '<div class="actuality-card-body">' +
        '<span class="actuality-tag">' + escapeHtml(item.type) + '</span>' +
        '<h2>' + escapeHtml(item.title) + '</h2>' +
        (item.date ? '<small class="post-meta">' + escapeHtml(item.date) + '</small>' : '') +
        (item.summary ? '<p>' + escapeHtml(item.summary) + '</p>' : '') +
        '<a class="soft-btn" href="' + escapeHtml(url) + '" target="_blank" rel="noopener">Leer en Uniguajira ↗</a>' +
        '</div></article>';
    }).join("");
  }
  async function load() {
    status.textContent = "Consultando noticias y eventos oficiales…";
    refresh.disabled = true;
    try {
      const response = await fetch(endpoint, { headers: { "Accept": "application/json" }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || data.error || "No se pudo consultar la fuente oficial.");
      items = Array.isArray(data.items) ? data.items : [];
      status.textContent = items.length
        ? items.length + " publicaciones encontradas · Fuente oficial Universidad de La Guajira"
        : "La fuente oficial respondió, pero no se encontraron publicaciones. Puedes abrir las secciones originales más abajo.";
      render();
    } catch (error) {
      status.textContent = "No fue posible cargar la actualidad automáticamente. Puedes consultar las publicaciones directamente en la web oficial.";
      grid.innerHTML = '<div class="panel" style="padding:18px;grid-column:1/-1"><p>' + escapeHtml(error.message) + '</p><p><a href="https://uniguajira.edu.co/transparencia-y-acceso-a-informacion-publica/noticias/" target="_blank" rel="noopener">Noticias oficiales</a> · <a href="https://uniguajira.edu.co/transparencia-y-acceso-a-informacion-publica/eventos/" target="_blank" rel="noopener">Eventos oficiales</a></p></div>';
    } finally { refresh.disabled = false; }
  }
  filters.forEach(button => button.addEventListener("click", () => {
    active = button.dataset.filter;
    filters.forEach(item => item.classList.toggle("active", item === button));
    render();
  }));
  refresh?.addEventListener("click", load);
  load();
})();