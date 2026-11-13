(() => {
  // Catálogo inicial basado en programas publicados por Uniguajira; revisar oferta vigente por periodo.
  const programs = [
    "Administración de Empresas","Administración Marítima y Portuaria","Administración Pública","Administración Turística y Hotelera","Contaduría Pública","Economía","Negocios Internacionales","Tecnología en Gestión de Comercio Internacional",
    "Arquitectura","Ingeniería Agroindustrial","Ingeniería Ambiental","Ingeniería Civil","Ingeniería de Sistemas","Ingeniería Industrial","Ingeniería Mecánica","Tecnología en Gestión de Redes Informáticas",
    "Agroecología","Biología","Comunicación Social","Derecho","Psicología","Trabajo Social",
    "Licenciatura en Ciencias Sociales","Licenciatura en Educación Física, Recreación y Deporte","Licenciatura en Educación Infantil","Licenciatura en Educación Básica Primaria","Licenciatura en Etnoeducación e Interculturalidad","Licenciatura en Español y Humanidades","Licenciatura en Música",
    "Medicina","Enfermería","Nutrición y Dietética","Seguridad y Salud en el Trabajo","Otro / Egresado"
  ];
  const campuses=["Riohacha","Maicao","Fonseca","Villanueva"];
  window.SIGMA_PROGRAMS=programs;window.SIGMA_CAMPUSES=campuses;
  document.querySelectorAll("select[data-academic-program]").forEach(select=>{const current=select.dataset.current||select.value;select.innerHTML='<option value="">Selecciona tu programa</option>'+programs.map(p=>'<option value="'+p.replace(/"/g,"&quot;")+'">'+p+'</option>').join("");if(current)select.value=current;});
  document.querySelectorAll("select[data-campus]").forEach(select=>{const current=select.dataset.current||select.value;select.innerHTML='<option value="">Selecciona tu sede</option>'+campuses.map(p=>'<option value="'+p+'">'+p+'</option>').join("");if(current)select.value=current;});
})();