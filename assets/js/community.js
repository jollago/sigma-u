(() => {
  const client = window.sigmaSupabase;
  const ready = window.sigmaSupabaseReady;
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const feed=$("#feedList"), form=$("#postForm"), input=$("#postText"), type=$("#postType");
  const search=$("#communitySearch"), filter=$("#feedFilter"), notice=$("#connectionNotice");
  const filesInput=$("#postFiles"), filesLabel=$("#selectedFiles");
  let user=null, posts=[], savedOnly=false, currentView="Todos";
  const initials=n => (n||"Estudiante").split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
  const status=t=>{if(notice) notice.textContent=t;};
  const time=s=>{const d=new Date(s);return isNaN(d)?"":d.toLocaleString("es-CO",{dateStyle:"medium",timeStyle:"short"});};
  const publicUrl=path=>client.storage.from("community-files").getPublicUrl(path).data.publicUrl;
  const fileSize=n=>n<1024*1024?(n/1024).toFixed(0)+" KB":(n/1024/1024).toFixed(1)+" MB";
  function attachmentMarkup(a){
    const url=publicUrl(a.storage_path), name=esc(a.file_name), mime=a.mime_type||"";
    if(mime.startsWith("image/")) return '<a class="media-link" href="'+esc(url)+'" target="_blank" rel="noopener"><img class="post-media-image" src="'+esc(url)+'" alt="'+name+'" loading="lazy"></a>';
    if(mime.startsWith("video/")) return '<video class="post-media-video" controls preload="metadata"><source src="'+esc(url)+'" type="'+esc(mime)+'">Tu navegador no puede reproducir este video.</video>';
    return '<a class="post-attachment" href="'+esc(url)+'" target="_blank" rel="noopener" download><span class="file-icon">'+esc((name.split(".").pop()||"FILE").slice(0,5).toUpperCase())+'</span><span><strong>'+name+'</strong><small class="post-meta">'+esc(fileSize(a.size_bytes||0))+' · Abrir o descargar</small></span><span class="attachment-download">↓</span></a>';
  }
  function card(p){
    const author=p.profiles?.full_name||"Estudiante", comments=p.comments||[], likes=p.reactions?.length||0;
    const avatar=p.profiles?.avatar_url?'<img src="'+esc(p.profiles.avatar_url)+'" alt="" class="avatar-img">':esc(initials(author));
    const attachments=(p.attachments||[]).map(attachmentMarkup).join("");
    return '<article class="post" data-id="'+esc(p.id)+'"><div class="post-head"><div class="avatar">'+avatar+'</div><div><div class="post-author">'+esc(author)+'</div><div class="post-meta">'+esc(p.profiles?.program||"Comunidad universitaria")+' · '+esc(time(p.created_at))+'</div></div><span class="post-type">'+esc(p.type)+'</span></div><div class="post-body">'+esc(p.content)+'</div>'+attachments+'<div class="post-actions"><button class="action '+(p.my_reaction?"active":"")+'" data-action="like">♡ Me gusta · '+likes+'</button><button class="action" data-action="comment">▢ Comentar · '+comments.length+'</button><button class="action '+(p.is_saved?"active":"")+'" data-action="save">'+(p.is_saved?"★ Guardado":"☆ Guardar")+'</button></div><div class="comments">'+comments.map(c=>'<div class="comment"><strong>'+esc(c.profiles?.full_name||"Estudiante")+':</strong> '+esc(c.content)+'</div>').join("")+'<form class="comment-form"><input name="comment" placeholder="Escribe un comentario..." aria-label="Escribe un comentario" maxlength="3000" required><button class="soft-btn" type="submit">Enviar</button></form></div></article>';
  }
  function render(){
    if(!feed)return;
    const q=(search?.value||"").trim().toLowerCase(), f=filter?.value||"Todos", fileF=$("#fileFilter")?.value||"Todos";
    let list=posts.filter(p=>(f==="Todos"||p.type===f)&&(!savedOnly||p.is_saved));
    list=list.filter(p=>{
      const names=(p.attachments||[]).map(a=>a.file_name).join(" ");
      const text=[p.content,p.profiles?.full_name,p.profiles?.program,p.type,names].join(" ").toLowerCase();
      const ext=(p.attachments||[]).map(a=>(a.file_name.split(".").pop()||"").toLowerCase());
      const byFile=fileF==="Todos"||(fileF==="Imagen"&&ext.some(x=>["png","jpg","jpeg","gif","webp","svg"].includes(x)))||(fileF==="Video"&&ext.some(x=>["mp4","webm","mov","m4v"].includes(x)))||(fileF==="Documento"&&ext.some(x=>["pdf","doc","docx","ppt","pptx","xls","xlsx","txt","csv","zip"].includes(x)));
      return text.includes(q)&&byFile;
    });
    feed.innerHTML=list.length?list.map(card).join(""):'<div class="empty panel">No encontramos contenido. Cambia los filtros o comparte el primer aporte.</div>';
  }
  async function loadPosts(){
    if(!ready){posts=[];render();status("Supabase no está conectado. Verifica la configuración pública y recarga la página.");return;}
    if(!user){posts=[];render();status("Inicia sesión para consultar y compartir contenido de la comunidad.");return;}

    // Consultas separadas: evitan relaciones ambiguas de PostgREST entre posts y profiles.
    const {data: basePosts,error:postsError}=await client
      .from("posts")
      .select("id,author_id,type,content,created_at")
      .order("created_at",{ascending:false})
      .limit(100);
    if(postsError){status("No se pudieron cargar las publicaciones: "+postsError.message);posts=[];render();return;}

    const postIds=(basePosts||[]).map(p=>p.id);
    const authorIds=[...new Set((basePosts||[]).map(p=>p.author_id).filter(Boolean))];
    let profileRows=[], commentRows=[], attachmentRows=[], reactionRows=[];
    if(authorIds.length){
      const {data,error}=await client.from("profiles").select("id,full_name,program,avatar_url").in("id",authorIds);
      if(error){status("No se pudieron cargar los perfiles: "+error.message);posts=[];render();return;}
      profileRows=data||[];
    }
    if(postIds.length){
      const [commentsResult,attachmentsResult,reactionsResult]=await Promise.all([
        client.from("comments").select("id,post_id,author_id,content,created_at").in("post_id",postIds).order("created_at",{ascending:true}),
        client.from("post_attachments").select("id,post_id,storage_path,file_name,mime_type,size_bytes").in("post_id",postIds),
        client.from("reactions").select("post_id,user_id").in("post_id",postIds)
      ]);
      if(commentsResult.error){status("No se pudieron cargar los comentarios: "+commentsResult.error.message);posts=[];render();return;}
      if(attachmentsResult.error){status("No se pudieron cargar los archivos: "+attachmentsResult.error.message);posts=[];render();return;}
      if(reactionsResult.error){status("No se pudieron cargar las reacciones: "+reactionsResult.error.message);posts=[];render();return;}
      commentRows=commentsResult.data||[];
      attachmentRows=attachmentsResult.data||[];
      reactionRows=reactionsResult.data||[];
    }
    const commentAuthorIds=[...new Set(commentRows.map(c=>c.author_id).filter(Boolean))];
    let commentProfiles=[];
    if(commentAuthorIds.length){
      const {data,error}=await client.from("profiles").select("id,full_name").in("id",commentAuthorIds);
      if(error){status("No se pudieron cargar los autores de comentarios: "+error.message);posts=[];render();return;}
      commentProfiles=data||[];
    }
    const profileById=new Map(profileRows.map(p=>[p.id,p]));
    const commentProfileById=new Map(commentProfiles.map(p=>[p.id,p]));
    const commentsByPost=new Map(), attachmentsByPost=new Map(), reactionsByPost=new Map();
    commentRows.forEach(c=>{
      if(!commentsByPost.has(c.post_id))commentsByPost.set(c.post_id,[]);
      commentsByPost.get(c.post_id).push({...c,profiles:commentProfileById.get(c.author_id)||null});
    });
    attachmentRows.forEach(a=>{
      if(!attachmentsByPost.has(a.post_id))attachmentsByPost.set(a.post_id,[]);
      attachmentsByPost.get(a.post_id).push(a);
    });
    reactionRows.forEach(r=>{
      if(!reactionsByPost.has(r.post_id))reactionsByPost.set(r.post_id,[]);
      reactionsByPost.get(r.post_id).push(r);
    });
    const [{data:saves,error:saveError},{data:likes,error:likeError}]=await Promise.all([
      client.from("saved_posts").select("post_id").eq("user_id",user.id),
      client.from("reactions").select("post_id").eq("user_id",user.id)
    ]);
    if(saveError)console.warn(saveError);
    if(likeError)console.warn(likeError);
    const saved=new Set((saves||[]).map(x=>x.post_id));
    const liked=new Set((likes||[]).map(x=>x.post_id));
    posts=(basePosts||[]).map(p=>({
      ...p,
      profiles:profileById.get(p.author_id)||null,
      comments:commentsByPost.get(p.id)||[],
      attachments:attachmentsByPost.get(p.id)||[],
      reactions:reactionsByPost.get(p.id)||[],
      is_saved:saved.has(p.id),
      my_reaction:liked.has(p.id)
    }));
    render();status("Conectado · "+posts.length+" publicaciones cargadas.");
  }
  async function account(){
    if(!ready){$("#accountActions").innerHTML='<a class="soft-btn" href="login.html">Iniciar sesión</a><a class="primary" href="registro.html">Crear cuenta</a>';return;}
    const {data}=await client.auth.getSession(); user=data.session?.user||null;
    if(user){
      const {data:p}=await client.from("profiles").select("full_name,program,avatar_url").eq("id",user.id).maybeSingle();
      const name=p?.full_name||user.user_metadata?.full_name||user.email;
      $("#profileName").textContent=name;$("#profileProgram").textContent=p?.program||"Estudiante SIGMA-U";
      $("#profileAvatar").innerHTML=p?.avatar_url?'<img class="avatar-img" src="'+esc(p.avatar_url)+'" alt="">':esc(initials(name));
      $("#composerAvatar").textContent=initials(name);
      $("#accountActions").innerHTML='<span class="account-email">'+esc(user.email)+'</span><button class="soft-btn" id="logoutBtn">Cerrar sesión</button>';
      $("#logoutBtn").onclick=async()=>{await client.auth.signOut();location.href="login.html";};
      input.placeholder="¿Qué quieres compartir hoy?";
      form.querySelector('button[type="submit"]').disabled=false;
    }else{
      $("#profileName").textContent="Visitante";$("#profileProgram").textContent="Inicia sesión para participar";
      $("#accountActions").innerHTML='<a class="soft-btn" href="login.html">Iniciar sesión</a><a class="primary" href="registro.html">Crear cuenta</a>';
      input.placeholder="Inicia sesión para compartir";form.querySelector('button[type="submit"]').disabled=true;
    }
  }
  filesInput?.addEventListener("change",()=>{
    const chosen=Array.from(filesInput.files||[]);
    if(chosen.length>6){filesInput.value="";filesLabel.textContent="Máximo 6 archivos por publicación.";return;}
    const invalid=chosen.find(f=>f.size>100*1024*1024);
    if(invalid){filesInput.value="";filesLabel.textContent=invalid.name+" supera el límite de 100 MB.";return;}
    filesLabel.textContent=chosen.length?chosen.map(f=>f.name+" ("+fileSize(f.size)+")").join(" · "):"Puedes adjuntar hasta 6 archivos.";
  });
  form?.addEventListener("submit",async e=>{
    e.preventDefault();if(!ready||!user){location.href="login.html";return;}
    const content=input.value.trim(), chosen=Array.from(filesInput?.files||[]);
    if(!content&&!chosen.length)return status("Escribe algo o adjunta un archivo.");
    const submit=form.querySelector('button[type="submit"]');submit.disabled=true;submit.textContent="Publicando…";
    let postId=null, uploaded=[];
    try{
      const {data:authResult,error:authError}=await client.auth.getUser();
      if(authError)throw new Error("No se pudo validar la sesión: "+authError.message);
      const currentUser=authResult.user;
      if(!currentUser)throw new Error("La sesión expiró. Cierra sesión e inicia nuevamente.");

      const {data:profile,error:profileReadError}=await client
        .from("profiles").select("id").eq("id",currentUser.id).maybeSingle();
      if(profileReadError)throw new Error("No se pudo verificar tu perfil: "+profileReadError.message+" ["+(profileReadError.code||"sin código")+"]");
      if(!profile){
        const metadata=currentUser.user_metadata||{};
        const {error:profileInsertError}=await client.from("profiles").insert({
          id:currentUser.id,
          full_name:metadata.full_name||currentUser.email||"Estudiante",
          program:metadata.program||null
        });
        if(profileInsertError)throw new Error("No se pudo crear tu perfil: "+profileInsertError.message+" ["+(profileInsertError.code||"sin código")+"]");
      }

      const {data:post,error}=await client.from("posts").insert({
        author_id:currentUser.id,
        type:type.value,
        content:content||"Archivo compartido por la comunidad."
      }).select("id").single();
      if(error)throw new Error("Supabase rechazó la publicación: "+error.message+" ["+(error.code||"sin código")+"]"+(error.details?" Detalles: "+error.details:"")+(error.hint?" Ayuda: "+error.hint:""));
      postId=post.id;
      for(const file of chosen){
        const safe=file.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"_");
        const path=user.id+"/"+Date.now()+"-"+Math.random().toString(36).slice(2,8)+"-"+safe;
        const {error:uploadError}=await client.storage.from("community-files").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type||"application/octet-stream"});
        if(uploadError)throw uploadError;uploaded.push(path);
        const {error:rowError}=await client.from("post_attachments").insert({post_id:postId,author_id:user.id,storage_path:path,file_name:file.name,mime_type:file.type||"application/octet-stream",size_bytes:file.size});
        if(rowError)throw rowError;
      }
      input.value="";if(filesInput)filesInput.value="";if(filesLabel)filesLabel.textContent="Puedes adjuntar hasta 6 archivos.";
      filter.value="Todos";savedOnly=false;currentView="Todos";await loadPosts();status("¡Publicación compartida correctamente!");
    }catch(err){
      if(uploaded.length)await client.storage.from("community-files").remove(uploaded);
      if(postId)await client.from("posts").delete().eq("id",postId);
      status("No se pudo publicar: "+(err.message||"Error inesperado"));
    }finally{submit.disabled=false;submit.textContent="Publicar";}
  });
  feed?.addEventListener("click",async e=>{
    const b=e.target.closest("[data-action]");if(!b)return;
    if(!user){location.href="login.html";return;}
    const id=b.closest("[data-id]").dataset.id;let result;
    if(b.dataset.action==="like"){
      const exists=posts.find(p=>p.id===id)?.my_reaction;
      result=exists?await client.from("reactions").delete().eq("post_id",id).eq("user_id",user.id):await client.from("reactions").insert({post_id:id,user_id:user.id});
    }else if(b.dataset.action==="save"){
      const exists=posts.find(p=>p.id===id)?.is_saved;
      result=exists?await client.from("saved_posts").delete().eq("post_id",id).eq("user_id",user.id):await client.from("saved_posts").insert({post_id:id,user_id:user.id});
    }else if(b.dataset.action==="comment"){b.closest(".post").querySelector('input[name="comment"]')?.focus();return;}
    if(result?.error)status("No se pudo actualizar la interacción: "+result.error.message);
    await loadPosts();
  });
  feed?.addEventListener("submit",async e=>{
    if(!e.target.matches(".comment-form"))return;e.preventDefault();if(!user){location.href="login.html";return;}
    const id=e.target.closest("[data-id]").dataset.id, content=e.target.elements.comment.value.trim();if(!content)return;
    const {error}=await client.from("comments").insert({post_id:id,author_id:user.id,content});
    if(error){status("No se pudo comentar: "+error.message);return;}await loadPosts();
  });
  function setView(view){
    currentView=view;savedOnly=view==="Guardados";
    if(filter)filter.value=["Pregunta","Recurso"].includes(view)?view:"Todos";
    $("#savedLink")?.classList.toggle("active",savedOnly);
    document.querySelectorAll(".side-nav .nav-link").forEach(a=>a.classList.toggle("active",a.dataset.view===view));
    render();
  }
  document.querySelectorAll(".side-nav [data-view]").forEach(a=>a.addEventListener("click",e=>{
    e.preventDefault();const view=a.dataset.view;setView(view);
    if(view==="Explorar")search?.focus();
  }));
  search?.addEventListener("input",render);filter?.addEventListener("change",render);$("#fileFilter")?.addEventListener("change",render);
  $("#savedLink")?.addEventListener("click",e=>{e.preventDefault();if(!user){location.href="login.html";return;}setView(savedOnly?"Todos":"Guardados");});
  (async()=>{await account();await loadPosts();if(ready)client.auth.onAuthStateChange(()=>{account().then(loadPosts);});})();
})();
