# Anga Security - Frontend

[![Made in Mexico](https://img.shields.io/badge/Made%20in-Mexico-green.svg)](https://angaflow.com)
[![Astro](https://img.shields.io/badge/Astro-5.17-orange.svg)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://reactjs.org)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-orange.svg)](https://pages.cloudflare.com)

Plataforma de auditoría y simulación de seguridad web para sitios protegidos por Cloudflare®.

🌐 **[angaflow.com](https://angaflow.com)** | 📚 [CONTEXT.md](./CONTEXT.md)

---

## 🏗️ Arquitectura del Ecosistema

Este repositorio es parte de un ecosistema de 3 microservicios:

```
┌─────────────────────┐
│ angaflow-security   │  ◄─ Frontend (Este Repo)
│ Astro + React + TS  │
│ Cloudflare Pages    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ angaflow-security-api│  ◄─ Backend API
│ Hono + Workers + AI │
│ api.angaflow.com    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ webhook-router      │  ◄─ Webhook Middleware
│ Cloudflare Worker   │
│ webhooks.anga...    │
└─────────────────────┘
```

**Repositorios relacionados:**
- 🔗 [angaflow-security-api](https://github.com/chirgone/angaflow-security-api) - Backend API con Hono + Workers
- 🔗 [angaflow-webhook-router](https://github.com/chirgone/angaflow-webhook-router) - Router de webhooks de Mercado Pago

---

## 🚀 Características

- ✅ **Auditoría de seguridad**: 38+ controles en 8 categorías
- ✅ **Simulación de ataques**: 75+ ataques reales (XSS, SQLi, DDoS, bots)
- ✅ **Compliance**: PCI DSS, ISO 27001, SOC 2, GDPR, LFPDPPP
- ✅ **Reportes profesionales**: Score A-F + PDF descargable
- ✅ **AI Consultant**: Explicación de vulnerabilidades con Workers AI
- ✅ **Sistema de créditos**: Prepago sin suscripción obligatoria
- ✅ **i18n**: Español (default) + Inglés
- ✅ **SSR + SSG**: Performance optimizado con Astro

---

## 📦 Stack Tecnológico

**Frontend:**
- **Framework:** Astro 5.17.1 (SSR + SSG híbrido)
- **UI:** React 19.2 + Tailwind CSS 4.2
- **Iconos:** Lucide React
- **PDF:** jsPDF para generación de reportes
- **Deployment:** Cloudflare Pages

**Backend:**
- **Database:** Supabase (PostgreSQL + Auth)
- **Pagos:** Mercado Pago (México/LATAM)
- **API:** REST con Hono (ver repo API)

---

## 🛠️ Instalación y Desarrollo

### Prerrequisitos

- Node.js 18+ 
- npm 9+
- Cuenta de Supabase configurada

### Setup

```bash
# Clonar el repositorio
git clone https://github.com/chirgone/angaflow-security.git
cd angaflow-security

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor de desarrollo
npm run dev
```

El sitio estará disponible en `http://localhost:4321`

### Variables de entorno requeridas

```bash
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
PUBLIC_API_URL=https://api.angaflow.com
PUBLIC_MERCADOPAGO_PUBLIC_KEY=tu-mp-public-key
```

---

## 📂 Estructura del Proyecto

```
angaflow-security/
├── src/
│   ├── components/          # Componentes React y Astro
│   │   ├── Dashboard.tsx    # Panel principal del usuario
│   │   ├── AuthForm.tsx     # Login/registro
│   │   ├── CheckoutPage.tsx # Proceso de compra
│   │   ├── AuditReportView.tsx
│   │   ├── ComplianceReportView.tsx
│   │   └── AIChat.tsx       # Consultor IA
│   ├── pages/               # Rutas de la aplicación
│   │   ├── es/              # Páginas en español
│   │   └── en/              # Páginas en inglés
│   ├── layouts/
│   │   └── Layout.astro     # Layout principal
│   ├── lib/
│   │   ├── supabase.ts      # Cliente Supabase
│   │   └── api.ts           # Cliente API
│   ├── i18n/                # Traducciones
│   │   ├── es.json
│   │   └── en.json
│   └── styles/
│       └── global.css       # Estilos globales
├── public/                  # Assets estáticos
├── database/                # SQL schemas
│   └── 001_security_schema.sql
├── CONTEXT.md               # Documentación exhaustiva del proyecto
├── astro.config.mjs
├── tailwind.config.js
└── package.json
```

---

## 🔧 Comandos Disponibles

```bash
npm run dev       # Servidor de desarrollo (localhost:4321)
npm run build     # Build para producción
npm run preview   # Preview del build
npm run astro     # CLI de Astro
```

---

## 🌍 Deployment

El proyecto está configurado para deployment automático en **Cloudflare Pages**.

### Deploy manual

```bash
# Build
npm run build

# Deploy con Wrangler
npx wrangler pages deploy dist
```

### Deploy automático

Conecta tu repositorio a Cloudflare Pages:
1. Framework preset: **Astro**
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Configura las variables de entorno en el dashboard

---

## 📚 Documentación Completa

Para documentación exhaustiva sobre arquitectura, base de datos, flujos de pago, y más, ver:

📖 **[CONTEXT.md](./CONTEXT.md)** - Documento completo del ecosistema

---

## 🔐 Seguridad

- ✅ Autenticación con Supabase (JWT)
- ✅ RLS (Row Level Security) en todas las tablas
- ✅ HMAC validation en webhooks
- ✅ Secrets en Cloudflare (no en código)
- ✅ HTTPS everywhere

---

## 🤝 Contribuir

Este es un proyecto privado. Para reportar issues o sugerencias, contactar a:

📧 [email protected]  
💬 WhatsApp: +52 55 5157 5041

---

## 📄 Licencia

© 2026 ANGA Mexico. Todos los derechos reservados.

**Nota:** Cloudflare® es marca registrada de Cloudflare, Inc. Anga Security no está afiliado, patrocinado ni respaldado por Cloudflare, Inc.

---

## 🎯 Roadmap

- [ ] Tests unitarios y de integración
- [ ] CI/CD con GitHub Actions
- [ ] Trust Badge para sitios verificados
- [ ] Benchmarks de industria
- [ ] Auto-Fix de configuraciones
- [ ] Monitoring con Sentry

---

**Made with ❤️ in Mexico** 🇲🇽
