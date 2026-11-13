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
  e.preventDefault();const f=e.currentTarget,name=f.elements.fullName.value.trim(),program=f.elements.program.value,campus=f.elements.campus.value,email=f.elements.email.value.trim(),password=f.elements.password.value,confirm=f.elements.confirmPassword.value;
  if(password!==confirm)return say("Las contraseñas no coinciden.");if(password.length<8)return say("La contraseña debe tener al menos 8 caracteres.");
  const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:name,program,campus}}});
  if(error)return say(error.message);if(data.session){location.href="comunidad.html";}else showConfirmationPanel();
 });
 document.getElementById("loginForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,{error}=await client.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)return say(error.message);location.href="comunidad.html";});
 document.getElementById("recoverForm")?.addEventListener("submit",async e=>{e.preventDefault();const email=e.currentTarget.elements.email.value.trim(),{error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname.replace("recuperar.html","login.html")});if(error)return say(error.message);say("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",true);});
})();