# SIGMA-U | Conecta. Comparte. Aprende.

Prototipo de red social universitaria con frontend estático, autenticación Supabase y base de datos PostgreSQL.

## Tecnologías
- HTML5, CSS3 responsive y JavaScript vanilla.
- Supabase Auth para registro, inicio de sesión y recuperación de contraseña.
- Supabase Database (PostgreSQL) para perfiles, publicaciones, comentarios, reacciones y guardados.
- Row Level Security (RLS) para proteger los datos.
- GitHub Pages para publicar el frontend.

## 1. Crear el proyecto Supabase
1. Entra a https://supabase.com/ y crea una cuenta o inicia sesión.
2. Crea un proyecto nuevo y guarda de forma segura la contraseña de la base de datos. No la necesitas para configurar el frontend.
3. Espera a que el proyecto termine de aprovisionarse.
4. En el panel abre **SQL Editor > New query**.
5. Abre `supabase/schema.sql`, copia todo el contenido, pégalo en SQL Editor y pulsa **Run**. Esto crea las tablas, índices, trigger de perfil y políticas RLS.

## 2. Conectar la web con Supabase
1. En Supabase abre **Project Settings > API** (o **Connect**, según la versión del panel).
2. Copia el **Project URL** y la clave pública **anon / publishable**.
3. Abre `assets/js/supabase-config.js`.
4. Reemplaza `PEGA_AQUI_TU_SUPABASE_PROJECT_URL` por el Project URL y `PEGA_AQUI_TU_SUPABASE_ANON_KEY` por la clave pública.
5. Guarda el archivo. La clave anon/publishable está diseñada para usarse en el navegador; la seguridad depende de RLS. **Nunca pegues `service_role` o una clave secreta en este archivo ni la subas a GitHub.**

## 3. Configurar autenticación
En Supabase abre **Authentication > URL Configuration**:
- Site URL: la URL publicada de tu sitio, por ejemplo `https://TU-USUARIO.github.io/TU-REPOSITORIO/`.
- Redirect URLs: agrega esa misma URL y, para pruebas locales, `http://localhost:8000/**`.
- En **Authentication > Providers > Email**, decide si exigirás confirmación del correo. Para una entrega real se recomienda dejarla activa.

La recuperación de contraseña utiliza el flujo de correo de Supabase. Revisa también las plantillas de correo y los límites de envío del proyecto.

## 4. Probar en local
No abras los archivos con `file://`. Desde la carpeta del proyecto ejecuta:

```bash
python -m http.server 8000
```

Abre `http://localhost:8000`. Regístrate con un correo al que tengas acceso, confirma el correo si la verificación está activa e inicia sesión. Prueba crear una publicación, comentar, reaccionar, guardar y editar el perfil.

## 5. Publicar en GitHub Pages
1. Sube todos los archivos y carpetas de `SIGMA-U` a la raíz de tu repositorio.
2. En GitHub entra a **Settings > Pages**.
3. En **Build and deployment**, elige **Deploy from a branch**.
4. Selecciona `main` y la carpeta `/ (root)`, luego guarda.
5. Espera la publicación y copia la URL que entrega GitHub Pages.
6. Regresa a Supabase y configura esa URL como Site URL y Redirect URL.

## Funcionalidades conectadas
- Registro con nombre, programa académico, correo y contraseña.
- Inicio y cierre de sesión.
- Recuperación de contraseña por correo.
- Creación y consulta compartida de publicaciones.
- Comentarios, reacciones y publicaciones guardadas.
- Perfil editable.
- Políticas RLS para que cada usuario gestione solo sus propios datos.

## Importante: qué está y qué no está implementado
- La conexión real se activa después de ejecutar el SQL y configurar el Project URL y la clave pública.
- Si Supabase no está configurado, la comunidad muestra publicaciones de demostración; no las guarda como datos compartidos.
- La versión actual no incluye carga de archivos, chat en tiempo real ni un sistema completo de notificaciones. La tabla `notifications` queda preparada para una ampliación posterior.
- Los posts de demostración no se insertan automáticamente en PostgreSQL.
- GitHub Pages solo aloja archivos estáticos; Supabase proporciona autenticación y base de datos.

## Estructura
- `index.html`: presentación del proyecto.
- `comunidad.html`: feed de la red social.
- `login.html`, `registro.html`, `recuperar.html`: autenticación.
- `perfil.html`: edición del perfil.
- `supabase/schema.sql`: esquema PostgreSQL y políticas RLS.
- `assets/js/supabase-config.js`: configuración pública del proyecto.
- `assets/js/`: cliente, autenticación y lógica de comunidad.
- `problema.html`, `innovacion.html`, `sistema.html`, `multimedia.html`, `metodo-cientifico.html`, `industria40.html`: contenido académico.

## Seguridad y entrega académica
No publiques contraseñas, claves `service_role`, tokens privados ni datos personales reales en el repositorio. Usa cuentas de prueba. Antes de presentar, valida el registro, la confirmación de correo, el inicio de sesión, la creación de posts y las políticas RLS con dos usuarios diferentes.
