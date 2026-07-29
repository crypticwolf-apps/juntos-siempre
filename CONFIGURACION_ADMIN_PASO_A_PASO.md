# Cómo activar el panel de gestión de Juntos Siempre

> ## ⚡ YA ESTÁ CASI TODO HECHO
>
> La instalación se hizo el **29 de julio de 2026**. Ya están listos:
>
> - ✅ El proyecto de Supabase (`juntos-siempre`, servidores en París)
> - ✅ Las tablas, la seguridad y el contenedor de fotos
> - ✅ Los textos, las 4 categorías y los 6 productos actuales
> - ✅ Las claves conectadas al despliegue automático
> - ✅ El registro público cerrado (comprobado: nadie puede darse de alta)
>
> **Solo te queda una cosa: crear tu usuario.** Son 2 minutos:
>
> 1. Entra en **https://supabase.com/dashboard/project/prbphmybpczjndrgsceq/auth/users**
> 2. Pulsa **Add user** → **Create new user**
> 3. Escribe tu correo y **la contraseña que tú quieras** (mínimo 8 caracteres).
>    Elígela tú: yo no he creado ninguna contraseña en tu nombre.
> 4. Marca la casilla **Auto Confirm User** (importante, si no no podrás entrar)
> 5. Pulsa **Create user**
>
> **La primera cuenta que se cree será automáticamente la administradora**, así
> que no tienes que ejecutar ninguna consulta. Después entra en:
>
> **https://crypticwolf-apps.github.io/juntos-siempre/admin.html**
>
> El resto de esta guía queda como referencia por si algún día hay que repetir
> la instalación desde cero o montarla en otro sitio.

---

Esta guía está escrita para hacerse **sin saber programar**. Solo hay que copiar
y pegar, y pulsar botones. Tardarás unos 20 minutos.

Los nombres de los botones están escritos **tal cual aparecen en pantalla**.
Muchas webs están en inglés: cuando sea así, te lo indico.

> **Mientras no hagas nada de esto, la web sigue funcionando con normalidad.**
> Los clientes la ven igual que siempre. Lo único que no funcionará todavía es
> el panel de gestión.

---

## Índice

1. [Crear la cuenta gratuita de Supabase](#1-crear-la-cuenta-gratuita-de-supabase)
2. [Crear las tablas (copiar y pegar 4 textos)](#2-crear-las-tablas-copiar-y-pegar-4-textos)
3. [Comprobar la carpeta de fotografías](#3-comprobar-la-carpeta-de-fotografías)
4. [Crear tu usuario](#4-crear-tu-usuario)
5. [Convertirte en administrador](#5-convertirte-en-administrador)
6. [Cerrar el registro público](#6-cerrar-el-registro-público)
7. [Copiar las dos claves](#7-copiar-las-dos-claves)
8. [Pegar las claves en Netlify](#8-pegar-las-claves-en-netlify)
9. [Lanzar la web otra vez](#9-lanzar-la-web-otra-vez)
10. [Entrar en el panel](#10-entrar-en-el-panel)
11. [Añadir tu primer producto](#11-añadir-tu-primer-producto)
12. [Si olvidas la contraseña](#12-si-olvidas-la-contraseña)
13. [Problemas más habituales](#13-problemas-más-habituales)

---

## 1. Crear la cuenta gratuita de Supabase

Supabase es el sitio donde se guardan los productos, los textos y las fotos.
El plan gratuito es suficiente.

1. Entra en **https://supabase.com** y pulsa el botón verde **Start your project**.
2. Pulsa **Continue with GitHub** (o crea la cuenta con tu correo).
3. Ya dentro, pulsa el botón verde **New project**.
4. Rellena:
   - **Name**: escribe `juntos-siempre`
   - **Database Password**: pulsa **Generate a password** y, muy importante,
     **cópiala y guárdala** en un sitio seguro. No la vas a necesitar para el
     panel, pero es la llave maestra de la base de datos.
   - **Region**: elige **West EU (Ireland)** o **Central EU (Frankfurt)**.
     Cuanto más cerca de España, más rápido.
5. Pulsa **Create new project**.
6. Espera 1 o 2 minutos. Verás una barra de progreso mientras se prepara.

---

## 2. Crear las tablas (copiar y pegar 4 textos)

Ahora hay que crear los "cajones" donde se guardará todo. Son 4 archivos que ya
vienen preparados en la web, en la carpeta `supabase/migrations`.

**Hay que ejecutarlos en orden: 1, 2, 3 y 4.**

1. En Supabase, mira la **columna de iconos de la izquierda** y pulsa el que
   pone **SQL Editor** (su icono es `>_`).
2. Pulsa **+ New query** (arriba a la izquierda del editor).
3. Abre en tu ordenador el archivo:
   `supabase/migrations/0001_schema.sql`
   Ábrelo con el Bloc de notas (Windows) o TextEdit (Mac).
4. Selecciónalo **todo** (`Ctrl + E` y luego `Ctrl + C`; en Mac `Cmd + A` y `Cmd + C`).
5. Pégalo en el recuadro grande de Supabase (`Ctrl + V` o `Cmd + V`).
6. Pulsa el botón verde **Run** (abajo a la derecha). También vale `Ctrl + Enter`.
7. Abajo tiene que aparecer **Success. No rows returned**. Eso significa que ha
   ido bien.

**Repite exactamente los pasos 2 a 7** con los otros tres archivos, en este orden:

| Orden | Archivo | Para qué sirve |
|-------|---------|----------------|
| 1º | `0001_schema.sql` | Crea las tablas |
| 2º | `0002_rls.sql` | Pone la seguridad |
| 3º | `0003_storage.sql` | Crea la carpeta de fotos |
| 4º | `0004_seed.sql` | Mete los textos y productos actuales de la web |

> Si al ejecutar el 4º ves un aviso de que algo "already exists" (ya existe),
> no pasa nada: significa que esa parte ya estaba hecha.

---

## 3. Comprobar la carpeta de fotografías

El paso anterior ya crea la carpeta sola. Vamos a comprobarlo:

1. En la columna de la izquierda, pulsa **Storage**.
2. Tienes que ver una carpeta llamada **site-media**.

**¿No aparece?** Créala a mano:

1. Pulsa **New bucket**.
2. En **Name of bucket** escribe exactamente: `site-media`
3. Activa el interruptor **Public bucket**.
4. Pulsa **Save**.

---

## 4. Crear tu usuario

1. En la columna de la izquierda, pulsa **Authentication**.
2. Pulsa la pestaña **Users**.
3. Pulsa el botón **Add user** y elige **Create new user**.
4. Rellena:
   - **Email**: tu correo, por ejemplo `juansanchez30895@gmail.com`
   - **Password**: la contraseña con la que entrarás al panel.
     Usa una de al menos 8 caracteres y guárdala bien.
   - Activa la casilla **Auto Confirm User**. Esto es importante: si no la
     marcas, no podrás entrar hasta confirmar el correo.
5. Pulsa **Create user**.

---

## 5. Convertirte en administrador

Tu usuario ya existe, pero todavía no tiene permisos. Vamos a dárselos.

1. Vuelve a **SQL Editor** → **+ New query**.
2. Copia y pega esto, **cambiando el correo por el tuyo**:

```sql
update public.profiles
set role = 'admin', is_active = true
where email = 'juansanchez30895@gmail.com';
```

3. Pulsa **Run**.
4. Abajo tiene que poner **Success**.

**Para comprobar que ha funcionado**, ejecuta esto en otra consulta nueva:

```sql
select email, role, is_active from public.profiles;
```

Debe aparecer tu correo con `admin` al lado.

> **¿Aparece vacío?** Significa que el usuario se creó antes de ejecutar el
> archivo `0001_schema.sql`. Arréglalo ejecutando esto y repitiendo el paso 2:
> ```sql
> insert into public.profiles (id, email, full_name, role, is_active)
> select id, email, split_part(email, '@', 1), 'admin', true
> from auth.users
> on conflict (id) do update set role = 'admin', is_active = true;
> ```

---

## 6. Cerrar el registro público

Para que nadie pueda crearse una cuenta por su cuenta:

1. Columna de la izquierda → **Authentication**.
2. Pulsa **Sign In / Providers** (en algunas versiones se llama **Providers**).
3. Busca **Email** y ábrelo.
4. **Desactiva** el interruptor **Allow new users to sign up**
   (traducido: "permitir que se registren usuarios nuevos").
5. Pulsa **Save**.

A partir de ahora, los usuarios solo se pueden crear desde el panel de Supabase,
como has hecho en el paso 4.

---

## 7. Copiar las dos claves

1. Columna de la izquierda, abajo del todo → **Project Settings** (el engranaje).
2. Pulsa **API Keys** (o **API**, según la versión).
3. Vas a copiar **dos** datos. Pégalos de momento en un Bloc de notas:

   - **Project URL**: es una dirección tipo `https://abcdefghijk.supabase.co`
   - **anon** / **public**: es un texto larguísimo de cientos de letras y números.

> ⚠️ **MUY IMPORTANTE**
> En esa misma pantalla verás otra clave llamada **service_role** con un aviso en
> rojo. **Esa NO se usa nunca.** No la copies, no la pegues en Netlify y no se la
> des a nadie. Con ella se puede borrar toda la tienda.

---

## 8. Pegar las claves en Netlify

1. Entra en **https://app.netlify.com** y abre tu web.
2. Pulsa **Site configuration** (arriba).
3. En el menú de la izquierda, pulsa **Environment variables**.
4. Pulsa **Add a variable** → **Add a single variable**.
5. Crea la primera:
   - **Key**: `VITE_SUPABASE_URL`
   - **Values**: pega la **Project URL** del paso anterior
   - Deja marcado **Same value for all deploy contexts**
   - Pulsa **Create variable**
6. Repite para la segunda:
   - **Key**: `VITE_SUPABASE_ANON_KEY`
   - **Values**: pega la clave **anon / public**
   - Pulsa **Create variable**

Escribe los nombres **exactamente así**, en mayúsculas y con guiones bajos. Si
te falta una letra, no funcionará.

---

## 9. Lanzar la web otra vez

Las claves solo se aplican cuando la web se vuelve a construir.

1. En Netlify, pulsa **Deploys** (arriba).
2. Pulsa el botón **Trigger deploy** (a la derecha).
3. Elige **Clear cache and deploy site**.
4. Espera 1 o 2 minutos hasta que ponga **Published** en verde.

---

## 10. Entrar en el panel

1. Abre tu web y añade `/admin` al final de la dirección:

   ```
   https://tu-web.netlify.app/admin
   ```

2. Escribe el correo y la contraseña del paso 4.
3. Pulsa **Iniciar sesión**.

Ya estás dentro. Verás el menú lateral con: Resumen, Productos, Categorías,
Editar página, Imágenes, Configuración y Cerrar sesión.

> La dirección `/admin` **no aparece en el menú de la web** y le hemos pedido a
> Google que no la muestre en los resultados de búsqueda. Aun así, lo que
> protege de verdad no es que la dirección sea secreta: es que sin usuario y
> contraseña autorizados no se puede cambiar absolutamente nada.

---

## 11. Añadir tu primer producto

1. En el panel, pulsa **Productos** en el menú.
2. Pulsa el botón grande **＋ Añadir producto**.
3. Rellena lo básico:
   - **Nombre**: por ejemplo `Camiseta Essential`
     (la dirección de la web se rellena sola)
   - **Categoría**: elígela de la lista
   - **Precio (€)**: escribe solo el número, por ejemplo `15`
   - **Descripción corta**: la frase que se ve en la tarjeta del producto
4. Baja hasta **Tallas y colores**:
   - Pulsa las tallas que quieras: `S`, `M`, `L`…
     Si necesitas otra distinta, pulsa **＋ Añadir talla**.
   - Pulsa los colores que quieras. Si falta uno, pulsa **＋ Otro color**,
     escribe su nombre y elígelo del selector.
   - Abajo aparece una tabla con cada combinación. Escribe cuántas unidades
     tienes de cada una. Si pones `0`, en la web aparecerá como agotada.
5. Baja hasta **Fotografías**:
   - Arrastra las fotos desde tu ordenador al recuadro,
     o pulsa encima para elegirlas (en el móvil se abre la galería o la cámara).
   - **La primera foto es la principal.** La segunda es la que se ve al pasar el
     ratón por encima. Arrástralas para cambiar el orden.
   - En cada foto puedes elegir a qué color corresponde.
6. Arriba, en **Estado**, elige **Publicado (visible para todos)**.
7. Pulsa el botón negro **Guardar y publicar**.

Aparecerá el mensaje **"Cambios publicados correctamente"** y el producto ya se
ve en la tienda. **No hace falta volver a lanzar nada en Netlify.**

### Cambiar textos e imágenes de la web

1. Pulsa **Editar página** en el menú.
2. Elige la página y pulsa **✏️ Editar visualmente**.
3. Se abre la web tal y como la ven los clientes. Al pasar el ratón por encima
   de un texto aparece un borde y un lápiz: púlsalo y escribe.
4. En las fotos, pulsa encima y elige **Cambiar fotografía**.
5. Cuando termines, pulsa **Guardar y publicar** en la barra de abajo.

---

## 12. Si olvidas la contraseña

1. Entra en `/admin`.
2. Escribe tu correo en el campo de arriba.
3. Pulsa **¿Has olvidado la contraseña?**
4. Te llegará un correo. Pulsa el enlace y escribe la contraseña nueva.

**¿No llega el correo?** El plan gratuito de Supabase envía pocos correos y a
veces tardan. Siempre puedes cambiarla directamente:
Supabase → **Authentication** → **Users** → pulsa los tres puntos `⋯` junto a tu
usuario → **Reset password** (o **Send password recovery**).

---

## 13. Problemas más habituales

### Al entrar en `/admin` pone "Falta un paso de configuración"

Las claves no han llegado a la web. Repasa:
- Que los nombres en Netlify sean exactamente `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY`.
- Que hayas hecho **Clear cache and deploy site** *después* de crearlas (paso 9).

### Pone "El correo o la contraseña no son correctos"

- Revisa que no haya espacios sueltos al principio o al final del correo.
- Comprueba que marcaste **Auto Confirm User** al crear el usuario (paso 4).
  Si no, ve a Supabase → Authentication → Users y confirma el usuario.

### Pone "Esta cuenta no tiene acceso"

Has entrado bien, pero falta darte permisos: repite el **paso 5**.

### Pone "Tu cuenta no tiene permiso para hacer este cambio"

Tu cuenta es **Editor** y estás intentando algo reservado a **Administrador**
(por ejemplo, cambiar permisos de otras personas). Pide a un administrador que
te cambie el permiso en **Configuración**.

### La web sigue igual después de guardar

- Recarga la página con `Ctrl + F5` (Windows) o `Cmd + Shift + R` (Mac).
- Comprueba que el producto esté en **Publicado** y no en **Borrador**.
- Los cambios tardan como mucho **1 minuto** en verse.

### Una foto no se sube

- Debe ser **JPG, PNG o WebP** y pesar menos de **15 MB**.
- Si falla por la conexión, aparece el botón **Reintentar**. Púlsalo.

### Al eliminar una categoría me avisa de que tiene productos

Es a propósito: te deja elegir si quieres moverlos a otra categoría o dejarlos
sin categoría. **Nunca se borra ningún producto** al borrar una categoría.

### He cambiado algo por error

Ve a **Configuración** → **Historial de cambios** y pulsa
**Volver a esta versión** en la línea correspondiente.

---

## Resumen de accesos

| Qué | Dónde |
|-----|-------|
| Panel de gestión | `https://tu-web.netlify.app/admin` |
| Editar la web visualmente | Panel → Editar página → ✏️ Editar visualmente |
| Base de datos y usuarios | https://supabase.com |
| Claves y despliegues | https://app.netlify.com |

**Nunca compartas** la clave `service_role` ni la contraseña de la base de datos.
Para el día a día solo necesitas tu correo y tu contraseña del panel.
