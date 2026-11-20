(() => {
  const client = window.sigmaSupabase;
  const ready = window.sigmaSupabaseReady;
  const $ = (selector) => document.querySelector(selector);
  const grid = $("#galleryGrid");
  const status = $("#galleryStatus");
  const adminPanel = $("#galleryAdmin");
  const form = $("#galleryUploadForm");
  const fileInput = $("#galleryFile");
  const titleInput = $("#galleryTitle");
  const descriptionInput = $("#galleryDescription");
  const submit = $("#gallerySubmit");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let user = null;
  let isAdmin = false;
  const say = message => { if (status) status.textContent = message; };
  const publicUrl = path => client.storage.from("sigma-gallery").getPublicUrl(path).data.publicUrl;

  function render(items) {
    if (!grid) return;
    grid.innerHTML = items.length ? items.map(item => {
      const url = publicUrl(item.storage_path);
      return '<article class="gallery-item"><a href="' + esc(url) + '" target="_blank" rel="noopener"><img src="' + esc(url) + '" alt="' + esc(item.title || "Fotografía de SIGMA-U") + '" loading="lazy"></a><div class="gallery-item-info"><h2>' + esc(item.title || "Registro de la comunidad") + '</h2>' +
        (item.description ? '<p>' + esc(item.description) + '</p>' : '') +
        '<small>' + new Date(item.created_at).toLocaleDateString("es-CO",{dateStyle:"medium"}) + '</small>' +
        (isAdmin ? '<button class="action delete-action" type="button" data-delete="' + esc(item.id) + '" data-path="' + esc(item.storage_path) + '">Eliminar fotografía</button>' : '') +
        '</div></article>';
    }).join("") : '<div class="content-card"><p class="muted">Todavía no hay fotografías. El administrador puede agregar los primeros registros.</p></div>';
  }

  async function loadGallery() {
    if (!ready) { say("No se pudo conectar con Supabase. Revisa la configuración y recarga."); return; }
    const {data,error} = await client.from("gallery_items").select("id,title,description,storage_path,created_at").order("created_at",{ascending:false});
    if (error) { say("No se pudo cargar la galería: " + error.message); return; }
    render(data || []);
    say((data || []).length + " fotografía(s) en la galería.");
  }

  async function init() {
    if (!ready) { say("Supabase no está conectado. Verifica assets/js/supabase-config.js."); return; }
    const {data} = await client.auth.getSession();
    user = data.session?.user || null;
    if (user) {
      const {data:roleRow} = await client.from("user_roles").select("role").eq("user_id",user.id).maybeSingle();
      isAdmin = roleRow?.role === "admin";
    }
    if (isAdmin && adminPanel) adminPanel.hidden = false;
    await loadGallery();
    client.auth.onAuthStateChange(() => location.reload());
  }

  form?.addEventListener("submit", async event => {
    event.preventDefault();
    if (!user || !isAdmin) { say("Solo el administrador puede cargar fotografías."); return; }
    const file = fileInput.files?.[0];
    if (!file) { say("Selecciona una fotografía."); return; }
    const allowed = ["image/jpeg","image/png","image/webp","image/gif"];
    if (!allowed.includes(file.type)) { say("Formato no permitido. Usa JPG, PNG, WEBP o GIF."); return; }
    if (file.size > 10 * 1024 * 1024) { say("La fotografía supera el límite de 10 MB."); return; }
    submit.disabled = true;
    submit.textContent = "Subiendo…";
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"_");
    const path = user.id + "/" + Date.now() + "-" + safeName;
    try {
      const {error:uploadError} = await client.storage.from("sigma-gallery").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
      if (uploadError) throw uploadError;
      const {error:rowError} = await client.from("gallery_items").insert({
        title: titleInput.value.trim() || null,
        description: descriptionInput.value.trim() || null,
        storage_path: path,
        uploaded_by: user.id
      });
      if (rowError) {
        await client.storage.from("sigma-gallery").remove([path]);
        throw rowError;
      }
      form.reset();
      say("Fotografía agregada correctamente.");
      await loadGallery();
    } catch (error) {
      say("No se pudo cargar la fotografía: " + (error.message || "Error inesperado"));
    } finally {
      submit.disabled = false;
      submit.textContent = "Subir fotografía";
    }
  });

  grid?.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    if (!isAdmin) { say("No tienes permisos para eliminar fotografías."); return; }
    if (!confirm("¿Eliminar esta fotografía de la galería? Esta acción no se puede deshacer.")) return;
    button.disabled = true;
    const id = button.dataset.delete;
    const path = button.dataset.path;
    const {error:rowError} = await client.from("gallery_items").delete().eq("id",id);
    if (rowError) { say("No se pudo eliminar el registro: " + rowError.message); button.disabled = false; return; }
    const {error:storageError} = await client.storage.from("sigma-gallery").remove([path]);
    say(storageError ? "Registro eliminado, pero el archivo podría permanecer almacenado: " + storageError.message : "Fotografía eliminada.");
    await loadGallery();
  });

  init();
})();
