(async()=>{
 const c=window.sigmaSupabase,m=document.getElementById("authMessage"),say=(t,ok=false)=>{m.textContent=t;m.className="auth-message "+(ok?"success":"error");};
 if(!c){say("Configura Supabase primero.");return;}
 const {data:{user:u},error:userError}=await c.auth.getUser();
 if(userError||!u){location.href="login.html";return;}
 const $=id=>document.getElementById(id);
 let {data:p,error}=await c.from("profiles").select("*").eq("id",u.id).single();
 if(error){say("No se pudo cargar el perfil: "+error.message);return;}
 $("fullName").value=p.full_name||u.user_metadata?.full_name||"";
 $("program").value=p.program||u.user_metadata?.program||"";
 $("campus").value=p.campus||u.user_metadata?.campus||"";
 $("semester").value=p.semester||"";
 $("bio").value=p.bio||"";
 $("interests").value=p.interests||"";
 $("email").value=u.email||"";
 const showSummary=()=>{const full=$("fullName").value||"Estudiante";$("summaryName").textContent=full;$("summaryProgram").textContent=$("program").selectedOptions[0]?.textContent||$("program").value||"Programa no especificado";$("summaryCampus").textContent=$("campus").value?"Sede: "+$("campus").value:"";$("summaryBio").textContent=$("bio").value||"Aún no has agregado una descripción.";$("summaryInterests").textContent=$("interests").value||"Aún no has agregado intereses.";if(p.avatar_url){$("summaryAvatar").src=p.avatar_url;$("summaryAvatar").classList.remove("hidden");}};
 showSummary();
 $("editProfileBtn").addEventListener("click",()=>{$("profileSummary").classList.add("hidden");$("profileEditor").classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});});
 $("backProfileBtn").addEventListener("click",()=>{$("profileEditor").classList.add("hidden");$("profileSummary").classList.remove("hidden");showSummary();});
 if(p.avatar_url){$("avatarPreview").src=p.avatar_url;$("avatarPreview").classList.remove("hidden");}
 $("avatarFile").addEventListener("change",()=>{
   const file=$("avatarFile").files[0];if(!file)return;
   if(!file.type.startsWith("image/")){say("Selecciona una imagen.");$("avatarFile").value="";return;}
   if(file.size>5*1024*1024){say("La foto no puede superar 5 MB.");$("avatarFile").value="";return;}
   $("avatarPreview").src=URL.createObjectURL(file);$("avatarPreview").classList.remove("hidden");
 });
 $("profileForm").addEventListener("submit",async e=>{
   e.preventDefault();const btn=e.currentTarget.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent="Guardando…";
   try{
     let avatar_url=p.avatar_url||null;const file=$("avatarFile").files[0];
     if(file){
       const ext=(file.name.split(".").pop()||"jpg").replace(/[^a-z0-9]/gi,"");
       const path=u.id+"/avatar-"+Date.now()+"."+ext;
       const {error:upError}=await c.storage.from("community-files").upload(path,file,{upsert:true,contentType:file.type});
       if(upError)throw upError;avatar_url=c.storage.from("community-files").getPublicUrl(path).data.publicUrl;
     }
     const payload={full_name:$("fullName").value.trim(),program:$("program").value,campus:$("campus").value,semester:$("semester").value,bio:$("bio").value.trim(),interests:$("interests").value.trim(),avatar_url,updated_at:new Date().toISOString()};
     const {error:saveError}=await c.from("profiles").update(payload).eq("id",u.id);
     if(saveError)throw saveError;p={...p,...payload};showSummary();$("profileEditor").classList.add("hidden");$("profileSummary").classList.remove("hidden");say("Perfil actualizado correctamente.",true);
   }catch(err){say("No se pudo guardar: "+err.message);}
   finally{btn.disabled=false;btn.textContent="Guardar cambios";}
 });
})();