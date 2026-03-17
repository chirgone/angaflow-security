import { useState, useEffect, useRef, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { supabase, initSessionTimeout } from '../lib/supabase';
import AIChat from './AIChat';
import {
  getAccount,
  createAccount,
  createCheckout,
  getTransactions,
  startQuickScan,
  getScanHistory,
  getScanReport,
  startAudit,
  getAuditReport,
  getAuditHistory,
  getComplianceHistory,
  AUDIT_TIER_INFO,
  compliancePreCheck,
  runCompliance,
  getComplianceReport,
  compliancePreCheckDirect,
  runComplianceDirect,
  COMPLIANCE_FRAMEWORK_INFO,
  COMPLIANCE_FRAMEWORKS,
  COMPLIANCE_BUNDLE_CREDITS,
  COMPLIANCE_BUNDLE_8_CREDITS,
  startSimulation,
  pollSimulationStatus,
  getSimulationReport,
  getSimulationHistory,
  SIMULATION_CREDIT_COST,
  auditPreCheck,
  simulationPreCheck,
  getSimulationTargets,
} from '../lib/api';
import type { AuditTier, AuditReport, AuditCategoryScore, StartAuditResponse, ComplianceFramework, ComplianceReport, PreCheckResponse, AuditPreCheckResponse, SimulationPreCheckResponse, DiscoveredDomain } from '../lib/api';
import AuditReportView from './AuditReportView';
import ComplianceReportView from './ComplianceReportView';
import SimulationReportView from './SimulationReportView';

// ============================================================
// Error Boundary for Report Views
// ============================================================
interface ReportErrorBoundaryProps {
  children: ReactNode;
  onBack: () => void;
  lang: 'es' | 'en';
}
interface ReportErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}
class ReportErrorBoundary extends Component<ReportErrorBoundaryProps, ReportErrorBoundaryState> {
  constructor(props: ReportErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ReportErrorBoundary caught:', error, info);
    this.setState({ errorInfo: info.componentStack || '' });
  }
  render() {
    if (this.state.hasError) {
      const { lang, onBack } = this.props;
      const msg = lang === 'es'
        ? 'Error al renderizar el reporte. Esto puede deberse a datos incompletos.'
        : 'Error rendering the report. This may be due to incomplete data.';
      return (
        <div className="space-y-4 max-w-3xl mx-auto py-10">
          <div className="rounded-xl p-6" style={{ background: '#1a1025', border: '1px solid #ef444440' }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{'\u26A0\uFE0F'}</span>
              <h3 className="text-lg font-bold" style={{ color: '#ef4444' }}>
                {lang === 'es' ? 'Error en el Reporte' : 'Report Error'}
              </h3>
            </div>
            <p className="text-sm mb-3" style={{ color: '#94a3b8' }}>{msg}</p>
            {this.state.error && (
              <pre className="text-xs p-3 rounded-lg overflow-auto max-h-40 mb-3" style={{ background: '#0a0a0f', color: '#f87171', border: '1px solid #1e293b' }}>
                {this.state.error.message}
                {this.state.errorInfo && '\n\nComponent stack:' + this.state.errorInfo}
              </pre>
            )}
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              style={{ background: '#06b6d415', color: '#06b6d4', border: '1px solid #06b6d430' }}
            >
              {'\u2190'} {lang === 'es' ? 'Volver' : 'Go Back'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  lang: 'es' | 'en';
}

// ============================================================
// Translations
// ============================================================

const t = {
  es: {
    title: 'Dashboard',
    loading: 'Cargando...',
    notLoggedIn: 'No has iniciado sesion',
    loginButton: 'Iniciar Sesion',
    logout: 'Cerrar Sesion',
    backToHome: 'Volver al inicio',
    // Tabs
    tabScan: 'Escaneo de Seguridad',
    tabCredits: 'Creditos y Pagos',
    // Scan tab
    scanTitle: 'Quick Scan',
    scanSubtitle: 'Analiza la seguridad de cualquier dominio en segundos',
    scanPlaceholder: 'ejemplo.com',
    scanButton: 'Escanear Ahora',
    scanning: 'Escaneando...',
    scanningSteps: [
      'Verificando SSL/TLS...',
      'Analizando headers de seguridad...',
      'Consultando registros DNS...',
      'Revisando cookies...',
      'Detectando tecnologias...',
      'Evaluando rendimiento...',
      'Calculando puntuacion...',
    ],
    freeScansLabel: 'Escaneos gratuitos este mes',
    freeScansOf: 'de',
    scoreLabel: 'Puntuacion de Seguridad',
    grade: 'Grado',
    scanDuration: 'Tiempo de escaneo',
    seconds: 'segundos',
    checksPerformed: 'verificaciones realizadas',
    recommendations: 'Recomendaciones',
    scanHistory: 'Historial de Escaneos',
    noHistory: 'Aun no has realizado escaneos',
    viewReport: 'Ver Reporte',
    domain: 'Dominio',
    score: 'Puntaje',
    date: 'Fecha',
    status: 'Estado',
    completed: 'Completado',
    failed: 'Fallido',
    running: 'En progreso',
    // Report view
    backToScan: 'Volver al escaner',
    exportPdf: 'Exportar PDF',
    reportTitle: 'Reporte de Seguridad',
    generatedBy: 'Generado por Anga Security',
    generatedOn: 'Fecha de generacion',
    loadingReport: 'Cargando reporte...',
    reportNotFound: 'No se pudieron cargar los datos del reporte.',
    newScan: 'Nuevo Escaneo',
    // Upsell
    upsellTitle: 'Desbloquea Analisis Completo',
    upsellAudit: 'Plan Starter',
    upsellAuditDesc: 'Analisis profundo con acceso a tu cuenta de Cloudflare: WAF, bot protection, trafico de ataques, y mas.',
    upsellAuditCta: 'Desbloquear por 1,500 creditos',
    upsellSimulation: 'Plan Pro',
    upsellSimulationDesc: '75+ payloads reales: SQLi, XSS, path traversal, y explotacion de APIs. Ve que pasa y que no.',
    upsellSimulationCta: 'Desbloquear por 3,500 creditos',
    upsellManaged: 'Administracion experta de tu dominio',
    upsellManagedDesc: 'Nuestro equipo administra tu cuenta de Cloudflare® por ti: DNS, WAF, Anti-DDoS, CDN, reportes ejecutivos y soporte dedicado.',
    upsellManagedCta: 'Contactar Ventas',
    upsellZoneConnect: 'Conecta tu cuenta de Cloudflare',
    upsellZoneConnectDesc: 'Ingresa tu Zone ID y API Token para un analisis 4x mas profundo con metricas internas de Cloudflare.',
    additionalChecks: 'checks adicionales con auditoria completa',
    moreCategories: 'Categorias que se desbloquean',
    // Credits tab
    creditBalance: 'Balance de Creditos',
    credits: 'creditos',
    buyCredits: 'Comprar Creditos',
    rechargeNow: 'Recargar Ahora',
    firstBonus: 'Tu primera recarga incluye +20% de bonificacion',
    recentTransactions: 'Transacciones Recientes',
    noTransactions: 'No hay transacciones aun',
    transactionTypes: {
      recharge: 'Recarga',
      deduction: 'Uso',
      bonus: 'Bonificacion',
      refund: 'Reembolso',
    },
    packages: {
      starter: { name: 'Starter', credits: '1,500', price: '$1,499' },
      pro: { name: 'Pro', credits: '4,500', price: '$3,299' },
      business: { name: 'Business', credits: '9,000', price: '$5,999' },
      enterprise: { name: 'Enterprise', credits: '16,000', price: '$9,999' },
    },
    scanLimitReached: 'Limite de escaneos gratuitos alcanzado',
    scanLimitMessage: 'Compra creditos para escaneos adicionales o espera al proximo mes.',
    scanPaidInfo: 'Escaneo adicional por',
    scanPaidCredits: 'creditos',
    scanPaidButton: 'Escanear',
    insufficientCredits: 'Creditos insuficientes',
    resetsOn: 'Se renueva el',
    priority: {
      critical: 'Critico',
      high: 'Alto',
      medium: 'Medio',
      low: 'Bajo',
    },
    // PDF
    pdfCategory: 'Categoria',
    pdfCheck: 'Verificacion',
    pdfResult: 'Resultado',
    pdfPoints: 'Puntos',
    pdfPriority: 'Prioridad',
    pdfDescription: 'Descripcion',
    pdfDisclaimer: 'Este reporte fue generado automaticamente por Anga Security (angaflow.com). Anga Security es un servicio independiente especializado en seguridad y administracion de plataformas Cloudflare. No es un producto ni servicio oficial de Cloudflare, Inc.',
    // Audit tab
    tabAudit: 'Auditoría de Seguridad',
    auditTitle: 'Auditoria de Seguridad',
    auditSubtitle: 'Analisis profundo de tu configuracion de Cloudflare con Zone ID y API Token',
    auditZoneId: 'Zone ID',
    auditZoneIdPlaceholder: 'ID de la zona (32 caracteres hex)',
    auditApiToken: 'API Token',
    auditApiTokenPlaceholder: 'Token con permisos Zone:Read, Analytics:Read, Firewall:Read, DNS:Read',
    auditTokenHint: 'Tu token NUNCA se almacena. Solo se usa durante el escaneo.',
    auditHowTo: 'Como obtener estos datos?',
    auditHowToZoneTitle: 'Zone ID',
    auditHowToZoneStep1: 'Ve a',
    auditHowToZoneStep2: 'y selecciona tu dominio',
    auditHowToZoneStep3: 'En la pagina Overview, busca "Zone ID" en la columna derecha',
    auditHowToZoneStep4: 'Copia el valor (32 caracteres hexadecimales)',
    auditHowToTokenTitle: 'API Token',
    auditHowToTokenStep1: 'Ve a',
    auditHowToTokenStep2: 'Clic en "Create Token"',
    auditHowToTokenStep3: 'Usa la plantilla "Read all resources" o crea uno personalizado',
    auditHowToTokenStep4: 'Copia el token generado (solo se muestra una vez)',
    auditHowToPermsTitle: 'Permisos requeridos',
    auditHowToPermsBasic: 'Basic / Pro / Complete',
    auditHowToPermsAdvanced: 'Solo Pro / Complete',
    auditHowToPerms: 'Permisos requeridos: Zone:Read, Analytics:Read, Firewall Services:Read, DNS:Read. Para auditorias Pro/Complete tambien necesitas: Logs:Read.',
    auditSelectTier: 'Selecciona el nivel de auditoria',
    auditBasic: 'Basic',
    auditBasicDesc: '5 colectores REST, 5 categorias de scoring',
    auditPro: 'Pro',
    auditProDesc: '12 colectores (REST+GraphQL), 8 categorias completas',
    auditComplete: 'Complete',
    auditCompleteDesc: '17 colectores con inteligencia L7/bots profunda',
    auditStart: 'Iniciar Auditoria',
    auditRunning: 'Auditando...',
    auditRunningSteps: [
      'Verificando credenciales...',
      'Obteniendo informacion de zona...',
      'Analizando configuracion SSL/TLS...',
      'Revisando reglas WAF...',
      'Consultando registros DNS...',
      'Analizando eventos de firewall...',
      'Evaluando cache y rendimiento...',
      'Detectando trafico de bots...',
      'Generando recomendaciones...',
      'Calculando puntuacion final...',
    ],
    auditCollectors: 'colectores',
    auditCategories: 'categorias',
    auditCreditsLabel: 'creditos',
    auditCfPlan: 'Plan Cloudflare',
    auditAnalysisPeriod: 'Periodo de analisis',
    auditCollectorsRun: 'Colectores ejecutados',
    auditCollectorsSkipped: 'Colectores omitidos',
    auditWarnings: 'Advertencias',
    auditFindings: 'Hallazgos',
    auditHistory: 'Historial de Auditorias',
    auditNoHistory: 'Aun no has realizado auditorias',
    auditBackToForm: 'Nueva Auditoria',
    auditPlanLimited: 'Limitado por plan',
    auditInsufficient: 'Creditos insuficientes para esta auditoria',
    auditProduct: 'Producto',
    auditMinPlan: 'Plan minimo',
    // Compliance tab
    tabCompliance: 'Cumplimiento',
    complianceTitle: 'Analisis de Cumplimiento Regulatorio',
    complianceSubtitle: 'Mapea tu configuracion de Cloudflare a marcos regulatorios',
    complianceSelectAudit: 'Selecciona una auditoria fuente (Pro o Complete)',
    complianceNoAudits: 'No tienes auditorias Pro o Complete. Ejecuta una primero.',
    complianceSelectFrameworks: 'Selecciona marcos regulatorios',
    complianceBundle: 'Bundle Clásico (5 marcos) — 2,500 cr',
    complianceBundleSave: 'Ahorra 1,200 cr',
    complianceBundle8: 'Bundle Pro (8 marcos) — 3,800 cr',
    complianceBundle8Save: 'Ahorra 2,000 cr',
    compliancePreCheck: 'Verificar Permisos',
    compliancePreChecking: 'Verificando...',
    complianceRun: 'Ejecutar Compliance',
    complianceRunning: 'Analizando cumplimiento...',
    complianceRunSteps: [
      'Verificando permisos del token...',
      'Recopilando datos adicionales de CF...',
      'Evaluando controles PCI DSS...',
      'Evaluando controles ISO 27001...',
      'Evaluando controles SOC 2...',
      'Evaluando controles LFPDPPP...',
      'Evaluando controles GDPR...',
      'Calculando puntuaciones...',
      'Generando resumen ejecutivo...',
    ],
    complianceHistory: 'Historial de Compliance',
    complianceNoHistory: 'Aun no has ejecutado analisis de compliance',
    complianceBackToForm: 'Nuevo Analisis',
    complianceCost: 'creditos',
    complianceStale: 'Auditoria de mas de 7 dias',
    complianceFresh: 'Auditoria reciente',
    compliancePermsOk: 'Todos los permisos disponibles',
    compliancePermsMissing: 'permisos faltantes',
    complianceControlsLimited: 'controles limitados',
    complianceAccountId: 'Account ID de Cloudflare',
    complianceAccountIdHint: 'Lo encuentras en dash.cloudflare.com en la barra lateral derecha',
    complianceTokenHint: 'Usa el mismo token de tu auditoria. Para cobertura completa, agrega: SSL and Certificates:Read, Logs:Read, Page Shield:Read, Health Checks:Read, Account Access: Audit Logs, Notifications:Read',
    complianceInsufficient: 'Creditos insuficientes',
    // Token permissions panel
    permsPanelTitle: 'Permisos requeridos del token',
    permsPanelDesc: 'Tu token de API necesita estos permisos para cobertura completa. Los permisos faltantes reduciran el numero de controles evaluados.',
    permsPanelZoneScope: 'Alcance de Zona',
    permsPanelAccountScope: 'Alcance de Cuenta',
    permsPanelCreateLink: 'Crear o editar token en Cloudflare',
    permsMissingTitle: 'Permisos faltantes detectados',
    permsMissingDesc: 'Los siguientes permisos no estan disponibles en tu token. Esto afectara {count} controles que seran marcados como "Permisos insuficientes".',
    permsMissingAction: 'Para agregar permisos: ve a dash.cloudflare.com > Profile > API Tokens > edita tu token y agrega los permisos listados arriba.',
    permsAvailableLabel: 'Disponible',
    permsMissingLabel: 'Faltante',
    permsControlsAffected: 'controles afectados',
    // Compliance history enhanced
    complianceFrameworksCol: 'Marcos',
    complianceCreditsCol: 'Creditos',
    complianceCompare: 'Comparar',
    complianceCompareBtn: 'Comparar seleccionados',
    complianceCompareTitle: 'Comparacion de Compliance',
    complianceCompareSelect: 'Selecciona 2 reportes para comparar',
    complianceCompareOverall: 'General',
    complianceCompareDelta: 'Cambio',
    complianceCompareClose: 'Cerrar comparacion',
    complianceCompareNoData: 'No hay datos de frameworks para comparar',
    // Simulation tab
    tabSimulation: 'Simulador de Ataques',
    simTitle: 'Simulador de Ataques',
    simSubtitle: 'Ejecuta 75+ ataques simulados contra tu dominio para evaluar tus defensas Cloudflare',
    simZoneId: 'Zone ID',
    simZoneIdPlaceholder: 'ID de la zona (32 caracteres hex)',
    simApiToken: 'API Token',
    simApiTokenPlaceholder: 'Token con permisos Zone:Read, Firewall Services:Read',
    simAccountId: 'Account ID de Cloudflare',
    simAccountIdPlaceholder: 'ID de cuenta Cloudflare',
    simSelectAll: 'Seleccionar todos',
    simDeselectAll: 'Deseleccionar todos',
    simCost: '3,500 creditos',
    simStart: 'Iniciar Simulacion',
    simRunning: 'Simulando ataques...',
    simRunningSteps: [
      'Recopilando inteligencia de seguridad...',
      'Analizando configuracion WAF...',
      'Escaneando reglas custom...',
      'Evaluando rate limits...',
      'Ejecutando pruebas de WAF bypass...',
      'Probando evasion de bots...',
      'Verificando SSL/TLS...',
      'Testando cache poisoning...',
      'Analizando seguridad API...',
      'Correlacionando eventos de firewall...',
      'Generando hallazgos...',
      'Calculando puntuacion final...',
    ],
    simHistory: 'Historial de Simulaciones',
    simNoHistory: 'Aun no has ejecutado simulaciones de ataque',
    simBackToForm: 'Nueva Simulacion',
    simInsufficient: 'Creditos insuficientes para la simulacion (3,500 requeridos)',
    simViewReport: 'Ver Reporte',
    simTests: 'pruebas',
    simBypassed: 'bypassed',
    simFindings: 'hallazgos',
    simRisk: 'Riesgo',
    // Services tab
    tabServices: 'Servicios Pro',
    servicesTitle: 'Servicios Profesionales',
    servicesSubtitle: 'Consultoria y administracion experta de Cloudflare para tu empresa',
    servicesCtaWhatsApp: 'Contactar por WhatsApp',
    servicesCtaQuote: 'Solicitar Cotizacion',
    servicesFormTitle: 'Listo para empezar?',
    servicesFormSubtitle: 'Completa el formulario y te contactamos en menos de 24 horas.',
    servicesFormName: 'Nombre completo',
    servicesFormEmail: 'Email',
    servicesFormCompany: 'Empresa (opcional)',
    servicesFormService: 'Servicio de interes',
    servicesFormServicePlaceholder: 'Selecciona un servicio',
    servicesFormMessage: 'Mensaje',
    servicesFormMessagePlaceholder: 'Cuentanos sobre tu empresa, dominio y que necesitas mejorar...',
    servicesFormSubmit: 'Enviar solicitud',
    servicesFormSending: 'Enviando...',
    servicesFormSuccess: 'Gracias! Te contactaremos pronto.',
    servicesFormError: 'Hubo un error. Por favor intenta de nuevo.',
  },
  en: {
    title: 'Dashboard',
    loading: 'Loading...',
    notLoggedIn: 'Not signed in',
    loginButton: 'Sign In',
    logout: 'Sign Out',
    backToHome: 'Back to home',
    tabScan: 'Security Scan',
    tabCredits: 'Credits & Billing',
    scanTitle: 'Quick Scan',
    scanSubtitle: 'Analyze the security of any domain in seconds',
    scanPlaceholder: 'example.com',
    scanButton: 'Scan Now',
    scanning: 'Scanning...',
    scanningSteps: [
      'Checking SSL/TLS...',
      'Analyzing security headers...',
      'Querying DNS records...',
      'Reviewing cookies...',
      'Detecting technologies...',
      'Evaluating performance...',
      'Calculating score...',
    ],
    freeScansLabel: 'Free scans this month',
    freeScansOf: 'of',
    scoreLabel: 'Security Score',
    grade: 'Grade',
    scanDuration: 'Scan duration',
    seconds: 'seconds',
    checksPerformed: 'checks performed',
    recommendations: 'Recommendations',
    scanHistory: 'Scan History',
    noHistory: 'No scans performed yet',
    viewReport: 'View Report',
    domain: 'Domain',
    score: 'Score',
    date: 'Date',
    status: 'Status',
    completed: 'Completed',
    failed: 'Failed',
    running: 'Running',
    // Report view
    backToScan: 'Back to scanner',
    exportPdf: 'Export PDF',
    reportTitle: 'Security Report',
    generatedBy: 'Generated by Anga Security',
    generatedOn: 'Generation date',
    loadingReport: 'Loading report...',
    reportNotFound: 'Could not load report data.',
    newScan: 'New Scan',
    // Upsell
    upsellTitle: 'Unlock Full Analysis',
    upsellAudit: 'Starter Plan',
    upsellAuditDesc: 'Deep analysis with Cloudflare account access: WAF, bot protection, attack traffic, and more.',
    upsellAuditCta: 'Unlock for 1,500 credits',
    upsellSimulation: 'Pro Plan',
    upsellSimulationDesc: '75+ real payloads: SQLi, XSS, path traversal, and API exploitation. See what passes and what gets blocked.',
    upsellSimulationCta: 'Unlock for 3,500 credits',
    upsellManaged: 'Expert management for your domain',
    upsellManagedDesc: 'Our team manages your Cloudflare® account for you: DNS, WAF, Anti-DDoS, CDN, executive reports and dedicated support.',
    upsellManagedCta: 'Contact Sales',
    upsellZoneConnect: 'Connect your Cloudflare account',
    upsellZoneConnectDesc: 'Enter your Zone ID and API Token for 4x deeper analysis with internal Cloudflare metrics.',
    additionalChecks: 'additional checks with full audit',
    moreCategories: 'Categories unlocked',
    creditBalance: 'Credit Balance',
    credits: 'credits',
    buyCredits: 'Buy Credits',
    rechargeNow: 'Recharge Now',
    firstBonus: 'Your first reload includes +20% bonus',
    recentTransactions: 'Recent Transactions',
    noTransactions: 'No transactions yet',
    transactionTypes: {
      recharge: 'Recharge',
      deduction: 'Usage',
      bonus: 'Bonus',
      refund: 'Refund',
    },
    packages: {
      starter: { name: 'Starter', credits: '1,500', price: '$1,499' },
      pro: { name: 'Pro', credits: '4,500', price: '$3,299' },
      business: { name: 'Business', credits: '9,000', price: '$5,999' },
      enterprise: { name: 'Enterprise', credits: '16,000', price: '$9,999' },
    },
    scanLimitReached: 'Free scan limit reached',
    scanLimitMessage: 'Purchase credits for additional scans or wait until next month.',
    scanPaidInfo: 'Additional scan for',
    scanPaidCredits: 'credits',
    scanPaidButton: 'Scan',
    insufficientCredits: 'Insufficient credits',
    resetsOn: 'Resets on',
    priority: {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    },
    // PDF
    pdfCategory: 'Category',
    pdfCheck: 'Check',
    pdfResult: 'Result',
    pdfPoints: 'Points',
    pdfPriority: 'Priority',
    pdfDescription: 'Description',
    pdfDisclaimer: 'This report was automatically generated by Anga Security (angaflow.com). Anga Security is an independent service specializing in security and management of Cloudflare platforms. It is not an official Cloudflare, Inc. product or service.',
    // Audit tab
    tabAudit: 'Security Audit',
    auditTitle: 'Security Audit',
    auditSubtitle: 'Deep analysis of your Cloudflare configuration using Zone ID and API Token',
    auditZoneId: 'Zone ID',
    auditZoneIdPlaceholder: 'Zone ID (32 hex characters)',
    auditApiToken: 'API Token',
    auditApiTokenPlaceholder: 'Token with Zone:Read, Analytics:Read, Firewall:Read, DNS:Read permissions',
    auditTokenHint: 'Your token is NEVER stored. It is only used during the scan.',
    auditHowTo: 'How to get this info?',
    auditHowToZoneTitle: 'Zone ID',
    auditHowToZoneStep1: 'Go to',
    auditHowToZoneStep2: 'and select your domain',
    auditHowToZoneStep3: 'On the Overview page, look for "Zone ID" in the right column',
    auditHowToZoneStep4: 'Copy the value (32 hex characters)',
    auditHowToTokenTitle: 'API Token',
    auditHowToTokenStep1: 'Go to',
    auditHowToTokenStep2: 'Click "Create Token"',
    auditHowToTokenStep3: 'Use the "Read all resources" template or create a custom one',
    auditHowToTokenStep4: 'Copy the generated token (shown only once)',
    auditHowToPermsTitle: 'Required permissions',
    auditHowToPermsBasic: 'Basic / Pro / Complete',
    auditHowToPermsAdvanced: 'Pro / Complete only',
    auditHowToPerms: 'Required permissions: Zone:Read, Analytics:Read, Firewall Services:Read, DNS:Read. For Pro/Complete audits you also need: Logs:Read.',
    auditSelectTier: 'Select audit level',
    auditBasic: 'Basic',
    auditBasicDesc: '5 REST collectors, 5 scoring categories',
    auditPro: 'Pro',
    auditProDesc: '12 collectors (REST+GraphQL), all 8 categories',
    auditComplete: 'Complete',
    auditCompleteDesc: '17 collectors with deep L7/bot intelligence',
    auditStart: 'Start Audit',
    auditRunning: 'Auditing...',
    auditRunningSteps: [
      'Verifying credentials...',
      'Fetching zone info...',
      'Analyzing SSL/TLS configuration...',
      'Reviewing WAF rules...',
      'Querying DNS records...',
      'Analyzing firewall events...',
      'Evaluating cache and performance...',
      'Detecting bot traffic...',
      'Generating recommendations...',
      'Calculating final score...',
    ],
    auditCollectors: 'collectors',
    auditCategories: 'categories',
    auditCreditsLabel: 'credits',
    auditCfPlan: 'Cloudflare Plan',
    auditAnalysisPeriod: 'Analysis period',
    auditCollectorsRun: 'Collectors run',
    auditCollectorsSkipped: 'Collectors skipped',
    auditWarnings: 'Warnings',
    auditFindings: 'Findings',
    auditHistory: 'Audit History',
    auditNoHistory: 'No audits performed yet',
    auditBackToForm: 'New Audit',
    auditPlanLimited: 'Plan limited',
    auditInsufficient: 'Insufficient credits for this audit',
    auditProduct: 'Product',
    auditMinPlan: 'Min. plan',
    // Compliance tab
    tabCompliance: 'Compliance',
    complianceTitle: 'Regulatory Compliance Analysis',
    complianceSubtitle: 'Map your Cloudflare configuration to regulatory frameworks',
    complianceSelectAudit: 'Select a source audit (Pro or Complete)',
    complianceNoAudits: 'No Pro or Complete audits found. Run one first.',
    complianceSelectFrameworks: 'Select regulatory frameworks',
    complianceBundle: 'Classic Bundle (5 frameworks) — 2,500 cr',
    complianceBundleSave: 'Save 1,200 cr',
    complianceBundle8: 'Pro Bundle (8 frameworks) — 3,800 cr',
    complianceBundle8Save: 'Save 2,000 cr',
    compliancePreCheck: 'Verify Permissions',
    compliancePreChecking: 'Verifying...',
    complianceRun: 'Run Compliance',
    complianceRunning: 'Analyzing compliance...',
    complianceRunSteps: [
      'Verifying token permissions...',
      'Collecting additional CF data...',
      'Evaluating PCI DSS controls...',
      'Evaluating ISO 27001 controls...',
      'Evaluating SOC 2 controls...',
      'Evaluating LFPDPPP controls...',
      'Evaluating GDPR controls...',
      'Calculating scores...',
      'Generating executive summary...',
    ],
    complianceHistory: 'Compliance History',
    complianceNoHistory: 'No compliance analyses yet',
    complianceBackToForm: 'New Analysis',
    complianceCost: 'credits',
    complianceStale: 'Audit older than 7 days',
    complianceFresh: 'Recent audit',
    compliancePermsOk: 'All permissions available',
    compliancePermsMissing: 'missing permissions',
    complianceControlsLimited: 'controls limited',
    complianceAccountId: 'Cloudflare Account ID',
    complianceAccountIdHint: 'Found at dash.cloudflare.com in the right sidebar',
    complianceTokenHint: 'Use the same token from your audit. For full coverage, add: SSL and Certificates:Read, Logs:Read, Page Shield:Read, Health Checks:Read, Account Access: Audit Logs, Notifications:Read',
    complianceInsufficient: 'Insufficient credits',
    // Token permissions panel
    permsPanelTitle: 'Required token permissions',
    permsPanelDesc: 'Your API token needs these permissions for full coverage. Missing permissions will reduce the number of evaluated controls.',
    permsPanelZoneScope: 'Zone Scope',
    permsPanelAccountScope: 'Account Scope',
    permsPanelCreateLink: 'Create or edit token on Cloudflare',
    permsMissingTitle: 'Missing permissions detected',
    permsMissingDesc: 'The following permissions are not available on your token. This will affect {count} controls that will be marked as "Insufficient permissions".',
    permsMissingAction: 'To add permissions: go to dash.cloudflare.com > Profile > API Tokens > edit your token and add the permissions listed above.',
    permsAvailableLabel: 'Available',
    permsMissingLabel: 'Missing',
    permsControlsAffected: 'controls affected',
    // Compliance history enhanced
    complianceFrameworksCol: 'Frameworks',
    complianceCreditsCol: 'Credits',
    complianceCompare: 'Compare',
    complianceCompareBtn: 'Compare selected',
    complianceCompareTitle: 'Compliance Comparison',
    complianceCompareSelect: 'Select 2 reports to compare',
    complianceCompareOverall: 'Overall',
    complianceCompareDelta: 'Change',
    complianceCompareClose: 'Close comparison',
    complianceCompareNoData: 'No framework data to compare',
    // Simulation tab
    tabSimulation: 'Attack Simulator',
    simTitle: 'Attack Simulator',
    simSubtitle: 'Run 75+ simulated attacks against your domain to evaluate your Cloudflare defenses',
    simZoneId: 'Zone ID',
    simZoneIdPlaceholder: 'Zone ID (32 hex characters)',
    simApiToken: 'API Token',
    simApiTokenPlaceholder: 'Token with Zone:Read, Firewall Services:Read permissions',
    simAccountId: 'Cloudflare Account ID',
    simAccountIdPlaceholder: 'Cloudflare Account ID',
    simSelectAll: 'Select all',
    simDeselectAll: 'Deselect all',
    simCost: '3,500 credits',
    simStart: 'Start Simulation',
    simRunning: 'Simulating attacks...',
    simRunningSteps: [
      'Gathering security intelligence...',
      'Analyzing WAF configuration...',
      'Scanning custom rules...',
      'Evaluating rate limits...',
      'Running WAF bypass tests...',
      'Testing bot evasion...',
      'Checking SSL/TLS...',
      'Testing cache poisoning...',
      'Analyzing API security...',
      'Correlating firewall events...',
      'Generating findings...',
      'Calculating final score...',
    ],
    simHistory: 'Simulation History',
    simNoHistory: 'You have not run any attack simulations yet',
    simBackToForm: 'New Simulation',
    simInsufficient: 'Insufficient credits for simulation (3,500 required)',
    simViewReport: 'View Report',
    simTests: 'tests',
    simBypassed: 'bypassed',
    simFindings: 'findings',
    simRisk: 'Risk',
    // Services tab
    tabServices: 'Pro Services',
    servicesTitle: 'Professional Services',
    servicesSubtitle: 'Expert Cloudflare consulting and management for your business',
    servicesCtaWhatsApp: 'Contact via WhatsApp',
    servicesCtaQuote: 'Request a Quote',
    servicesFormTitle: 'Ready to get started?',
    servicesFormSubtitle: 'Fill out the form and we will contact you within 24 hours.',
    servicesFormName: 'Full name',
    servicesFormEmail: 'Email',
    servicesFormCompany: 'Company (optional)',
    servicesFormService: 'Service of interest',
    servicesFormServicePlaceholder: 'Select a service',
    servicesFormMessage: 'Message',
    servicesFormMessagePlaceholder: 'Tell us about your company, domain, and what you need to improve...',
    servicesFormSubmit: 'Submit request',
    servicesFormSending: 'Sending...',
    servicesFormSuccess: 'Thank you! We will contact you soon.',
    servicesFormError: 'There was an error. Please try again.',
  },
};

// ============================================================
// Services Data (separate from translations for cleaner typing)
// ============================================================

const SERVICES_DATA = {
  es: [
    { id: 'quick_call', name: 'Quick Call', duration: '30 min', price: '$1,499 MXN', color: '#06b6d4', icon: '\uD83D\uDCDE', description: 'Sesion de 30 min para diagnosticar tu situacion de seguridad en Cloudflare y recomendarte los siguientes pasos. Ideal para arrancar o resolver una duda urgente.' },
    { id: 'config_review', name: 'Config Review', duration: '60 min', price: '$2,999 MXN', color: '#3b82f6', icon: '\uD83D\uDD0D', description: 'Revision experta de tu configuracion de Cloudflare: WAF, DNS, SSL/TLS, cache y headers. Entregamos un reporte con hallazgos y plan de accion.' },
    { id: 'workshop', name: 'Security Workshop', duration: '2 hrs', price: '$4,999 MXN', color: '#8b5cf6', icon: '\uD83C\uDF93', description: 'Taller practico de 2 horas para tu equipo tecnico. Cubrimos hardening de Cloudflare, mejores practicas y simulamos ataques en vivo.' },
    { id: 'advisor', name: 'Asesor Mensual', duration: '4 hrs/mes', price: '$9,999 MXN', color: '#f59e0b', icon: '\uD83D\uDC65', description: 'Tu experto de seguridad Cloudflare de confianza. 4 horas al mes para monitorear, optimizar, responder incidentes y mantener tu postura actualizada.' },
    { id: 'managed', name: 'Servicios Administrados', duration: 'Plan personalizado', price: 'Cotizar', color: '#22c55e', icon: '\u2699\uFE0F', description: 'Administramos tu cuenta de Cloudflare por ti: DNS, WAF, reglas custom, reportes ejecutivos y soporte dedicado 24/7. Plan personalizado a tu empresa.' },
  ],
  en: [
    { id: 'quick_call', name: 'Quick Call', duration: '30 min', price: '$1,499 MXN', color: '#06b6d4', icon: '\uD83D\uDCDE', description: '30-min session to diagnose your Cloudflare security posture and recommend next steps. Ideal for getting started or resolving urgent questions.' },
    { id: 'config_review', name: 'Config Review', duration: '60 min', price: '$2,999 MXN', color: '#3b82f6', icon: '\uD83D\uDD0D', description: 'Expert review of your Cloudflare setup: WAF, DNS, SSL/TLS, cache, and headers. Delivered as a findings report with action plan.' },
    { id: 'workshop', name: 'Security Workshop', duration: '2 hrs', price: '$4,999 MXN', color: '#8b5cf6', icon: '\uD83C\uDF93', description: '2-hour hands-on workshop for your tech team. We cover Cloudflare hardening, best practices, and live attack simulations.' },
    { id: 'advisor', name: 'Monthly Advisor', duration: '4 hrs/month', price: '$9,999 MXN', color: '#f59e0b', icon: '\uD83D\uDC65', description: 'Your trusted Cloudflare security expert. 4 hours/month to monitor, optimize, respond to incidents, and keep your posture up to date.' },
    { id: 'managed', name: 'Managed Services', duration: 'Custom plan', price: 'Get Quote', color: '#22c55e', icon: '\u2699\uFE0F', description: 'We manage your entire Cloudflare account for you: DNS, WAF, custom rules, executive reports, and dedicated 24/7 support. Custom plan for your business.' },
  ],
};

// ============================================================
// Score Gauge SVG Component
// ============================================================

function ScoreGauge({ score, grade, size = 180 }: { score: number; grade: string; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const fillPercent = score / 100;
  const dashOffset = circumference * (1 - fillPercent);
  const cx = size / 2;
  const cy = size / 2;

  const gradeColor =
    score >= 90 ? '#22c55e' :
    score >= 70 ? '#06b6d4' :
    score >= 50 ? '#f59e0b' :
    score >= 30 ? '#f97316' : '#ef4444';

  return (
    <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke="#1e293b"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
        fill="none"
        stroke={gradeColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
      />
      <text x={cx} y={cy - 15} textAnchor="middle" fill="#f8fafc" fontSize="36" fontWeight="700">
        {score}
      </text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill={gradeColor} fontSize="20" fontWeight="600">
        {grade}
      </text>
    </svg>
  );
}

// ============================================================
// Category Card Component
// ============================================================

function CategoryCard({ cat, lang }: { cat: any; lang: string }) {
  const [expanded, setExpanded] = useState(false);
  const gradeColor =
    cat.score >= 90 ? '#22c55e' :
    cat.score >= 70 ? '#06b6d4' :
    cat.score >= 50 ? '#f59e0b' :
    cat.score >= 30 ? '#f97316' : '#ef4444';

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ background: '#111827', border: `1px solid ${expanded ? gradeColor + '40' : '#1e293b'}` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: gradeColor + '20', color: gradeColor }}
          >
            {cat.grade}
          </div>
          <div>
            <h4 className="font-medium text-white text-sm">{cat.label}</h4>
            <p className="text-xs" style={{ color: '#64748b' }}>{cat.checks.length} checks</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold" style={{ color: gradeColor }}>{cat.score}</span>
          <span className="text-xs" style={{ color: '#64748b' }}>/100</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: '1px solid #1e293b' }}>
          <div className="pt-3 space-y-2">
            {cat.checks.map((check: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex-shrink-0">
                  {check.status === 'pass' ? '\u2713' : check.status === 'fail' ? '\u2717' : check.status === 'warn' ? '!' : 'i'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: check.status === 'pass' ? '#22c55e' : check.status === 'fail' ? '#ef4444' : check.status === 'warn' ? '#f59e0b' : '#94a3b8' }}>
                      {check.name}
                    </span>
                    <span className="text-xs font-mono" style={{ color: '#64748b' }}>
                      {check.earnedPoints}/{check.maxPoints}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: '#64748b' }}>{check.value}</p>
                </div>
              </div>
            ))}
          </div>
          {cat.additionalChecksInAudit > 0 && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: '#06b6d4' + '10', border: '1px dashed #06b6d4' + '30' }}>
              <p className="text-xs" style={{ color: '#06b6d4' }}>
                +{cat.additionalChecksInAudit} {lang === 'es' ? 'checks adicionales con auditoria completa' : 'additional checks with full audit'}
              </p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>{cat.auditBenefitHint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tooltip Component for Framework Info
// ============================================================

function FrameworkTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span
      className="relative inline-flex items-center ml-1"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setVisible(!visible); }}
    >
      <span
        className="cursor-help text-xs font-bold"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#1e293b',
          color: '#64748b',
          border: '1px solid #334155',
        }}
      >
        i
      </span>
      {visible && (
        <span
          className="absolute z-50 px-3 py-2 text-xs rounded-lg shadow-lg"
          style={{
            left: '50%',
            bottom: '100%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            minWidth: 200,
            maxWidth: 280,
            background: '#0f172a',
            color: '#e2e8f0',
            border: '1px solid #334155',
            whiteSpace: 'normal',
            lineHeight: 1.4,
          }}
        >
          {text}
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '100%',
              transform: 'translateX(-50%)',
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #334155',
            }}
          />
        </span>
      )}
    </span>
  );
}

// ============================================================
// PDF Export Helper
// ============================================================

function exportReportPdf(reportData: any, lang: 'es' | 'en') {
  const strings = t[lang];
  const r = reportData;
  const totalChecks = r.categories.reduce((sum: number, cat: any) => sum + cat.checks.length, 0);
  const dateStr = new Date().toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const gradeColor = (score: number) =>
    score >= 90 ? '#22c55e' :
    score >= 70 ? '#06b6d4' :
    score >= 50 ? '#f59e0b' :
    score >= 30 ? '#f97316' : '#ef4444';

  const priorityColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#f59e0b',
    low: '#94a3b8',
  };

  const statusIcon = (s: string) =>
    s === 'pass' ? '\u2713 PASS' : s === 'fail' ? '\u2717 FAIL' : s === 'warn' ? '! WARN' : 'i INFO';

  const statusColor = (s: string) =>
    s === 'pass' ? '#22c55e' : s === 'fail' ? '#ef4444' : s === 'warn' ? '#f59e0b' : '#94a3b8';

  // Build categories HTML
  let categoriesHtml = '';
  r.categories.forEach((cat: any) => {
    let checksHtml = '';
    cat.checks.forEach((check: any) => {
      checksHtml += `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;">${check.name}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${check.value}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="color:${statusColor(check.status)};font-weight:600;font-size:12px;">${statusIcon(check.status)}</span>
          </td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:12px;font-family:monospace;">${check.earnedPoints}/${check.maxPoints}</td>
        </tr>`;
    });

    categoriesHtml += `
      <div style="margin-bottom:24px;break-inside:avoid;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
          <div style="width:36px;height:36px;border-radius:8px;background:${gradeColor(cat.score)}20;color:${gradeColor(cat.score)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;">${cat.grade}</div>
          <div>
            <h3 style="margin:0;font-size:15px;color:#0f172a;">${cat.label}</h3>
            <span style="font-size:12px;color:#64748b;">${cat.checks.length} checks &middot; Score: ${cat.score}/100 &middot; Weight: ${Math.round(cat.weight * 100)}%</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.pdfCheck}</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.pdfResult}</th>
              <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.status}</th>
              <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.pdfPoints}</th>
            </tr>
          </thead>
          <tbody>${checksHtml}</tbody>
        </table>
      </div>`;
  });

  // Build recommendations HTML
  let recsHtml = '';
  r.recommendations.forEach((rec: any) => {
    const color = priorityColors[rec.priority] || '#94a3b8';
    recsHtml += `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">
          <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}20;color:${color};">
            ${(strings.priority as any)[rec.priority] || rec.priority}
          </span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:500;color:#0f172a;">${rec.title}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${rec.description}</td>
      </tr>`;
  });

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${strings.reportTitle} - ${r.domain} - Anga Security</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
      @page { margin: 15mm; size: A4; }
    }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <!-- Print bar -->
  <div class="no-print" style="position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 0 12px 0;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:13px;color:#64748b;">
        ${lang === 'es'
          ? '&#128196; Para descargar: haz clic en <strong>Guardar PDF</strong> &rarr; en el di&aacute;logo selecciona <em>"Guardar como PDF"</em>'
          : '&#128196; To download: click <strong>Save PDF</strong> &rarr; in the dialog choose <em>"Save as PDF"</em>'}
      </span>
    </div>
    <div style="display:flex;gap:8px;flex-shrink:0;">
      <button onclick="window.print()" style="padding:9px 22px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
        &#128190; ${lang === 'es' ? 'Guardar PDF' : 'Save PDF'}
      </button>
      <button onclick="window.close()" style="padding:9px 16px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;cursor:pointer;">
        ${lang === 'es' ? 'Cerrar' : 'Close'}
      </button>
    </div>
  </div>

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #06b6d4;padding-bottom:16px;margin-bottom:24px;">
    <div>
      <h1 style="font-size:22px;color:#0f172a;margin-bottom:4px;">Anga <span style="color:#06b6d4;">Security</span></h1>
      <p style="font-size:12px;color:#64748b;">${strings.generatedBy} &middot; angaflow.com</p>
    </div>
    <div style="text-align:right;">
      <p style="font-size:12px;color:#64748b;">${strings.generatedOn}</p>
      <p style="font-size:13px;font-weight:500;">${dateStr}</p>
    </div>
  </div>

  <!-- Report title -->
  <h2 style="font-size:20px;margin-bottom:20px;">${strings.reportTitle}: <span style="color:#06b6d4;">${r.domain}</span></h2>

  <!-- Score overview -->
  <div style="display:flex;gap:24px;align-items:center;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:32px;">
    <div style="text-align:center;flex-shrink:0;">
      <div style="width:100px;height:100px;border-radius:50%;border:6px solid ${gradeColor(r.overallScore)};display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <span style="font-size:28px;font-weight:700;color:${gradeColor(r.overallScore)};">${r.overallScore}</span>
        <span style="font-size:14px;font-weight:600;color:${gradeColor(r.overallScore)};">${r.overallGrade}</span>
      </div>
    </div>
    <div>
      <p style="font-size:15px;margin-bottom:8px;"><strong>${strings.scoreLabel}:</strong> ${r.overallScore}/100 (${r.overallGrade})</p>
      <p style="font-size:13px;color:#64748b;">${strings.checksPerformed}: ${totalChecks} &middot; ${strings.scanDuration}: ${(r.durationMs / 1000).toFixed(1)}s</p>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        ${r.categories.map((cat: any) => `
          <span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${gradeColor(cat.score)}15;color:${gradeColor(cat.score)};border:1px solid ${gradeColor(cat.score)}30;">
            ${cat.label}: ${cat.score} ${cat.grade}
          </span>
        `).join('')}
      </div>
    </div>
  </div>

  <!-- Categories detail -->
  <h2 style="font-size:17px;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${lang === 'es' ? 'Detalle por Categoria' : 'Category Details'}</h2>
  ${categoriesHtml}

  <!-- Recommendations -->
  <h2 style="font-size:17px;margin-bottom:16px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${strings.recommendations}</h2>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:32px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;width:90px;">${strings.pdfPriority}</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;width:200px;">${lang === 'es' ? 'Titulo' : 'Title'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.pdfDescription}</th>
      </tr>
    </thead>
    <tbody>${recsHtml}</tbody>
  </table>

  <!-- Footer / Disclaimer -->
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:40px;">
    <p style="font-size:11px;color:#94a3b8;line-height:1.5;">${strings.pdfDisclaimer}</p>
    <p style="font-size:11px;color:#94a3b8;margin-top:8px;">angaflow.com &middot; contacto: seguridad@angaflow.com</p>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

// ============================================================
// Main Dashboard Component
// ============================================================

export default function DashboardComponent({ lang }: Props) {
  const [user, setUser] = useState<any>(null);
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'scan' | 'audit' | 'compliance' | 'simulation' | 'services' | 'credits'>('scan');

  // Scan state
  const [domain, setDomain] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanHistory, setScanHistoryData] = useState<any[]>([]);
  const [freeScans, setFreeScans] = useState({ used: 0, limit: 1, resetsAt: '' });
  const [paidScanCost, setPaidScanCost] = useState(100);

  // Report viewing state
  const [viewingReport, setViewingReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Audit state
  const [auditZoneId, setAuditZoneId] = useState('');
  const [auditApiToken, setAuditApiToken] = useState('');
  const [auditTier, setAuditTier] = useState<AuditTier>('basic');
  const [auditing, setAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [auditResult, setAuditResult] = useState<AuditReport | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditHistoryData, setAuditHistoryData] = useState<any[]>([]);
  const [viewingAuditReport, setViewingAuditReport] = useState<AuditReport | null>(null);

  // Compliance state
  const [complianceMode, setComplianceMode] = useState<'direct' | 'source_audit'>('direct');
  const [complianceAuditId, setComplianceAuditId] = useState<string>('');
  const [complianceApiToken, setComplianceApiToken] = useState<string>('');
  const [complianceAccountId, setComplianceAccountId] = useState<string>('');
  const [complianceFrameworks, setComplianceFrameworks] = useState<ComplianceFramework[] | 'bundle' | 'bundle_8'>('bundle_8');
  const [compliancePreCheckData, setCompliancePreCheckData] = useState<PreCheckResponse | null>(null);
  const [compliancePreChecking, setCompliancePreChecking] = useState(false);
  const [complianceRunning, setComplianceRunning] = useState(false);
  const [complianceStep, setComplianceStep] = useState(0);
  const [complianceResult, setComplianceResult] = useState<ComplianceReport | null>(null);
  const [complianceReportId, setComplianceReportId] = useState<string | null>(null);
  const [complianceError, setComplianceError] = useState<string | null>(null);
  const [viewingComplianceReport, setViewingComplianceReport] = useState<ComplianceReport | null>(null);
  const [viewingComplianceReportId, setViewingComplianceReportId] = useState<string | null>(null);
  const [complianceHistoryData, setComplianceHistoryData] = useState<any[]>([]);
  const [complianceCompareIds, setComplianceCompareIds] = useState<string[]>([]);
  const [complianceCompareOpen, setComplianceCompareOpen] = useState(false);
  const [activeComplianceToken, setActiveComplianceToken] = useState<string>('');

  // Direct compliance mode states
  const [directZoneId, setDirectZoneId] = useState('');
  const [directToken, setDirectToken] = useState('');
  const [directAccountId, setDirectAccountId] = useState('');
  const [directTier, setDirectTier] = useState<'pro' | 'complete'>('complete');
  const [directPreCheckData, setDirectPreCheckData] = useState<any | null>(null);
  const [directPreChecking, setDirectPreChecking] = useState(false);

  // Simulation state
  const [simZoneId, setSimZoneId] = useState('');
  const [simApiToken, setSimApiToken] = useState('');
  const [simAccountId, setSimAccountId] = useState('');
  const [simDomain, setSimDomain] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [simHistoryData, setSimHistoryData] = useState<any[]>([]);
  const [viewingSimReport, setViewingSimReport] = useState<any>(null);
  const [simPreCheckData, setSimPreCheckData] = useState<SimulationPreCheckResponse | null>(null);
  const [simPreChecking, setSimPreChecking] = useState(false);
  const [simPhase, setSimPhase] = useState<'intelligence' | 'probing' | 'correlation' | null>(null);
  const [simModuleIndex, setSimModuleIndex] = useState(0);
  const [simCounts, setSimCounts] = useState({ blocked: 0, challenged: 0, bypassed: 0, tested: 0 });
  
  // Multi-target state
  const [discoveredTargets, setDiscoveredTargets] = useState<DiscoveredDomain[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Audit pre-check state
  const [auditPreCheckData, setAuditPreCheckData] = useState<AuditPreCheckResponse | null>(null);
  const [auditPreChecking, setAuditPreChecking] = useState(false);

  // Credits state
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  // Services form state
  const [servicesForm, setServicesForm] = useState({ name: '', email: '', company: '', service: '', message: '' });
  const [servicesFormLoading, setServicesFormLoading] = useState(false);
  const [servicesFormSuccess, setServicesFormSuccess] = useState(false);
  const [servicesFormError, setServicesFormError] = useState<string | null>(null);

  // AI Chat state
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [aiContext, setAiContext] = useState<'general' | 'audit' | 'simulation' | 'compliance'>('general');
  const [aiReportId, setAiReportId] = useState<string | undefined>(undefined);

  const strings = t[lang];

  useEffect(() => {
    checkAuth();
    initSessionTimeout(); // Start 1hr inactivity timeout
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    setUser(session.user);

    try {
      const accountData = await getAccount();
      setAccount(accountData.account);
    } catch {
      try {
        const newAccount = await createAccount();
        setAccount(newAccount.account);
      } catch (err) {
        console.error('Failed to create account:', err);
      }
    }

    try {
      const [txData, historyData, auditHistory, compHistory, simHistory] = await Promise.all([
        getTransactions(10, 0).catch(() => ({ transactions: [] })),
        getScanHistory(10, 0).catch(() => ({ reports: [], freeScans: { used: 0, limit: 1, resetsAt: '' } })),
        getAuditHistory(10, 0).catch(() => ({ reports: [] })),
        getComplianceHistory(10, 0).catch(() => ({ reports: [] })),
        getSimulationHistory(10, 0).catch(() => ({ reports: [] })),
      ]);
      setTransactions(txData.transactions || []);
      setScanHistoryData(historyData.reports || []);
      if (historyData.freeScans) setFreeScans(historyData.freeScans);
      if (historyData.paidScanCost) setPaidScanCost(historyData.paidScanCost);
      setAuditHistoryData(auditHistory.reports || []);
      setComplianceHistoryData(compHistory.reports || []);
      setSimHistoryData(simHistory.reports || []);
    } catch {
      // silent
    }

    setLoading(false);
  }

  async function handleScan() {
    if (!domain.trim() || scanning || loading) return;
    setScanning(true);
    setScanResult(null);
    setViewingReport(null);
    setScanError(null);
    setScanStep(0);

    const stepInterval = setInterval(() => {
      setScanStep((prev) => (prev < strings.scanningSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const result = await startQuickScan(domain.trim());
      clearInterval(stepInterval);
      setScanResult(result.report);

      const [historyData, accountData] = await Promise.all([
        getScanHistory(10, 0).catch(() => null),
        getAccount().catch(() => null),
      ]);
      if (historyData) {
        setScanHistoryData(historyData.reports || []);
        if (historyData.freeScans) setFreeScans(historyData.freeScans);
        if (historyData.paidScanCost) setPaidScanCost(historyData.paidScanCost);
      }
      if (accountData) setAccount(accountData.account);
    } catch (err: any) {
      clearInterval(stepInterval);
      setScanError(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function handleViewReport(reportId: string) {
    setLoadingReport(true);
    setScanResult(null);
    setScanError(null);
    try {
      const { report } = await getScanReport(reportId);
      if (report?.data?.result) {
        setViewingReport(report.data.result);
      } else if (report?.data?.scanData) {
        // Fallback: the report has scanData but no pre-computed result
        setViewingReport(null);
        setScanError(strings.reportNotFound);
      } else {
        setViewingReport(null);
        setScanError(strings.reportNotFound);
      }
    } catch (err: any) {
      setScanError(err.message || strings.reportNotFound);
    } finally {
      setLoadingReport(false);
    }
  }

  function handleBackToScan() {
    setViewingReport(null);
    setScanResult(null);
    setScanError(null);
  }

  function handleExportPdf() {
    const data = scanResult || viewingReport;
    if (data) exportReportPdf(data, lang);
  }

  // Package prices for GA4 tracking (MXN)
  const packagePrices: Record<string, number> = {
    starter: 1499,
    pro: 3299,
    business: 5999,
    enterprise: 9999,
  };

  async function handlePurchase(packageId: string) {
    setPurchaseLoading(packageId);
    try {
      const result = await createCheckout('credit_recharge', { package_id: packageId });
      // GA4 event: begin_checkout
      if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'begin_checkout', {
          currency: 'MXN',
          value: packagePrices[packageId] || 0,
          items: [{ item_id: packageId, item_name: packageId, price: packagePrices[packageId] || 0 }],
        });
      }
      window.location.href = result.checkout_url;
    } catch (err) {
      console.error('Checkout error:', err);
      setPurchaseLoading(null);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = `/${lang}/`;
  }

  // ============================================================
  // Render: Loading / Not logged in
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin" style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }} />
          <p style={{ color: '#94a3b8' }}>{strings.loading}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0f' }}>
        <div className="text-center">
          <p className="text-lg mb-4" style={{ color: '#94a3b8' }}>{strings.notLoggedIn}</p>
          <a
            href={`/${lang}/login`}
            className="px-6 py-3 rounded-lg font-semibold text-white inline-block"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
          >
            {strings.loginButton}
          </a>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Dashboard
  // ============================================================

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <header className="border-b px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
        <div className="flex items-center gap-4">
          <a href={`/${lang}/`} className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <defs><linearGradient id="g" x1="0" y1="0" x2="32" y2="32"><stop offset="0%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
              <path d="M16 2L4 8v8c0 7.18 5.12 13.88 12 16 6.88-2.12 12-8.82 12-16V8L16 2z" stroke="url(#g)" strokeWidth="1.5" fill="none" />
              <path d="M12 16l3 3 5-6" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <span className="font-bold text-white">Anga <span style={{ color: '#06b6d4' }}>Security</span></span>
          </a>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('credits')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #06b6d410, #3b82f610)', border: '1px solid #06b6d440' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 6v12M6 12h12" />
              </svg>
              <span className="text-xs sm:text-sm font-bold" style={{ color: '#06b6d4' }}>
                {account ? parseFloat(account.credit_balance).toLocaleString() : '0'}
              </span>
              <span className="hidden sm:inline text-xs" style={{ color: '#94a3b8' }}>{strings.credits}</span>
            </button>
            <button
              onClick={() => setActiveTab('credits')}
              className="px-2.5 py-1.5 rounded-full text-xs font-semibold text-white transition-all hover:scale-105 hidden sm:block"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
            >
              +
            </button>
          </div>
          <span className="text-sm hidden md:inline" style={{ color: '#94a3b8' }}>{user.email}</span>
          {/* Language switcher */}
          <a
            href={`/${lang === 'es' ? 'en' : 'es'}/dashboard`}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all hover:text-white"
            style={{ color: '#64748b', border: '1px solid #1e293b' }}
            title={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {lang === 'es' ? 'EN' : 'ES'}
          </a>
          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg transition-colors"
            style={{ color: '#94a3b8', border: '1px solid #1e293b' }}
          >
            {strings.logout}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-1 sm:gap-1.5 px-2 sm:px-4 py-2" style={{ background: '#0c1222', borderBottom: '1px solid #1e293b' }}>
        {([
          { id: 'scan' as const, label: strings.tabScan, icon: '\uD83D\uDD0D', color: '#06b6d4', onClick: () => { setActiveTab('scan'); handleBackToScan(); } },
          { id: 'audit' as const, label: strings.tabAudit, icon: '\uD83D\uDEE1\uFE0F', color: '#06b6d4' },
          { id: 'compliance' as const, label: strings.tabCompliance, icon: '\uD83D\uDCCB', color: '#8b5cf6' },
          { id: 'simulation' as const, label: strings.tabSimulation, icon: '\u26A1', color: '#ef4444' },
          { id: 'services' as const, label: strings.tabServices, icon: '\uD83E\uDD1D', color: '#f59e0b' },
          { id: 'credits' as const, label: strings.tabCredits, icon: '\uD83D\uDCB3', color: '#10b981' },
        ]).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={tab.onClick || (() => setActiveTab(tab.id))}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap"
              style={{
                background: isActive ? `${tab.color}18` : 'transparent',
                color: isActive ? tab.color : '#64748b',
                border: isActive ? `1.5px solid ${tab.color}40` : '1.5px solid transparent',
                boxShadow: isActive ? `0 0 12px ${tab.color}15` : 'none',
              }}
            >
              <span className="text-sm sm:text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Persistent Credit Banner - visible on all tabs except credits */}
      {activeTab !== 'credits' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div
            className="rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            style={{
              background: 'linear-gradient(135deg, #06b6d408, #3b82f608)',
              border: '1px solid #06b6d430',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #06b6d420, #3b82f620)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
              </div>
              <div>
                <p className="text-xs sm:text-sm" style={{ color: '#94a3b8' }}>{strings.creditBalance}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold" style={{ color: '#06b6d4' }}>
                    {account ? parseFloat(account.credit_balance).toLocaleString() : '0'}
                  </span>
                  <span className="text-sm" style={{ color: '#64748b' }}>{strings.credits}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('credits')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                boxShadow: '0 0 20px #06b6d420',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
              </svg>
              {strings.rechargeNow}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'scan' ? renderScanTab() : activeTab === 'audit' ? renderAuditTab() : activeTab === 'compliance' ? renderComplianceTab() : activeTab === 'simulation' ? renderSimulationTab() : activeTab === 'services' ? renderServicesTab() : renderCreditsTab()}
      </div>

      {/* AI Chat Floating Button */}
      {!aiChatOpen && (
        <button
          onClick={() => setAiChatOpen(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            border: 'none',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#fff',
            zIndex: 999,
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          title="Asistente AI de Seguridad"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <circle cx="12" cy="5" r="2" />
            <path d="M12 7v4M8 16h.01M16 16h.01" />
          </svg>
        </button>
      )}

      {/* AI Chat Window */}
      {aiChatOpen && (
        <AIChat
          context={aiContext}
          reportId={aiReportId}
          onClose={() => setAiChatOpen(false)}
        />
      )}
    </div>
  );

  // ============================================================
  // Scan Tab
  // ============================================================

  function renderScanTab() {
    // If viewing a saved report, show report view
    if (viewingReport || loadingReport) {
      return renderSavedReportView();
    }

    return (
      <div className="space-y-8">
        {/* Domain input */}
        <div className="rounded-xl p-4 sm:p-6" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">{strings.scanTitle}</h2>
              <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{strings.scanSubtitle}</p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs" style={{ color: '#64748b' }}>{strings.freeScansLabel}</span>
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-lg font-bold`} style={{ color: freeScans.used >= freeScans.limit ? '#ef4444' : '#06b6d4' }}>
                  {freeScans.used}
                </span>
                <span className="text-sm" style={{ color: '#64748b' }}>/ {freeScans.limit}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              placeholder={strings.scanPlaceholder}
              disabled={scanning}
              className="flex-1 px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2"
              style={{
                background: '#0a0a0f',
                border: '1px solid #1e293b',
              }}
            />
            <button
              onClick={handleScan}
              disabled={loading || scanning || !domain.trim() || (freeScans.used >= freeScans.limit && (account ? parseFloat(account.credit_balance) : 0) < paidScanCost)}
              className="px-6 sm:px-8 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
            >
              {scanning ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {strings.scanning}
                </>
              ) : freeScans.used >= freeScans.limit ? (
                <>{strings.scanButton} ({paidScanCost} cr)</>
              ) : (
                strings.scanButton
              )}
            </button>
          </div>

          {/* Free scan used — show paid scan info or buy credits prompt */}
          {freeScans.used >= freeScans.limit && !scanning && !scanResult && (() => {
            const balance = account ? parseFloat(account.credit_balance) : 0;
            const canPay = balance >= paidScanCost;

            if (canPay) {
              // User has credits — show cost info (no blocking message)
              return (
                <div className="mt-4 p-4 rounded-lg" style={{ background: '#06b6d4' + '10', border: '1px solid #06b6d4' + '30' }}>
                  <p className="text-sm font-medium" style={{ color: '#06b6d4' }}>
                    {strings.scanPaidInfo} <span className="font-bold">{paidScanCost} {strings.scanPaidCredits}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                    {lang === 'es'
                      ? `Tu escaneo gratuito del mes ya fue usado. Los escaneos adicionales se cobran de tu balance (${balance.toLocaleString()} creditos disponibles).`
                      : `Your free monthly scan has been used. Additional scans are charged from your balance (${balance.toLocaleString()} credits available).`
                    }
                  </p>
                </div>
              );
            }

            // No credits — show buy prompt
            return (
              <div className="mt-4 p-4 rounded-lg" style={{ background: '#f59e0b' + '10', border: '1px solid #f59e0b' + '30' }}>
                <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>{strings.scanLimitReached}</p>
                <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  {lang === 'es'
                    ? `Los escaneos adicionales cuestan ${paidScanCost} creditos. Tu balance actual: ${balance.toLocaleString()} creditos.`
                    : `Additional scans cost ${paidScanCost} credits. Your current balance: ${balance.toLocaleString()} credits.`
                  }
                  {freeScans.resetsAt && (
                    <span> {strings.resetsOn} {new Date(freeScans.resetsAt).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}</span>
                  )}
                </p>
                <button
                  onClick={() => setActiveTab('credits')}
                  className="mt-2 text-sm font-medium px-4 py-1.5 rounded-lg"
                  style={{ color: '#06b6d4', border: '1px solid #06b6d4' + '40' }}
                >
                  {strings.buyCredits}
                </button>
              </div>
            );
          })()}
        </div>

        {/* Scanning animation */}
        {scanning && (
          <div className="rounded-xl p-8 text-center" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent mx-auto mb-6 animate-spin" style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }} />
            <p className="text-lg font-medium text-white mb-2">{strings.scanning}</p>
            <p className="text-sm" style={{ color: '#06b6d4' }}>
              {strings.scanningSteps[scanStep]}
            </p>
            <div className="flex justify-center gap-1 mt-4">
              {strings.scanningSteps.map((_: any, i: number) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{
                    background: i <= scanStep ? '#06b6d4' : '#1e293b',
                    transform: i === scanStep ? 'scale(1.3)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Scan error */}
        {scanError && (
          <div className="rounded-xl p-6" style={{ background: '#ef4444' + '10', border: '1px solid #ef4444' + '30' }}>
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{scanError}</p>
          </div>
        )}

        {/* Scan results */}
        {scanResult && !scanning && renderScanResults(scanResult)}

        {/* Scan history */}
        {renderScanHistory()}
      </div>
    );
  }

  // ============================================================
  // Saved Report View (loaded from history)
  // ============================================================

  function renderSavedReportView() {
    return (
      <div className="space-y-6">
        {/* Top bar with Back + Export buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToScan}
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            style={{ color: '#06b6d4', border: '1px solid #1e293b' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            {strings.backToScan}
          </button>
          {viewingReport && (
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ color: '#fff', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              {strings.exportPdf}
            </button>
          )}
        </div>

        {/* Loading state */}
        {loadingReport && (
          <div className="rounded-xl p-8 text-center" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin" style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }} />
            <p style={{ color: '#94a3b8' }}>{strings.loadingReport}</p>
          </div>
        )}

        {/* Error */}
        {scanError && (
          <div className="rounded-xl p-6" style={{ background: '#ef4444' + '10', border: '1px solid #ef4444' + '30' }}>
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{scanError}</p>
          </div>
        )}

        {/* Loaded report */}
        {viewingReport && renderScanResults(viewingReport)}
      </div>
    );
  }

  // ============================================================
  // Scan Results (shared between fresh scan and viewed report)
  // ============================================================

  function renderScanResults(r: any) {
    const totalChecks = r.categories.reduce((sum: number, cat: any) => sum + cat.checks.length, 0);

    return (
      <div className="space-y-6">
        {/* Score overview + action buttons */}
        <div className="rounded-xl p-6" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <ScoreGauge score={r.overallScore} grade={r.overallGrade} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-white mb-1">{r.domain}</h3>
              <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
                {strings.scoreLabel}: <span className="font-bold" style={{ color: '#06b6d4' }}>{r.overallScore}/100</span>
                {' '}{strings.grade}: <span className="font-bold">{r.overallGrade}</span>
              </p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="text-center">
                  <p className="text-xs" style={{ color: '#64748b' }}>{strings.scanDuration}</p>
                  <p className="text-sm font-medium text-white">{(r.durationMs / 1000).toFixed(1)}s</p>
                </div>
                <div className="text-center">
                  <p className="text-xs" style={{ color: '#64748b' }}>{strings.checksPerformed}</p>
                  <p className="text-sm font-medium text-white">{totalChecks}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs" style={{ color: '#64748b' }}>{strings.recommendations}</p>
                  <p className="text-sm font-medium text-white">{r.recommendations.length}</p>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                <button
                  onClick={handleExportPdf}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg"
                  style={{ color: '#fff', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  {strings.exportPdf}
                </button>
                <button
                  onClick={handleBackToScan}
                  className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg"
                  style={{ color: '#94a3b8', border: '1px solid #1e293b' }}
                >
                  {strings.newScan}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {r.categories.map((cat: any) => (
            <CategoryCard key={cat.category} cat={cat} lang={lang} />
          ))}
        </div>

        {/* Upsell banner */}
        <div className="rounded-xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #06b6d415, #3b82f615)', border: '1px solid #06b6d430' }}>
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-white mb-2">{strings.upsellZoneConnect}</h3>
            <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>{strings.upsellZoneConnectDesc}</p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                <span className="text-xs font-mono" style={{ color: '#06b6d4' }}>Quick Scan: {totalChecks} checks</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: '#06b6d415', border: '1px solid #06b6d440' }}>
                <span className="text-xs font-mono" style={{ color: '#06b6d4' }}>{strings.upsellAudit}: {r.upsell?.auditChecks || 64}+ checks</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="p-4 border-b" style={{ borderColor: '#1e293b' }}>
            <h3 className="font-bold text-white">{strings.recommendations}</h3>
          </div>
          <div className="divide-y" style={{ borderColor: '#1e293b' }}>
            {r.recommendations.map((rec: any, i: number) => {
              const priorityColors: Record<string, string> = {
                critical: '#ef4444',
                high: '#f97316',
                medium: '#f59e0b',
                low: '#94a3b8',
              };
              const color = priorityColors[rec.priority] || '#94a3b8';

              return (
                <div key={i} className="p-4" style={{ borderColor: '#1e293b', background: rec.requiresAudit ? '#06b6d405' : 'transparent' }}>
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 mt-0.5"
                      style={{ background: color + '20', color }}
                    >
                      {(strings.priority as any)[rec.priority] || rec.priority}
                    </span>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-white">{rec.title}</h4>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>{rec.description}</p>
                      {rec.requiresAudit && rec.auditUpsellText && (
                        <button
                          onClick={() => setActiveTab('credits')}
                          className="mt-2 text-xs font-medium px-3 py-1 rounded-lg inline-flex items-center gap-1"
                          style={{ color: '#06b6d4', background: '#06b6d415', border: '1px solid #06b6d430' }}
                        >
                          {rec.auditUpsellText}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upsell cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Audit */}
          <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #06b6d430' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#06b6d420' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h4 className="font-bold text-white mb-1">{strings.upsellAudit}</h4>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>{strings.upsellAuditDesc}</p>
            <button
              onClick={() => setActiveTab('credits')}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ color: '#06b6d4', border: '1px solid #06b6d440' }}
            >
              {strings.upsellAuditCta}
            </button>
          </div>

          {/* Simulation */}
          <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #3b82f630' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#3b82f620' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            </div>
            <h4 className="font-bold text-white mb-1">{strings.upsellSimulation}</h4>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>{strings.upsellSimulationDesc}</p>
            <button
              onClick={() => setActiveTab('credits')}
              className="w-full py-2 rounded-lg text-sm font-medium"
              style={{ color: '#3b82f6', border: '1px solid #3b82f640' }}
            >
              {strings.upsellSimulationCta}
            </button>
          </div>

          {/* Managed service */}
          <div className="rounded-xl p-5" style={{ background: '#111827', border: '1px solid #8b5cf630' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#8b5cf620' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </div>
            <h4 className="font-bold text-white mb-1">{strings.upsellManaged}</h4>
            <p className="text-xs mb-4" style={{ color: '#94a3b8' }}>{strings.upsellManagedDesc}</p>
            <a
              href={`https://wa.me/525551575041?text=${encodeURIComponent(lang === 'es' ? 'Hola, me interesa que Anga Security administre mi dominio en Cloudflare.' : 'Hi, I am interested in having Anga Security manage my domain on Cloudflare.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2 rounded-lg text-sm font-medium text-center"
              style={{ color: '#8b5cf6', border: '1px solid #8b5cf640' }}
            >
              {strings.upsellManagedCta}
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // Scan History
  // ============================================================

  function renderScanHistory() {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
        <div className="p-4 border-b" style={{ borderColor: '#1e293b' }}>
          <h3 className="font-bold text-white">{strings.scanHistory}</h3>
        </div>
        {scanHistory.length === 0 ? (
          <p className="p-6 text-center text-sm" style={{ color: '#94a3b8' }}>{strings.noHistory}</p>
        ) : (
          <div className="space-y-3 p-4">
            {scanHistory.map((r: any) => {
              const isCompleted = r.status === 'completed';
              const isFailed = r.status === 'failed';
              const statusColor = isCompleted ? '#22c55e' : isFailed ? '#ef4444' : '#f59e0b';
              const statusLabel = isCompleted
                ? (lang === 'es' ? 'Completado' : 'Completed')
                : isFailed
                  ? (lang === 'es' ? 'Fallido' : 'Failed')
                  : (lang === 'es' ? 'En progreso' : 'Running');
              const gradeColor =
                (r.score || 0) >= 90 ? '#22c55e' :
                (r.score || 0) >= 70 ? '#06b6d4' :
                (r.score || 0) >= 50 ? '#f59e0b' :
                (r.score || 0) >= 30 ? '#f97316' : '#ef4444';
              const durationStr = r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : null;

              return (
                <div
                  key={r.id}
                  className={`rounded-lg p-4 transition-all ${isCompleted ? 'cursor-pointer hover:border-cyan-800' : ''}`}
                  style={{ background: '#0f172a', border: `1px solid ${isCompleted ? '#1e293b' : statusColor + '30'}` }}
                  onClick={() => isCompleted && handleViewReport(r.id)}
                >
                  {/* Row 1: Domain + Score + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white">{r.domain}</span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: statusColor + '20', color: statusColor }}>
                        {statusLabel}
                      </span>
                      {r.report_type === 'quick_scan' && (
                        <span className="px-2 py-0.5 text-xs rounded-full" style={{ background: '#06b6d415', color: '#06b6d4' }}>Quick Scan</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {r.score !== null && isCompleted && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl font-black font-mono" style={{ color: gradeColor }}>{r.score}</span>
                          <span className="text-sm font-bold" style={{ color: gradeColor }}>{r.grade}</span>
                        </div>
                      )}
                      {isCompleted && (
                        <span className="text-xs px-2 py-1 rounded" style={{ background: '#06b6d420', color: '#06b6d4' }}>
                          {strings.viewReport} {'\u2192'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Categories mini-bar (if available) */}
                  {isCompleted && r.categories_summary && r.categories_summary.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {r.categories_summary.map((cat: any, ci: number) => {
                        const catGradeColor = (cat.score || 0) >= 90 ? '#22c55e' : (cat.score || 0) >= 70 ? '#06b6d4' : (cat.score || 0) >= 50 ? '#f59e0b' : '#ef4444';
                        return (
                          <span key={ci} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: catGradeColor + '10', color: catGradeColor, border: `1px solid ${catGradeColor}20` }}>
                            <span className="font-bold">{cat.grade}</span>
                            <span style={{ color: '#94a3b8' }}>{cat.label}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Row 3: Metadata */}
                  <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
                    <span>{new Date(r.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {isCompleted && r.categories_count > 0 && (
                      <span>{r.categories_count} {lang === 'es' ? 'categor\u00edas' : 'categories'}</span>
                    )}
                    {isCompleted && r.recommendations_count > 0 && (
                      <span style={{ color: '#f59e0b' }}>
                        {r.recommendations_count} {lang === 'es' ? 'recomendaciones' : 'recommendations'}
                        {r.recommendations_high > 0 && <span style={{ color: '#ef4444' }}> ({r.recommendations_high} {lang === 'es' ? 'alta' : 'high'})</span>}
                      </span>
                    )}
                    {durationStr && <span>{durationStr}</span>}
                    {r.credits_charged > 0 && (
                      <span style={{ color: '#8b5cf6' }}>{r.credits_charged} cr</span>
                    )}
                    {r.credits_charged === 0 && isCompleted && (
                      <span style={{ color: '#22c55e' }}>{lang === 'es' ? 'Gratis' : 'Free'}</span>
                    )}
                  </div>

                  {/* Error message for failed */}
                  {isFailed && r.error_message && (
                    <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{r.error_message}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Audit Handlers
  // ============================================================

  async function handleAuditPreCheck() {
    if (!auditZoneId.trim() || !auditApiToken.trim() || auditPreChecking) return;
    setAuditPreChecking(true);
    setAuditPreCheckData(null);
    setAuditError(null);
    try {
      const result = await auditPreCheck(auditZoneId.trim(), auditApiToken.trim(), auditTier);
      setAuditPreCheckData(result);
    } catch (err: any) {
      setAuditError(err.message || (lang === 'es' ? 'Error al verificar permisos' : 'Permission check failed'));
    } finally {
      setAuditPreChecking(false);
    }
  }

  async function handleStartAudit() {
    if (!auditZoneId.trim() || !auditApiToken.trim() || auditing) return;
    setAuditing(true);
    setAuditResult(null);
    setViewingAuditReport(null);
    setAuditError(null);
    setAuditPreCheckData(null);
    setAuditStep(0);

    const stepInterval = setInterval(() => {
      setAuditStep((prev) => (prev < strings.auditRunningSteps.length - 1 ? prev + 1 : prev));
    }, 2000);

    try {
      const result = await startAudit(auditZoneId.trim(), auditApiToken.trim(), auditTier);
      clearInterval(stepInterval);
      setAuditResult(result.report);

      // Refresh account data and audit history
      const [accountData, historyData] = await Promise.all([
        getAccount().catch(() => null),
        getAuditHistory(10, 0).catch(() => null),
      ]);
      if (accountData) setAccount(accountData.account);
      if (historyData) setAuditHistoryData(historyData.reports || []);
    } catch (err: any) {
      clearInterval(stepInterval);
      setAuditError(err.message || 'Audit failed');
      if (err.creditsRefunded) {
        setAuditError(`${err.message}${lang === 'es' ? '. Creditos reembolsados.' : '. Credits refunded.'}`);
      }
    } finally {
      setAuditing(false);
    }
  }

  async function handleViewAuditReport(reportId: string) {
    setLoadingReport(true);
    setAuditResult(null);
    setAuditError(null);
    try {
      const { report } = await getAuditReport(reportId);
      if (report?.data) {
        setViewingAuditReport(report.data as AuditReport);
      } else {
        setAuditError(strings.reportNotFound);
      }
    } catch (err: any) {
      setAuditError(err.message || strings.reportNotFound);
    } finally {
      setLoadingReport(false);
    }
  }

  function handleBackToAuditForm() {
    setAuditResult(null);
    setViewingAuditReport(null);
    setAuditError(null);
  }

  function exportAuditPdf(report: AuditReport) {
    const dateStr = new Date().toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const gradeColor = (s: number) => s >= 90 ? '#22c55e' : s >= 75 ? '#06b6d4' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';
    const priorityColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#94a3b8' };
    const sevLabels: Record<string, string> = lang === 'es'
      ? { critical: 'Critico', high: 'Alto', medium: 'Medio', low: 'Bajo' }
      : { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
    const data = report.data || {};

    // ── Categories ──
    let categoriesHtml = '';
    report.score.categories.forEach((cat) => {
      const findingsHtml = cat.findings.map((f) => `<li style="margin-bottom:4px;font-size:13px;color:#334155;">${f}</li>`).join('');
      categoriesHtml += `
        <div style="margin-bottom:24px;break-inside:avoid;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
            <div style="width:36px;height:36px;border-radius:8px;background:${gradeColor(cat.score)}20;color:${gradeColor(cat.score)};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;">${cat.grade}</div>
            <div>
              <h3 style="margin:0;font-size:15px;color:#0f172a;">${cat.label[lang]}</h3>
              <span style="font-size:12px;color:#64748b;">Score: ${cat.score}/100 &middot; Weight: ${Math.round(cat.weight * 100)}%${cat.plan_limited ? ' &middot; ' + strings.auditPlanLimited : ''}</span>
            </div>
          </div>
          <ul style="margin:0;padding-left:20px;list-style:disc;">${findingsHtml}</ul>
          ${cat.plan_note ? `<p style="margin-top:6px;font-size:12px;color:#f59e0b;font-style:italic;">${cat.plan_note}</p>` : ''}
        </div>`;
    });

    // ── Recommendations ──
    let recsHtml = '';
    report.recommendations.forEach((rec) => {
      const color = priorityColors[rec.priority] || '#94a3b8';
      recsHtml += `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${color}20;color:${color};">${(strings.priority as any)[rec.priority] || rec.priority}</span></td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:500;">${rec.title}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${rec.description}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${rec.product || '-'}</td>
      </tr>`;
    });

    // ── Config Audit Table (from zone_settings) ──
    let configAuditHtml = '';
    if (data.zone_settings) {
      const settingsMap: Record<string, any> = {};
      if (Array.isArray(data.zone_settings)) {
        data.zone_settings.forEach((s: any) => { settingsMap[s.id] = s.value; });
      }
      interface CfgItem { label: string; current: string; recommended: string; ok: boolean; severity: string; }
      const cfgItems: CfgItem[] = [];
      const chk = (id: string, label: string, rec: string, sev: string, okFn: (v: any) => boolean) => {
        const val = settingsMap[id];
        const display = val === undefined ? '\u2014' : typeof val === 'object' ? JSON.stringify(val) : String(val);
        cfgItems.push({ label, current: display, recommended: rec, ok: okFn(val), severity: sev });
      };
      chk('ssl', 'SSL/TLS Mode', 'strict', 'critical', v => v === 'strict' || v === 'full');
      chk('always_use_https', lang === 'es' ? 'Forzar HTTPS' : 'Force HTTPS', 'on', 'critical', v => v === 'on');
      chk('min_tls_version', 'Min TLS', '1.2', 'high', v => v === '1.2' || v === '1.3');
      chk('tls_1_3', 'TLS 1.3', 'on', 'high', v => v === 'on' || v === 'zrt');
      chk('security_level', lang === 'es' ? 'Nivel Seguridad' : 'Security Level', 'high', 'high', v => v === 'high' || v === 'under_attack');
      chk('browser_check', 'Browser Integrity Check', 'on', 'medium', v => v === 'on');
      chk('hotlink_protection', 'Hotlink Protection', 'on', 'low', v => v === 'on');
      chk('http3', 'HTTP/3 (QUIC)', 'on', 'medium', v => v === 'on');
      chk('brotli', 'Brotli', 'on', 'medium', v => v === 'on');
      chk('early_hints', 'Early Hints', 'on', 'low', v => v === 'on');
      chk('0rtt', '0-RTT', 'on', 'low', v => v === 'on');
      // HSTS
      const hsts = settingsMap['security_header']?.strict_transport_security;
      cfgItems.push({ label: 'HSTS', current: hsts?.enabled ? `max-age=${hsts.max_age}` : 'off', recommended: 'on (max-age=31536000)', ok: hsts?.enabled && hsts?.max_age >= 31536000, severity: 'high' });

      const issues = cfgItems.filter(c => !c.ok);
      if (cfgItems.length > 0) {
        let rows = '';
        cfgItems.forEach(item => {
          const sColor = priorityColors[item.severity] || '#94a3b8';
          rows += `<tr style="${!item.ok ? 'background:#fef2f2;' : ''}">
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:500;">${item.label}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-family:monospace;color:${item.ok ? '#22c55e' : '#ef4444'};">${item.current}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-family:monospace;color:#06b6d4;">${item.recommended}</td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;"><span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background:${item.ok ? '#22c55e' : '#ef4444'}20;color:${item.ok ? '#22c55e' : '#ef4444'};">${item.ok ? 'OK' : (lang === 'es' ? 'Corregir' : 'Fix')}</span></td>
            <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:11px;font-weight:600;color:${sColor};">${!item.ok ? sevLabels[item.severity] || item.severity : ''}</td>
          </tr>`;
        });
        configAuditHtml = `
          <h2 style="font-size:17px;margin-bottom:8px;margin-top:32px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${lang === 'es' ? 'Auditoria de Configuracion' : 'Configuration Audit'}${issues.length > 0 ? ` <span style="color:#ef4444;font-size:13px;">(${issues.length} ${lang === 'es' ? 'a corregir' : 'to fix'})</span>` : ''}</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:24px;">
            <thead><tr style="background:#f1f5f9;">
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">Setting</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Actual' : 'Current'}</th>
              <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Recomendado' : 'Recommended'}</th>
              <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Estado' : 'Status'}</th>
              <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Severidad' : 'Severity'}</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
      }
    }

    // ── Top Attacker IPs with Classification (Pro+) ──
    let attackerIpsHtml = '';
    if (data.top_attacker_ips?.length) {
      const classifyIp = (ip: any): { label: string; color: string; severity: string } => {
        const ua = (ip.user_agent || '').toLowerCase();
        const asn = (ip.asn_name || '').toLowerCase();
        if (ip.asn === 13335 || asn.includes('cloudflare')) return { label: 'Cloudflare', color: '#06b6d4', severity: 'info' };
        if (/apachebench|ab\/|wrk\/|siege|k6\/|locust|vegeta|hey\/|bombardier|gatling/i.test(ua)) return { label: 'Stress Test / Flood', color: '#ef4444', severity: lang === 'es' ? 'Peligro' : 'Danger' };
        if (/waf.event.generator|loic|hoic|hulk|slowloris|goldeneye/i.test(ua)) return { label: lang === 'es' ? 'Herramienta DDoS' : 'DDoS Tool', color: '#ef4444', severity: lang === 'es' ? 'Peligro' : 'Danger' };
        if (/nikto|sqlmap|nmap|masscan|nuclei|gobuster|dirbuster|ffuf|wpscan|burp|acunetix|zgrab/i.test(ua)) return { label: lang === 'es' ? 'Escaner' : 'Scanner', color: '#ef4444', severity: lang === 'es' ? 'Peligro' : 'Danger' };
        if (/scrapy|python|curl|wget|go-http|java\/|bot|crawl|spider/i.test(ua)) return { label: 'Bot/Scraper', color: '#f59e0b', severity: lang === 'es' ? 'Alerta' : 'Warning' };
        if (/amazon|aws|digitalocean|linode|hetzner|ovh|vultr|google cloud/i.test(asn)) return { label: 'Cloud Infra', color: '#f59e0b', severity: lang === 'es' ? 'Alerta' : 'Warning' };
        if (ip.action === 'block') return { label: lang === 'es' ? 'Bloqueado' : 'Blocked', color: '#ef4444', severity: lang === 'es' ? 'Peligro' : 'Danger' };
        return { label: lang === 'es' ? 'Desconocido' : 'Unknown', color: '#64748b', severity: 'Info' };
      };

      let ipRows = '';
      data.top_attacker_ips.slice(0, 10).forEach((ip: any) => {
        const cls = classifyIp(ip);
        const actionColor = ip.action === 'block' ? '#ef4444' : ip.action === 'log' ? '#f59e0b' : '#06b6d4';
        ipRows += `<tr>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:monospace;">${ip.ip.length > 28 ? ip.ip.slice(0, 28) + '...' : ip.ip}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;"><span style="padding:2px 6px;border-radius:4px;font-weight:600;background:${cls.color}15;color:${cls.color};">${cls.label}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;">${ip.asn_name ? (ip.asn_name.length > 25 ? ip.asn_name.slice(0, 25) + '...' : ip.asn_name) : 'AS' + ip.asn}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;">${ip.country}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;"><span style="padding:2px 6px;border-radius:4px;font-weight:600;background:${actionColor}15;color:${actionColor};">${ip.action}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;font-weight:600;color:${cls.color};">${cls.severity}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:right;font-family:monospace;font-weight:600;">${Number(ip.count).toLocaleString()}</td>
        </tr>`;
      });

      attackerIpsHtml = `
        <h2 style="font-size:17px;margin-bottom:8px;margin-top:32px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${lang === 'es' ? 'Inteligencia de Ataques \u2014 IPs de Mayor Actividad' : 'Attack Intelligence \u2014 Top Activity IPs'}</h2>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:24px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">IP</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Tipo' : 'Type'}</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">ASN</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Pais' : 'Country'}</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Accion' : 'Action'}</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Severidad' : 'Severity'}</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Peticiones' : 'Requests'}</th>
          </tr></thead>
          <tbody>${ipRows}</tbody>
        </table>`;
    }

    // ── User Agent Threat Analysis (Pro+) ──
    let uaAnalysisHtml = '';
    if (data.traffic_analytics?.top_user_agents?.length) {
      const classifyUa = (ua: string): { label: string; color: string; risk: string } => {
        if (!ua || ua === '(empty)') return { label: lang === 'es' ? 'Sin UA' : 'Empty UA', color: '#ef4444', risk: lang === 'es' ? 'Alto' : 'High' };
        if (/LOIC|HOIC|HULK|Slowloris|GoldenEye|Xerxes|UFONet/i.test(ua)) return { label: 'DDoS Tool', color: '#ef4444', risk: lang === 'es' ? 'Critico' : 'Critical' };
        if (/ApacheBench|ab\/[\d]|wrk\/|siege\/|k6\/|locust|vegeta|hey\/|bombardier|gatling|artillery|autocannon|JMeter/i.test(ua)) return { label: 'Stress Test / Flood', color: '#ef4444', risk: lang === 'es' ? 'Critico' : 'Critical' };
        if (/WAF.Event.Generator|waf-?tester|wafw00f|WAFNinja|bypass-?waf|CloudFail/i.test(ua)) return { label: lang === 'es' ? 'Evasion WAF' : 'WAF Evasion', color: '#ef4444', risk: lang === 'es' ? 'Critico' : 'Critical' };
        if (/Metasploit|Empire|Cobalt.Strike|BeEF|commix|XSStrike|dalfox/i.test(ua)) return { label: lang === 'es' ? 'Explotacion' : 'Exploitation', color: '#ef4444', risk: lang === 'es' ? 'Critico' : 'Critical' };
        if (/Nikto|sqlmap|Nmap|Nessus|OpenVAS|ZAP|Burp|Acunetix|Nuclei|Masscan|ffuf|gobuster|wpscan|zgrab/i.test(ua)) return { label: lang === 'es' ? 'Escaner' : 'Scanner', color: '#ef4444', risk: lang === 'es' ? 'Alto' : 'High' };
        if (/Scrapy|MJ12bot|AhrefsBot|DotBot|SemrushBot|Bytespider|PetalBot/i.test(ua)) return { label: 'Bot/Scraper', color: '#f97316', risk: lang === 'es' ? 'Alto' : 'High' };
        if (/GPTBot|ChatGPT|ClaudeBot|anthropic|PerplexityBot|CCBot/i.test(ua)) return { label: 'AI Bot', color: '#f59e0b', risk: lang === 'es' ? 'Medio' : 'Medium' };
        if (/python|curl\/|wget\/|Go-http-client|Java\/|node-fetch|axios|aiohttp/i.test(ua)) return { label: lang === 'es' ? 'Automatizacion' : 'Automation', color: '#f59e0b', risk: lang === 'es' ? 'Medio' : 'Medium' };
        if (/HeadlessChrome|PhantomJS|Selenium|Puppeteer|Playwright/i.test(ua)) return { label: 'Headless Browser', color: '#f59e0b', risk: lang === 'es' ? 'Medio' : 'Medium' };
        if (/Googlebot|bingbot|Baiduspider|DuckDuckBot|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp/i.test(ua)) return { label: lang === 'es' ? 'Bot Verificado' : 'Verified Bot', color: '#06b6d4', risk: lang === 'es' ? 'Bajo' : 'Low' };
        if (/UptimeRobot|Pingdom|Datadog|GTmetrix|Lighthouse|Cloudflare/i.test(ua)) return { label: 'Monitor', color: '#22c55e', risk: lang === 'es' ? 'Ninguno' : 'None' };
        if (/Mozilla\/5\.0.*(?:Chrome|Firefox|Safari|Edge|Opera)/.test(ua)) return { label: lang === 'es' ? 'Navegador' : 'Browser', color: '#22c55e', risk: lang === 'es' ? 'Ninguno' : 'None' };
        return { label: lang === 'es' ? 'Desconocido' : 'Unknown', color: '#64748b', risk: lang === 'es' ? 'Bajo' : 'Low' };
      };

      let uaRows = '';
      const threats: string[] = [];
      data.traffic_analytics.top_user_agents.slice(0, 12).forEach((item: any) => {
        const cls = classifyUa(item.ua || '');
        const isAttack = ['DDoS Tool', 'Stress Test / Flood', 'WAF Evasion', 'Evasion WAF', 'Exploitation', 'Explotacion', 'Scanner', 'Escaner'].some(t => cls.label.includes(t));
        if (isAttack) threats.push(item.ua || '(empty)');
        uaRows += `<tr style="${isAttack ? 'background:#fef2f2;' : ''}">
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;font-family:monospace;max-width:350px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${isAttack ? 'color:#ef4444;font-weight:600;' : ''}">${isAttack ? '\u26A0 ' : ''}${item.ua || '(empty)'}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;"><span style="padding:2px 6px;border-radius:4px;font-weight:600;background:${cls.color}15;color:${cls.color};">${cls.label}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:center;"><span style="font-weight:600;color:${cls.color};">${cls.risk}</span></td>
          <td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-size:11px;text-align:right;font-family:monospace;font-weight:600;">${Number(item.count).toLocaleString()}</td>
        </tr>`;
      });

      const threatBanner = threats.length > 0
        ? `<div style="padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin-bottom:16px;">
            <strong style="color:#ef4444;">\u26A0 ${threats.length} ${lang === 'es' ? 'amenazas activas detectadas' : 'active threats detected'}:</strong>
            <span style="font-size:12px;color:#991b1b;"> ${threats.map(t => t.length > 40 ? t.slice(0, 40) + '...' : t).join(', ')}</span>
          </div>`
        : `<div style="padding:10px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:16px;font-size:12px;color:#166534;">\u2713 ${lang === 'es' ? 'Sin amenazas detectadas en user agents' : 'No threats detected in user agents'}</div>`;

      uaAnalysisHtml = `
        <h2 style="font-size:17px;margin-bottom:8px;margin-top:32px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${lang === 'es' ? 'Analisis de User Agents \u2014 Identificacion de Amenazas' : 'User Agent Analysis \u2014 Threat Identification'}</h2>
        ${threatBanner}
        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:24px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">User Agent</th>
            <th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Tipo' : 'Type'}</th>
            <th style="padding:8px 10px;text-align:center;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Riesgo' : 'Risk'}</th>
            <th style="padding:8px 10px;text-align:right;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Peticiones' : 'Requests'}</th>
          </tr></thead>
          <tbody>${uaRows}</tbody>
        </table>`;
    }

    const tierLabel = { basic: strings.auditBasic, pro: strings.auditPro, complete: strings.auditComplete }[report.tier];

    const html = `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8">
<title>${strings.auditTitle} - ${report.zone_name} - Anga Security</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;background:#fff;padding:40px;max-width:900px;margin:0 auto;}@media print{body{padding:20px;}.no-print{display:none!important;}@page{margin:15mm;size:A4;}}table{page-break-inside:auto;}tr{page-break-inside:avoid;}</style>
</head><body>
<div class="no-print" style="position:sticky;top:0;z-index:100;background:#fff;border-bottom:1px solid #e2e8f0;padding:12px 0;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:12px;"><span style="font-size:13px;color:#64748b;">${lang === 'es' ? '&#128196; Haz clic en <strong>Guardar PDF</strong> &rarr; en el di&aacute;logo elige <em>"Guardar como PDF"</em>' : '&#128196; Click <strong>Save PDF</strong> &rarr; in the dialog choose <em>"Save as PDF"</em>'}</span><div style="display:flex;gap:8px;flex-shrink:0;"><button onclick="window.print()" style="padding:9px 22px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">&#128190; ${lang === 'es' ? 'Guardar PDF' : 'Save PDF'}</button><button onclick="window.close()" style="padding:9px 16px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;cursor:pointer;">${lang === 'es' ? 'Cerrar' : 'Close'}</button></div></div>
<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #06b6d4;padding-bottom:16px;margin-bottom:24px;">
  <div><h1 style="font-size:22px;margin-bottom:4px;">Anga <span style="color:#06b6d4;">Security</span></h1><p style="font-size:12px;color:#64748b;">${strings.generatedBy} &middot; angaflow.com</p></div>
  <div style="text-align:right;"><p style="font-size:12px;color:#64748b;">${strings.generatedOn}</p><p style="font-size:13px;font-weight:500;">${dateStr}</p></div>
</div>
<h2 style="font-size:20px;margin-bottom:8px;">${strings.auditTitle}: <span style="color:#06b6d4;">${report.zone_name}</span></h2>
<p style="font-size:13px;color:#64748b;margin-bottom:20px;">${tierLabel} &middot; ${strings.auditCfPlan}: ${report.cf_plan} &middot; ${strings.auditCollectorsRun}: ${report.collectors_run} &middot; ${(report.duration_ms / 1000).toFixed(1)}s</p>
<div style="display:flex;gap:24px;align-items:center;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:32px;">
  <div style="text-align:center;flex-shrink:0;"><div style="width:100px;height:100px;border-radius:50%;border:6px solid ${gradeColor(report.score.overall_score)};display:flex;flex-direction:column;align-items:center;justify-content:center;"><span style="font-size:28px;font-weight:700;color:${gradeColor(report.score.overall_score)};">${report.score.overall_score}</span><span style="font-size:14px;font-weight:600;color:${gradeColor(report.score.overall_score)};">${report.score.overall_grade}</span></div></div>
  <div><p style="font-size:15px;margin-bottom:8px;"><strong>${strings.scoreLabel}:</strong> ${report.score.overall_score}/100 (${report.score.overall_grade})</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;">${report.score.categories.map((c) => `<span style="display:inline-block;padding:4px 10px;border-radius:6px;font-size:12px;font-weight:600;background:${gradeColor(c.score)}15;color:${gradeColor(c.score)};border:1px solid ${gradeColor(c.score)}30;">${c.label[lang]}: ${c.score} ${c.grade}</span>`).join('')}</div></div>
</div>
${configAuditHtml}
<h2 style="font-size:17px;margin-bottom:16px;margin-top:32px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${lang === 'es' ? 'Detalle por Categoria' : 'Category Details'}</h2>
${categoriesHtml}
${attackerIpsHtml}
${uaAnalysisHtml}
<h2 style="font-size:17px;margin-bottom:16px;margin-top:32px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">${strings.recommendations}</h2>
<table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:32px;">
  <thead><tr style="background:#f1f5f9;"><th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;width:90px;">${strings.pdfPriority}</th><th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${lang === 'es' ? 'Titulo' : 'Title'}</th><th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.pdfDescription}</th><th style="padding:8px 10px;text-align:left;font-size:12px;color:#475569;border-bottom:1px solid #e2e8f0;">${strings.auditProduct}</th></tr></thead>
  <tbody>${recsHtml}</tbody>
</table>
<div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:40px;">
  <p style="font-size:11px;color:#94a3b8;line-height:1.5;">${strings.pdfDisclaimer}</p>
  <p style="font-size:11px;color:#94a3b8;margin-top:8px;">angaflow.com &middot; contacto: seguridad@angaflow.com</p>
</div>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); }
  }

  // ============================================================
  // Audit Tab
  // ============================================================

  function renderAuditTab() {
    const currentReport = auditResult || viewingAuditReport;

    // Show results if available
    if (currentReport) {
      return renderAuditResults(currentReport);
    }

    // Loading state for viewing saved report
    if (loadingReport) {
      return (
        <div className="rounded-xl p-8 text-center" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin" style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }} />
          <p style={{ color: '#94a3b8' }}>{strings.loadingReport}</p>
        </div>
      );
    }

    const balance = account ? parseFloat(account.credit_balance) : 0;
    const tierCost = AUDIT_TIER_INFO[auditTier].credits;
    const canAfford = balance >= tierCost;
    const pc = auditPreCheckData;

    return (
      <div className="space-y-8">
        {/* Audit form */}
        <div className="rounded-xl p-6" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">{strings.auditTitle}</h2>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{strings.auditSubtitle}</p>
          </div>

          {/* Zone ID + API Token */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{strings.auditZoneId}</label>
              <input
                type="text"
                value={auditZoneId}
                onChange={(e) => { setAuditZoneId(e.target.value); setAuditPreCheckData(null); }}
                placeholder={strings.auditZoneIdPlaceholder}
                disabled={auditing}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm"
                style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{strings.auditApiToken}</label>
              <input
                type="password"
                value={auditApiToken}
                onChange={(e) => { setAuditApiToken(e.target.value); setAuditPreCheckData(null); }}
                placeholder={strings.auditApiTokenPlaceholder}
                disabled={auditing}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm"
                style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
              />
            </div>
          </div>
          <p className="text-xs mb-4 flex items-center gap-2" style={{ color: '#22c55e' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            {strings.auditTokenHint}
          </p>

          {/* Help: How to get Zone ID and API Token */}
          <details className="mb-6 rounded-xl overflow-hidden group" style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}>
            <summary className="px-5 py-4 cursor-pointer text-sm font-medium flex items-center gap-2.5 select-none list-none [&::-webkit-details-marker]:hidden" style={{ color: '#06b6d4' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {strings.auditHowTo}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto transition-transform group-open:rotate-180"><polyline points="6 9 12 15 18 9"/></svg>
            </summary>
            <div className="px-5 pb-5">
              {/* Two-column guide cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Zone ID card */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#06b6d415', border: '1px solid #06b6d430' }}>
                      <span className="text-xs font-bold" style={{ color: '#06b6d4' }}>1</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{strings.auditHowToZoneTitle}</h4>
                  </div>
                  <ol className="space-y-2 ml-1">
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToZoneStep1}{' '}
                        <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:no-underline" style={{ color: '#06b6d4' }}>dash.cloudflare.com</a>
                        {' '}{strings.auditHowToZoneStep2}
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToZoneStep3}</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToZoneStep4}</span>
                    </li>
                  </ol>
                  <div className="mt-3 px-3 py-2 rounded-lg font-mono text-xs text-center select-all" style={{ background: '#0a0a0f', border: '1px dashed #1e293b', color: '#64748b' }}>
                    a1b2c3d4e5f6...
                  </div>
                </div>

                {/* API Token card */}
                <div className="rounded-xl p-4" style={{ background: '#111827', border: '1px solid #1e293b' }}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#06b6d415', border: '1px solid #06b6d430' }}>
                      <span className="text-xs font-bold" style={{ color: '#06b6d4' }}>2</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{strings.auditHowToTokenTitle}</h4>
                  </div>
                  <ol className="space-y-2 ml-1">
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToTokenStep1}{' '}
                        <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:no-underline" style={{ color: '#06b6d4' }}>dash.cloudflare.com/profile/api-tokens</a>
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToTokenStep2}</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToTokenStep3}</span>
                    </li>
                    <li className="flex items-start gap-2 text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: '#06b6d4' }}>&#x2023;</span>
                      <span>{strings.auditHowToTokenStep4}</span>
                    </li>
                  </ol>
                </div>
              </div>

              {/* Permissions section */}
              <div className="rounded-xl p-4" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <h4 className="text-sm font-bold" style={{ color: '#f59e0b' }}>{strings.auditHowToPermsTitle}</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>{strings.auditHowToPermsBasic}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Zone:Read', 'Analytics:Read', 'Firewall Services:Read', 'DNS:Read'].map((perm) => (
                        <span key={perm} className="px-2.5 py-1 rounded-md text-xs font-mono font-medium" style={{ background: '#06b6d412', border: '1px solid #06b6d430', color: '#06b6d4' }}>{perm}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: '#64748b' }}>{strings.auditHowToPermsAdvanced}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Logs:Read'].map((perm) => (
                        <span key={perm} className="px-2.5 py-1 rounded-md text-xs font-mono font-medium" style={{ background: '#8b5cf612', border: '1px solid #8b5cf630', color: '#8b5cf6' }}>{perm}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </details>

          {/* Tier selector */}
          <div className="mb-6">
            <label className="block text-xs font-medium mb-3" style={{ color: '#94a3b8' }}>{strings.auditSelectTier}</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['basic', 'pro', 'complete'] as AuditTier[]).map((tier) => {
                const info = AUDIT_TIER_INFO[tier];
                const tierNames = { basic: strings.auditBasic, pro: strings.auditPro, complete: strings.auditComplete };
                const tierDescs = { basic: strings.auditBasicDesc, pro: strings.auditProDesc, complete: strings.auditCompleteDesc };
                const selected = auditTier === tier;
                const affordable = balance >= info.credits;

                return (
                  <button
                    key={tier}
                    onClick={() => { setAuditTier(tier); setAuditPreCheckData(null); }}
                    disabled={auditing}
                    className="p-4 rounded-xl text-left transition-all"
                    style={{
                      background: selected ? '#06b6d410' : '#0a0a0f',
                      border: `2px solid ${selected ? '#06b6d4' : '#1e293b'}`,
                      opacity: auditing ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-white">{tierNames[tier]}</span>
                      <span className="text-sm font-mono" style={{ color: affordable ? '#06b6d4' : '#ef4444' }}>
                        {info.credits.toLocaleString()} cr
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>{tierDescs[tier]}</p>
                    <div className="flex gap-3 text-xs" style={{ color: '#64748b' }}>
                      <span>{info.collectors} {strings.auditCollectors}</span>
                      <span>{info.categories} {strings.auditCategories}</span>
                      <span>{info.time}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ═══ PRE-CHECK PERMISSIONS PANEL ═══ */}
          {pc && !auditing && (
            <div className="mb-6 rounded-xl overflow-hidden" style={{ background: '#0f172a', border: `1px solid ${pc.can_run ? '#06b6d440' : '#ef444440'}` }}>
              {/* Header with zone info */}
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderBottom: '1px solid #1e293b' }}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {pc.zone_info.zone_valid ? '\u2713' : '\u2717'}
                    {' '}{lang === 'es' ? 'Verificaci\u00f3n de Permisos' : 'Permission Verification'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    {pc.zone_info.zone_name} \u2022 Plan: <span style={{ color: '#06b6d4' }}>{pc.zone_info.cf_plan}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-xs" style={{ color: '#64748b' }}>{lang === 'es' ? 'Costo' : 'Cost'}</div>
                    <div className="text-sm font-bold" style={{ color: '#06b6d4' }}>{pc.credits.required.toLocaleString()}</div>
                  </div>
                  <div className="w-px h-8" style={{ background: '#1e293b' }} />
                  <div className="text-center">
                    <div className="text-xs" style={{ color: '#64748b' }}>Balance</div>
                    <div className="text-sm font-bold" style={{ color: pc.credits.sufficient ? '#22c55e' : '#ef4444' }}>{pc.credits.available.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Permissions grid */}
              <div className="px-5 py-4">
                <p className="text-xs font-medium mb-3" style={{ color: '#94a3b8' }}>
                  {lang === 'es' ? 'Permisos del Token' : 'Token Permissions'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...pc.permissions.required_for_tier, ...pc.permissions.optional_for_tier].map((perm) => {
                    const isAvailable = pc.permissions.available.includes(perm);
                    const isRequired = pc.permissions.required_for_tier.includes(perm);
                    return (
                      <div key={perm} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: isAvailable ? '#22c55e08' : '#ef444408', border: `1px solid ${isAvailable ? '#22c55e30' : '#ef444430'}` }}>
                        <span style={{ color: isAvailable ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '14px' }}>
                          {isAvailable ? '\u2713' : '\u2717'}
                        </span>
                        <span className="flex-1 font-mono" style={{ color: isAvailable ? '#d1fae5' : '#fecaca' }}>{perm}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                          background: isRequired ? '#3b82f620' : '#64748b20',
                          color: isRequired ? '#93c5fd' : '#94a3b8',
                        }}>
                          {isRequired ? (lang === 'es' ? 'Requerido' : 'Required') : (lang === 'es' ? 'Opcional' : 'Optional')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Missing required warning */}
                {pc.permissions.missing_required.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                    <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                      {lang === 'es'
                        ? `\u26A0 ${pc.permissions.missing_required.length} permiso(s) requerido(s) faltante(s). La auditor\u00eda no puede ejecutarse.`
                        : `\u26A0 ${pc.permissions.missing_required.length} required permission(s) missing. Audit cannot run.`}
                    </p>
                  </div>
                )}

                {/* Missing optional info */}
                {pc.permissions.missing_optional.length > 0 && pc.permissions.missing_required.length === 0 && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
                    <p className="text-xs" style={{ color: '#f59e0b' }}>
                      {lang === 'es'
                        ? `${pc.permissions.missing_optional.length} permiso(s) opcional(es) faltante(s). La auditor\u00eda proceder\u00e1 con cobertura reducida (~${pc.permissions.collectors_affected} colector(es) afectado(s)).`
                        : `${pc.permissions.missing_optional.length} optional permission(s) missing. Audit will proceed with reduced coverage (~${pc.permissions.collectors_affected} collector(s) affected).`}
                    </p>
                  </div>
                )}

                {/* Link to edit token */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href="https://dash.cloudflare.com/profile/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium flex items-center gap-1 hover:underline"
                    style={{ color: '#06b6d4' }}
                  >
                    {lang === 'es' ? 'Editar token en Cloudflare' : 'Edit token on Cloudflare'} \u2197
                  </a>
                  <button
                    onClick={() => { setAuditPreCheckData(null); }}
                    className="text-xs hover:underline"
                    style={{ color: '#64748b' }}
                  >
                    {lang === 'es' ? 'Verificar de nuevo' : 'Re-check'}
                  </button>
                </div>
              </div>

              {/* Consent / Proceed section */}
              {pc.can_run && (
                <div className="px-5 py-4" style={{ borderTop: '1px solid #1e293b', background: '#06b6d408' }}>
                  <button
                    onClick={handleStartAudit}
                    disabled={auditing}
                    className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                  >
                    {lang === 'es'
                      ? `Proceder con Auditor\u00eda (${tierCost.toLocaleString()} cr\u00e9ditos)`
                      : `Proceed with Audit (${tierCost.toLocaleString()} credits)`}
                  </button>
                  <p className="text-xs text-center mt-2" style={{ color: '#64748b' }}>
                    {lang === 'es'
                      ? 'Al proceder, se deducir\u00e1n los cr\u00e9ditos de tu balance. Si la auditor\u00eda falla, se reembolsar\u00e1n autom\u00e1ticamente.'
                      : 'By proceeding, credits will be deducted from your balance. If the audit fails, they will be automatically refunded.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Insufficient credits warning */}
          {!canAfford && !auditing && !pc && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
              <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>{strings.auditInsufficient}</p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {lang === 'es'
                  ? `Necesitas ${tierCost.toLocaleString()} creditos. Tu balance: ${balance.toLocaleString()}.`
                  : `You need ${tierCost.toLocaleString()} credits. Your balance: ${balance.toLocaleString()}.`}
              </p>
              <button
                onClick={() => setActiveTab('credits')}
                className="mt-2 text-sm font-medium px-4 py-1.5 rounded-lg"
                style={{ color: '#06b6d4', border: '1px solid #06b6d440' }}
              >
                {strings.buyCredits}
              </button>
            </div>
          )}

          {/* Pre-check / Start button (Step 1 — before pre-check) */}
          {!pc && !auditing && (
            <button
              onClick={handleAuditPreCheck}
              disabled={auditPreChecking || !auditZoneId.trim() || !auditApiToken.trim()}
              className="w-full py-4 rounded-lg font-semibold text-white text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
            >
              {auditPreChecking ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {lang === 'es' ? 'Verificando permisos...' : 'Verifying permissions...'}
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                  {lang === 'es' ? 'Verificar Permisos y Continuar' : 'Verify Permissions & Continue'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Scanning animation */}
        {auditing && (
          <div className="rounded-xl p-8 text-center" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            <div className="w-16 h-16 rounded-full border-4 border-t-transparent mx-auto mb-6 animate-spin" style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }} />
            <p className="text-lg font-medium text-white mb-2">{strings.auditRunning}</p>
            <p className="text-sm" style={{ color: '#06b6d4' }}>{strings.auditRunningSteps[auditStep]}</p>
            <div className="flex justify-center gap-1 mt-4">
              {strings.auditRunningSteps.map((_: any, i: number) => (
                <div key={i} className="w-2 h-2 rounded-full transition-all" style={{ background: i <= auditStep ? '#06b6d4' : '#1e293b', transform: i === auditStep ? 'scale(1.3)' : 'scale(1)' }} />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {auditError && (
          <div className="rounded-xl p-6" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
            <p className="text-sm font-medium" style={{ color: '#ef4444' }}>{auditError}</p>
          </div>
        )}

        {/* Audit history */}
        {renderAuditHistory()}
      </div>
    );
  }

  // ============================================================
  // Audit Results
  // ============================================================

  function renderAuditResults(report: AuditReport) {
    return (
      <AuditReportView
        report={report}
        lang={lang}
        onBack={handleBackToAuditForm}
        onExportPdf={() => exportAuditPdf(report)}
      />
    );
  }

  // ============================================================
  // Audit History
  // ============================================================

  function inferTierFromCredits(credits: number): { label: string; color: string; tier: string } {
    if (credits >= 5000) return { label: 'Complete', color: '#8b5cf6', tier: 'complete' };
    if (credits >= 3000) return { label: 'Pro', color: '#3b82f6', tier: 'pro' };
    return { label: 'Basic', color: '#06b6d4', tier: 'basic' };
  }

  function renderAuditHistory() {
    return (
      <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: '#1e293b' }}>
          <h3 className="font-bold text-white">{strings.auditHistory}</h3>
          <span className="text-xs" style={{ color: '#64748b' }}>{auditHistoryData.length} {lang === 'es' ? 'auditorias' : 'audits'}</span>
        </div>
        {auditHistoryData.length === 0 ? (
          <p className="p-6 text-center text-sm" style={{ color: '#94a3b8' }}>{strings.auditNoHistory}</p>
        ) : (
          <div className="p-4 space-y-3">
            {auditHistoryData.map((r: any) => {
              const gc = (s: number) => s >= 90 ? '#22c55e' : s >= 75 ? '#06b6d4' : s >= 60 ? '#f59e0b' : s >= 40 ? '#f97316' : '#ef4444';
              const tierLabel = r.tier ? r.tier.charAt(0).toUpperCase() + r.tier.slice(1) : inferTierFromCredits(r.credits_charged || 0).label;
              const tierColor = r.tier === 'complete' ? '#8b5cf6' : r.tier === 'pro' ? '#3b82f6' : '#06b6d4';
              const isCompleted = r.status === 'completed';
              const isFailed = r.status === 'failed';
              const statusColor = isCompleted ? '#22c55e' : isFailed ? '#ef4444' : '#f59e0b';
              const statusLabel = isCompleted ? strings.completed : isFailed ? strings.failed : strings.running;
              const durationStr = r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : null;

              return (
                <div
                  key={r.id}
                  className={`rounded-lg p-4 transition-all ${isCompleted ? 'cursor-pointer hover:border-cyan-800' : 'opacity-70'}`}
                  style={{ background: '#0f172a', border: `1px solid ${isCompleted ? '#1e293b' : statusColor + '30'}` }}
                  onClick={() => isCompleted && handleViewAuditReport(r.id)}
                >
                  {/* Row 1: Domain + Score + Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-white">{r.domain}</span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ background: tierColor + '15', color: tierColor, border: `1px solid ${tierColor}30` }}>
                        {tierLabel}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: statusColor + '20', color: statusColor }}>
                        {statusLabel}
                      </span>
                      {r.cf_plan && isCompleted && (
                        <span className="text-xs" style={{ color: '#64748b' }}>CF: {r.cf_plan}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {r.score != null && isCompleted && (
                        <span className="text-lg font-bold font-mono" style={{ color: gc(r.score) }}>
                          {r.score} <span className="text-xs font-normal">{r.grade}</span>
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-xs px-2 py-1 rounded" style={{ background: '#06b6d420', color: '#06b6d4' }}>
                          {strings.viewReport} \u2192
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Detailed execution info */}
                  <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: '#64748b' }}>
                    <span>{new Date(r.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {isCompleted && (
                      <>
                        {r.collectors_run != null && (
                          <span>{r.collectors_run} {lang === 'es' ? 'colectores' : 'collectors'}{r.collectors_skipped ? ` (${r.collectors_skipped} ${lang === 'es' ? 'omitidos' : 'skipped'})` : ''}</span>
                        )}
                        {r.categories_count > 0 && (
                          <span>{r.categories_count} {lang === 'es' ? 'categor\u00edas' : 'categories'}</span>
                        )}
                        {r.recommendations_count > 0 && (
                          <span style={{ color: '#f59e0b' }}>{r.recommendations_count} {lang === 'es' ? 'recomendaciones' : 'recommendations'}</span>
                        )}
                        {durationStr && <span>{durationStr}</span>}
                        <span>{(r.credits_charged || 0).toLocaleString()} cr</span>
                      </>
                    )}
                    {isFailed && r.error_message && (
                      <span style={{ color: '#ef4444' }}>{r.error_message}</span>
                    )}
                    {isFailed && (
                      <span style={{ color: '#64748b' }}>{lang === 'es' ? 'Cr\u00e9ditos reembolsados' : 'Credits refunded'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // ============================================================
  // Compliance Tab
  // ============================================================

  async function handleCompliancePreCheck() {
    if (!complianceAuditId || !complianceApiToken || !complianceAccountId) return;
    setCompliancePreChecking(true);
    setComplianceError(null);
    try {
      const fwsForPreCheck = complianceFrameworks === 'bundle' ? COMPLIANCE_FRAMEWORKS.slice(0, 5) : complianceFrameworks === 'bundle_8' ? COMPLIANCE_FRAMEWORKS : complianceFrameworks as ComplianceFramework[];
      const result = await compliancePreCheck(complianceAuditId, complianceApiToken, complianceAccountId, fwsForPreCheck);
      setCompliancePreCheckData(result);
    } catch (err: any) {
      setComplianceError(err.message || 'Pre-check failed');
    } finally {
      setCompliancePreChecking(false);
    }
  }

  async function handleRunCompliance() {
    if (!complianceAuditId || !complianceApiToken || !complianceAccountId) return;
    setComplianceRunning(true);
    setComplianceError(null);
    setComplianceResult(null);
    setComplianceReportId(null);
    setComplianceStep(0);

    const stepInterval = setInterval(() => {
      setComplianceStep((prev) => {
        const steps = (strings as any).complianceRunSteps || [];
        return prev < steps.length - 1 ? prev + 1 : prev;
      });
    }, 3000);

    try {
      const fws = complianceFrameworks === 'bundle' ? COMPLIANCE_FRAMEWORKS.slice(0, 5) : complianceFrameworks === 'bundle_8' ? COMPLIANCE_FRAMEWORKS : complianceFrameworks as ComplianceFramework[];
      // Get zone_id from the audit report data
      // The AuditReport structure has zone_id at the top level (report.data.zone_id)
      let zoneIdForApi = '';
      try {
        const auditReportData = await getAuditReport(complianceAuditId);
        // auditReportData.report.data IS the AuditReport, which has zone_id directly
        zoneIdForApi = auditReportData?.report?.data?.zone_id || '';
        if (!zoneIdForApi) {
          console.warn('Could not extract zone_id from audit report');
        }
      } catch (err) {
        console.error('Failed to get audit report for zone_id:', err);
      }

      const result = await runCompliance(complianceAuditId, zoneIdForApi, complianceApiToken, complianceAccountId, fws);
      setComplianceResult(result.report);
      setComplianceReportId(result.report_id);
      setActiveComplianceToken(complianceApiToken);
      // Refresh balance and compliance history
      try {
        const [acctData, compHistory] = await Promise.all([
          getAccount(),
          getComplianceHistory(10, 0).catch(() => ({ reports: [] })),
        ]);
        setAccount(acctData.account);
        setComplianceHistoryData(compHistory.reports || []);
      } catch {}
    } catch (err: any) {
      setComplianceError(err.message || 'Compliance analysis failed');
    } finally {
      clearInterval(stepInterval);
      setComplianceRunning(false);
    }
  }

  // Direct compliance pre-check handler
  async function handleDirectPreCheck() {
    if (!directZoneId || !directToken || !directAccountId) return;
    setDirectPreChecking(true);
    setComplianceError(null);
    try {
      const fws = complianceFrameworks === 'bundle'
        ? 'bundle'
        : complianceFrameworks === 'bundle_8'
        ? 'bundle_8'
        : complianceFrameworks as ComplianceFramework[];
      const result = await compliancePreCheckDirect(
        directZoneId,
        directToken,
        directAccountId,
        directTier,
        fws,
      );
      setDirectPreCheckData(result);
    } catch (err: any) {
      setComplianceError(err.message || 'Pre-check failed');
    } finally {
      setDirectPreChecking(false);
    }
  }

  // Direct compliance run handler
  async function handleRunDirectCompliance() {
    if (!directZoneId || !directToken || !directAccountId) return;
    setComplianceRunning(true);
    setComplianceError(null);
    setComplianceResult(null);
    setComplianceReportId(null);
    setComplianceStep(0);

    const stepInterval = setInterval(() => {
      setComplianceStep((prev) => {
        const steps = (strings as any).complianceRunSteps || [];
        return prev < steps.length - 1 ? prev + 1 : prev;
      });
    }, 4000); // Slower for direct mode (audit + compliance)

    try {
      const fws = complianceFrameworks === 'bundle'
        ? 'bundle'
        : complianceFrameworks === 'bundle_8'
        ? 'bundle_8'
        : complianceFrameworks as ComplianceFramework[];

      const result = await runComplianceDirect(
        directZoneId,
        directToken,
        directAccountId,
        directTier,
        fws,
      );

      setComplianceResult(result.report);
      setComplianceReportId(result.report_id);
      setActiveComplianceToken(directToken);

      // Refresh balance and history
      try {
        const [acctData, compHistory] = await Promise.all([
          getAccount(),
          getComplianceHistory(10, 0).catch(() => ({ reports: [] })),
        ]);
        setAccount(acctData.account);
        setComplianceHistoryData(compHistory.reports || []);
      } catch {}
    } catch (err: any) {
      setComplianceError(err.message || 'Compliance execution failed');
    } finally {
      clearInterval(stepInterval);
      setComplianceRunning(false);
    }
  }

  async function handleViewComplianceReport(id: string) {
    setLoadingReport(true);
    try {
      const data = await getComplianceReport(id);
      if (data?.report?.data) {
        setViewingComplianceReport(data.report.data as ComplianceReport);
        setViewingComplianceReportId(id);
      }
    } catch (err: any) {
      setComplianceError(err.message || 'Failed to load report');
    } finally {
      setLoadingReport(false);
    }
  }

  function handleBackToComplianceForm() {
    setComplianceResult(null);
    setComplianceReportId(null);
    setViewingComplianceReport(null);
    setViewingComplianceReportId(null);
    setCompliancePreCheckData(null);
    setComplianceError(null);
    setActiveComplianceToken('');
  }

  function renderComplianceTab() {
    // Loading state
    if (loadingReport) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
          <p style={{ color: '#94a3b8' }}>{strings.loadingReport}</p>
        </div>
      );
    }

    // If viewing a compliance report
    const currentReport = complianceResult || viewingComplianceReport;
    const currentReportId = complianceReportId || viewingComplianceReportId;
    if (currentReport && currentReportId) {
      return (
        <ReportErrorBoundary lang={lang} onBack={handleBackToComplianceForm} key={currentReportId}>
          <ComplianceReportView
            report={currentReport}
            reportId={currentReportId}
            lang={lang}
            onBack={handleBackToComplianceForm}
            apiToken={activeComplianceToken}
            onCreditsCharged={(amount) => {
              // Refresh account balance after AutoFix charges credits
              getAccount().then((data) => setAccount(data.account)).catch(() => {});
            }}
          />
        </ReportErrorBoundary>
      );
    }

    // Filter audit history to Pro/Complete only
    const eligibleAudits = auditHistoryData.filter(
      (r: any) => r.status === 'completed' && r.report_type === 'audit' && (r.tier === 'pro' || r.tier === 'complete')
    );

    const isBundle = complianceFrameworks === 'bundle';
    const isBundle8 = complianceFrameworks === 'bundle_8';
    const estimatedCost = isBundle
      ? COMPLIANCE_BUNDLE_CREDITS
      : isBundle8
        ? COMPLIANCE_BUNDLE_8_CREDITS
        : (Array.isArray(complianceFrameworks) ? complianceFrameworks : []).reduce(
            (sum, fw) => sum + (COMPLIANCE_FRAMEWORK_INFO[fw]?.credits || 800),
            0,
          );

    return (
      <div className="space-y-6">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: '#8b5cf615', border: '1px solid #8b5cf630' }}>
            {'\uD83D\uDCCB'}
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{strings.complianceTitle}</h2>
            <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{strings.complianceSubtitle}</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
          <button
            onClick={() => { setComplianceMode('direct'); setCompliancePreCheckData(null); setDirectPreCheckData(null); }}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: complianceMode === 'direct' ? '#8b5cf620' : 'transparent',
              color: complianceMode === 'direct' ? '#8b5cf6' : '#64748b',
              border: complianceMode === 'direct' ? '1px solid #8b5cf640' : '1px solid transparent',
            }}
          >
            {lang === 'es' ? 'Compliance Directo' : 'Direct Compliance'} {lang === 'es' ? '(Recomendado)' : '(Recommended)'}
          </button>
          <button
            onClick={() => { setComplianceMode('source_audit'); setCompliancePreCheckData(null); setDirectPreCheckData(null); }}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: complianceMode === 'source_audit' ? '#06b6d420' : 'transparent',
              color: complianceMode === 'source_audit' ? '#06b6d4' : '#64748b',
              border: complianceMode === 'source_audit' ? '1px solid #06b6d440' : '1px solid transparent',
            }}
          >
            {lang === 'es' ? 'Usar Audit Existente' : 'Use Existing Audit'}
          </button>
        </div>

        {/* Form */}
        <div className="rounded-xl p-5 space-y-5" style={{ background: '#111827', border: '1px solid #1e293b' }}>

          {/* ═══════════════════════════════════════════════════════════════════
              DIRECT MODE FORM
              ═══════════════════════════════════════════════════════════════════ */}
          {complianceMode === 'direct' && (
            <>
              {/* Info banner */}
              <div className="rounded-lg p-3" style={{ background: '#8b5cf610', border: '1px solid #8b5cf630' }}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{'\uD83D\uDE80'}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#c4b5fd' }}>
                      {lang === 'es' ? 'Compliance Directo' : 'Direct Compliance'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#a78bfa' }}>
                      {lang === 'es'
                        ? 'Recolecta datos frescos y ejecuta compliance en un solo paso. Incluye descuento por bundle.'
                        : 'Collect fresh data and run compliance in one step. Includes bundle discount.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Zone ID */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>1</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Zone ID</label>
                </div>
                <input
                  type="text"
                  value={directZoneId}
                  onChange={(e) => { setDirectZoneId(e.target.value); setDirectPreCheckData(null); }}
                  placeholder="78cc695ec3932c370033ac24d583f1e9"
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                  style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#f1f5f9' }}
                />
                <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>
                  {lang === 'es' ? 'Cloudflare Dashboard → Tu zona → Overview → Zone ID' : 'Cloudflare Dashboard → Your zone → Overview → Zone ID'}
                </p>
              </div>

              {/* API Token */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#06b6d420', color: '#06b6d4', border: '1px solid #06b6d440' }}>2</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>API Token</label>
                </div>
                <input
                  type="password"
                  value={directToken}
                  onChange={(e) => { setDirectToken(e.target.value); setDirectPreCheckData(null); }}
                  placeholder="nr9TdMpx..."
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                  style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#f1f5f9' }}
                />
                <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>{strings.complianceTokenHint}</p>
              </div>

              {/* Account ID */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#06b6d420', color: '#06b6d4', border: '1px solid #06b6d440' }}>3</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{strings.complianceAccountId}</label>
                </div>
                <input
                  type="text"
                  value={directAccountId}
                  onChange={(e) => { setDirectAccountId(e.target.value); setDirectPreCheckData(null); }}
                  placeholder="e3421356cff91cef..."
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                  style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#f1f5f9' }}
                />
                <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>{strings.complianceAccountIdHint}</p>
              </div>

              {/* Tier Selection */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}>4</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    {lang === 'es' ? 'Nivel de Auditoría' : 'Audit Tier'}
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" style={{
                    background: directTier === 'pro' ? '#8b5cf615' : '#0f172a',
                    border: `1px solid ${directTier === 'pro' ? '#8b5cf640' : '#1e293b'}`,
                  }}>
                    <input
                      type="radio"
                      checked={directTier === 'pro'}
                      onChange={() => { setDirectTier('pro'); setDirectPreCheckData(null); }}
                      className="accent-purple-500"
                    />
                    <div>
                      <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Pro</span>
                      <p className="text-xs" style={{ color: '#64748b' }}>3,000 {lang === 'es' ? 'créditos' : 'credits'}</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" style={{
                    background: directTier === 'complete' ? '#06b6d415' : '#0f172a',
                    border: `1px solid ${directTier === 'complete' ? '#06b6d440' : '#1e293b'}`,
                  }}>
                    <input
                      type="radio"
                      checked={directTier === 'complete'}
                      onChange={() => { setDirectTier('complete'); setDirectPreCheckData(null); }}
                      className="accent-cyan-500"
                    />
                    <div>
                      <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>Complete</span>
                      <p className="text-xs" style={{ color: '#64748b' }}>5,000 {lang === 'es' ? 'créditos' : 'credits'}</p>
                    </div>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              SOURCE AUDIT MODE FORM (Existing)
              ═══════════════════════════════════════════════════════════════════ */}
          {complianceMode === 'source_audit' && (
            <>
              {/* Info banner */}
              <div className="rounded-lg p-3" style={{ background: '#06b6d410', border: '1px solid #06b6d430' }}>
                <div className="flex items-start gap-2">
                  <span className="text-lg">{'\uD83D\uDCCB'}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#67e8f9' }}>
                      {lang === 'es' ? 'Usar Audit Existente' : 'Use Existing Audit'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#22d3ee' }}>
                      {lang === 'es'
                        ? 'Re-usa datos de un audit previo para generar compliance. Más económico si ya tienes un audit reciente.'
                        : 'Re-use data from a previous audit for compliance. More economical if you have a recent audit.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Source audit select */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>1</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    {strings.complianceSelectAudit}
                  </label>
                </div>
                <select
                  value={complianceAuditId}
                  onChange={(e) => { setComplianceAuditId(e.target.value); setCompliancePreCheckData(null); }}
                  className="w-full px-4 py-3 rounded-lg text-sm font-medium"
                  style={{
                    background: complianceAuditId ? '#8b5cf608' : '#0f172a',
                    border: complianceAuditId ? '1.5px solid #8b5cf640' : '1.5px solid #334155',
                    color: '#f1f5f9',
                    boxShadow: complianceAuditId ? '0 0 10px #8b5cf610' : 'none',
                  }}
                >
                  <option value="">{strings.complianceSelectAudit}</option>
                  {eligibleAudits.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      [{(a.tier || '?').toUpperCase()}] {a.domain} {'\u2014'} {a.score != null ? `${a.score}/${a.grade}` : a.grade || '?'} {'\u2014'} {new Date(a.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                {eligibleAudits.length === 0 && (
                  <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg" style={{ background: '#f59e0b08', border: '1px solid #f59e0b20' }}>
                    <span>{'\u26A0\uFE0F'}</span>
                    <p className="text-xs font-medium" style={{ color: '#f59e0b' }}>{strings.complianceNoAudits}</p>
                  </div>
                )}
              </div>

              {/* API Token */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#06b6d420', color: '#06b6d4', border: '1px solid #06b6d440' }}>2</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    API Token
                  </label>
                </div>
                <input
                  type="password"
                  value={complianceApiToken}
                  onChange={(e) => { setComplianceApiToken(e.target.value); setCompliancePreCheckData(null); }}
                  placeholder="nr9TdMpx..."
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                  style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#f1f5f9' }}
                />
                <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>{strings.complianceTokenHint}</p>
              </div>

              {/* Account ID */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#06b6d420', color: '#06b6d4', border: '1px solid #06b6d440' }}>3</span>
                  <label className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                    {strings.complianceAccountId}
                  </label>
                </div>
                <input
                  type="text"
                  value={complianceAccountId}
                  onChange={(e) => { setComplianceAccountId(e.target.value); setCompliancePreCheckData(null); }}
                  placeholder="e3421356cff91cef..."
                  className="w-full px-4 py-3 rounded-lg text-sm font-mono"
                  style={{ background: '#0f172a', border: '1.5px solid #334155', color: '#f1f5f9' }}
                />
                <p className="text-xs mt-1.5" style={{ color: '#64748b' }}>{strings.complianceAccountIdHint}</p>
              </div>
            </>
          )}

          {/* Token permissions info panel */}
          {(() => {
            const preCheckData = complianceMode === 'direct' ? directPreCheckData : compliancePreCheckData;
            return (
              <div className="rounded-lg p-4 space-y-3" style={{ background: '#0c1222', border: '1px solid #1e293b' }}>
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="7" stroke="#06b6d4" strokeWidth="1.5" />
                    <path d="M8 4v5M8 11v1" stroke="#06b6d4" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>{strings.permsPanelTitle}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{strings.permsPanelDesc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Zone-scoped permissions */}
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>{strings.permsPanelZoneScope}</p>
                    <div className="space-y-1">
                      {['Zone:Read', 'Analytics:Read', 'Firewall Services:Read', 'DNS:Read', 'SSL and Certificates:Read', 'Logs:Read', 'Page Shield:Read', 'Health Checks:Read'].map((perm) => {
                        const isAvailable = preCheckData?.token_permissions?.available?.includes(perm);
                        const isMissing = preCheckData?.token_permissions?.missing?.includes(perm);
                        const hasData = preCheckData != null;
                        return (
                          <div key={perm} className="flex items-center gap-1.5 text-xs" style={{ color: hasData ? (isAvailable ? '#22c55e' : isMissing ? '#f59e0b' : '#475569') : '#475569' }}>
                            {hasData ? (isAvailable ? '\u2713' : isMissing ? '\u2717' : '\u2022') : '\u2022'} {perm}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Account-scoped permissions */}
                  <div>
                    <p className="text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>{strings.permsPanelAccountScope}</p>
                    <div className="space-y-1">
                      {['Account Access: Audit Logs', 'Notifications:Read'].map((perm) => {
                        const isAvailable = preCheckData?.token_permissions?.available?.includes(perm);
                        const isMissing = preCheckData?.token_permissions?.missing?.includes(perm);
                        const hasData = preCheckData != null;
                        return (
                          <div key={perm} className="flex items-center gap-1.5 text-xs" style={{ color: hasData ? (isAvailable ? '#22c55e' : isMissing ? '#f59e0b' : '#475569') : '#475569' }}>
                            {hasData ? (isAvailable ? '\u2713' : isMissing ? '\u2717' : '\u2022') : '\u2022'} {perm}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <a
                  href="https://dash.cloudflare.com/profile/api-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: '#06b6d4' }}
                >
                  {strings.permsPanelCreateLink} {'\u2197'}
                </a>
              </div>
            );
          })()}

          {/* Missing permissions warning (after pre-check) */}
          {(() => {
            const preCheckData = complianceMode === 'direct' ? directPreCheckData : compliancePreCheckData;
            if (!preCheckData || preCheckData.token_permissions.missing.length === 0) return null;
            return (
              <div className="rounded-lg p-4 space-y-2" style={{ background: '#f59e0b08', border: '1px solid #f59e0b30' }}>
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M9 1L17 16H1L9 1Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M9 7v4M9 13v1" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>{strings.permsMissingTitle}</span>
                </div>
                <p className="text-xs" style={{ color: '#d97706' }}>
                  {strings.permsMissingDesc.replace('{count}', String(preCheckData.token_permissions.controls_limited))}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {preCheckData.token_permissions.missing.map((perm: string) => (
                    <span key={perm} className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}>
                      {perm}
                    </span>
                  ))}
                </div>
                <p className="text-xs mt-1" style={{ color: '#92400e' }}>{strings.permsMissingAction}</p>
              </div>
            );
          })()}

          {/* Framework selection */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>
              {strings.complianceSelectFrameworks}
            </label>
            <div className="space-y-2">
              {/* Bundle 8 option (all frameworks) */}
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" style={{
                background: isBundle8 ? '#06b6d415' : '#0f172a',
                border: `1px solid ${isBundle8 ? '#06b6d440' : '#1e293b'}`,
              }}>
                <input
                  type="radio"
                  checked={isBundle8}
                  onChange={() => setComplianceFrameworks('bundle_8')}
                  className="accent-cyan-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{strings.complianceBundle8}</span>
                  <span className="text-xs ml-2" style={{ color: '#22c55e' }}>{strings.complianceBundle8Save}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: '#06b6d4' }}>{COMPLIANCE_BUNDLE_8_CREDITS} {strings.complianceCost}</span>
              </label>
              {/* Bundle 5 option */}
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" style={{
                background: isBundle ? '#8b5cf615' : '#0f172a',
                border: `1px solid ${isBundle ? '#8b5cf640' : '#1e293b'}`,
              }}>
                <input
                  type="radio"
                  checked={isBundle}
                  onChange={() => setComplianceFrameworks('bundle')}
                  className="accent-purple-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{strings.complianceBundle}</span>
                  <span className="text-xs ml-2" style={{ color: '#22c55e' }}>{strings.complianceBundleSave}</span>
                </div>
                <span className="text-sm font-bold" style={{ color: '#8b5cf6' }}>{COMPLIANCE_BUNDLE_CREDITS} {strings.complianceCost}</span>
              </label>
              {/* Individual frameworks */}
              {COMPLIANCE_FRAMEWORKS.map((fw) => {
                const info = COMPLIANCE_FRAMEWORK_INFO[fw];
                const selected = !isBundle && !isBundle8 && Array.isArray(complianceFrameworks) && complianceFrameworks.includes(fw);
                return (
                  <label key={fw} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all" style={{
                    background: selected ? '#06b6d410' : '#0f172a',
                    border: `1px solid ${selected ? '#06b6d430' : '#1e293b'}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {
                        if (isBundle || isBundle8) {
                          setComplianceFrameworks([fw]);
                          return;
                        }
                        const arr = Array.isArray(complianceFrameworks) ? complianceFrameworks : [];
                        if (arr.includes(fw)) {
                          const next = arr.filter((f) => f !== fw);
                          setComplianceFrameworks(next.length === 0 ? 'bundle_8' : next);
                        } else {
                          const next = [...arr, fw];
                          setComplianceFrameworks(next.length === COMPLIANCE_FRAMEWORKS.length ? 'bundle_8' : next);
                        }
                      }}
                      className="accent-cyan-500"
                    />
                    <span className="text-sm flex-1 flex items-center gap-1" style={{ color: '#f1f5f9' }}>
                      {info.label[lang]}
                      <FrameworkTooltip text={info.tooltip[lang]} />
                    </span>
                    <span className="text-xs font-bold" style={{ color: '#06b6d4' }}>{info.credits} {strings.complianceCost}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Pre-check button - DIRECT MODE */}
          {complianceMode === 'direct' && !directPreCheckData && (
            <button
              onClick={handleDirectPreCheck}
              disabled={!directZoneId || !directToken || !directAccountId || directPreChecking}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                background: (!directZoneId || !directToken || !directAccountId) ? '#1e293b' : 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                color: (!directZoneId || !directToken || !directAccountId) ? '#475569' : '#fff',
                boxShadow: (!directZoneId || !directToken || !directAccountId) ? 'none' : '0 4px 20px #8b5cf640',
                border: 'none',
              }}
            >
              {directPreChecking ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {strings.compliancePreChecking}
                </>
              ) : (
                <>
                  <span>{'\uD83D\uDD0D'}</span>
                  {strings.compliancePreCheck}
                </>
              )}
            </button>
          )}

          {/* Pre-check results - DIRECT MODE */}
          {complianceMode === 'direct' && directPreCheckData && (
            <div className="rounded-lg p-4 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{
                  background: '#22c55e15',
                  color: '#22c55e',
                }}>
                  {lang === 'es' ? 'Datos Frescos' : 'Fresh Data'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{
                  background: directPreCheckData.token_permissions.missing.length === 0 ? '#22c55e15' : '#f5970b15',
                  color: directPreCheckData.token_permissions.missing.length === 0 ? '#22c55e' : '#f59e0b',
                }}>
                  {directPreCheckData.token_permissions.missing.length === 0
                    ? strings.compliancePermsOk
                    : `${directPreCheckData.token_permissions.missing.length} ${strings.compliancePermsMissing}`}
                </span>
                {directPreCheckData.token_permissions.controls_limited > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ background: '#f5970b15', color: '#f59e0b' }}>
                    {directPreCheckData.token_permissions.controls_limited} {strings.complianceControlsLimited}
                  </span>
                )}
              </div>
              {/* Cost breakdown */}
              <div className="rounded-lg p-3 space-y-1.5" style={{ background: '#111827' }}>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#64748b' }}>{lang === 'es' ? 'Audit' : 'Audit'} ({directPreCheckData.cost_breakdown.audit_tier})</span>
                  <span style={{ color: '#94a3b8' }}>{directPreCheckData.cost_breakdown.audit_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#64748b' }}>{lang === 'es' ? 'Compliance' : 'Compliance'} ({directPreCheckData.cost_breakdown.frameworks})</span>
                  <span style={{ color: '#94a3b8' }}>{directPreCheckData.cost_breakdown.compliance_cost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: '#22c55e' }}>{lang === 'es' ? 'Descuento' : 'Discount'}</span>
                  <span style={{ color: '#22c55e' }}>-{directPreCheckData.cost_breakdown.discount.toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between text-sm font-bold">
                  <span style={{ color: '#e2e8f0' }}>Total</span>
                  <span style={{ color: '#8b5cf6' }}>{directPreCheckData.cost_breakdown.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#94a3b8' }}>
                  {strings.complianceCost}: <span className="font-bold" style={{ color: '#8b5cf6' }}>{directPreCheckData.credits_required.toLocaleString()}</span>
                </span>
                <span style={{ color: directPreCheckData.insufficient_credits ? '#ef4444' : '#94a3b8' }}>
                  Balance: <span className="font-bold">{directPreCheckData.credits_available.toLocaleString()}</span>
                </span>
              </div>
              {directPreCheckData.insufficient_credits && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{strings.complianceInsufficient}</p>
              )}
            </div>
          )}

          {/* Run button - DIRECT MODE */}
          {complianceMode === 'direct' && directPreCheckData && !directPreCheckData.insufficient_credits && (
            <button
              onClick={handleRunDirectCompliance}
              disabled={complianceRunning}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                color: '#fff',
                boxShadow: '0 4px 15px #8b5cf640',
              }}
            >
              {complianceRunning ? strings.complianceRunning : `${strings.complianceRun} (${directPreCheckData.credits_required.toLocaleString()} ${strings.complianceCost})`}
            </button>
          )}

          {/* Pre-check button - SOURCE AUDIT MODE */}
          {complianceMode === 'source_audit' && !compliancePreCheckData && (
            <button
              onClick={handleCompliancePreCheck}
              disabled={!complianceAuditId || !complianceApiToken || !complianceAccountId || compliancePreChecking}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                background: (!complianceAuditId || !complianceApiToken || !complianceAccountId) ? '#1e293b' : 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                color: (!complianceAuditId || !complianceApiToken || !complianceAccountId) ? '#475569' : '#fff',
                boxShadow: (!complianceAuditId || !complianceApiToken || !complianceAccountId) ? 'none' : '0 4px 20px #8b5cf640',
                border: 'none',
              }}
            >
              {compliancePreChecking ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {strings.compliancePreChecking}
                </>
              ) : (
                <>
                  <span>{'\uD83D\uDD0D'}</span>
                  {strings.compliancePreCheck}
                </>
              )}
            </button>
          )}

          {/* Pre-check results - SOURCE AUDIT MODE */}
          {complianceMode === 'source_audit' && compliancePreCheckData && (
            <div className="rounded-lg p-4 space-y-3" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{
                  background: compliancePreCheckData.source_audit.is_stale ? '#f59e0b15' : '#22c55e15',
                  color: compliancePreCheckData.source_audit.is_stale ? '#f59e0b' : '#22c55e',
                }}>
                  {compliancePreCheckData.source_audit.is_stale ? strings.complianceStale : strings.complianceFresh}
                  {' '}({compliancePreCheckData.source_audit.age_days}d)
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{
                  background: compliancePreCheckData.token_permissions.missing.length === 0 ? '#22c55e15' : '#f5970b15',
                  color: compliancePreCheckData.token_permissions.missing.length === 0 ? '#22c55e' : '#f59e0b',
                }}>
                  {compliancePreCheckData.token_permissions.missing.length === 0
                    ? strings.compliancePermsOk
                    : `${compliancePreCheckData.token_permissions.missing.length} ${strings.compliancePermsMissing}`}
                </span>
                {compliancePreCheckData.token_permissions.controls_limited > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full" style={{ background: '#f5970b15', color: '#f59e0b' }}>
                    {compliancePreCheckData.token_permissions.controls_limited} {strings.complianceControlsLimited}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: '#94a3b8' }}>
                  {strings.complianceCost}: <span className="font-bold" style={{ color: '#8b5cf6' }}>{estimatedCost}</span>
                </span>
                <span style={{ color: compliancePreCheckData.insufficient_credits ? '#ef4444' : '#94a3b8' }}>
                  Balance: <span className="font-bold">{compliancePreCheckData.credits_available}</span>
                </span>
              </div>
              {compliancePreCheckData.insufficient_credits && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{strings.complianceInsufficient}</p>
              )}
            </div>
          )}

          {/* Run button - SOURCE AUDIT MODE */}
          {complianceMode === 'source_audit' && compliancePreCheckData && !compliancePreCheckData.insufficient_credits && (
            <button
              onClick={handleRunCompliance}
              disabled={complianceRunning}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)',
                color: '#fff',
                boxShadow: '0 4px 15px #8b5cf640',
              }}
            >
              {complianceRunning ? strings.complianceRunning : `${strings.complianceRun} (${estimatedCost} ${strings.complianceCost})`}
            </button>
          )}

          {/* Running animation */}
          {complianceRunning && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#8b5cf608', border: '1px solid #8b5cf620' }}>
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#8b5cf6', borderTopColor: 'transparent' }} />
              <span className="text-sm" style={{ color: '#8b5cf6' }}>
                {((strings as any).complianceRunSteps || [])[complianceStep] || strings.complianceRunning}
              </span>
            </div>
          )}

          {/* Error */}
          {complianceError && (
            <div className="p-3 rounded-lg text-sm" style={{ background: '#ef444410', border: '1px solid #ef444430', color: '#ef4444' }}>
              {complianceError}
            </div>
          )}
        </div>

        {/* Compliance History */}
        {renderComplianceHistory()}
      </div>
    );
  }

  function renderComplianceHistory() {
    const complianceReports = complianceHistoryData;
    const fwShortNames: Record<string, string> = {
      pci_dss_4: 'PCI',
      iso_27001: 'ISO',
      soc2_type2: 'SOC2',
      lfpdppp: 'LFPDPPP',
      gdpr: 'GDPR',
      nist_800_53: 'NIST 800-53',
      nist_csf: 'NIST CSF',
      infra_baseline: 'Infra',
    };
    const fwColors: Record<string, string> = {
      pci_dss_4: '#3b82f6',
      iso_27001: '#8b5cf6',
      soc2_type2: '#06b6d4',
      lfpdppp: '#22c55e',
      gdpr: '#f59e0b',
      nist_800_53: '#ef4444',
      nist_csf: '#f97316',
      infra_baseline: '#14b8a6',
    };

    function toggleCompare(id: string) {
      setComplianceCompareIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
    }

    const canCompare = complianceCompareIds.length === 2;
    const reportA = canCompare ? complianceReports.find((r: any) => r.id === complianceCompareIds[0]) : null;
    const reportB = canCompare ? complianceReports.find((r: any) => r.id === complianceCompareIds[1]) : null;

    return (
      <div className="space-y-4">
        <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e293b' }}>
            <h3 className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>{strings.complianceHistory}</h3>
            {complianceReports.length >= 2 && (
              <div className="flex items-center gap-2">
                {complianceCompareIds.length < 2 && (
                  <span className="text-xs" style={{ color: '#64748b' }}>{strings.complianceCompareSelect}</span>
                )}
                {canCompare && (
                  <button
                    onClick={() => setComplianceCompareOpen(true)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf630' }}
                  >
                    {strings.complianceCompareBtn}
                  </button>
                )}
              </div>
            )}
          </div>
          {complianceReports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#0f172a' }}>
                    {complianceReports.length >= 2 && (
                      <th className="px-3 py-2.5 text-center font-medium" style={{ color: '#64748b', width: 40 }}>{strings.complianceCompare}</th>
                    )}
                    <th className="px-4 py-2.5 text-left font-medium" style={{ color: '#64748b' }}>{strings.domain}</th>
                    <th className="px-4 py-2.5 text-center font-medium" style={{ color: '#64748b' }}>{strings.score}</th>
                    <th className="px-4 py-2.5 text-center font-medium" style={{ color: '#64748b' }}>{strings.complianceFrameworksCol}</th>
                    <th className="px-4 py-2.5 text-center font-medium" style={{ color: '#64748b' }}>{strings.complianceCreditsCol}</th>
                    <th className="px-4 py-2.5 text-center font-medium" style={{ color: '#64748b' }}>{strings.status}</th>
                    <th className="px-4 py-2.5 text-right font-medium" style={{ color: '#64748b' }}>{strings.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceReports.map((r: any) => {
                    const isSelected = complianceCompareIds.includes(r.id);
                    return (
                      <tr
                        key={r.id}
                        className="cursor-pointer hover:bg-[#ffffff04] transition-colors"
                        style={{ borderTop: '1px solid #1e293b', background: isSelected ? '#8b5cf608' : undefined }}
                        onClick={() => r.status === 'completed' && handleViewComplianceReport(r.id)}
                      >
                        {complianceReports.length >= 2 && (
                          <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCompare(r.id)}
                              className="accent-purple-500"
                              disabled={r.status !== 'completed'}
                            />
                          </td>
                        )}
                        <td className="px-4 py-2.5" style={{ color: '#f1f5f9' }}>{r.domain}</td>
                        <td className="px-4 py-2.5 text-center">
                          {r.score != null ? (
                            <span className="font-mono font-bold" style={{ color: r.score >= 75 ? '#22c55e' : r.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                              {r.score} {r.grade && `(${r.grade})`}
                            </span>
                          ) : '\u2014'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {(r.frameworks || []).map((fw: string) => (
                              <span key={fw} className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: (fwColors[fw] || '#64748b') + '15', color: fwColors[fw] || '#64748b', fontSize: '0.6rem' }}>
                                {fwShortNames[fw] || fw}
                              </span>
                            ))}
                            {r.type === 'bundle' && (
                              <span className="inline-block px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: '#8b5cf615', color: '#8b5cf6', fontSize: '0.6rem' }}>BUNDLE</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-mono text-xs" style={{ color: '#94a3b8' }}>{r.credits_charged || '\u2014'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-xs" style={{
                            background: r.status === 'completed' ? '#22c55e15' : r.status === 'failed' ? '#ef444415' : '#f59e0b15',
                            color: r.status === 'completed' ? '#22c55e' : r.status === 'failed' ? '#ef4444' : '#f59e0b',
                          }}>
                            {r.status === 'completed' ? strings.completed : r.status === 'failed' ? strings.failed : strings.running}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right" style={{ color: '#64748b' }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-sm" style={{ color: '#64748b' }}>
              {strings.complianceNoHistory}
            </div>
          )}
        </div>

        {/* Comparison panel */}
        {complianceCompareOpen && reportA && reportB && (
          <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #8b5cf630' }}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1e293b', background: '#8b5cf608' }}>
              <h3 className="text-sm font-bold" style={{ color: '#8b5cf6' }}>{strings.complianceCompareTitle}</h3>
              <button
                onClick={() => { setComplianceCompareOpen(false); setComplianceCompareIds([]); }}
                className="text-xs px-3 py-1 rounded-lg"
                style={{ color: '#94a3b8', background: '#1e293b' }}
              >
                {strings.complianceCompareClose}
              </button>
            </div>
            <div className="p-4">
              {/* Overall comparison */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{new Date(reportA.created_at).toLocaleDateString()}</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: (reportA.score ?? 0) >= 75 ? '#22c55e' : (reportA.score ?? 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {reportA.score ?? '\u2014'} <span className="text-sm">{reportA.grade || ''}</span>
                  </p>
                </div>
                <div className="text-center flex flex-col items-center justify-center">
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{strings.complianceCompareDelta}</p>
                  {reportA.score != null && reportB.score != null ? (() => {
                    const delta = reportB.score - reportA.score;
                    return (
                      <p className="text-xl font-bold font-mono" style={{ color: delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#94a3b8' }}>
                        {delta > 0 ? '+' : ''}{delta}
                      </p>
                    );
                  })() : <p style={{ color: '#64748b' }}>{'\u2014'}</p>}
                </div>
                <div className="text-center">
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>{new Date(reportB.created_at).toLocaleDateString()}</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: (reportB.score ?? 0) >= 75 ? '#22c55e' : (reportB.score ?? 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {reportB.score ?? '\u2014'} <span className="text-sm">{reportB.grade || ''}</span>
                  </p>
                </div>
              </div>

              {/* Per-framework comparison */}
              {(reportA.framework_scores && reportB.framework_scores) ? (
                <div className="space-y-2">
                  {Object.keys({ ...reportA.framework_scores, ...reportB.framework_scores }).map((fw) => {
                    const a = reportA.framework_scores?.[fw];
                    const b = reportB.framework_scores?.[fw];
                    const delta = (a && b) ? b.score - a.score : null;
                    return (
                      <div key={fw} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
                        <span className="text-xs font-bold w-16" style={{ color: fwColors[fw] || '#94a3b8' }}>{fwShortNames[fw] || fw}</span>
                        <div className="flex-1 grid grid-cols-3 gap-2 text-center text-xs">
                          <span className="font-mono" style={{ color: a ? ((a.score >= 75) ? '#22c55e' : (a.score >= 50) ? '#f59e0b' : '#ef4444') : '#64748b' }}>
                            {a ? `${a.score} (${a.grade})` : '\u2014'}
                          </span>
                          <span className="font-mono font-bold" style={{ color: delta != null ? (delta > 0 ? '#22c55e' : delta < 0 ? '#ef4444' : '#94a3b8') : '#64748b' }}>
                            {delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '\u2014'}
                          </span>
                          <span className="font-mono" style={{ color: b ? ((b.score >= 75) ? '#22c55e' : (b.score >= 50) ? '#f59e0b' : '#ef4444') : '#64748b' }}>
                            {b ? `${b.score} (${b.grade})` : '\u2014'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-center" style={{ color: '#64748b' }}>{strings.complianceCompareNoData}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================
  // Simulation Tab
  // ============================================================

  const SIM_MODULES = [
    { id: 'waf_bypass', es: 'WAF Bypass / OWASP', en: 'WAF Bypass / OWASP', color: '#ef4444', tests: 12 },
    { id: 'rate_limit', es: 'Rate Limiting / DDoS', en: 'Rate Limiting / DDoS', color: '#f59e0b', tests: 8 },
    { id: 'bot_evasion', es: 'Evasi\u00f3n de Bots', en: 'Bot Evasion', color: '#8b5cf6', tests: 10 },
    { id: 'custom_rule_bypass', es: 'Bypass Reglas Custom', en: 'Custom Rule Bypass', color: '#06b6d4', tests: 8 },
    { id: 'ip_geo_access', es: 'Control IP/Geo', en: 'IP/Geo Control', color: '#10b981', tests: 6 },
    { id: 'ssl_tls', es: 'SSL/TLS', en: 'SSL/TLS', color: '#3b82f6', tests: 8 },
    { id: 'cache_poisoning', es: 'Cache Poisoning', en: 'Cache Poisoning', color: '#ec4899', tests: 8 },
    { id: 'api_security', es: 'Seguridad API', en: 'API Security', color: '#f97316', tests: 8 },
    { id: 'challenge_analysis', es: 'An\u00e1lisis Challenge', en: 'Challenge Analysis', color: '#64748b', tests: 8 },
  ];

  async function handleSimPreCheck() {
    if (!simZoneId.trim() || !simApiToken.trim() || simPreChecking) return;
    setSimPreChecking(true);
    setSimPreCheckData(null);
    setSimError(null);
    setDiscoveredTargets([]);
    setSelectedTargets([]);
    try {
      const result = await simulationPreCheck(simZoneId.trim(), simApiToken.trim(), simAccountId.trim() || undefined);
      setSimPreCheckData(result);
    } catch (err: any) {
      setSimError(err.message || (lang === 'es' ? 'Error al verificar permisos' : 'Permission check failed'));
    } finally {
      setSimPreChecking(false);
    }
  }

  async function handleLoadTargets() {
    if (!simZoneId.trim() || !simApiToken.trim() || loadingTargets) return;
    setLoadingTargets(true);
    setSimError(null);
    try {
      const targets = await getSimulationTargets(simZoneId.trim(), simApiToken.trim());
      setDiscoveredTargets(targets);
      // Auto-select apex only
      const apex = targets.find(t => t.is_apex);
      if (apex) {
        setSelectedTargets([apex.name]);
      }
    } catch (err: any) {
      setSimError(err.message || (lang === 'es' ? 'Error al cargar subdominios' : 'Failed to load subdomains'));
    } finally {
      setLoadingTargets(false);
    }
  }

  function toggleTargetSelection(domain: string) {
    setSelectedTargets(prev => {
      if (prev.includes(domain)) {
        // Don't allow unselecting if it's the only one selected
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== domain);
      } else {
        // Max 5 targets
        if (prev.length >= 5) {
          setSimError(lang === 'es' ? 'Máximo 5 dominios permitidos' : 'Maximum 5 domains allowed');
          return prev;
        }
        return [...prev, domain];
      }
    });
  }

  async function handleSimulation() {
    if (!simZoneId.trim() || !simApiToken.trim() || !simAccountId.trim() || simulating) return;
    setSimulating(true);
    setSimResult(null);
    setViewingSimReport(null);
    setSimError(null);
    setSimPreCheckData(null);
    setSimStep(0);
    setSimPhase('intelligence');
    setSimModuleIndex(0);
    setSimCounts({ blocked: 0, challenged: 0, bypassed: 0, tested: 0 });

    // Animated phases (cosmetic progress while polling)
    let modIdx = 0;
    let counters = { blocked: 0, challenged: 0, bypassed: 0, tested: 0 };

    const phaseTimer = setInterval(() => {
      const elapsed = Date.now() - startTs;
      if (elapsed < 12000) {
        // Phase 1: Intelligence (0-12s)
        setSimPhase('intelligence');
        setSimStep(Math.min(Math.floor(elapsed / 3000), 3));
      } else if (elapsed < 55000) {
        // Phase 2: Probing (12-55s)
        setSimPhase('probing');
        const probingElapsed = elapsed - 12000;
        const newModIdx = Math.min(Math.floor(probingElapsed / 4800), 8);
        if (newModIdx !== modIdx) {
          modIdx = newModIdx;
          setSimModuleIndex(modIdx);
          const b = Math.floor(Math.random() * 3) + 1;
          const c = Math.random() > 0.7 ? 1 : 0;
          const bp = Math.random() > 0.8 ? 1 : 0;
          counters = {
            tested: counters.tested + b + c + bp,
            blocked: counters.blocked + b,
            challenged: counters.challenged + c,
            bypassed: counters.bypassed + bp,
          };
          setSimCounts({ ...counters });
        }
        setSimStep(4 + Math.min(Math.floor(probingElapsed / 8000), 4));
      } else {
        // Phase 3: Correlation (55s+)
        setSimPhase('correlation');
        setSimStep(Math.min(10 + Math.floor((elapsed - 55000) / 4000), 11));
      }
    }, 800);
    const startTs = Date.now();

    try {
      // Step 1: Start simulation (returns immediately with report_id)
      const startResult = await startSimulation(
        simZoneId.trim(), 
        simApiToken.trim(), 
        simAccountId.trim(),
        selectedTargets.length > 0 
          ? { domains: selectedTargets }
          : {}
      );

      // Step 2: Poll for completion. The backend runs the simulation async via waitUntil().
      const finalReport = await pollSimulationStatus(startResult.report_id, {
        intervalMs: 4000,
        maxAttempts: 90,
        onStatus: (_status, _report) => {
          // Could update progress UI here in the future
        },
      });

      clearInterval(phaseTimer);
      // finalReport is the full DB row; the simulation data lives in .data
      setSimResult(finalReport.data);

      const [accountData, simHistData] = await Promise.all([
        getAccount().catch(() => null),
        getSimulationHistory(10, 0).catch(() => null),
      ]);
      if (accountData) setAccount(accountData.account);
      if (simHistData) setSimHistoryData(simHistData.reports || []);
    } catch (err: any) {
      clearInterval(phaseTimer);
      if (err.creditsRefunded) {
        setSimError(
          lang === 'es'
            ? `La simulaci\u00f3n fall\u00f3: ${err.message}. Los cr\u00e9ditos fueron reembolsados.`
            : `Simulation failed: ${err.message}. Credits were refunded.`
        );
      } else {
        setSimError(err.message || 'Simulation failed');
      }
      // Refresh data even on failure to show updated credit balance
      const [accountData, simHistData] = await Promise.all([
        getAccount().catch(() => null),
        getSimulationHistory(10, 0).catch(() => null),
      ]);
      if (accountData) setAccount(accountData.account);
      if (simHistData) setSimHistoryData(simHistData.reports || []);
    } finally {
      setSimulating(false);
      setSimPhase(null);
    }
  }

  function handleBackToSimForm() {
    setSimResult(null);
    setViewingSimReport(null);
    setSimError(null);
    setSimPreCheckData(null);
  }

  async function handleViewSimReport(reportId: string) {
    setLoadingReport(true);
    setSimError(null);
    try {
      const { report } = await getSimulationReport(reportId);
      if (!report) {
        setSimError(lang === 'es' ? 'Reporte no encontrado.' : 'Report not found.');
        return;
      }
      if (report.status === 'running') {
        // Report is still running \u2014 start polling for it
        setLoadingReport(false);
        setSimulating(true);
        setSimPhase('probing');
        setSimStep(5);
        const pollStartTs = Date.now();
        const phaseTimer = setInterval(() => {
          const elapsed = Date.now() - pollStartTs;
          if (elapsed < 20000) {
            setSimPhase('probing');
            setSimStep(5 + Math.min(Math.floor(elapsed / 5000), 3));
          } else {
            setSimPhase('correlation');
            setSimStep(Math.min(10 + Math.floor((elapsed - 20000) / 4000), 11));
          }
        }, 800);
        try {
          const finalReport = await pollSimulationStatus(reportId, {
            intervalMs: 4000,
            maxAttempts: 60,
          });
          clearInterval(phaseTimer);
          if (finalReport.data?.test_results) {
            setViewingSimReport(finalReport.data);
          } else {
            setSimError(lang === 'es'
              ? 'Los datos del reporte est\u00e1n incompletos.'
              : 'Report data is incomplete.');
          }
        } catch (pollErr: any) {
          clearInterval(phaseTimer);
          setSimError(pollErr.message || (lang === 'es' ? 'Error al esperar resultados' : 'Error waiting for results'));
        } finally {
          setSimulating(false);
          setSimPhase(null);
        }
        return;
      }
      if (report.status === 'failed') {
        const errMsg = report.data?.error || (lang === 'es' ? 'Error desconocido' : 'Unknown error');
        const refundNote = report.credits_charged === 0
          ? (lang === 'es' ? ' Los cr\u00e9ditos fueron reembolsados.' : ' Credits were refunded.')
          : '';
        setSimError(lang === 'es'
          ? `La simulaci\u00f3n fall\u00f3: ${errMsg}.${refundNote}`
          : `Simulation failed: ${errMsg}.${refundNote}`);
        return;
      }
      // status === 'completed'
      if (report.data && report.data.test_results) {
        setViewingSimReport(report.data);
      } else {
        setSimError(lang === 'es'
          ? 'Los datos del reporte est\u00e1n incompletos o corruptos.'
          : 'Report data is incomplete or corrupt.');
      }
    } catch (err: any) {
      setSimError(err.message || (lang === 'es' ? 'Error al cargar el reporte' : 'Failed to load report'));
    } finally {
      setLoadingReport(false);
    }
  }

  function renderSimulationTab() {
    // Loading state
    if (loadingReport) {
      return (
        <div className="rounded-xl p-8 text-center" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-3 animate-spin" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
          <p style={{ color: '#94a3b8' }}>{strings.loading}</p>
        </div>
      );
    }

    // If viewing report
    const currentReport = simResult || viewingSimReport;
    if (currentReport) {
      return (
        <ReportErrorBoundary lang={lang} onBack={handleBackToSimForm} key={currentReport?.id || 'sim-report'}>
          <SimulationReportView
            report={currentReport}
            lang={lang}
            onBack={handleBackToSimForm}
          />
        </ReportErrorBoundary>
      );
    }

    const balance = account ? parseFloat(account.credit_balance) : 0;
    const canAfford = balance >= SIMULATION_CREDIT_COST;
    const spc = simPreCheckData;

    return (
      <div className="space-y-8">
        {/* Simulation form */}
        <div className="rounded-xl p-6" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">{strings.simTitle}</h2>
            <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>{strings.simSubtitle}</p>
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{strings.simZoneId}</label>
              <input
                type="text"
                value={simZoneId}
                onChange={(e) => { setSimZoneId(e.target.value); setSimPreCheckData(null); }}
                placeholder={strings.simZoneIdPlaceholder}
                disabled={simulating}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm"
                style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{strings.simApiToken}</label>
              <input
                type="password"
                value={simApiToken}
                onChange={(e) => { setSimApiToken(e.target.value); setSimPreCheckData(null); }}
                placeholder={strings.simApiTokenPlaceholder}
                disabled={simulating}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm"
                style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#94a3b8' }}>{strings.simAccountId}</label>
              <input
                type="text"
                value={simAccountId}
                onChange={(e) => { setSimAccountId(e.target.value); setSimPreCheckData(null); }}
                placeholder={strings.simAccountIdPlaceholder}
                disabled={simulating}
                className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 font-mono text-sm"
                style={{ background: '#0a0a0f', border: '1px solid #1e293b' }}
              />
            </div>
          </div>

          {/* Token permissions info panel (static, updates after pre-check) */}
          <div className="rounded-lg p-4 space-y-3 mb-6" style={{ background: '#0c1222', border: '1px solid #1e293b' }}>
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M8 4v5M8 11v1" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                {lang === 'es' ? 'Permisos Requeridos del Token' : 'Required Token Permissions'}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>
              {lang === 'es'
                ? 'Tu token API de Cloudflare necesita los siguientes permisos. Zone:Read y Firewall Services:Read son obligatorios. Los dem\u00e1s mejoran la cobertura del an\u00e1lisis.'
                : 'Your Cloudflare API token needs the following permissions. Zone:Read and Firewall Services:Read are mandatory. The rest improve analysis coverage.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Zone-scoped permissions */}
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                  {lang === 'es' ? 'Permisos de Zona' : 'Zone-Scoped Permissions'}
                </p>
                <div className="space-y-1">
                  {['Zone:Read', 'Analytics:Read', 'Firewall Services:Read', 'DNS:Read', 'SSL and Certificates:Read', 'Logs:Read', 'Page Shield:Read', 'Health Checks:Read'].map((perm) => {
                    const isAvailable = spc?.permissions?.available?.includes(perm);
                    const isMissing = spc?.permissions?.missing?.includes(perm);
                    const isRequired = ['Zone:Read', 'Firewall Services:Read'].includes(perm);
                    const hasData = spc != null;
                    return (
                      <div key={perm} className="flex items-center gap-1.5 text-xs" style={{ color: hasData ? (isAvailable ? '#22c55e' : isMissing ? '#f59e0b' : '#475569') : '#475569' }}>
                        {hasData ? (isAvailable ? '\u2713' : isMissing ? '\u2717' : '\u2022') : '\u2022'} {perm}
                        {isRequired && <span className="text-[10px] px-1 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{lang === 'es' ? 'obligatorio' : 'required'}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Account-scoped permissions */}
              <div>
                <p className="text-xs font-medium mb-1.5" style={{ color: '#94a3b8' }}>
                  {lang === 'es' ? 'Permisos de Cuenta' : 'Account-Scoped Permissions'}
                </p>
                <div className="space-y-1">
                  {['Account Access: Audit Logs', 'Notifications:Read'].map((perm) => {
                    const isAvailable = spc?.permissions?.available?.includes(perm);
                    const isMissing = spc?.permissions?.missing?.includes(perm);
                    const hasData = spc != null;
                    return (
                      <div key={perm} className="flex items-center gap-1.5 text-xs" style={{ color: hasData ? (isAvailable ? '#22c55e' : isMissing ? '#f59e0b' : '#475569') : '#475569' }}>
                        {hasData ? (isAvailable ? '\u2713' : isMissing ? '\u2717' : '\u2022') : '\u2022'} {perm}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <a
              href="https://dash.cloudflare.com/profile/api-tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
              style={{ color: '#06b6d4' }}
            >
              {lang === 'es' ? 'Crear/editar token en Cloudflare' : 'Create/edit token on Cloudflare'} {'\u2197'}
            </a>
          </div>

          {/* Error */}
          {simError && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#1a0505', border: '1px solid #ef4444', color: '#fca5a5' }}>
              {simError}
            </div>
          )}

          {/* ═══ PRE-CHECK PERMISSIONS PANEL (after verification) ═══ */}
          {spc && !simulating && (
            <div className="mb-6 rounded-xl overflow-hidden" style={{ background: '#0f172a', border: `1px solid ${spc.can_run ? '#ef444440' : '#ef444440'}` }}>
              {/* Header with zone info */}
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderBottom: '1px solid #1e293b' }}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {spc.zone_info.zone_valid ? '\u2713' : '\u2717'}
                    {' '}{lang === 'es' ? 'Verificaci\u00f3n de Permisos' : 'Permission Verification'}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>
                    {spc.zone_info.zone_name} {'\u2022'} Plan: <span style={{ color: '#ef4444' }}>{spc.zone_info.cf_plan}</span>
                    {spc.zone_info.domain_reachable
                      ? <span style={{ color: '#22c55e' }}> {'\u2022'} {lang === 'es' ? 'Dominio alcanzable' : 'Domain reachable'}</span>
                      : <span style={{ color: '#f59e0b' }}> {'\u2022'} {lang === 'es' ? 'Dominio no alcanzable' : 'Domain unreachable'}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-xs" style={{ color: '#64748b' }}>{lang === 'es' ? 'Costo' : 'Cost'}</div>
                    <div className="text-sm font-bold" style={{ color: '#ef4444' }}>{spc.credits.required.toLocaleString()}</div>
                  </div>
                  <div className="w-px h-8" style={{ background: '#1e293b' }} />
                  <div className="text-center">
                    <div className="text-xs" style={{ color: '#64748b' }}>Balance</div>
                    <div className="text-sm font-bold" style={{ color: spc.credits.sufficient ? '#22c55e' : '#ef4444' }}>{spc.credits.available.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              {/* Permissions grid */}
              <div className="px-5 py-4">
                <p className="text-xs font-medium mb-3" style={{ color: '#94a3b8' }}>
                  {lang === 'es' ? 'Permisos del Token' : 'Token Permissions'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[...spc.permissions.required, ...spc.permissions.optional].map((perm) => {
                    const isAvailable = spc.permissions.available.includes(perm);
                    const isRequired = spc.permissions.required.includes(perm);
                    return (
                      <div key={perm} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: isAvailable ? '#22c55e08' : '#ef444408', border: `1px solid ${isAvailable ? '#22c55e30' : '#ef444430'}` }}>
                        <span style={{ color: isAvailable ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: '14px' }}>
                          {isAvailable ? '\u2713' : '\u2717'}
                        </span>
                        <span className="flex-1 font-mono" style={{ color: isAvailable ? '#d1fae5' : '#fecaca' }}>{perm}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{
                          background: isRequired ? '#ef444420' : '#64748b20',
                          color: isRequired ? '#fca5a5' : '#94a3b8',
                        }}>
                          {isRequired ? (lang === 'es' ? 'Requerido' : 'Required') : (lang === 'es' ? 'Opcional' : 'Optional')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Missing required warning */}
                {spc.permissions.missing_required.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                    <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                      {lang === 'es'
                        ? `\u26A0 ${spc.permissions.missing_required.length} permiso(s) requerido(s) faltante(s). La simulaci\u00f3n no puede ejecutarse.`
                        : `\u26A0 ${spc.permissions.missing_required.length} required permission(s) missing. Simulation cannot run.`}
                    </p>
                  </div>
                )}

                {/* Missing optional info */}
                {spc.permissions.missing_optional.length > 0 && spc.permissions.missing_required.length === 0 && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
                    <p className="text-xs" style={{ color: '#f59e0b' }}>
                      {lang === 'es'
                        ? `${spc.permissions.missing_optional.length} permiso(s) opcional(es) faltante(s). La simulaci\u00f3n proceder\u00e1 con cobertura de an\u00e1lisis reducida.`
                        : `${spc.permissions.missing_optional.length} optional permission(s) missing. Simulation will proceed with reduced analysis coverage.`}
                    </p>
                  </div>
                )}

                {/* Insufficient credits */}
                {!spc.credits.sufficient && (
                  <div className="mt-3 p-3 rounded-lg" style={{ background: '#ef444410', border: '1px solid #ef444430' }}>
                    <p className="text-xs font-medium" style={{ color: '#ef4444' }}>
                      {lang === 'es'
                        ? `Cr\u00e9ditos insuficientes. Necesitas ${spc.credits.required.toLocaleString()}, tienes ${spc.credits.available.toLocaleString()}.`
                        : `Insufficient credits. You need ${spc.credits.required.toLocaleString()}, you have ${spc.credits.available.toLocaleString()}.`}
                    </p>
                    <button
                      onClick={() => setActiveTab('credits')}
                      className="mt-2 text-xs font-medium px-3 py-1 rounded-lg"
                      style={{ color: '#06b6d4', border: '1px solid #06b6d440' }}
                    >
                      {lang === 'es' ? 'Comprar cr\u00e9ditos' : 'Buy credits'}
                    </button>
                  </div>
                )}

                {/* Link to edit token + re-check */}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href="https://dash.cloudflare.com/profile/api-tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium flex items-center gap-1 hover:underline"
                    style={{ color: '#06b6d4' }}
                  >
                    {lang === 'es' ? 'Editar token en Cloudflare' : 'Edit token on Cloudflare'} {'\u2197'}
                  </a>
                  <button
                    onClick={() => { setSimPreCheckData(null); setDiscoveredTargets([]); setSelectedTargets([]); }}
                    className="text-xs hover:underline"
                    style={{ color: '#64748b' }}
                  >
                    {lang === 'es' ? 'Verificar de nuevo' : 'Re-check'}
                  </button>
                </div>
              </div>

              {/* Multi-target selection section — prominent */}
              {spc.can_run && (
                <div className="px-5 py-5" style={{ borderTop: '2px solid #06b6d430', background: '#06b6d408' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: '#06b6d420' }}>
                      {'\uD83C\uDF10'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">
                        {lang === 'es' ? 'Objetivos de Simulacion' : 'Simulation Targets'}
                      </h4>
                      <p className="text-[11px]" style={{ color: '#64748b' }}>
                        {lang === 'es'
                          ? 'Descubre y selecciona los dominios proxeados a probar (hasta 5, mismo costo)'
                          : 'Discover and select proxied domains to test (up to 5, same cost)'}
                      </p>
                    </div>
                  </div>

                  {discoveredTargets.length === 0 ? (
                    <button
                      onClick={handleLoadTargets}
                      disabled={loadingTargets}
                      className="w-full py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                      style={{ background: '#06b6d420', color: '#06b6d4', border: '1px solid #06b6d440' }}
                    >
                      {loadingTargets ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#06b6d4', borderTopColor: 'transparent' }} />
                          {lang === 'es' ? 'Descubriendo subdominios proxeados...' : 'Discovering proxied subdomains...'}
                        </>
                      ) : (
                        <>
                          {'\uD83D\uDD0D'} {lang === 'es' ? 'Descubrir Subdominios Proxeados' : 'Discover Proxied Subdomains'}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      {/* Quick actions bar */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium" style={{ color: '#94a3b8' }}>
                          {lang === 'es'
                            ? `${discoveredTargets.length} dominio(s) proxeado(s) encontrado(s)`
                            : `${discoveredTargets.length} proxied domain(s) found`}
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#06b6d420', color: '#06b6d4' }}>
                            {selectedTargets.length}/5
                          </span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const maxTargets = discoveredTargets.slice(0, 5).map(t => t.name);
                              setSelectedTargets(maxTargets);
                            }}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-all"
                            style={{ background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }}
                          >
                            {strings.simSelectAll}
                          </button>
                          <button
                            onClick={() => { setDiscoveredTargets([]); setSelectedTargets([]); }}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-all"
                            style={{ background: '#64748b15', color: '#64748b', border: '1px solid #64748b30' }}
                          >
                            {lang === 'es' ? 'Reiniciar' : 'Reset'}
                          </button>
                        </div>
                      </div>
                      {/* Domain list */}
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#1e293b #0a0a0f' }}>
                        {discoveredTargets.map((target) => {
                          const isSelected = selectedTargets.includes(target.name);
                          const isApex = target.is_apex;
                          return (
                            <label
                              key={target.name}
                              className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all"
                              style={{
                                background: isSelected ? '#06b6d412' : '#0a0a0f',
                                border: `1px solid ${isSelected ? '#06b6d440' : '#1e293b'}`,
                                boxShadow: isSelected ? '0 0 8px rgba(6,182,212,0.1)' : 'none',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTargetSelection(target.name)}
                                className="w-4 h-4 rounded flex-shrink-0"
                                style={{ accentColor: '#06b6d4' }}
                              />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span className="text-sm font-mono truncate" style={{ color: isSelected ? '#e0f2fe' : '#cbd5e1' }}>
                                  {target.name}
                                </span>
                                {isApex && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0" style={{ background: '#ef444425', color: '#fca5a5', border: '1px solid #ef444430' }}>
                                    APEX
                                  </span>
                                )}
                                <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: '#1e293b', color: '#64748b' }}>
                                  {target.type}
                                </span>
                              </div>
                              {isSelected && (
                                <span className="text-xs flex-shrink-0" style={{ color: '#06b6d4' }}>{'\u2713'}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {selectedTargets.length === 0 && (
                        <p className="text-[11px] px-2 py-1.5 rounded" style={{ background: '#f59e0b10', color: '#f59e0b', border: '1px solid #f59e0b20' }}>
                          {lang === 'es'
                            ? 'Sin dominios seleccionados. Se usara el dominio apex de la zona por defecto.'
                            : 'No domains selected. The zone apex domain will be used by default.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Consent / Proceed section */}
              {spc.can_run && (
                <div className="px-5 py-4" style={{ borderTop: '1px solid #1e293b', background: '#ef444408' }}>
                  <button
                    onClick={handleSimulation}
                    disabled={simulating}
                    className="w-full py-3 rounded-lg font-semibold text-white text-sm transition-all flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                  >
                    {lang === 'es'
                      ? `Proceder con Simulaci\u00f3n (${SIMULATION_CREDIT_COST.toLocaleString()} cr\u00e9ditos)`
                      : `Proceed with Simulation (${SIMULATION_CREDIT_COST.toLocaleString()} credits)`}
                  </button>
                  <p className="text-xs text-center mt-2" style={{ color: '#64748b' }}>
                    {lang === 'es'
                      ? 'Al proceder, se deducir\u00e1n los cr\u00e9ditos de tu balance. Si la simulaci\u00f3n falla, se reembolsar\u00e1n autom\u00e1ticamente.'
                      : 'By proceeding, credits will be deducted from your balance. If the simulation fails, they will be automatically refunded.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Simulating progress */}
          {simulating && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: '#0f172a', border: '1px solid #1e293b' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#ef4444', borderTopColor: 'transparent' }} />
                <span className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{strings.simRunning}</span>
              </div>
              <p className="text-sm" style={{ color: '#94a3b8' }}>{strings.simRunningSteps[simStep]}</p>
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    background: 'linear-gradient(90deg, #ef4444, #f97316)',
                    width: `${((simStep + 1) / strings.simRunningSteps.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Insufficient credits warning (before pre-check) */}
          {!canAfford && !simulating && !spc && (
            <div className="mb-4 p-4 rounded-lg" style={{ background: '#f59e0b10', border: '1px solid #f59e0b30' }}>
              <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
                {lang === 'es' ? 'Cr\u00e9ditos insuficientes' : 'Insufficient credits'}
              </p>
              <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                {lang === 'es'
                  ? `Necesitas ${SIMULATION_CREDIT_COST.toLocaleString()} cr\u00e9ditos. Tu balance: ${balance.toLocaleString()}.`
                  : `You need ${SIMULATION_CREDIT_COST.toLocaleString()} credits. Your balance: ${balance.toLocaleString()}.`}
              </p>
              <button
                onClick={() => setActiveTab('credits')}
                className="mt-2 text-sm font-medium px-4 py-1.5 rounded-lg"
                style={{ color: '#06b6d4', border: '1px solid #06b6d440' }}
              >
                {lang === 'es' ? 'Comprar cr\u00e9ditos' : 'Buy credits'}
              </button>
            </div>
          )}

          {/* Step 1: Pre-check button (before verification) */}
          {!spc && !simulating && (
            <button
              onClick={handleSimPreCheck}
              disabled={simPreChecking || !simZoneId.trim() || !simApiToken.trim()}
              className="w-full py-4 rounded-lg font-semibold text-white text-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
            >
              {simPreChecking ? (
                <>
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {lang === 'es' ? 'Verificando permisos...' : 'Verifying permissions...'}
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                  {lang === 'es' ? 'Verificar Permisos y Continuar' : 'Verify Permissions & Continue'}
                </>
              )}
            </button>
          )}
        </div>

        {/* Simulation History */}
        <div className="rounded-xl p-6" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <h3 className="text-lg font-bold text-white mb-4">{strings.simHistory}</h3>
          {simHistoryData.length === 0 ? (
            <p className="text-sm" style={{ color: '#64748b' }}>{strings.simNoHistory}</p>
          ) : (
            <div className="space-y-3">
              {simHistoryData.map((r: any) => {
                const riskColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
                const isCompleted = r.status === 'completed';
                const isFailed = r.status === 'failed';
                const isRunning = r.status === 'running';
                const statusColor = isCompleted ? '#22c55e' : isFailed ? '#ef4444' : '#f59e0b';
                const statusLabel = isCompleted
                  ? (lang === 'es' ? 'Completado' : 'Completed')
                  : isFailed
                    ? (lang === 'es' ? 'Fallido (reembolsado)' : 'Failed (refunded)')
                    : (lang === 'es' ? 'En progreso' : 'Running');
                const durationStr = r.duration_ms ? `${(r.duration_ms / 1000).toFixed(1)}s` : null;
                // Domain display: if domain looks like a zone_id (32 hex), show truncated with label
                const domainDisplay = r.domain || r.zone_id || '—';
                const isZoneIdAsDomain = /^[a-f0-9]{32}$/.test(domainDisplay);
                return (
                  <div
                    key={r.id}
                    className={`rounded-lg p-4 transition-all ${isCompleted || isRunning ? 'cursor-pointer hover:border-cyan-800' : ''}`}
                    style={{ background: '#0f172a', border: `1px solid ${isCompleted ? '#1e293b' : statusColor + '30'}`, opacity: isRunning ? 0.7 : 1 }}
                    onClick={() => (isCompleted || isFailed || isRunning) ? handleViewSimReport(r.id) : null}
                  >
                    {/* Row 1: Domain + Score + Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isZoneIdAsDomain
                          ? <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: '#1e293b', color: '#94a3b8' }}>Zone: {domainDisplay.slice(0, 8)}...{domainDisplay.slice(-4)}</span>
                          : <span className="font-semibold text-sm text-white">{domainDisplay}</span>}
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: statusColor + '20', color: statusColor }}>
                          {statusLabel}
                        </span>
                        {r.risk_level && isCompleted && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full" style={{ background: `${riskColors[r.risk_level] || '#64748b'}20`, color: riskColors[r.risk_level] || '#64748b' }}>
                            {r.risk_level.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {r.score !== null && isCompleted && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl font-black font-mono" style={{ color: r.score >= 80 ? '#22c55e' : r.score >= 60 ? '#f59e0b' : '#ef4444' }}>{r.score}</span>
                            <span className="text-sm font-bold" style={{ color: r.score >= 80 ? '#22c55e' : r.score >= 60 ? '#f59e0b' : '#ef4444' }}>{r.grade}</span>
                          </div>
                        )}
                        {isCompleted && (
                          <span className="text-xs px-2 py-1 rounded" style={{ background: '#06b6d420', color: '#06b6d4' }}>
                            {strings.simViewReport} {'\u2192'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Test stats for completed */}
                    {isCompleted && r.total_tests > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: '#06b6d410', color: '#06b6d4' }}>
                          {r.total_tests} {lang === 'es' ? 'pruebas' : 'tests'}
                        </span>
                        {r.bypassed > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: '#ef444415', color: '#ef4444' }}>
                            {r.bypassed} bypassed
                          </span>
                        )}
                        {r.findings_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: '#f59e0b15', color: '#f59e0b' }}>
                            {r.findings_count} {lang === 'es' ? 'hallazgos' : 'findings'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 3: Metadata */}
                    <div className="flex items-center gap-3 text-xs flex-wrap" style={{ color: '#64748b' }}>
                      <span>{new Date(r.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {durationStr && <span>{durationStr}</span>}
                      {r.credits_charged > 0 && isCompleted && (
                        <span style={{ color: '#8b5cf6' }}>{r.credits_charged} cr</span>
                      )}
                      {isFailed && r.credits_charged === 0 && (
                        <span style={{ color: '#22c55e' }}>{lang === 'es' ? 'Cr\u00e9ditos reembolsados' : 'Credits refunded'}</span>
                      )}
                      {isRunning && (
                        <span style={{ color: '#f59e0b' }}>{lang === 'es' ? 'Esperando resultado...' : 'Waiting for result...'}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Services Tab
  // ============================================================

  async function handleServicesFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServicesFormLoading(true);
    setServicesFormError(null);

    try {
      const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.angaflow.com';
      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: servicesForm.name,
          email: servicesForm.email,
          company: servicesForm.company || '',
          domain: 'servicios.pro',
          message: `[Servicio: ${servicesForm.service}] ${servicesForm.message}`,
          ownership_confirmed: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || strings.servicesFormError);
      }

      setServicesFormSuccess(true);
      setServicesForm({ name: '', email: '', company: '', service: '', message: '' });
      setTimeout(() => setServicesFormSuccess(false), 5000);
    } catch (err: any) {
      setServicesFormError(err.message || strings.servicesFormError);
    } finally {
      setServicesFormLoading(false);
    }
  }

  function renderServicesTab() {
    const services = SERVICES_DATA[lang];
    const whatsappBase = 'https://wa.me/525551575041?text=';

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">{strings.servicesTitle}</h2>
          <p className="text-base" style={{ color: '#94a3b8' }}>{strings.servicesSubtitle}</p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {services.map((service) => {
            const waMessage = encodeURIComponent(
              lang === 'es'
                ? `Hola, me interesa el servicio ${service.name} (${service.duration}, ${service.price}). ¿Cuándo tienen disponibilidad?`
                : `Hi, I'm interested in ${service.name} (${service.duration}, ${service.price}). When are you available?`
            );
            return (
              <div
                key={service.id}
                className="rounded-xl overflow-hidden transition-all hover:scale-[1.02]"
                style={{
                  background: '#111827',
                  border: `1px solid ${service.color}30`,
                  borderTop: `3px solid ${service.color}`,
                }}
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">{service.icon}</span>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: `${service.color}20`, color: service.color }}
                    >
                      {service.duration}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">{service.name}</h3>
                  <p className="text-xl font-bold mb-3" style={{ color: service.color }}>{service.price}</p>
                  <p className="text-sm mb-4" style={{ color: '#94a3b8', lineHeight: 1.6 }}>{service.description}</p>
                  <a
                    href={`${whatsappBase}${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
                    style={{
                      background: `${service.color}20`,
                      color: service.color,
                      border: `1px solid ${service.color}40`,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    {strings.servicesCtaWhatsApp}
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline Lead Form */}
        <div className="rounded-xl p-6 sm:p-8" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          {servicesFormSuccess ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">{'\u2705'}</div>
              <p className="text-lg font-semibold" style={{ color: '#22c55e' }}>{strings.servicesFormSuccess}</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-white mb-2">{strings.servicesFormTitle}</h3>
                <p className="text-sm" style={{ color: '#94a3b8' }}>{strings.servicesFormSubtitle}</p>
              </div>

              <form onSubmit={handleServicesFormSubmit} className="space-y-4 max-w-xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#e2e8f0' }}>
                      {strings.servicesFormName} *
                    </label>
                    <input
                      type="text"
                      required
                      value={servicesForm.name}
                      onChange={(e) => setServicesForm({ ...servicesForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b', color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#e2e8f0' }}>
                      {strings.servicesFormEmail} *
                    </label>
                    <input
                      type="email"
                      required
                      value={servicesForm.email}
                      onChange={(e) => setServicesForm({ ...servicesForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b', color: '#e2e8f0' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#e2e8f0' }}>
                      {strings.servicesFormCompany}
                    </label>
                    <input
                      type="text"
                      value={servicesForm.company}
                      onChange={(e) => setServicesForm({ ...servicesForm, company: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b', color: '#e2e8f0' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#e2e8f0' }}>
                      {strings.servicesFormService} *
                    </label>
                    <select
                      required
                      value={servicesForm.service}
                      onChange={(e) => setServicesForm({ ...servicesForm, service: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{ background: '#0a0a0f', border: '1px solid #1e293b', color: '#e2e8f0' }}
                    >
                      <option value="">{strings.servicesFormServicePlaceholder}</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.name}>{s.name} - {s.price}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: '#e2e8f0' }}>
                    {strings.servicesFormMessage} *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={servicesForm.message}
                    onChange={(e) => setServicesForm({ ...servicesForm, message: e.target.value })}
                    placeholder={strings.servicesFormMessagePlaceholder}
                    className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
                    style={{ background: '#0a0a0f', border: '1px solid #1e293b', color: '#e2e8f0' }}
                  />
                </div>

                {servicesFormError && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: '#991b1b20', border: '1px solid #dc2626', color: '#fca5a5' }}>
                    {servicesFormError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={servicesFormLoading}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                    color: '#fff',
                    border: 'none',
                  }}
                >
                  {servicesFormLoading ? strings.servicesFormSending : strings.servicesFormSubmit}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Credits Tab
  // ============================================================

  function renderCreditsTab() {
    return (
      <div className="space-y-8">
        {/* Balance Card */}
        <div className="rounded-xl p-6" style={{ background: '#111827', border: '1px solid #1e293b' }}>
          <h2 className="text-sm font-medium mb-2" style={{ color: '#94a3b8' }}>{strings.creditBalance}</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold" style={{ color: '#06b6d4' }}>
              {account ? parseFloat(account.credit_balance).toLocaleString() : '0'}
            </span>
            <span style={{ color: '#94a3b8' }}>{strings.credits}</span>
          </div>
          {account && !account.first_reload_bonus_claimed && (
            <p className="mt-2 text-sm" style={{ color: '#22c55e' }}>{strings.firstBonus}</p>
          )}
        </div>

        {/* Buy Credits */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">{strings.buyCredits}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(Object.entries(strings.packages) as [string, { name: string; credits: string; price: string }][]).map(([id, pkg]) => (
              <div
                key={id}
                className="rounded-xl p-5 flex flex-col justify-between"
                style={{ background: '#111827', border: '1px solid #1e293b' }}
              >
                <div>
                  <h3 className="font-semibold text-white mb-1">{pkg.name}</h3>
                  <p className="text-2xl font-bold mb-1" style={{ color: '#06b6d4' }}>{pkg.credits}</p>
                  <p className="text-sm" style={{ color: '#94a3b8' }}>{strings.credits}</p>
                </div>
                <div className="mt-4">
                  <p className="text-lg font-bold text-white mb-3">{pkg.price} <span className="text-sm font-normal" style={{ color: '#94a3b8' }}>MXN</span></p>
                  <button
                    onClick={() => handlePurchase(id)}
                    disabled={purchaseLoading === id}
                    className="w-full py-2 rounded-lg font-medium text-white text-sm transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                  >
                    {purchaseLoading === id ? '...' : strings.buyCredits}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">{strings.recentTransactions}</h2>
          <div className="rounded-xl overflow-hidden" style={{ background: '#111827', border: '1px solid #1e293b' }}>
            {transactions.length === 0 ? (
              <p className="p-6 text-center" style={{ color: '#94a3b8' }}>{strings.noTransactions}</p>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[440px]">
                <tbody>
                  {transactions.map((tx: any) => (
                    <tr key={tx.id} className="border-b" style={{ borderColor: '#1e293b' }}>
                      <td className="px-3 sm:px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          tx.type === 'recharge' || tx.type === 'bonus'
                            ? 'text-green-400 bg-green-400/10'
                            : tx.type === 'deduction'
                            ? 'text-red-400 bg-red-400/10'
                            : 'text-blue-400 bg-blue-400/10'
                        }`}>
                          {(strings.transactionTypes as any)[tx.type] || tx.type}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm" style={{ color: '#94a3b8' }}>{tx.description}</td>
                      <td className="px-3 sm:px-4 py-3 text-right font-mono" style={{ color: tx.type === 'deduction' ? '#ef4444' : '#22c55e' }}>
                        {tx.type === 'deduction' ? '-' : '+'}{parseFloat(tx.total_credits).toLocaleString()}
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right text-xs sm:text-sm" style={{ color: '#64748b' }}>
                        {new Date(tx.created_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
