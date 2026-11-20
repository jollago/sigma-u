(async()=>{
 const c=window.sigmaSupabase,$=id=>document.getElementById(id),msg=$("onboardingMessage");
 const say=(t,ok=false)=>{msg.textContent=t;msg.className="auth-message "+(ok?"success":"error");};
 if(!c){say("No se pudo conectar con Supabase.");return;}
 const {data:{user:u}}=await c.auth.getUser();
 if(!u){location.href="login.html";return;}
 const {data:p,error}=await c.from("profiles").select("full_name,program,campus").eq("id",u.id).maybeSingle();
 if(error){say("No se pudo consultar el perfil: "+error.message);return;}
 $("fullName").value=p?.full_name||u.user_metadata?.full_name||"";
 $("program").value=p?.program||u.user_metadata?.program||"";
 $("campus").value=p?.campus||u.user_metadata?.campus||"";
 $("onboardingForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const full_name=$("fullName").value.trim(),program=$("program").value,campus=$("campus").value;
  if(!full_name||!program||!campus){say("Los tres datos son obligatorios.");return;}
  const button=e.currentTarget.querySelector("button[type=submit]");button.disabled=true;button.textContent="Guardando…";
  const {error:saveError}=await c.from("profiles").upsert({id:u.id,full_name,program,campus,updated_at:new Date().toISOString()});
  if(saveError){say("No se pudo guardar: "+saveError.message);button.disabled=false;button.textContent="Guardar y entrar a SIGMA-U";return;}
  const {error:metaError}=await c.auth.updateUser({data:{full_name,program,campus}});
  if(metaError){say("Tus datos se guardaron, pero no se pudo actualizar la información de la cuenta: "+metaError.message);button.disabled=false;button.textContent="Guardar y entrar a SIGMA-U";return;}
  location.href="comunidad.html";
 });
})();