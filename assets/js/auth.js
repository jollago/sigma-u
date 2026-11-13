(() => {
 const client=window.sigmaSupabase;const msg=document.getElementById("authMessage");
 const say=(t,ok=false)=>{if(msg){msg.textContent=t;msg.className="auth-message "+(ok?"success":"error");}};
 const showConfirmationPanel=()=>{
  const panel=document.getElementById("emailConfirmationPanel");
  if(panel){panel.hidden=false;document.body.classList.add("auth-modal-open");panel.querySelector("[data-confirm-ok]")?.focus();}
  else say("Tu cuenta está pendiente de activación. Revisa tu correo y confirma la dirección antes de iniciar sesión.",true);
 };
 document.getElementById("emailConfirmationOk")?.addEventListener("click",()=>{location.href="login.html";});
 if(!client){say("Falta configurar Supabase. Revisa assets/js/supabase-config.js.");return;}
 document.getElementById("registerForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget,submit=f.querySelector('button[type="submit"]'),name=f.elements.fullName.value.trim(),program=f.elements.program.value,campus=f.elements.campus.value,email=f.elements.email.value.trim(),password=f.elements.password.value,confirm=f.elements.confirmPassword.value;
  if(password!==confirm)return say("Las contraseñas no coinciden.");if(password.length<8)return say("La contraseña debe tener al menos 8 caracteres.");
  if(submit){submit.disabled=true;submit.textContent="Creando cuenta…";}
  try{
   const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:"https://jollago.github.io/confirmar.html",data:{full_name:name,program,campus}}});
   if(error){
    const detail=(error.message||"").toLowerCase();
    if(error.status===429||detail.includes("rate limit")||detail.includes("rate_limit")||detail.includes("too many requests")){
     return say("Supabase alcanzó el límite de correos de confirmación. Espera a que se restablezca el límite o configura un servicio SMTP propio en Supabase para permitir más registros. No necesitas cambiar el código de GitHub Pages.");
    }
    return say(error.message);
   }
   if(data.session){location.href="comunidad.html";}else showConfirmationPanel();
  }catch(error){say("No se pudo completar el registro. Comprueba tu conexión e inténtalo más tarde.");}
  finally{if(submit){submit.disabled=false;submit.textContent="Crear cuenta";}}
 });
 document.getElementById("googleAuthButton")?.addEventListener("click",async e=>{
  const button=e.currentTarget;button.disabled=true;button.textContent="Conectando con Google…";
  try{
   const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:"https://jollago.github.io/comunidad.html",queryParams:{prompt:"select_account"}}});
   if(error){say("No se pudo iniciar con Google: "+error.message);button.disabled=false;button.innerHTML='<span class="google-g" aria-hidden="true">G</span>Continuar con Google';}
  }catch(error){say("No se pudo conectar con Google. Inténtalo nuevamente.");button.disabled=false;button.innerHTML='<span class="google-g" aria-hidden="true">G</span>Continuar con Google';}
 });
 document.getElementById("loginForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,{error}=await client.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)return say(error.message);location.href="comunidad.html";});
 document.getElementById("recoverForm")?.addEventListener("submit",async e=>{e.preventDefault();const email=e.currentTarget.elements.email.value.trim(),{error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname.replace("recuperar.html","login.html")});if(error)return say(error.message);say("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",true);});
})();