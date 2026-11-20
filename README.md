# SIGMA-U | Conecta. Comparte. Aprende.

SIGMA-U es un prototipo de red social universitaria orientado a reunir publicaciones, preguntas, comentarios y recursos en un espacio digital colaborativo. Complementa los canales institucionales y no reemplaza los sistemas académicos oficiales.

## Tecnologías

- HTML5, CSS3 responsive y JavaScript vanilla.
- GitHub Pages para alojar el frontend estático.
- Supabase Auth para registro, inicio de sesión y recuperación de contraseña.
- PostgreSQL para perfiles, publicaciones, comentarios, reacciones, guardados y metadatos de galería.
- Row Level Security (RLS) para aplicar permisos por usuario y rol.
- Supabase Storage para archivos adjuntos y fotografías.

## Estructura principal

- `index.html`: presentación del proyecto.
- `comunidad.html`: feed personalizado por programa académico.
- `completar-perfil.html`: formulario obligatorio para completar datos académicos.
- `login.html`, `registro.html`, `recuperar.html`: autenticación.
- `perfil.html`: edición del perfil.
- `problema.html`: contexto, diagnóstico inicial, pregunta y objetivos.
- `innovacion.html`: propuesta de valor y funciones colaborativas.
- `sistema.html`: entradas, procesos, salidas y arquitectura.
- `multimedia.html`: galería dinámica administrada desde Supabase.
- `metodo-cientifico.html`: hipótesis y propuesta de validación.
- `industria40.html`: relación con la transformación digital.
- `assets/js/`: cliente, autenticación, comunidad y galería.
- `supabase/`: scripts SQL de configuración y ampliación.

## Configuración de Supabase

### 1. Crear el proyecto

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En **SQL Editor**, ejecuta en este orden:
   - `supabase/schema.sql`
   - `supabase/community_upgrade.sql`
   - `supabase/roles_gallery_upgrade.sql`
   - `supabase/program_targeted_feed.sql`
3. Los scripts crean las tablas, relaciones, políticas RLS, bucket de adjuntos, roles y galería. Los scripts de ampliación deben ejecutarse después del esquema inicial.

### 2. Configurar el cliente web

1. En el panel de Supabase copia el **Project URL** y la clave pública **publishable** (o la clave pública anon heredada).
2. Abre `assets/js/supabase-config.js`.
3. Configura esos dos valores en `window.SIGMA_SUPABASE_CONFIG`.
4. No uses ni publiques una clave `service_role` o una clave secreta en el frontend. La clave pública está diseñada para el navegador; las políticas RLS deben proteger los datos.

### 3. Configurar autenticación

En **Authentication > URL Configuration** establece:

- Site URL: `https://jollago.github.io/sigma-u/`
- Redirect URL para producción: `https://jollago.github.io/sigma-u/**`
- Redirect URL local: `http://localhost:8000/**`

En **Authentication > Providers** configura el método de inicio de sesión que vayas a utilizar. Si se activa Google OAuth, registra en Google Cloud el callback que proporciona Supabase y autoriza el origen del sitio publicado.

### 4. Asignar administradores

El script `roles_gallery_upgrade.sql` crea `public.user_roles` y las reglas de moderación. Para otorgar el rol, abre SQL Editor y ejecuta una consulta como esta, sustituyendo el correo por el de la cuenta que debe administrar el proyecto:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('CORREO_DEL_ADMIN')
on conflict (user_id) do update set role = excluded.role;
```

La asignación debe hacerse únicamente a cuentas autorizadas. Los usuarios pueden consultar su propio rol, pero no pueden elevar sus permisos desde la aplicación.

## Roles y permisos

| Función | Usuario | Administrador |
|---|---:|---:|
| Consultar la comunidad | Sí | Sí |
| Recibir primero publicaciones de su programa | Sí | Sí |
| Dirigir una publicación a un programa específico | Sí | Sí |
| Crear publicaciones y comentarios | Sí | Sí |
| Reaccionar y guardar publicaciones | Sí | Sí |
| Eliminar sus propias publicaciones y comentarios | Sí | Sí |
| Eliminar publicaciones y comentarios de otras personas | No | Sí |
| Consultar la galería | Sí | Sí |
| Cargar o eliminar fotografías de la galería | No | Sí |

La base de datos aplica los permisos mediante RLS. Ocultar botones en la interfaz no es el mecanismo de seguridad principal.

## Galería multimedia

- Bucket: `sigma-gallery`, público para lectura.
- Formatos admitidos: JPG, PNG, WEBP y GIF.
- Tamaño máximo: 10 MB por imagen.
- La tabla `gallery_items` guarda título, descripción, ruta del archivo, autor de carga y fecha.
- Solo las cuentas con rol `admin` pueden cargar o eliminar imágenes.
- Publica únicamente imágenes propias o autorizadas. Evita datos privados y fotografías de personas sin consentimiento.

## Archivos de publicaciones

La comunidad utiliza el bucket `community-files` y la tabla `post_attachments`. El límite configurado en el script de comunidad es de 100 MB por archivo. El bucket está configurado para acceso público mediante URL, por lo que no deben subirse documentos confidenciales, sensibles o con datos personales.

## Ejecutar en local

No abras el proyecto con `file://`. Desde la carpeta raíz ejecuta:

```bash
python -m http.server 8000
```

Abre [http://localhost:8000](http://localhost:8000). Configura las URL de redirección locales en Supabase antes de probar autenticación.

## Publicar en GitHub Pages

1. Sube el contenido del repositorio a la rama `main).
2. En GitHub abre **Settings > Pages**.
3. Selecciona **Deploy from a branch**, rama `main` y carpeta `/(root)`.
4. Guarda y espera a que termine el despliegue.
5. Verifica la URL `https://jollago.github.io/sigma-u/`.
6. Comprueba que las URL de autenticación de Supabase coincidan con la dirección publicada.

## Funciones incluidas en el prototipo

- Registro, inicio y cierre de sesión.
- Recuperación de contraseña mediante Supabase Auth.
- Perfil académico editable.
- Publicaciones de distintos tipos y adjuntos.
- Búsqueda y filtros por texto, tipo y archivo.
- Comentarios, reacciones, guardados y hashtags.
- Moderación de publicaciones y comentarios por administradores.
- Galería con identidad visual, diagramas y recursos del proyecto, además de fotografías dinámicas con carga y eliminación reservadas al administrador.
- Registro obligatorio con nombre, programa académico, sede, correo y contraseña.
- Feed que prioriza publicaciones dirigidas al programa del usuario, luego las generales y finalmente las dirigidas a otros programas.
- Contenido académico del proyecto: problema, innovación, sistema, método científico e Industria 4.0.

## Alcance y validación académica

El diagnóstico presentado en las páginas del proyecto es un planteamiento inicial. No se deben afirmar resultados de encuestas, entrevistas o pruebas de usabilidad hasta que se realicen y documenten. La hipótesis y el plan experimental describen cómo evaluar la propuesta, no resultados ya obtenidos.

La relación con Industria 4.0 se explica desde la digitalización, conectividad, servicios en la nube y gestión de datos. El prototipo no implementa actualmente inteligencia artificial, sensores industriales ni analítica avanzada.

## Seguridad

- Nunca publiques contraseñas, tokens privados, claves secretas o claves `service_role`.
- Mantén RLS habilitado en las tablas expuestas.
- Asigna el rol administrador solo a cuentas verificadas y autorizadas.
- No subas archivos privados al bucket público.
- Antes de una entrega, prueba la aplicación con al menos dos cuentas: una normal y otra administradora.
