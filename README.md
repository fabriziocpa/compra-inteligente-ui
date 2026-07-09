# Compra Inteligente

Simulador de créditos vehiculares con cuota balón (curso SI642 - Finanzas).

Permite registrar clientes y vehículos, armar simulaciones de préstamo y ver el
plan de pagos completo con sus indicadores financieros (cuota, cuota balón,
TCEA, TIR y VAN) junto con gráficos de la evolución de la deuda.

Esta aplicación es solo la interfaz web. Los cálculos financieros los hace un
servidor aparte (el "backend"), que ya está publicado en internet, así que no
necesitas instalarlo.

---

## Cómo correr el programa

Si nunca has corrido un proyecto de programación, sigue estos pasos en orden.
Todo lo que dice `así` se escribe en la **terminal** (en Mac se llama
"Terminal", en Windows "PowerShell").

### Paso 1: Instalar Node.js

Node.js es el programa que sabe ejecutar este proyecto.

1. Entra a [nodejs.org](https://nodejs.org) y descarga la versión **LTS**.
   Necesitas la versión 20.9 o superior.
2. Instálalo como cualquier otro programa (siguiente, siguiente, aceptar).
3. Cierra y vuelve a abrir la terminal.
4. Comprueba que quedó instalado escribiendo:

   ```bash
   node --version
   ```

   Debe responder algo como `v20.9.0` o un número mayor. Si dice
   "command not found", reinstala Node.js.

### Paso 2: Descargar el proyecto

Si todavía no tienes la carpeta del proyecto en tu computadora:

```bash
git clone https://github.com/fabriziocpa/compra-inteligente-ui.git
cd compra-inteligente-ui
```

Si ya la tienes, solo abre la terminal dentro de esa carpeta.

### Paso 3: Instalar las dependencias

Esto descarga las librerías que el proyecto necesita. Se hace **una sola vez**
y puede demorar un par de minutos.

```bash
npm install
```

### Paso 4: Configurar la dirección del servidor

El proyecto necesita saber dónde está el backend. Esa dirección se guarda en un
archivo llamado `.env`. Créalo copiando la plantilla:

**Mac / Linux:**

```bash
cp .env.example .env
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

Ahora abre el archivo `.env` con cualquier editor de texto. Vas a ver una línea
que apunta a `localhost`. Reemplázala para que quede exactamente así:

```
API_BASE_URL=https://web-production-a4f31.up.railway.app/api/v1
```

Guarda el archivo. Con eso la app usará el backend que ya está en internet y no
tienes que instalar nada más.

> ¿Y si quiero usar un backend en mi propia computadora? Entonces deja la línea
> original (`http://localhost:8000/api/v1`) y levanta el backend por tu cuenta
> antes de continuar.

### Paso 5: Encender la aplicación

```bash
npm run dev
```

Verás un mensaje parecido a `Ready on http://localhost:3000`. Abre esa
dirección en tu navegador: **http://localhost:3000**

Para apagar la aplicación, vuelve a la terminal y presiona `Ctrl + C`.

### Paso 6: Crear tu usuario

La primera vez la app te va a pedir iniciar sesión. Como todavía no tienes
cuenta, haz clic en **Registrarse**, llena tus datos y entra. Después de eso ya
puedes crear clientes, vehículos y simulaciones.

---

## Problemas frecuentes

**"command not found: npm"**
Node.js no está instalado o no reiniciaste la terminal después de instalarlo.
Repite el Paso 1.

**"Port 3000 is already in use"**
Ya hay algo ocupando ese puerto (probablemente otra copia de la app abierta).
Ciérrala, o corre `npm run dev -- -p 3001` y usa http://localhost:3001.

**La página carga pero no puedo iniciar sesión / todo da error**
Revisa que el archivo `.env` exista y que la línea `API_BASE_URL` esté escrita
tal cual, sin espacios de más. Después de cambiar el `.env` tienes que apagar la
app (`Ctrl + C`) y volver a correr `npm run dev`.

**Cambié algo y ahora nada funciona**
Borra la carpeta `node_modules` y la carpeta `.next`, y vuelve a correr
`npm install`.

---

## Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Enciende la app en modo desarrollo (el que usas normalmente). |
| `npm run build` | Compila la versión optimizada para producción. |
| `npm start` | Corre la versión compilada. Requiere haber hecho `build` antes. |
| `npm run lint` | Revisa que el código cumpla las reglas de estilo. |

---

## Para desarrolladores

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
TanStack Query · react-hook-form + zod · Recharts.

El navegador nunca habla directamente con el backend. Todo pasa por un BFF
(Backend For Frontend) implementado con route handlers de Next.js:

- `app/api/[...path]/route.ts` — proxy genérico hacia el backend, inyecta el
  access token y reintenta con refresh si expiró.
- `app/api/auth/*` — login, register, refresh, logout y me. Guardan los tokens
  en cookies `HttpOnly`, de modo que nunca quedan expuestos a JavaScript.
- `proxy.ts` — protección optimista de rutas: si no hay cookie de sesión,
  redirige a `/login`.

Por eso `API_BASE_URL` **no** lleva el prefijo `NEXT_PUBLIC_`: se lee únicamente
en el servidor.

Toda la matemática financiera (plan de pagos, TCEA, TIR, VAN) vive en el
backend; el frontend no recalcula nada, solo muestra lo que el servidor devuelve.
