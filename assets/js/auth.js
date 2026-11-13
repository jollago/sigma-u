(() => {
 const client=window.sigmaSupabase;const msg=document.getElementById("authMessage");
 const say=(t,ok=false)=>{if(msg){msg.textContent=t;msg.className="auth-message "+(ok?"success":"error");}};
 if(!client){say("Falta configurar Supabase. Revisa assets/js/supabase-config.js.");return;}
 document.getElementById("registerForm")?.addEventListener("submit",async e=>{
  e.preventDefault();const f=e.currentTarget,name=f.elements.fullName.value.trim(),program=f.elements.program.value,campus=f.elements.campus.value,email=f.elements.email.value.trim(),password=f.elements.password.value,confirm=f.elements.confirmPassword.value;
  if(password!==confirm)return say("Las contraseñas no coinciden.");if(password.length<8)return say("La contraseña debe tener al menos 8 caracteres.");
  const {data,error}=await client.auth.signUp({email,password,options:{data:{full_name:name,program,campus}}});
  if(error)return say(error.message);if(data.session){location.href="comunidad.html";}else say("¡Registro recibido! Revisa tu correo electrónico (también la carpeta de spam) y abre el mensaje de SIGMA-U para confirmar tu cuenta. Después podrás iniciar sesión.",true);
 });
 document.getElementById("loginForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,{error}=await client.auth.signInWithPassword({email:f.elements.email.value.trim(),password:f.elements.password.value});if(error)return say(error.message);location.href="comunidad.html";});
 document.getElementById("recoverForm")?.addEventListener("submit",async e=>{e.preventDefault();const email=e.currentTarget.elements.email.value.trim(),{error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname.replace("recuperar.html","login.html")});if(error)return say(error.message);say("Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.",true);});
})();