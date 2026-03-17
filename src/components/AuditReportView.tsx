/**
 * AuditReportView.tsx — Enterprise-grade Cloudflare security audit report viewer.
 * All tiers (Basic/Pro/Complete) show charts, recommendations, and value.
 * Complete tier adds executive analysis, bot intelligence, and fingerprints.
 * No emoji literals — all icons use Unicode escapes to prevent encoding issues.
 */
import { useState } from 'react';
import type { AuditReport, AuditCategoryScore, AuditRecommendation } from '../lib/api';
import {
  Speedometer,
  DonutChart,
  StackedBarChart,
  HorizontalBarChart,
  BotScoreHistogram,
  StatusCodeChart,
  MetricCard,
  SectionHeader,
  formatNumber,
  formatBytes,
  COLORS,
  CHART_PALETTE,
} from './AuditCharts';

// ─── Safe Icon Constants (no raw emoji, prevents encoding issues) ─────────────
const ICON = {
  back: '\u2190',        // ←
  pdf: '\uD83D\uDCC4',  // 📄
  chart: '\uD83D\uDCCA', // 📊
  trend: '\uD83D\uDCC8', // 📈
  shield: '\uD83D\uDEE1\uFE0F', // 🛡️
  robot: '\uD83E\uDD16', // 🤖
  search: '\uD83D\uDD0D', // 🔍
  clipboard: '\uD83D\uDCCB', // 📋
  bulb: '\uD83D\uDCA1',  // 💡
  pkg: '\uD83D\uDCE6',   // 📦
  globe: '\uD83C\uDF10',  // 🌐
  satellite: '\uD83D\uDCE1', // 📡
  signal: '\uD83D\uDCF6', // 📶
  disk: '\uD83D\uDCBE',   // 💾
  ban: '\uD83D\uDEAB',    // 🚫
  warning: '\u26A0\uFE0F', // ⚠️
  lock: '\uD83D\uDD12',   // 🔒
  fire: '\uD83D\uDD25',   // 🔥
  eye: '\uD83D\uDC41\uFE0F', // 👁️
  target: '\uD83C\uDFAF', // 🎯
  magnify: '\uD83D\uDD0E', // 🔎
  brain: '\uD83E\uDDE0',  // 🧠
  doc: '\uD83D\uDCC3',    // 📃
};

// ─── User Agent Classification (inspired by helix-attack-simulator) ───────────
interface UAClassification {
  type: 'human' | 'bot_good' | 'bot_bad' | 'crawler' | 'scanner' | 'ai_bot' | 'automation' | 'ddos_tool' | 'unknown';
  label: { es: string; en: string };
  color: string;
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

const UA_PATTERNS: { pattern: RegExp; classification: UAClassification }[] = [
  // ── DDoS / Flood / Attack tools (CRITICAL) ──
  { pattern: /LOIC|HOIC|HULK|Slowloris|GoldenEye|Xerxes|UFONet|Torshammer|RUDY|PyLoris|hping/i, classification: { type: 'ddos_tool', label: { es: 'Herramienta DDoS', en: 'DDoS Tool' }, color: COLORS.red, risk: 'critical' } },
  // ── Stress / Load Testing tools used as attack vectors (CRITICAL) ──
  { pattern: /ApacheBench|ab\/[\d]|wrk\/|siege\/|k6\/|locust|vegeta|hey\/|bombardier|gatling|artillery|autocannon|Tsung|JMeter|LoadRunner|Taurus|drill\/|oha\/|cassowary/i, classification: { type: 'ddos_tool', label: { es: 'Stress Test / Flood', en: 'Stress Test / Flood' }, color: COLORS.red, risk: 'critical' } },
  // ── WAF/Firewall testing & evasion tools (CRITICAL) ──
  { pattern: /WAF Event Generator|waf-?tester|wafw00f|WAFNinja|bypass-?waf|CloudFail|CloudBuster|Firewalk/i, classification: { type: 'ddos_tool', label: { es: 'Evasion WAF / Ataque', en: 'WAF Evasion / Attack' }, color: COLORS.red, risk: 'critical' } },
  // ── Vulnerability Scanners (HIGH) ──
  { pattern: /Nikto|sqlmap|Nmap|Nessus|OpenVAS|ZAP|Burp|Acunetix|Arachni|w3af|Wapiti|Nuclei|Masscan|dirbuster|gobuster|ffuf|feroxbuster|wpscan|zgrab|httpx\/|subfinder|amass|whatweb|testssl|sslyze|droopescan/i, classification: { type: 'scanner', label: { es: 'Escaner de Vulnerabilidades', en: 'Vulnerability Scanner' }, color: COLORS.red, risk: 'high' } },
  // ── Exploitation frameworks (CRITICAL) ──
  { pattern: /Metasploit|msfconsole|Empire|Cobalt\s?Strike|BeEF|commix|XSStrike|dalfox|tplmap/i, classification: { type: 'ddos_tool', label: { es: 'Framework de Explotacion', en: 'Exploitation Framework' }, color: COLORS.red, risk: 'critical' } },
  // ── Known bad bots / Scrapers (HIGH) ──
  { pattern: /Scrapy|MJ12bot|AhrefsBot|DotBot|SemrushBot|MauiBot|BLEXBot|DataForSeoBot|Bytespider|PetalBot|Sogou|YandexBot|MegaIndex|Nimbostratus|Daum|Yeti\/|Rogerbot|Exabot|GrapeshotCrawler/i, classification: { type: 'bot_bad', label: { es: 'Bot Malicioso/Scraper', en: 'Malicious Bot/Scraper' }, color: COLORS.orange, risk: 'high' } },
  // ── AI Crawlers (MEDIUM) ──
  { pattern: /GPTBot|ChatGPT|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic|Google-Extended|Gemini|CCBot|PerplexityBot|Cohere|Meta-ExternalAgent|Applebot-Extended|Diffbot|Amazonbot|YouBot|AI2Bot|Ai2Bot-Dolma|Timpibot|img2dataset/i, classification: { type: 'ai_bot', label: { es: 'Bot de IA', en: 'AI Bot' }, color: COLORS.yellow, risk: 'medium' } },
  // ── Automation libraries (MEDIUM) ──
  { pattern: /python-requests|python-urllib|python\/|curl\/|wget\/|HTTPie|libwww-perl|Go-http-client|Java\/|Apache-HttpClient|okhttp|node-fetch|axios\/|undici|aiohttp|httpx-python|mechanize|LWP::Simple/i, classification: { type: 'automation', label: { es: 'Automatizacion', en: 'Automation' }, color: COLORS.yellow, risk: 'medium' } },
  // ── Headless browsers (MEDIUM) ──
  { pattern: /HeadlessChrome|PhantomJS|Selenium|Puppeteer|Playwright|CasperJS|SlimerJS|splash|Rendertron/i, classification: { type: 'automation', label: { es: 'Navegador Headless', en: 'Headless Browser' }, color: COLORS.yellow, risk: 'medium' } },
  // ── Good bots / Verified crawlers (LOW) ──
  { pattern: /Googlebot|bingbot|Baiduspider|DuckDuckBot|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Applebot(?!-Extended)|Pinterest|Slackbot/i, classification: { type: 'bot_good', label: { es: 'Bot Verificado', en: 'Verified Bot' }, color: COLORS.cyan, risk: 'low' } },
  // ── Monitoring / Uptime (NONE) ──
  { pattern: /UptimeRobot|Pingdom|StatusCake|Site24x7|NewRelic|Datadog|Zabbix|Nagios|GTmetrix|PageSpeed|Lighthouse/i, classification: { type: 'bot_good', label: { es: 'Monitor/Uptime', en: 'Monitor/Uptime' }, color: COLORS.green, risk: 'none' } },
  // ── Cloudflare internal (NONE) ──
  { pattern: /Cloudflare-Health|cloudflare-workers|CF-Diagnostics/i, classification: { type: 'bot_good', label: { es: 'Cloudflare Interno', en: 'Cloudflare Internal' }, color: COLORS.cyan, risk: 'none' } },
  // ── Empty user agent (HIGH) ──
  { pattern: /^$/, classification: { type: 'bot_bad', label: { es: 'Sin User Agent', en: 'Empty User Agent' }, color: COLORS.red, risk: 'high' } },
];

function classifyUserAgent(ua: string): UAClassification {
  if (!ua || ua === '(empty)') {
    return { type: 'bot_bad', label: { es: 'Sin User Agent', en: 'Empty User Agent' }, color: COLORS.red, risk: 'high' };
  }
  for (const { pattern, classification } of UA_PATTERNS) {
    if (pattern.test(ua)) return classification;
  }
  // Default: if it looks like a real browser
  if (/Mozilla\/5\.0.*(?:Chrome|Firefox|Safari|Edge|Opera)/.test(ua)) {
    return { type: 'human', label: { es: 'Navegador', en: 'Browser' }, color: COLORS.green, risk: 'none' };
  }
  return { type: 'unknown', label: { es: 'Desconocido', en: 'Unknown' }, color: COLORS.textMuted, risk: 'low' };
}

const RISK_LABELS: Record<string, { es: string; en: string }> = {
  none: { es: 'Sin riesgo', en: 'No risk' },
  low: { es: 'Bajo', en: 'Low' },
  medium: { es: 'Medio', en: 'Medium' },
  high: { es: 'Alto', en: 'High' },
  critical: { es: 'Critico', en: 'Critical' },
};

const RISK_COLORS: Record<string, string> = {
  none: COLORS.green,
  low: COLORS.cyan,
  medium: COLORS.yellow,
  high: COLORS.orange,
  critical: COLORS.red,
};

// ─── JA3/JA4 Fingerprint Risk Classification ─────────────────────────────────
interface FpRisk {
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  label: { es: string; en: string };
  reason: { es: string; en: string };
  color: string;
}

// Known malicious/suspicious JA3 hashes (common scanners, bots, malware)
const KNOWN_BAD_JA3: Record<string, { label: string; risk: 'high' | 'critical' }> = {
  'e7d705a3286e19ea42f587b344ee6865': { label: 'Nmap scanner', risk: 'critical' },
  'c0bfe38e10b718c54c2bbcd0e1b95d63': { label: 'Masscan', risk: 'critical' },
  '4d7a28d6f2263ed61de88ca66eb011e3': { label: 'Python/urllib', risk: 'high' },
  'b386946a5a44d1ddcc843bc75336dfce': { label: 'Go HTTP client', risk: 'high' },
  '3b5074b1b5d032e5620f69f9f700ff0e': { label: 'Metasploit', risk: 'critical' },
  '19e29534fd49dd27d09234e639c4057e': { label: 'TLS scanner', risk: 'high' },
  '907c902b1f6f1e6a12db3c1051ae9d20': { label: 'Zgrab scanner', risk: 'critical' },
};

function classifyJA3(hash: string, count: number, totalTraffic: number): FpRisk {
  // Check known bad hashes
  const known = KNOWN_BAD_JA3[hash];
  if (known) {
    return {
      level: known.risk,
      label: { es: known.label, en: known.label },
      reason: { es: `Fingerprint asociado con ${known.label}`, en: `Fingerprint associated with ${known.label}` },
      color: known.risk === 'critical' ? COLORS.red : COLORS.orange,
    };
  }
  // High volume from single fingerprint = suspicious automation
  const pct = totalTraffic > 0 ? (count / totalTraffic) * 100 : 0;
  if (pct > 30) {
    return {
      level: 'high',
      label: { es: 'Volumen sospechoso', en: 'Suspicious volume' },
      reason: { es: `${pct.toFixed(1)}% del trafico total — posible automatizacion masiva`, en: `${pct.toFixed(1)}% of total traffic — possible mass automation` },
      color: COLORS.orange,
    };
  }
  if (pct > 10) {
    return {
      level: 'medium',
      label: { es: 'Volumen elevado', en: 'High volume' },
      reason: { es: `${pct.toFixed(1)}% del trafico — monitorear patron`, en: `${pct.toFixed(1)}% of traffic — monitor pattern` },
      color: COLORS.yellow,
    };
  }
  return {
    level: 'safe',
    label: { es: 'Normal', en: 'Normal' },
    reason: { es: 'Sin anomalias detectadas', en: 'No anomalies detected' },
    color: COLORS.green,
  };
}

function classifyJA4(hash: string, count: number, totalTraffic: number): FpRisk {
  // JA4 format: t{TLS_version}d{cipher_count}{ext_count}_hash1_hash2
  // Example: t13d191000_9dc949149365_e7c285222651
  const parts = hash.split('_');
  const prefix = parts[0] || '';

  // Parse TLS version from JA4 prefix: t10=TLS1.0, t11=TLS1.1, t12=TLS1.2, t13=TLS1.3
  const tlsMatch = prefix.match(/^t(\d{2})/);
  const tlsVersion = tlsMatch ? parseInt(tlsMatch[1]) : 0;

  // Very old TLS = suspicious
  if (tlsVersion > 0 && tlsVersion < 12) {
    return {
      level: 'critical',
      label: { es: `TLS 1.${tlsVersion - 10} obsoleto`, en: `Obsolete TLS 1.${tlsVersion - 10}` },
      reason: { es: `Usa TLS 1.${tlsVersion - 10} — posible herramienta de escaneo o cliente desactualizado`, en: `Uses TLS 1.${tlsVersion - 10} — possible scanning tool or outdated client` },
      color: COLORS.red,
    };
  }

  // Parse cipher/extension count from JA4
  const dMatch = prefix.match(/d(\d+)/);
  const cipherInfo = dMatch ? parseInt(dMatch[1]) : 0;
  // Very low cipher count = stripped TLS handshake = bot/scanner
  if (cipherInfo > 0 && cipherInfo < 50) {
    return {
      level: 'high',
      label: { es: 'TLS handshake minimo', en: 'Minimal TLS handshake' },
      reason: { es: 'Pocos ciphers/extensiones — probable bot o scanner', en: 'Few ciphers/extensions — likely bot or scanner' },
      color: COLORS.orange,
    };
  }

  // Volume-based analysis
  const pct = totalTraffic > 0 ? (count / totalTraffic) * 100 : 0;
  if (pct > 30) {
    return {
      level: 'high',
      label: { es: 'Volumen dominante', en: 'Dominant volume' },
      reason: { es: `${pct.toFixed(1)}% del trafico — posible ataque o scraping masivo`, en: `${pct.toFixed(1)}% of traffic — possible attack or mass scraping` },
      color: COLORS.orange,
    };
  }
  if (pct > 10) {
    return {
      level: 'medium',
      label: { es: 'Volumen significativo', en: 'Significant volume' },
      reason: { es: `${pct.toFixed(1)}% del trafico — revisar si es legitimo`, en: `${pct.toFixed(1)}% of traffic — verify if legitimate` },
      color: COLORS.yellow,
    };
  }

  // TLS 1.2 — not critical but worth noting
  if (tlsVersion === 12) {
    return {
      level: 'low',
      label: { es: 'TLS 1.2', en: 'TLS 1.2' },
      reason: { es: 'TLS 1.2 — funcional pero considerar migrar a 1.3', en: 'TLS 1.2 — functional but consider migrating to 1.3' },
      color: COLORS.cyan,
    };
  }

  return {
    level: 'safe',
    label: { es: 'Normal', en: 'Normal' },
    reason: { es: 'Sin anomalias detectadas', en: 'No anomalies detected' },
    color: COLORS.green,
  };
}

// ─── Translations ─────────────────────────────────────────────────────────────
const t = {
  es: {
    overallScore: 'Puntuacion General de Seguridad',
    securityAudit: 'Auditoría de Seguridad',
    zone: 'Zona',
    plan: 'Plan',
    tier: 'Nivel',
    duration: 'Duracion',
    collectors: 'Collectors',
    period: 'Periodo de Analisis',
    generated: 'Generado',
    domainScreenshot: 'Vista Previa del Dominio',
    keyMetrics: 'Metricas Clave',
    totalRequests: 'Peticiones Totales',
    bandwidth: 'Ancho de Banda',
    cacheHitRatio: 'Ratio Cache Hit',
    wafEvents: 'Eventos WAF',
    botTraffic: 'Trafico Bot',
    blockedRequests: 'Bloqueados',
    trafficAnalytics: 'Analisis de Trafico',
    trafficOverTime: 'Trafico por Tipo de Bot (Ultimos 7 Dias)',
    httpMethods: 'Metodos HTTP',
    statusCodes: 'Codigos de Estado',
    topPaths: 'Rutas Mas Solicitadas',
    topCountries: 'Paises con Mas Trafico',
    topUserAgents: 'Identificacion de User Agents',
    uaType: 'Tipo',
    uaRisk: 'Riesgo',
    securityIntelligence: 'Inteligencia de Seguridad',
    wafAnalysis: 'Analisis WAF',
    actionBreakdown: 'Acciones WAF',
    topAttackerIps: 'IPs de Mayor Actividad',
    topAttackedPaths: 'Rutas Mas Atacadas',
    attackOrigins: 'Origenes de Ataque',
    botAnalysis: 'Analisis de Bots',
    botScoreDistribution: 'Distribucion de Bot Scores',
    botClassification: 'Clasificacion de Trafico Bot',
    botAsns: 'ASNs con Actividad Bot',
    detectionEngines: 'Motores de Deteccion',
    fingerprintIntelligence: 'Inteligencia de Fingerprints',
    ja3Fingerprints: 'JA3 Fingerprints (TLS Client)',
    ja4Fingerprints: 'JA4 Fingerprints (TLS Avanzado)',
    fpRisk: 'Riesgo',
    fpAnalysis: 'Analisis',
    fpTrafficShare: 'del trafico',
    cachePerformance: 'Rendimiento de Cache',
    cachedRequests: 'Peticiones en Cache',
    uncachedRequests: 'Sin Cache',
    cachedBandwidth: 'BW en Cache',
    uncachedBandwidth: 'BW Sin Cache',
    securityScores: 'Desglose de Categorias de Seguridad',
    findings: 'hallazgos',
    planLimited: 'Limitado por plan',
    recommendations: 'Recomendaciones',
    productRecommendations: 'Recomendaciones por Producto',
    priority: { critical: 'Critico', high: 'Alto', medium: 'Medio' },
    product: 'Producto',
    minPlan: 'Plan Minimo',
    estimatedValue: 'Valor Estimado',
    basic: 'Basica',
    pro: 'Pro',
    complete: 'Completa',
    exportPdf: 'Exportar PDF',
    goBack: 'Volver',
    ip: 'IP',
    country: 'Pais',
    action: 'Accion',
    requests: 'Peticiones',
    userAgent: 'User Agent',
    asn: 'ASN',
    host: 'Host',
    hash: 'Hash',
    count: 'Cantidad',
    engine: 'Motor',
    planProducts: 'Productos Recomendados para tu Plan',
    planProductsDesc: 'Basado en tu plan de Cloudflare, estos productos mejorarian tu seguridad:',
    automated: 'Automatizado',
    likelyHuman: 'Prob. Humano',
    verifiedBot: 'Bot Verificado',
    likelyAutomated: 'Prob. Automatizado',
    dataNotAvailable: 'Datos no disponibles en este nivel de auditoria',
    upgradeHint: 'Actualiza a un nivel superior para ver este analisis',
    upgradeToProHint: 'Disponible en auditoria Pro o Complete',
    upgradeToCompleteHint: 'Disponible en auditoria Complete',
    // Basic tier sections
    configOverview: 'Panorama de Configuracion',
    dnsRecords: 'Registros DNS',
    dnsProxyStatus: 'Estado de Proxy DNS',
    proxied: 'Proxied',
    dnsOnly: 'Solo DNS',
    securitySettings: 'Configuracion de Seguridad',
    performanceSettings: 'Configuracion de Rendimiento',
    enabled: 'Activo',
    disabled: 'Inactivo',
    wafRulesets: 'Reglas WAF / Firewall',
    rulesCount: 'reglas',
    alreadyActive: 'Ya activo',
    currentConfig: 'Actual',
    recommendedConfig: 'Recomendado',
    configStatus: 'Estado',
    configOk: 'Correcto',
    configFix: 'Corregir',
    attackInsights: 'Inteligencia de Ataques',
    attackType: 'Tipo de Actividad',
    attackVolume: 'Volumen',
    attackSeverity: 'Severidad',
    uaAttackIntel: 'Intel de Ataque',
    uaCorrelatedIps: 'IPs correlacionadas',
    uaBlockedReqs: 'bloqueadas',
    uaOrigins: 'Origenes',
    uaThreatSummary: 'Resumen de Amenazas Detectadas',
    uaThreatDesc: 'User agents correlacionados con actividad de ataque en tu dominio',
    uaThreatsFound: 'amenazas activas',
    uaBlockedTotal: 'peticiones bloqueadas',
    uaFromCountries: 'de paises',
    uaNoThreats: 'Sin amenazas detectadas en los user agents del periodo analizado',
    // Executive Analysis (Complete)
    executiveAnalysis: 'Analisis Ejecutivo',
    executiveDesc: 'Resumen completo de la postura de seguridad de tu dominio',
    execWho: 'Quien ataca tu dominio',
    execHow: 'Como atacan tu dominio',
    execWhere: 'Donde atacan tu dominio',
    execProblems: 'Problemas Detectados',
    execNoAttacks: 'No se detectaron ataques significativos en el periodo analizado.',
    execSummary: 'Resumen General',
    // Compliance Preview
    compliancePreview: 'Vista Previa de Cumplimiento Regulatorio',
    compliancePreviewDesc: 'Tu auditoria mapea a 70 controles en 5 marcos regulatorios. Aqui hay un adelanto:',
    complianceControl: 'Control',
    complianceStatus: 'Estado',
    complianceCurrent: 'Valor Actual',
    complianceExpected: 'Valor Esperado',
    compliancePass: 'Cumple',
    complianceFail: 'No Cumple',
    compliancePartial: 'Parcial',
    complianceUnlock: 'Desbloquear Analisis Completo',
    complianceBundleLabel: 'Bundle Completo (5 marcos)',
    complianceBundlePrice: '2,500 creditos',
    complianceBundleSave: 'Ahorra 900 creditos vs. individual',
    complianceIndividual: 'Individual desde 500 creditos',
    complianceCta: 'Ejecutar Compliance',
    complianceDisclaimer: 'Este analisis es orientativo. No constituye una certificacion formal.',
    complianceTotalControls: 'controles evaluables',
    complianceFrameworks: 'marcos regulatorios',
    complianceSampleOf: 'Muestra de',
    complianceRequiresPro: 'Requiere auditoria Pro o Complete',
  },
  en: {
    overallScore: 'Overall Security Score',
    securityAudit: 'Security Audit',
    zone: 'Zone',
    plan: 'Plan',
    tier: 'Tier',
    duration: 'Duration',
    collectors: 'Collectors',
    period: 'Analysis Period',
    generated: 'Generated',
    domainScreenshot: 'Domain Preview',
    keyMetrics: 'Key Metrics',
    totalRequests: 'Total Requests',
    bandwidth: 'Bandwidth',
    cacheHitRatio: 'Cache Hit Ratio',
    wafEvents: 'WAF Events',
    botTraffic: 'Bot Traffic',
    blockedRequests: 'Blocked',
    trafficAnalytics: 'Traffic Analytics',
    trafficOverTime: 'Traffic by Bot Type (Last 7 Days)',
    httpMethods: 'HTTP Methods',
    statusCodes: 'Status Codes',
    topPaths: 'Top Requested Paths',
    topCountries: 'Top Traffic Countries',
    topUserAgents: 'User Agent Identification',
    uaType: 'Type',
    uaRisk: 'Risk',
    securityIntelligence: 'Security Intelligence',
    wafAnalysis: 'WAF Analysis',
    actionBreakdown: 'WAF Actions',
    topAttackerIps: 'Top Activity IPs',
    topAttackedPaths: 'Top Attacked Paths',
    attackOrigins: 'Attack Origins',
    botAnalysis: 'Bot Analysis',
    botScoreDistribution: 'Bot Score Distribution',
    botClassification: 'Bot Traffic Classification',
    botAsns: 'ASNs with Bot Activity',
    detectionEngines: 'Detection Engines',
    fingerprintIntelligence: 'Fingerprint Intelligence',
    ja3Fingerprints: 'JA3 Fingerprints (TLS Client)',
    ja4Fingerprints: 'JA4 Fingerprints (Advanced TLS)',
    fpRisk: 'Risk',
    fpAnalysis: 'Analysis',
    fpTrafficShare: 'of traffic',
    cachePerformance: 'Cache Performance',
    cachedRequests: 'Cached Requests',
    uncachedRequests: 'Uncached',
    cachedBandwidth: 'Cached BW',
    uncachedBandwidth: 'Uncached BW',
    securityScores: 'Security Category Breakdown',
    findings: 'findings',
    planLimited: 'Plan limited',
    recommendations: 'Recommendations',
    productRecommendations: 'Product Recommendations',
    priority: { critical: 'Critical', high: 'High', medium: 'Medium' },
    product: 'Product',
    minPlan: 'Min Plan',
    estimatedValue: 'Estimated Value',
    basic: 'Basic',
    pro: 'Pro',
    complete: 'Complete',
    exportPdf: 'Export PDF',
    goBack: 'Go Back',
    ip: 'IP',
    country: 'Country',
    action: 'Action',
    requests: 'Requests',
    userAgent: 'User Agent',
    asn: 'ASN',
    host: 'Host',
    hash: 'Hash',
    count: 'Count',
    engine: 'Engine',
    planProducts: 'Recommended Products for Your Plan',
    planProductsDesc: 'Based on your Cloudflare plan, these products would improve your security:',
    automated: 'Automated',
    likelyHuman: 'Likely Human',
    verifiedBot: 'Verified Bot',
    likelyAutomated: 'Likely Automated',
    dataNotAvailable: 'Data not available at this audit tier',
    upgradeHint: 'Upgrade to a higher tier to see this analysis',
    upgradeToProHint: 'Available in Pro or Complete audit',
    upgradeToCompleteHint: 'Available in Complete audit',
    // Basic tier sections
    configOverview: 'Configuration Overview',
    dnsRecords: 'DNS Records',
    dnsProxyStatus: 'DNS Proxy Status',
    proxied: 'Proxied',
    dnsOnly: 'DNS Only',
    securitySettings: 'Security Settings',
    performanceSettings: 'Performance Settings',
    enabled: 'Enabled',
    disabled: 'Disabled',
    wafRulesets: 'WAF / Firewall Rules',
    rulesCount: 'rules',
    alreadyActive: 'Already active',
    currentConfig: 'Current',
    recommendedConfig: 'Recommended',
    configStatus: 'Status',
    configOk: 'OK',
    configFix: 'Fix',
    attackInsights: 'Attack Intelligence',
    attackType: 'Activity Type',
    attackVolume: 'Volume',
    attackSeverity: 'Severity',
    uaAttackIntel: 'Attack Intel',
    uaCorrelatedIps: 'correlated IPs',
    uaBlockedReqs: 'blocked',
    uaOrigins: 'Origins',
    uaThreatSummary: 'Detected Threat Summary',
    uaThreatDesc: 'User agents correlated with attack activity on your domain',
    uaThreatsFound: 'active threats',
    uaBlockedTotal: 'blocked requests',
    uaFromCountries: 'from countries',
    uaNoThreats: 'No threats detected in user agents for the analyzed period',
    // Executive Analysis (Complete)
    executiveAnalysis: 'Executive Analysis',
    executiveDesc: 'Complete summary of your domain security posture',
    execWho: 'Who is attacking your domain',
    execHow: 'How they attack your domain',
    execWhere: 'Where they attack your domain',
    execProblems: 'Detected Problems',
    execNoAttacks: 'No significant attacks detected in the analyzed period.',
    execSummary: 'General Summary',
    // Compliance Preview
    compliancePreview: 'Regulatory Compliance Preview',
    compliancePreviewDesc: 'Your audit maps to 70 controls across 5 regulatory frameworks. Here is a preview:',
    complianceControl: 'Control',
    complianceStatus: 'Status',
    complianceCurrent: 'Current Value',
    complianceExpected: 'Expected Value',
    compliancePass: 'Compliant',
    complianceFail: 'Non-Compliant',
    compliancePartial: 'Partial',
    complianceUnlock: 'Unlock Full Analysis',
    complianceBundleLabel: 'Complete Bundle (5 frameworks)',
    complianceBundlePrice: '2,500 credits',
    complianceBundleSave: 'Save 900 credits vs. individual',
    complianceIndividual: 'Individual from 500 credits',
    complianceCta: 'Run Compliance',
    complianceDisclaimer: 'This analysis is advisory. It does not constitute a formal certification.',
    complianceTotalControls: 'evaluable controls',
    complianceFrameworks: 'regulatory frameworks',
    complianceSampleOf: 'Sample of',
    complianceRequiresPro: 'Requires Pro or Complete audit',
  },
};

// ─── Plan-Based Product Recommendations ───────────────────────────────────────
interface PlanProduct {
  name: string;
  desc: { es: string; en: string };
  icon: string;
  color: string;
  detectKey?: string; // key used to check if already active
}

const PLAN_PRODUCTS: Record<string, PlanProduct[]> = {
  free: [
    { name: 'Pro Plan', desc: { es: 'WAF gestionado, optimizacion de imagenes, analytics avanzado', en: 'Managed WAF, image optimization, advanced analytics' }, icon: '\u2B06', color: COLORS.cyan },
    { name: 'Bot Fight Mode', desc: { es: 'Proteccion basica contra bots automatizada', en: 'Basic automated bot protection' }, icon: ICON.robot, color: COLORS.blue, detectKey: 'bot_management' },
    { name: 'Page Rules', desc: { es: 'Reglas de cache y redireccion personalizadas (3 gratis)', en: 'Custom cache and redirect rules (3 free)' }, icon: ICON.clipboard, color: COLORS.green },
  ],
  pro: [
    { name: 'Business Plan', desc: { es: 'WAF avanzado, SLA 100%, reglas de firewall custom', en: 'Advanced WAF, 100% SLA, custom firewall rules' }, icon: '\u2B06', color: COLORS.cyan },
    { name: 'Argo Smart Routing', desc: { es: 'Enrutamiento inteligente para menor latencia', en: 'Smart routing for lower latency' }, icon: '\uD83D\uDD00', color: COLORS.purple, detectKey: 'argo' },
    { name: 'Rate Limiting', desc: { es: 'Limitacion de tasa avanzada con reglas custom', en: 'Advanced rate limiting with custom rules' }, icon: '\u23F1', color: COLORS.yellow, detectKey: 'rate_limiting' },
    { name: 'Workers', desc: { es: 'Compute en el edge para logica personalizada', en: 'Edge compute for custom logic' }, icon: '\u26A1', color: COLORS.orange },
  ],
  business: [
    { name: 'Enterprise Plan', desc: { es: 'SLA dedicado, soporte premium, analytics en tiempo real', en: 'Dedicated SLA, premium support, real-time analytics' }, icon: '\u2B06', color: COLORS.cyan },
    { name: 'Advanced DDoS', desc: { es: 'Proteccion DDoS L7 avanzada con mitigacion adaptativa', en: 'Advanced L7 DDoS protection with adaptive mitigation' }, icon: ICON.shield, color: COLORS.red, detectKey: 'advanced_ddos' },
    { name: 'Spectrum', desc: { es: 'Proteccion para protocolos no-HTTP (TCP/UDP)', en: 'Protection for non-HTTP protocols (TCP/UDP)' }, icon: ICON.globe, color: COLORS.blue },
    { name: 'Load Balancing', desc: { es: 'Balanceo de carga global con health checks', en: 'Global load balancing with health checks' }, icon: '\u2696', color: COLORS.green, detectKey: 'load_balancing' },
  ],
  enterprise: [
    { name: 'Bot Management', desc: { es: 'Deteccion avanzada de bots con ML y fingerprinting', en: 'Advanced bot detection with ML and fingerprinting' }, icon: ICON.robot, color: COLORS.purple, detectKey: 'bot_management' },
    { name: 'API Shield', desc: { es: 'Proteccion completa de APIs con schema validation', en: 'Complete API protection with schema validation' }, icon: ICON.lock, color: COLORS.cyan, detectKey: 'api_shield' },
    { name: 'Advanced Certificate Manager', desc: { es: 'Certificados SSL/TLS personalizados y dedicados', en: 'Custom and dedicated SSL/TLS certificates' }, icon: ICON.doc, color: COLORS.green, detectKey: 'acm' },
    { name: 'Data Localization', desc: { es: 'Control de donde se almacenan y procesan los datos', en: 'Control where data is stored and processed' }, icon: ICON.globe, color: COLORS.yellow },
    { name: 'Magic Transit', desc: { es: 'Proteccion DDoS para infraestructura de red completa', en: 'DDoS protection for entire network infrastructure' }, icon: '\u2728', color: COLORS.orange },
    { name: 'Cloudflare One', desc: { es: 'Zero Trust completo: Access, Gateway, WARP, Browser Isolation', en: 'Complete Zero Trust: Access, Gateway, WARP, Browser Isolation' }, icon: '\uD83C\uDFE2', color: COLORS.blue },
  ],
};

/** Detect which products are already active from zone data */
function detectActiveProducts(data: any): Set<string> {
  const active = new Set<string>();
  const settings = data.zone_settings || [];
  const rulesets = data.rulesets || [];

  // Helper: get setting value
  const getSetting = (id: string) => settings.find?.((s: any) => s.id === id)?.value;

  // Advanced DDoS
  if (getSetting('advanced_ddos') === 'on') active.add('advanced_ddos');

  // Rate Limiting (has rules in http_ratelimit phase)
  const rlRuleset = rulesets.find?.((r: any) => r.phase === 'http_ratelimit');
  if (rlRuleset?.rules?.length > 0) active.add('rate_limiting');

  // Bot Management (rules using cf.bot_management.score or cf.bot_management.ja3_hash or cf.verified_bot_category)
  const allExpressions = rulesets.flatMap?.((r: any) => (r.rules || []).map((rule: any) => rule.expression || '')) || [];
  const allExprs = allExpressions.join(' ');
  if (/cf\.bot_management\.|cf\.verified_bot_category/.test(allExprs)) active.add('bot_management');

  // WAF Managed Rules
  const wafManaged = rulesets.find?.((r: any) => r.phase === 'http_request_firewall_managed');
  if (wafManaged?.rules?.length > 0) active.add('waf_managed');

  // Load Balancing (detected if argo/lb setting or Argo rule)
  if (/lb-|load.?balanc/i.test(allExprs)) active.add('load_balancing');

  // Argo (detected from rules mentioning argo)
  if (/argo/i.test(allExprs)) active.add('argo');

  // SSL strict
  if (getSetting('ssl') === 'strict') active.add('ssl_strict');

  // TLS client auth (mTLS / API Shield indicator)
  if (getSetting('tls_client_auth') === 'on') active.add('api_shield');

  // ACM (if min_tls_version > 1.0 and tls_1_3 enabled, likely has ACM)
  if (getSetting('tls_client_auth') === 'on') active.add('acm');

  return active;
}

// ─── Key security/performance settings for Basic charts ───────────────────────
const SECURITY_SETTINGS_MAP: { id: string; label: { es: string; en: string }; category: 'security' | 'performance' }[] = [
  { id: 'always_use_https', label: { es: 'HTTPS Forzado', en: 'Force HTTPS' }, category: 'security' },
  { id: 'ssl', label: { es: 'Modo SSL', en: 'SSL Mode' }, category: 'security' },
  { id: 'tls_1_3', label: { es: 'TLS 1.3', en: 'TLS 1.3' }, category: 'security' },
  { id: 'min_tls_version', label: { es: 'TLS Minimo', en: 'Min TLS' }, category: 'security' },
  { id: 'automatic_https_rewrites', label: { es: 'HTTPS Auto Rewrite', en: 'Auto HTTPS Rewrite' }, category: 'security' },
  { id: 'browser_check', label: { es: 'Browser Check', en: 'Browser Check' }, category: 'security' },
  { id: 'hotlink_protection', label: { es: 'Hotlink Protection', en: 'Hotlink Protection' }, category: 'security' },
  { id: 'email_obfuscation', label: { es: 'Ofuscacion Email', en: 'Email Obfuscation' }, category: 'security' },
  { id: 'opportunistic_encryption', label: { es: 'Cifrado Oportunista', en: 'Opportunistic Encryption' }, category: 'security' },
  { id: 'waf', label: { es: 'WAF Clasico', en: 'Classic WAF' }, category: 'security' },
  { id: 'advanced_ddos', label: { es: 'DDoS Avanzado', en: 'Advanced DDoS' }, category: 'security' },
  { id: 'http2', label: { es: 'HTTP/2', en: 'HTTP/2' }, category: 'performance' },
  { id: 'http3', label: { es: 'HTTP/3 (QUIC)', en: 'HTTP/3 (QUIC)' }, category: 'performance' },
  { id: '0rtt', label: { es: '0-RTT', en: '0-RTT' }, category: 'performance' },
  { id: 'brotli', label: { es: 'Brotli', en: 'Brotli' }, category: 'performance' },
  { id: 'early_hints', label: { es: 'Early Hints', en: 'Early Hints' }, category: 'performance' },
  { id: 'rocket_loader', label: { es: 'Rocket Loader', en: 'Rocket Loader' }, category: 'performance' },
  { id: 'mirage', label: { es: 'Mirage', en: 'Mirage' }, category: 'performance' },
  { id: 'polish', label: { es: 'Polish (Imagenes)', en: 'Polish (Images)' }, category: 'performance' },
  { id: 'ipv6', label: { es: 'IPv6', en: 'IPv6' }, category: 'performance' },
  { id: 'websockets', label: { es: 'WebSockets', en: 'WebSockets' }, category: 'performance' },
];

function isSettingOn(value: any): boolean {
  if (value === 'on' || value === true) return true;
  if (typeof value === 'string' && value !== 'off' && value !== '' && value !== 'false') return true;
  return false;
}

// ─── Config Audit: Current vs Recommended ─────────────────────────────────────
interface ConfigAuditItem {
  label: { es: string; en: string };
  settingId: string;
  current: string;
  recommended: string;
  ok: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

function buildConfigAudit(settingsMap: Record<string, any>): ConfigAuditItem[] {
  const items: ConfigAuditItem[] = [];
  const check = (id: string, label: { es: string; en: string }, rec: string, severity: ConfigAuditItem['severity'], okFn: (v: any) => boolean) => {
    const val = settingsMap[id];
    const display = val === undefined ? '—' : typeof val === 'object' ? JSON.stringify(val) : String(val);
    items.push({ label, settingId: id, current: display, recommended: rec, ok: okFn(val), severity });
  };

  check('ssl', { es: 'Modo SSL/TLS', en: 'SSL/TLS Mode' }, 'strict', 'critical',
    v => v === 'strict' || v === 'full');
  check('always_use_https', { es: 'Forzar HTTPS', en: 'Force HTTPS' }, 'on', 'critical',
    v => v === 'on');
  check('min_tls_version', { es: 'Version TLS Minima', en: 'Min TLS Version' }, '1.2', 'high',
    v => v === '1.2' || v === '1.3');
  check('tls_1_3', { es: 'TLS 1.3', en: 'TLS 1.3' }, 'on (zrt)', 'high',
    v => v === 'on' || v === 'zrt');
  check('automatic_https_rewrites', { es: 'HTTPS Rewrite Auto', en: 'Auto HTTPS Rewrite' }, 'on', 'medium',
    v => v === 'on');
  check('security_level', { es: 'Nivel de Seguridad', en: 'Security Level' }, 'high', 'high',
    v => v === 'high' || v === 'under_attack');
  check('browser_check', { es: 'Browser Integrity Check', en: 'Browser Integrity Check' }, 'on', 'medium',
    v => v === 'on');
  check('hotlink_protection', { es: 'Hotlink Protection', en: 'Hotlink Protection' }, 'on', 'low',
    v => v === 'on');
  check('http3', { es: 'HTTP/3 (QUIC)', en: 'HTTP/3 (QUIC)' }, 'on', 'medium',
    v => v === 'on');
  check('brotli', { es: 'Compresion Brotli', en: 'Brotli Compression' }, 'on', 'medium',
    v => v === 'on');
  check('early_hints', { es: 'Early Hints (103)', en: 'Early Hints (103)' }, 'on', 'low',
    v => v === 'on');
  check('0rtt', { es: '0-RTT Resumption', en: '0-RTT Resumption' }, 'on', 'low',
    v => v === 'on');

  // Check HSTS
  const hsts = settingsMap['security_header']?.strict_transport_security;
  items.push({
    label: { es: 'HSTS (Strict Transport Security)', en: 'HSTS (Strict Transport Security)' },
    settingId: 'security_header',
    current: hsts?.enabled ? `max-age=${hsts.max_age}` : 'off',
    recommended: 'on (max-age=31536000)',
    ok: hsts?.enabled && hsts?.max_age >= 31536000,
    severity: 'high',
  });

  return items;
}

// ─── Attacker IP Classification ───────────────────────────────────────────────
interface AttackerInsight {
  type: string;
  label: { es: string; en: string };
  color: string;
  severity: 'info' | 'warning' | 'danger';
}

function classifyAttacker(ip: any): AttackerInsight {
  const ua = (ip.user_agent || '').toLowerCase();
  const asnName = (ip.asn_name || '').toLowerCase();

  // Cloudflare internal
  if (ip.asn === 13335 || asnName.includes('cloudflare')) {
    if (ua.includes('healthcheck')) return { type: 'health', label: { es: 'Health Check CF', en: 'CF Health Check' }, color: COLORS.cyan, severity: 'info' };
    return { type: 'cloudflare', label: { es: 'Infra Cloudflare', en: 'Cloudflare Infra' }, color: COLORS.cyan, severity: 'info' };
  }
  // Load testing / bench tools
  if (/apachebench|ab\/|wrk\/|siege|k6\/|locust|vegeta|hey\/|bombardier|gatling/i.test(ua)) {
    return { type: 'loadtest', label: { es: 'Load Testing', en: 'Load Testing' }, color: COLORS.orange, severity: 'warning' };
  }
  // DDoS tools
  if (/loic|hoic|hulk|slowloris|goldeneye/i.test(ua)) {
    return { type: 'ddos', label: { es: 'Herramienta DDoS', en: 'DDoS Tool' }, color: COLORS.red, severity: 'danger' };
  }
  // Scanners
  if (/nikto|sqlmap|nmap|masscan|nuclei|gobuster|dirbuster|ffuf|wpscan|burp|acunetix|zgrab/i.test(ua)) {
    return { type: 'scanner', label: { es: 'Escaner', en: 'Scanner' }, color: COLORS.red, severity: 'danger' };
  }
  // Bots/scrapers
  if (/scrapy|python|curl|wget|go-http|java\/|bot|crawl|spider/i.test(ua)) {
    return { type: 'bot', label: { es: 'Bot/Scraper', en: 'Bot/Scraper' }, color: COLORS.yellow, severity: 'warning' };
  }
  // Hosting/Cloud ASNs (common attack origins)
  if (/amazon|aws|digitalocean|linode|akamai|hetzner|ovh|vultr|google cloud/i.test(asnName)) {
    return { type: 'cloud', label: { es: 'Infra Cloud', en: 'Cloud Infra' }, color: COLORS.yellow, severity: 'warning' };
  }
  // Block action = confirmed attack
  if (ip.action === 'block') {
    return { type: 'blocked', label: { es: 'Bloqueado', en: 'Blocked' }, color: COLORS.red, severity: 'danger' };
  }
  return { type: 'unknown', label: { es: 'Desconocido', en: 'Unknown' }, color: COLORS.textMuted, severity: 'info' };
}

// ─── UA ↔ Attacker IP Correlation ─────────────────────────────────────────────
interface UACorrelation {
  matchedIps: number;
  totalBlocked: number;
  totalRequests: number;
  topCountries: string[];
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/** Cross-reference a UA string against the top_attacker_ips list.
 *  Attacker IPs may include user_agent field — we do a substring match.
 *  Also checks if the UA itself matches an attack pattern to boost severity. */
function correlateUAWithAttackers(uaStr: string, attackerIps: any[]): UACorrelation {
  if (!attackerIps?.length || !uaStr) return { matchedIps: 0, totalBlocked: 0, totalRequests: 0, topCountries: [], severity: 'none' };

  const uaLower = uaStr.toLowerCase();
  let matchedIps = 0;
  let totalBlocked = 0;
  let totalRequests = 0;
  const countries: string[] = [];

  for (const ip of attackerIps) {
    const ipUa = (ip.user_agent || '').toLowerCase();
    // Match if: exact same UA, UA contains the attack IP's UA, or vice versa
    const uaMatch = ipUa && (uaLower.includes(ipUa) || ipUa.includes(uaLower));
    // Also match if the IP was blocked and its ASN/pattern suggests related traffic
    if (uaMatch) {
      matchedIps++;
      totalRequests += (ip.count || 0);
      if (ip.action === 'block') totalBlocked += (ip.count || 0);
      if (ip.country && !countries.includes(ip.country)) countries.push(ip.country);
    }
  }

  // Determine correlation severity
  let severity: UACorrelation['severity'] = 'none';
  if (matchedIps > 0) {
    if (totalBlocked > 0) severity = 'critical';
    else if (matchedIps >= 3) severity = 'high';
    else severity = 'medium';
  }

  return { matchedIps, totalBlocked, totalRequests, topCountries: countries.slice(0, 4), severity };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gradeColor(score: number) {
  if (score >= 90) return COLORS.green;
  if (score >= 75) return COLORS.cyan;
  if (score >= 60) return COLORS.yellow;
  if (score >= 40) return COLORS.orange;
  return COLORS.red;
}

function tierBadge(tier: string, s: any) {
  const map: Record<string, { label: string; color: string }> = {
    basic: { label: s.basic, color: COLORS.cyan },
    pro: { label: s.pro, color: COLORS.blue },
    complete: { label: s.complete, color: COLORS.purple },
  };
  const t = map[tier] || map.basic;
  return (
    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: t.color + '15', color: t.color, border: `1px solid ${t.color}30` }}>
      {t.label}
    </span>
  );
}

function countryFlag(code: string) {
  if (!code || code.length !== 2) return ICON.globe;
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** Upgrade teaser panel shown when data is not available for the tier */
function UpgradeTeaser({ text, subtext }: { text: string; subtext: string }) {
  return (
    <div className="rounded-xl p-6 text-center" style={{ background: '#0f172a80', border: `1px dashed ${COLORS.cyan}30` }}>
      <p className="text-lg mb-1" style={{ color: COLORS.textMuted }}>{ICON.lock}</p>
      <p className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>{text}</p>
      <p className="text-xs mt-1" style={{ color: COLORS.cyan }}>{subtext}</p>
    </div>
  );
}

// ─── Executive Analysis Builder (Complete tier) ──────────────────────────────
function buildExecutiveAnalysis(data: any, score: any, report: any, lang: 'es' | 'en') {
  const s = t[lang];
  const sections: { title: string; icon: string; items: string[]; color: string }[] = [];

  // WHO is attacking
  const whoItems: string[] = [];
  if (data.top_attacker_ips?.length) {
    const topCountries = [...new Set(data.top_attacker_ips.slice(0, 5).map((ip: any) => ip.country).filter(Boolean))];
    if (topCountries.length) {
      whoItems.push(lang === 'es'
        ? `Ataques provienen principalmente de: ${topCountries.map((c: string) => `${countryFlag(c)} ${c}`).join(', ')}`
        : `Attacks primarily come from: ${topCountries.map((c: string) => `${countryFlag(c)} ${c}`).join(', ')}`);
    }
    const topASNs = [...new Set(data.top_attacker_ips.slice(0, 3).map((ip: any) => ip.asn_name).filter(Boolean))];
    if (topASNs.length) {
      whoItems.push(lang === 'es'
        ? `Redes mas activas: ${topASNs.join(', ')}`
        : `Most active networks: ${topASNs.join(', ')}`);
    }
  }
  if (data.bot_scores) {
    const botPct = ((data.bot_scores.automated / (data.bot_scores.total_requests || 1)) * 100).toFixed(1);
    whoItems.push(lang === 'es'
      ? `${botPct}% del trafico es automatizado (${formatNumber(data.bot_scores.automated)} peticiones)`
      : `${botPct}% of traffic is automated (${formatNumber(data.bot_scores.automated)} requests)`);
  }
  if (data.bot_asns?.length) {
    whoItems.push(lang === 'es'
      ? `ASNs bot principales: ${data.bot_asns.slice(0, 3).map((a: any) => `AS${a.asn} ${a.name || ''}`).join(', ')}`
      : `Top bot ASNs: ${data.bot_asns.slice(0, 3).map((a: any) => `AS${a.asn} ${a.name || ''}`).join(', ')}`);
  }
  if (!whoItems.length) whoItems.push(s.execNoAttacks);
  sections.push({ title: s.execWho, icon: ICON.eye, items: whoItems, color: COLORS.red });

  // HOW they attack
  const howItems: string[] = [];
  if (data.waf_events?.events_by_action) {
    const actions = data.waf_events.events_by_action;
    const total = data.waf_events.total_events || 0;
    if (total > 0) {
      howItems.push(lang === 'es'
        ? `${formatNumber(total)} eventos WAF detectados: ${Object.entries(actions).map(([k, v]) => `${k}: ${formatNumber(v as number)}`).join(', ')}`
        : `${formatNumber(total)} WAF events detected: ${Object.entries(actions).map(([k, v]) => `${k}: ${formatNumber(v as number)}`).join(', ')}`);
    }
  }
  if (data.detection_engines?.length) {
    howItems.push(lang === 'es'
      ? `Motores de deteccion activos: ${data.detection_engines.map((e: any) => e.engine.replace(/_/g, ' ')).join(', ')}`
      : `Active detection engines: ${data.detection_engines.map((e: any) => e.engine.replace(/_/g, ' ')).join(', ')}`);
  }
  if (data.http_methods) {
    const suspicious = data.http_methods.filter((m: any) => ['DELETE', 'PUT', 'PATCH', 'OPTIONS', 'TRACE'].includes(m.method));
    if (suspicious.length) {
      howItems.push(lang === 'es'
        ? `Metodos HTTP inusuales detectados: ${suspicious.map((m: any) => `${m.method} (${formatNumber(m.count)})`).join(', ')}`
        : `Unusual HTTP methods detected: ${suspicious.map((m: any) => `${m.method} (${formatNumber(m.count)})`).join(', ')}`);
    }
  }
  if (data.traffic_analytics?.top_user_agents) {
    const badUAs = data.traffic_analytics.top_user_agents.filter((ua: any) => {
      const cls = classifyUserAgent(ua.ua || '');
      return cls.risk === 'high' || cls.risk === 'critical';
    });
    if (badUAs.length) {
      howItems.push(lang === 'es'
        ? `${badUAs.length} user agents maliciosos/sospechosos detectados en el top de trafico`
        : `${badUAs.length} malicious/suspicious user agents detected in top traffic`);
    }
  }
  sections.push({ title: s.execHow, icon: ICON.target, items: howItems.length ? howItems : [s.execNoAttacks], color: COLORS.orange });

  // WHERE they attack
  const whereItems: string[] = [];
  if (data.waf_events?.top_paths?.length) {
    whereItems.push(lang === 'es'
      ? `Rutas mas atacadas: ${data.waf_events.top_paths.slice(0, 5).map((p: any) => `${p.path} (${formatNumber(p.count)})`).join(', ')}`
      : `Most attacked paths: ${data.waf_events.top_paths.slice(0, 5).map((p: any) => `${p.path} (${formatNumber(p.count)})`).join(', ')}`);
  }
  if (data.traffic_analytics?.top_paths?.length) {
    whereItems.push(lang === 'es'
      ? `Rutas con mas trafico: ${data.traffic_analytics.top_paths.slice(0, 3).map((p: any) => p.path).join(', ')}`
      : `Highest traffic paths: ${data.traffic_analytics.top_paths.slice(0, 3).map((p: any) => p.path).join(', ')}`);
  }
  sections.push({ title: s.execWhere, icon: ICON.magnify, items: whereItems.length ? whereItems : [s.execNoAttacks], color: COLORS.blue });

  // PROBLEMS detected
  const problemItems: string[] = [];
  if (score.categories) {
    const weakCats = score.categories.filter((c: any) => c.score < 60).sort((a: any, b: any) => a.score - b.score);
    for (const cat of weakCats.slice(0, 5)) {
      problemItems.push(lang === 'es'
        ? `${cat.label.es}: Puntuacion ${cat.score}/100 (${cat.grade}) — ${cat.findings.length} hallazgos`
        : `${cat.label.en}: Score ${cat.score}/100 (${cat.grade}) — ${cat.findings.length} findings`);
    }
  }
  if (data.cache_analytics && data.cache_analytics.hit_ratio < 0.5) {
    problemItems.push(lang === 'es'
      ? `Cache hit ratio bajo: ${(data.cache_analytics.hit_ratio * 100).toFixed(1)}% — se recomienda optimizar reglas de cache`
      : `Low cache hit ratio: ${(data.cache_analytics.hit_ratio * 100).toFixed(1)}% — recommend optimizing cache rules`);
  }
  if (score.overall_score < 70) {
    problemItems.push(lang === 'es'
      ? `Puntuacion general (${score.overall_score}/100) por debajo del umbral recomendado de 70`
      : `Overall score (${score.overall_score}/100) below recommended threshold of 70`);
  }
  sections.push({ title: s.execProblems, icon: ICON.warning, items: problemItems.length ? problemItems : [lang === 'es' ? 'No se detectaron problemas criticos' : 'No critical problems detected'], color: COLORS.yellow });

  // Summary
  const summaryItems: string[] = [];
  const totalReqs = data.traffic_analytics?.total_requests || 0;
  const wafTotal = data.waf_events?.total_events || 0;
  const botPct = data.bot_scores ? ((data.bot_scores.automated / (data.bot_scores.total_requests || 1)) * 100).toFixed(1) : '0';
  summaryItems.push(lang === 'es'
    ? `Dominio ${report.zone_name} (${report.cf_plan}) analizado con ${report.collectors_run} colectores en ${(report.duration_ms / 1000).toFixed(1)}s`
    : `Domain ${report.zone_name} (${report.cf_plan}) analyzed with ${report.collectors_run} collectors in ${(report.duration_ms / 1000).toFixed(1)}s`);
  summaryItems.push(lang === 'es'
    ? `Trafico: ${formatNumber(totalReqs)} peticiones, ${formatNumber(wafTotal)} eventos WAF, ${botPct}% trafico automatizado`
    : `Traffic: ${formatNumber(totalReqs)} requests, ${formatNumber(wafTotal)} WAF events, ${botPct}% automated traffic`);
  summaryItems.push(lang === 'es'
    ? `Puntuacion: ${score.overall_score}/100 (${score.overall_grade}) — ${score.categories.filter((c: any) => c.score >= 80).length}/${score.categories.length} categorias en buen estado`
    : `Score: ${score.overall_score}/100 (${score.overall_grade}) — ${score.categories.filter((c: any) => c.score >= 80).length}/${score.categories.length} categories in good shape`);
  sections.push({ title: s.execSummary, icon: ICON.brain, items: summaryItems, color: COLORS.purple });

  return sections;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface AuditReportViewProps {
  report: AuditReport;
  lang: 'es' | 'en';
  onBack: () => void;
  onExportPdf?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AuditReportView({ report, lang, onBack, onExportPdf }: AuditReportViewProps) {
  const s = t[lang];
  const data = report.data || {};
  const score = report.score;
  const hasPro = report.tier === 'pro' || report.tier === 'complete';
  const hasComplete = report.tier === 'complete';

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (id: string) => setExpandedSection(expandedSection === id ? null : id);

  // Derive plan key for recommendations
  const planKey = (() => {
    const p = (report.cf_plan || '').toLowerCase();
    if (p.includes('enterprise')) return 'enterprise';
    if (p.includes('business')) return 'business';
    if (p.includes('pro')) return 'pro';
    return 'free';
  })();

  const activeProducts = detectActiveProducts(data);
  const allPlanProducts = PLAN_PRODUCTS[planKey] || [];
  const planProducts = allPlanProducts.filter(p => !p.detectKey || !activeProducts.has(p.detectKey));
  const activeProductNames = allPlanProducts.filter(p => p.detectKey && activeProducts.has(p.detectKey));

  // Build settings map for Basic charts
  const settingsMap: Record<string, any> = {};
  if (data.zone_settings) {
    for (const s2 of data.zone_settings) settingsMap[s2.id] = s2.value;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Top Actions Bar (sticky) ─────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl z-50"
        style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(10,10,15,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${COLORS.border}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        <button onClick={onBack} className="flex items-center gap-2 text-sm px-3 sm:px-4 py-2 rounded-lg transition-colors" style={{ color: COLORS.cyan, background: COLORS.cyan + '10' }}>
          {ICON.back} {s.goBack}
        </button>
        <div className="flex flex-wrap gap-2 items-center">
          {tierBadge(report.tier, s)}
          {onExportPdf && (
            <button onClick={onExportPdf} className="flex items-center gap-2 text-sm px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors" style={{ background: COLORS.cyan + '15', color: COLORS.cyan, border: `1px solid ${COLORS.cyan}30` }}>
              {ICON.pdf} {s.exportPdf}
            </button>
          )}
        </div>
      </div>

      {/* ── Report Header with Screenshot ───────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
          {/* Domain Screenshot */}
          <div className="lg:col-span-1 p-4 flex flex-col items-center justify-center lg:border-r" style={{ borderColor: COLORS.border }}>
            <p className="text-xs mb-2 font-medium uppercase tracking-wider" style={{ color: COLORS.textMuted }}>{s.domainScreenshot}</p>
            <div className="rounded-xl overflow-hidden border w-full" style={{ borderColor: COLORS.border, maxHeight: 200 }}>
              <img
                src={`https://image.thum.io/get/width/600/crop/340/noanimate/https://${report.zone_name}`}
                alt={report.zone_name}
                className="w-full h-auto object-cover"
                style={{ minHeight: 120, background: '#1a1a2e' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div className="mt-3 text-center">
              <h2 className="text-lg font-bold" style={{ color: COLORS.textPrimary }}>{report.zone_name}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase" style={{ background: COLORS.green + '15', color: COLORS.green }}>{data.zone_info?.status || 'active'}</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: COLORS.purple + '15', color: COLORS.purple }}>{report.cf_plan}</span>
              </div>
            </div>
          </div>

          {/* Speedometer + Meta */}
          <div className="lg:col-span-2 p-6 flex flex-col items-center justify-center">
            <p className="text-xs mb-1 font-medium uppercase tracking-wider" style={{ color: COLORS.textMuted }}>{s.overallScore}</p>
            <Speedometer score={score.overall_score} grade={score.overall_grade} size={260} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 w-full">
              <div className="text-center">
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.tier}</p>
                <p className="text-sm font-bold capitalize" style={{ color: COLORS.textPrimary }}>{report.tier}</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.duration}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{(report.duration_ms / 1000).toFixed(1)}s</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.collectors}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{report.collectors_run}</p>
              </div>
              <div className="text-center">
                <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.generated}</p>
                <p className="text-sm font-bold" style={{ color: COLORS.textPrimary }}>{new Date(report.generated_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Key Metrics Row (ALL TIERS — shows available data) ──────── */}
      <div>
        <SectionHeader title={s.keyMetrics} icon={ICON.chart} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.traffic_analytics && (
            <>
              <MetricCard label={s.totalRequests} value={formatNumber(data.traffic_analytics.total_requests || 0)} icon={ICON.satellite} color={COLORS.cyan} />
              <MetricCard label={s.bandwidth} value={formatBytes(data.traffic_analytics.total_bandwidth || 0)} icon={ICON.signal} color={COLORS.blue} />
            </>
          )}
          {data.cache_analytics && (
            <MetricCard label={s.cacheHitRatio} value={`${(data.cache_analytics.hit_ratio * 100).toFixed(1)}%`} icon={ICON.disk} color={data.cache_analytics.hit_ratio > 0.8 ? COLORS.green : COLORS.yellow} />
          )}
          {data.waf_events && (
            <MetricCard label={s.wafEvents} value={formatNumber(data.waf_events.total_events || 0)} icon={ICON.shield} color={COLORS.orange} />
          )}
          {data.bot_scores && (
            <MetricCard
              label={s.botTraffic}
              value={`${((data.bot_scores.automated / (data.bot_scores.total_requests || 1)) * 100).toFixed(1)}%`}
              sublabel={formatNumber(data.bot_scores.automated) + (lang === 'es' ? ' automatizados' : ' automated')}
              icon={ICON.robot}
              color={COLORS.red}
            />
          )}
          {data.waf_events?.events_by_action?.block !== undefined && (
            <MetricCard label={s.blockedRequests} value={formatNumber(data.waf_events.events_by_action.block)} icon={ICON.ban} color={COLORS.red} />
          )}
          {/* Basic tier: show what data we have from zone_settings */}
          {!data.traffic_analytics && (
            <>
              <MetricCard label={s.collectors} value={String(report.collectors_run)} icon={ICON.search} color={COLORS.cyan} />
              <MetricCard label={s.tier} value={report.tier.toUpperCase()} icon={ICON.shield} color={COLORS.blue} />
            </>
          )}
        </div>
      </div>

      {/* ── Basic Config Overview (ALL TIERS — charts from zone data) ── */}
      {data.zone_settings && (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.configOverview} icon={ICON.shield} badge={report.tier.toUpperCase()} badgeColor={report.tier === 'basic' ? COLORS.cyan : report.tier === 'pro' ? COLORS.blue : COLORS.purple} />
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* DNS Records Donut */}
              {data.dns_summary?.record_types && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.dnsRecords}</h4>
                  <DonutChart
                    size={160}
                    centerLabel="Total"
                    centerValue={String(data.dns_summary.total_records || 0)}
                    slices={Object.entries(data.dns_summary.record_types).map(([type, count], i) => ({
                      label: type,
                      value: count as number,
                      color: CHART_PALETTE[i % CHART_PALETTE.length],
                    }))}
                  />
                </div>
              )}

              {/* DNS Proxy Donut */}
              {data.dns_summary && (data.dns_summary.proxied_count > 0 || data.dns_summary.dns_only_count > 0) && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.dnsProxyStatus}</h4>
                  <DonutChart
                    size={160}
                    centerLabel="DNS"
                    centerValue={String(data.dns_summary.total_records || 0)}
                    slices={[
                      { label: s.proxied, value: data.dns_summary.proxied_count || 0, color: COLORS.cyan },
                      { label: s.dnsOnly, value: data.dns_summary.dns_only_count || 0, color: COLORS.yellow },
                    ]}
                  />
                  <div className="mt-2 text-center">
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      background: data.dns_summary.dnssec_enabled ? COLORS.green + '15' : COLORS.red + '15',
                      color: data.dns_summary.dnssec_enabled ? COLORS.green : COLORS.red,
                    }}>
                      DNSSEC: {data.dns_summary.dnssec_enabled ? s.enabled : s.disabled}
                    </span>
                  </div>
                </div>
              )}

              {/* WAF Rulesets Bar */}
              {data.rulesets && data.rulesets.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.wafRulesets}</h4>
                  <HorizontalBarChart
                    items={data.rulesets.map((r: any) => {
                      const phaseLabels: Record<string, string> = {
                        http_request_firewall_managed: 'WAF Managed',
                        http_request_firewall_custom: 'Custom Rules',
                        http_ratelimit: 'Rate Limiting',
                        http_request_sbfm: 'Bot Fight Mode',
                      };
                      return {
                        label: phaseLabels[r.phase] || r.phase.replace(/http_request_/g, '').replace(/_/g, ' '),
                        value: r.rules?.length || 0,
                        color: r.phase.includes('managed') ? COLORS.blue : r.phase.includes('ratelimit') ? COLORS.yellow : COLORS.cyan,
                      };
                    })}
                  />
                  <p className="text-xs mt-2 text-center" style={{ color: COLORS.textMuted }}>
                    {data.rulesets.reduce((sum: number, r: any) => sum + (r.rules?.length || 0), 0)} {s.rulesCount} total
                  </p>
                </div>
              )}
            </div>

            {/* Security & Performance Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Security Settings */}
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.securitySettings}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SECURITY_SETTINGS_MAP.filter(st => st.category === 'security').map((st) => {
                    const val = settingsMap[st.id];
                    const on = isSettingOn(val);
                    const displayVal = typeof val === 'string' && val !== 'on' && val !== 'off' ? val : undefined;
                    return (
                      <div key={st.id} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: '#0f172a' }}>
                        <span style={{ color: COLORS.textSecondary }}>{st.label[lang]}</span>
                        <span className="font-semibold px-1.5 py-0.5 rounded" style={{
                          background: on ? COLORS.green + '15' : COLORS.red + '15',
                          color: on ? COLORS.green : COLORS.red,
                          fontSize: '10px',
                        }}>
                          {displayVal || (on ? s.enabled : s.disabled)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Performance Settings */}
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.performanceSettings}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SECURITY_SETTINGS_MAP.filter(st => st.category === 'performance').map((st) => {
                    const val = settingsMap[st.id];
                    const on = isSettingOn(val);
                    return (
                      <div key={st.id} className="flex items-center justify-between p-2 rounded-lg text-xs" style={{ background: '#0f172a' }}>
                        <span style={{ color: COLORS.textSecondary }}>{st.label[lang]}</span>
                        <span className="font-semibold px-1.5 py-0.5 rounded" style={{
                          background: on ? COLORS.green + '15' : COLORS.red + '15',
                          color: on ? COLORS.green : COLORS.red,
                          fontSize: '10px',
                        }}>
                          {on ? s.enabled : s.disabled}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── Config Audit: Current vs Recommended ── */}
            {(() => {
              const auditItems = buildConfigAudit(settingsMap);
              const issueCount = auditItems.filter(a => !a.ok).length;
              if (!auditItems.length) return null;
              return (
                <div>
                  <h4 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
                    {ICON.clipboard} {lang === 'es' ? 'Auditoria de Configuracion' : 'Configuration Audit'}
                    {issueCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: COLORS.red + '15', color: COLORS.red }}>
                        {issueCount} {lang === 'es' ? 'a corregir' : 'to fix'}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs mb-3" style={{ color: COLORS.textMuted }}>
                    {lang === 'es'
                      ? 'Comparacion de tu configuracion actual contra las mejores practicas de seguridad'
                      : 'Comparison of your current configuration against security best practices'}
                  </p>
                  <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: '#0f172a' }}>
                          <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>Setting</th>
                          <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.currentConfig}</th>
                          <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.recommendedConfig}</th>
                          <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.configStatus}</th>
                          <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.attackSeverity}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditItems.map((item, i) => {
                          const sevColors: Record<string, string> = { critical: COLORS.red, high: COLORS.orange, medium: COLORS.yellow, low: COLORS.textMuted };
                          const sevLabels: Record<string, string> = {
                            critical: lang === 'es' ? 'Critico' : 'Critical',
                            high: lang === 'es' ? 'Alto' : 'High',
                            medium: lang === 'es' ? 'Medio' : 'Medium',
                            low: lang === 'es' ? 'Bajo' : 'Low',
                          };
                          return (
                            <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}`, background: !item.ok ? '#1c1018' : 'transparent' }}>
                              <td className="px-3 py-2 font-medium" style={{ color: COLORS.textPrimary }}>{item.label[lang]}</td>
                              <td className="px-3 py-2 text-center font-mono" style={{ color: item.ok ? COLORS.green : COLORS.red }}>
                                {item.current}
                              </td>
                              <td className="px-3 py-2 text-center font-mono" style={{ color: COLORS.cyan }}>
                                {item.recommended}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{
                                  background: item.ok ? COLORS.green + '15' : COLORS.red + '15',
                                  color: item.ok ? COLORS.green : COLORS.red,
                                }}>
                                  {item.ok ? s.configOk : s.configFix}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center">
                                {!item.ok && (
                                  <span className="text-xs font-semibold" style={{ color: sevColors[item.severity] }}>
                                    {'\u25CF'} {sevLabels[item.severity]}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Executive Analysis (Complete only) ──────────────────────── */}
      {hasComplete && (
        <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.card}, #0c1225)`, border: `1px solid ${COLORS.purple}25` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.executiveAnalysis} subtitle={s.executiveDesc} icon={ICON.brain} badge="COMPLETE" badgeColor={COLORS.purple} />
          </div>
          <div className="p-5 space-y-4">
            {buildExecutiveAnalysis(data, score, report, lang).map((section, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: section.color + '06', border: `1px solid ${section.color}18` }}>
                <h4 className="text-sm font-bold flex items-center gap-2 mb-3" style={{ color: section.color }}>
                  <span>{section.icon}</span> {section.title}
                </h4>
                <div className="space-y-2">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: section.color }}>{'\u25CF'}</span>
                      <span style={{ color: COLORS.textSecondary }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Traffic Analytics (Pro+, teaser for Basic) ──────────────── */}
      {hasPro ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.trafficAnalytics} icon={ICON.trend} badge="PRO+" badgeColor={COLORS.blue} />
          </div>
          <div className="p-5 space-y-6">
            {/* Traffic time series (Complete only) */}
            {hasComplete && data.traffic_time_series && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.trafficOverTime}</h4>
                <StackedBarChart
                  lang={lang}
                  height={220}
                  series={[
                    { label: s.automated, data: data.traffic_time_series.automated || [], color: COLORS.red },
                    { label: s.likelyAutomated, data: data.traffic_time_series.likely_automated || [], color: COLORS.orange },
                    { label: s.verifiedBot, data: data.traffic_time_series.verified_bot || [], color: COLORS.cyan },
                    { label: s.likelyHuman, data: data.traffic_time_series.likely_human || [], color: COLORS.green },
                  ]}
                />
              </div>
            )}

            {/* HTTP Methods + Status Codes + Cache */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.http_methods && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.httpMethods}</h4>
                  <DonutChart
                    size={170}
                    centerLabel={s.totalRequests}
                    centerValue={formatNumber(data.http_methods.reduce((sum: number, m: any) => sum + m.count, 0))}
                    slices={data.http_methods.slice(0, 6).map((m: any, i: number) => ({
                      label: m.method,
                      value: m.count,
                      color: CHART_PALETTE[i % CHART_PALETTE.length],
                    }))}
                  />
                </div>
              )}

              {data.traffic_analytics?.status_codes && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.statusCodes}</h4>
                  <StatusCodeChart codes={data.traffic_analytics.status_codes} />
                </div>
              )}

              {data.cache_analytics && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.cachePerformance}</h4>
                  <DonutChart
                    size={170}
                    centerLabel="Hit Ratio"
                    centerValue={`${(data.cache_analytics.hit_ratio * 100).toFixed(1)}%`}
                    slices={[
                      { label: s.cachedRequests, value: data.cache_analytics.cached_requests, color: COLORS.green },
                      { label: s.uncachedRequests, value: data.cache_analytics.uncached_requests, color: COLORS.orange },
                    ]}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg p-2 text-center" style={{ background: COLORS.green + '10' }}>
                      <p style={{ color: COLORS.textMuted }}>{s.cachedBandwidth}</p>
                      <p className="font-mono font-bold" style={{ color: COLORS.green }}>{formatBytes(data.cache_analytics.bandwidth_cached)}</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: COLORS.orange + '10' }}>
                      <p style={{ color: COLORS.textMuted }}>{s.uncachedBandwidth}</p>
                      <p className="font-mono font-bold" style={{ color: COLORS.orange }}>{formatBytes(data.cache_analytics.bandwidth_uncached)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top Paths & Countries */}
            {data.traffic_analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.traffic_analytics.top_paths && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.topPaths}</h4>
                    <HorizontalBarChart items={data.traffic_analytics.top_paths.slice(0, 8).map((p: any) => ({ label: p.path, value: p.count }))} />
                  </div>
                )}
                {data.traffic_analytics.top_countries && (
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.topCountries}</h4>
                    <HorizontalBarChart items={data.traffic_analytics.top_countries.slice(0, 10).map((c: any) => ({ label: `${countryFlag(c.country)} ${c.country}`, value: c.count }))} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Basic tier: show teaser */
        <UpgradeTeaser text={s.trafficAnalytics} subtext={s.upgradeToProHint} />
      )}

      {/* ── Security Intelligence (WAF) — Pro+, teaser for Basic ───── */}
      {hasPro && data.waf_events ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.securityIntelligence} icon={ICON.shield} badge="WAF" badgeColor={COLORS.orange} />
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.waf_events.events_by_action && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.actionBreakdown}</h4>
                  <DonutChart
                    size={170}
                    centerLabel={s.wafEvents}
                    centerValue={formatNumber(data.waf_events.total_events)}
                    slices={Object.entries(data.waf_events.events_by_action).map(([action, count], i) => ({
                      label: action.charAt(0).toUpperCase() + action.slice(1),
                      value: count as number,
                      color: action === 'block' ? COLORS.red : action === 'log' ? COLORS.yellow : action === 'skip' ? COLORS.cyan : CHART_PALETTE[i],
                    }))}
                  />
                </div>
              )}

              {/* Attacker Type Distribution — aggregate classifyAttacker across IPs */}
              {data.top_attacker_ips && data.top_attacker_ips.length > 0 && (() => {
                const typeMap: Record<string, { label: string; count: number; color: string }> = {};
                for (const ip of data.top_attacker_ips) {
                  const insight = classifyAttacker(ip);
                  const key = insight.type;
                  if (!typeMap[key]) {
                    typeMap[key] = { label: insight.label[lang], count: 0, color: insight.color };
                  }
                  typeMap[key].count += (ip.count || 1);
                }
                const slices = Object.values(typeMap)
                  .sort((a, b) => b.count - a.count)
                  .map(t => ({ label: t.label, value: t.count, color: t.color }));
                const total = slices.reduce((sum, sl) => sum + sl.value, 0);
                return (
                  <div>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.attackInsights}</h4>
                    <DonutChart
                      size={170}
                      centerLabel={lang === 'es' ? 'Tipos' : 'Types'}
                      centerValue={formatNumber(total)}
                      slices={slices}
                    />
                  </div>
                );
              })()}

              {data.waf_events.top_countries && (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.attackOrigins}</h4>
                  <HorizontalBarChart
                    items={data.waf_events.top_countries.slice(0, 10).map((c: any) => ({
                      label: `${countryFlag(c.country)} ${c.country}`,
                      value: c.count,
                      color: COLORS.red,
                    }))}
                  />
                </div>
              )}
            </div>

            {/* Top Attacker IPs Table — with classification insights */}
            {data.top_attacker_ips && data.top_attacker_ips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.topAttackerIps}</h4>
                <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: '#0f172a' }}>
                        <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.ip}</th>
                        <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.attackType}</th>
                        <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.asn}</th>
                        <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.country}</th>
                        <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.action}</th>
                        <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.attackSeverity}</th>
                        <th className="px-3 py-2.5 text-right font-semibold" style={{ color: COLORS.textMuted }}>{s.requests}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_attacker_ips.slice(0, 10).map((ip: any, i: number) => {
                        const insight = classifyAttacker(ip);
                        const sevColor = insight.severity === 'danger' ? COLORS.red : insight.severity === 'warning' ? COLORS.orange : COLORS.cyan;
                        const sevLabel = insight.severity === 'danger'
                          ? (lang === 'es' ? 'Peligro' : 'Danger')
                          : insight.severity === 'warning'
                            ? (lang === 'es' ? 'Alerta' : 'Warning')
                            : 'Info';
                        return (
                          <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                            <td className="px-3 py-2 font-mono" style={{ color: COLORS.textPrimary }}>{ip.ip.length > 39 ? ip.ip.slice(0, 39) + '...' : ip.ip}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold" style={{
                                background: insight.color + '15',
                                color: insight.color,
                                border: `1px solid ${insight.color}30`,
                              }}>
                                {insight.label[lang]}
                              </span>
                            </td>
                            <td className="px-3 py-2" style={{ color: COLORS.textSecondary }}>{ip.asn_name ? (ip.asn_name.length > 25 ? ip.asn_name.slice(0, 25) + '...' : ip.asn_name) : `AS${ip.asn}`}</td>
                            <td className="px-3 py-2 text-center">{countryFlag(ip.country)} {ip.country}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{
                                background: ip.action === 'block' ? COLORS.red + '15' : ip.action === 'log' ? COLORS.yellow + '15' : COLORS.cyan + '15',
                                color: ip.action === 'block' ? COLORS.red : ip.action === 'log' ? COLORS.yellow : COLORS.cyan,
                              }}>
                                {ip.action}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ color: sevColor }}>
                                {'\u25CF'} {sevLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-medium" style={{ color: COLORS.textPrimary }}>{formatNumber(ip.count)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Attacked Paths */}
            {data.waf_events.top_paths && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.topAttackedPaths}</h4>
                <HorizontalBarChart items={data.waf_events.top_paths.slice(0, 8).map((p: any) => ({ label: p.path, value: p.count, color: COLORS.orange }))} />
              </div>
            )}
          </div>
        </div>
      ) : !hasPro ? (
        <UpgradeTeaser text={s.securityIntelligence} subtext={s.upgradeToProHint} />
      ) : null}

      {/* ── Bot Analysis (Pro+, teaser for Basic) ──────────────────── */}
      {hasPro && data.bot_scores ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.botAnalysis} icon={ICON.robot} badge={hasComplete ? 'COMPLETE' : 'PRO+'} badgeColor={COLORS.purple} />
          </div>
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.botClassification}</h4>
                <DonutChart
                  size={180}
                  centerLabel={s.totalRequests}
                  centerValue={formatNumber(data.bot_scores.total_requests)}
                  slices={[
                    { label: s.automated, value: data.bot_scores.automated, color: COLORS.red },
                    { label: s.likelyAutomated, value: data.bot_scores.likely_automated, color: COLORS.orange },
                    { label: s.verifiedBot, value: data.bot_scores.verified_bot, color: COLORS.cyan },
                    { label: s.likelyHuman, value: data.bot_scores.likely_human, color: COLORS.green },
                  ]}
                />
              </div>

              {hasComplete && data.bot_score_histogram ? (
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.botScoreDistribution}</h4>
                  <BotScoreHistogram data={data.bot_score_histogram} lang={lang} height={180} />
                </div>
              ) : !hasComplete ? (
                <div className="flex items-center justify-center">
                  <UpgradeTeaser text={s.botScoreDistribution} subtext={s.upgradeToCompleteHint} />
                </div>
              ) : null}
            </div>

            {hasComplete && data.detection_engines && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.detectionEngines}</h4>
                <HorizontalBarChart
                  items={data.detection_engines.map((e: any) => ({
                    label: e.engine.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                    value: e.count,
                    color: COLORS.purple,
                  }))}
                />
              </div>
            )}

            {hasComplete && data.bot_asns && data.bot_asns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.botAsns}</h4>
                <HorizontalBarChart
                  items={data.bot_asns.slice(0, 10).map((a: any) => ({
                    label: `AS${a.asn} \u2014 ${a.name ? (a.name.length > 40 ? a.name.slice(0, 40) + '...' : a.name) : 'Unknown'}`,
                    value: a.count,
                    color: COLORS.red,
                  }))}
                />
              </div>
            )}
          </div>
        </div>
      ) : !hasPro ? (
        <UpgradeTeaser text={s.botAnalysis} subtext={s.upgradeToProHint} />
      ) : null}

      {/* ── Fingerprint Intelligence (Complete only, teaser for Pro) ── */}
      {hasComplete && (data.ja3_fingerprints || data.ja4_fingerprints) ? (() => {
        const totalTraffic = data.traffic_analytics?.total_requests || 0;
        return (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.fingerprintIntelligence} icon={ICON.search} badge="COMPLETE" badgeColor={COLORS.purple} />
          </div>
          <div className="p-5 space-y-6">
            {data.ja3_fingerprints && data.ja3_fingerprints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.ja3Fingerprints}</h4>
                <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                  <table className="w-full text-xs">
                    <thead><tr style={{ background: '#0f172a' }}>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.hash}</th>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.host}</th>
                      <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.fpRisk}</th>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.fpAnalysis}</th>
                      <th className="px-3 py-2.5 text-right font-semibold" style={{ color: COLORS.textMuted }}>{s.requests}</th>
                    </tr></thead>
                    <tbody>{data.ja3_fingerprints.slice(0, 8).map((fp: any, i: number) => {
                      const risk = classifyJA3(fp.ja3_hash, fp.count, totalTraffic);
                      return (
                      <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td className="px-3 py-2 font-mono" style={{ color: COLORS.textPrimary }}>{fp.ja3_hash.slice(0, 16)}...</td>
                        <td className="px-3 py-2 truncate max-w-[150px]" style={{ color: COLORS.textSecondary }}>{fp.host}</td>
                        <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: risk.color + '15', color: risk.color }}>{risk.label[lang]}</span></td>
                        <td className="px-3 py-2 max-w-[200px]" style={{ color: COLORS.textMuted, fontSize: '10px' }}>{risk.reason[lang]}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: COLORS.cyan }}>{formatNumber(fp.count)}</td>
                      </tr>);
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}
            {data.ja4_fingerprints && data.ja4_fingerprints.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3" style={{ color: COLORS.textPrimary }}>{s.ja4Fingerprints}</h4>
                <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                  <table className="w-full text-xs">
                    <thead><tr style={{ background: '#0f172a' }}>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.hash}</th>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.host}</th>
                      <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.fpRisk}</th>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.fpAnalysis}</th>
                      <th className="px-3 py-2.5 text-right font-semibold" style={{ color: COLORS.textMuted }}>{s.requests}</th>
                    </tr></thead>
                    <tbody>{data.ja4_fingerprints.slice(0, 8).map((fp: any, i: number) => {
                      const risk = classifyJA4(fp.ja4_hash, fp.count, totalTraffic);
                      return (
                      <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <td className="px-3 py-2 font-mono" style={{ color: COLORS.textPrimary }}>{fp.ja4_hash.length > 24 ? fp.ja4_hash.slice(0, 24) + '...' : fp.ja4_hash}</td>
                        <td className="px-3 py-2 truncate max-w-[150px]" style={{ color: COLORS.textSecondary }}>{fp.host}</td>
                        <td className="px-3 py-2 text-center"><span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ background: risk.color + '15', color: risk.color }}>{risk.label[lang]}</span></td>
                        <td className="px-3 py-2 max-w-[200px]" style={{ color: COLORS.textMuted, fontSize: '10px' }}>{risk.reason[lang]}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: COLORS.purple }}>{formatNumber(fp.count)}</td>
                      </tr>);
                    })}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>);
      })() : hasPro && !hasComplete ? (
        <UpgradeTeaser text={s.fingerprintIntelligence} subtext={s.upgradeToCompleteHint} />
      ) : null}

      {/* ── Security Category Breakdown (ALL TIERS) ─────────────────── */}
      <div>
        <SectionHeader title={s.securityScores} icon={ICON.clipboard} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {score.categories.map((cat) => (
            <CategoryCard key={cat.category} cat={cat} lang={lang} s={s} />
          ))}
        </div>
      </div>

      {/* ── Recommendations (ALL TIERS) ─────────────────────────────── */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={`${s.recommendations} (${report.recommendations.length})`} icon={ICON.bulb} />
          </div>
          <div className="divide-y" style={{ borderColor: COLORS.border }}>
            {report.recommendations.map((rec, i) => (
              <RecommendationRow key={i} rec={rec} s={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Plan-Based Product Recommendations (ALL TIERS) ──────────── */}
      {(planProducts.length > 0 || activeProductNames.length > 0) && (
        <div className="rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${COLORS.card}, #0c1222)`, border: `1px solid ${COLORS.cyan}20` }}>
          <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            <SectionHeader title={s.planProducts} subtitle={s.planProductsDesc} icon={ICON.pkg} badge={report.cf_plan} badgeColor={COLORS.purple} />
          </div>
          <div className="p-5 space-y-4">
            {/* Already active products */}
            {activeProductNames.length > 0 && (
              <div className="flex flex-wrap gap-2 pb-3" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                {activeProductNames.map((prod, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: COLORS.green + '10', border: `1px solid ${COLORS.green}25`, color: COLORS.green }}>
                    <span>{prod.icon}</span> {prod.name}
                    <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: COLORS.green + '20', fontSize: '9px' }}>{s.alreadyActive}</span>
                  </span>
                ))}
              </div>
            )}
            {/* Recommended products (not active) */}
            {planProducts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {planProducts.map((prod, i) => (
                  <div key={i} className="rounded-xl p-4 transition-all hover:scale-[1.02]" style={{ background: prod.color + '08', border: `1px solid ${prod.color}20` }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{prod.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold" style={{ color: prod.color }}>{prod.name}</h4>
                        <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>{prod.desc[lang]}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── User Agent Identification + Attack Correlation (Pro+) ──── */}
      {hasPro && data.traffic_analytics?.top_user_agents ? (() => {
        const attackerIps = data.top_attacker_ips || [];
        const uaList = data.traffic_analytics.top_user_agents.slice(0, 15);
        // Pre-compute correlations for all UAs
        const uaCorrelations = uaList.map((ua: any) => ({
          ...ua,
          cls: classifyUserAgent(ua.ua || ''),
          corr: correlateUAWithAttackers(ua.ua || '', attackerIps),
        }));
        // Sort: threats first (by risk critical>high>medium>low>none, then by count)
        const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
        const sorted = [...uaCorrelations].sort((a, b) => {
          const ra = riskOrder[a.cls.risk] ?? 4;
          const rb = riskOrder[b.cls.risk] ?? 4;
          if (ra !== rb) return ra - rb;
          return (b.count || 0) - (a.count || 0);
        });
        // Threat summary stats
        const threats = sorted.filter(u => u.cls.risk === 'critical' || u.cls.risk === 'high');
        const totalBlockedFromUAs = sorted.reduce((sum: number, u: any) => sum + (u.corr.totalBlocked || 0), 0);
        const allCountries = [...new Set(sorted.flatMap((u: any) => u.corr.topCountries))];

        return (
          <div className="rounded-2xl overflow-hidden" style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}>
            <div className="p-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <SectionHeader title={s.topUserAgents} icon={ICON.magnify} badge={threats.length > 0 ? `${threats.length} THREATS` : 'PRO+'} badgeColor={threats.length > 0 ? COLORS.red : COLORS.blue} />
            </div>
            <div className="p-5 space-y-5">

              {/* Threat summary banner */}
              {threats.length > 0 ? (
                <div className="rounded-xl p-4" style={{ background: COLORS.red + '08', border: `1px solid ${COLORS.red}20` }}>
                  <h4 className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: COLORS.red }}>
                    {ICON.warning} {s.uaThreatSummary}
                  </h4>
                  <p className="text-xs mb-3" style={{ color: COLORS.textSecondary }}>{s.uaThreatDesc}</p>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: COLORS.red + '20', color: COLORS.red }}>{threats.length}</span>
                      <span style={{ color: COLORS.textSecondary }}>{s.uaThreatsFound}</span>
                    </div>
                    {totalBlockedFromUAs > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: COLORS.orange + '20', color: COLORS.orange }}>{formatNumber(totalBlockedFromUAs)}</span>
                        <span style={{ color: COLORS.textSecondary }}>{s.uaBlockedTotal}</span>
                      </div>
                    )}
                    {allCountries.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: COLORS.yellow + '20', color: COLORS.yellow }}>{allCountries.length}</span>
                        <span style={{ color: COLORS.textSecondary }}>{s.uaFromCountries}: {allCountries.slice(0, 6).map(c => `${countryFlag(c)} ${c}`).join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3 text-center text-xs" style={{ background: COLORS.green + '08', border: `1px solid ${COLORS.green}20`, color: COLORS.green }}>
                  {'\u2713'} {s.uaNoThreats}
                </div>
              )}

              {/* Enhanced UA table with Attack Intel column */}
              <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${COLORS.border}` }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#0f172a' }}>
                      <th className="px-3 py-2.5 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.userAgent}</th>
                      <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.uaType}</th>
                      <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.uaRisk}</th>
                      <th className="px-3 py-2.5 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.uaAttackIntel}</th>
                      <th className="px-3 py-2.5 text-right font-semibold" style={{ color: COLORS.textMuted }}>{s.requests}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((item: any, i: number) => {
                      const { cls, corr } = item;
                      const riskColor = RISK_COLORS[cls.risk];
                      const isAttack = cls.risk === 'critical' || cls.risk === 'high';
                      const rowBg = isAttack ? COLORS.red + '06' : 'transparent';
                      return (
                        <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}`, background: rowBg }}>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs block truncate max-w-[200px] sm:max-w-[350px]" style={{ color: isAttack ? COLORS.red : COLORS.textPrimary }}>
                              {isAttack && ICON.warning + ' '}{item.ua || '(empty)'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: cls.color + '18', color: cls.color, border: `1px solid ${cls.color}30` }}>
                              {cls.label[lang]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold" style={{ background: riskColor + '15', color: riskColor }}>
                              {RISK_LABELS[cls.risk][lang]}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {corr.matchedIps > 0 ? (
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-xs font-bold" style={{ color: corr.totalBlocked > 0 ? COLORS.red : COLORS.orange }}>
                                  {corr.matchedIps} {s.uaCorrelatedIps}
                                </span>
                                {corr.totalBlocked > 0 && (
                                  <span className="text-xs" style={{ color: COLORS.red }}>
                                    {ICON.ban} {formatNumber(corr.totalBlocked)} {s.uaBlockedReqs}
                                  </span>
                                )}
                                {corr.topCountries.length > 0 && (
                                  <span className="text-xs" style={{ color: COLORS.textMuted }}>
                                    {corr.topCountries.map((c: string) => countryFlag(c)).join(' ')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs" style={{ color: COLORS.textMuted }}>{'\u2014'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold" style={{ color: isAttack ? COLORS.red : COLORS.cyan }}>{formatNumber(item.count)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })() : !hasPro ? (
        <UpgradeTeaser text={s.topUserAgents} subtext={s.upgradeToProHint} />
      ) : null}

      {/* ── Compliance Preview Section (Pro/Complete only) ──────────── */}
      {hasPro && (() => {
        // Derive 5 sample compliance checks from audit data
        const sslMode = settingsMap['ssl'] || 'off';
        const minTls = settingsMap['min_tls_version'] || '1.0';
        const alwaysHttps = settingsMap['always_use_https'] || 'off';
        const hstsRaw = settingsMap['security_header'] as any;
        const hstsEnabled = hstsRaw?.strict_transport_security?.enabled === true;
        const hasManagedWaf = data.rulesets?.some((r: any) => r.phase === 'http_request_firewall_managed' && r.rules?.length > 0) || false;

        const previewControls = [
          {
            framework: 'PCI DSS 4.0',
            clause: '4.2.1',
            title: lang === 'es' ? 'Cifrado fuerte en transmision' : 'Strong encryption in transit',
            status: sslMode === 'strict' ? 'pass' : sslMode === 'full' ? 'partial' : 'fail',
            current: `SSL: ${sslMode}`,
            expected: 'SSL: strict (Full Strict)',
            severity: 'critical' as const,
          },
          {
            framework: 'ISO 27001:2022',
            clause: 'A.8.24',
            title: lang === 'es' ? 'Uso de criptografia' : 'Use of cryptography',
            status: minTls === '1.3' ? 'pass' : minTls === '1.2' ? 'partial' : 'fail',
            current: `TLS ${minTls}+`,
            expected: 'TLS 1.2+ (1.3 ideal)',
            severity: 'high' as const,
          },
          {
            framework: 'SOC 2 Type II',
            clause: 'CC6.7',
            title: lang === 'es' ? 'Seguridad en transmision de datos' : 'Data transmission security',
            status: alwaysHttps === 'on' && hstsEnabled ? 'pass' : alwaysHttps === 'on' || hstsEnabled ? 'partial' : 'fail',
            current: `HTTPS: ${alwaysHttps === 'on' ? 'ON' : 'OFF'}, HSTS: ${hstsEnabled ? 'ON' : 'OFF'}`,
            expected: 'Always HTTPS: ON, HSTS: ON',
            severity: 'high' as const,
          },
          {
            framework: 'LFPDPPP',
            clause: 'Art. 19.III',
            title: lang === 'es' ? 'Medidas tecnicas de cifrado' : 'Technical encryption measures',
            status: sslMode === 'strict' && minTls >= '1.2' ? 'pass' : sslMode !== 'off' ? 'partial' : 'fail',
            current: `SSL: ${sslMode}, TLS: ${minTls}`,
            expected: 'SSL strict + TLS 1.2+',
            severity: 'high' as const,
          },
          {
            framework: 'GDPR',
            clause: 'Art. 32.1.a',
            title: lang === 'es' ? 'Cifrado de datos personales' : 'Encryption of personal data',
            status: sslMode === 'strict' && hasManagedWaf ? 'pass' : sslMode !== 'off' ? 'partial' : 'fail',
            current: `SSL: ${sslMode}, WAF: ${hasManagedWaf ? 'ON' : 'OFF'}`,
            expected: 'SSL strict + WAF active',
            severity: 'critical' as const,
          },
        ];

        const statusColor = (st: string) =>
          st === 'pass' ? COLORS.green : st === 'partial' ? COLORS.yellow : COLORS.red;
        const statusLabel = (st: string) =>
          st === 'pass' ? s.compliancePass : st === 'partial' ? s.compliancePartial : s.complianceFail;
        const statusIcon = (st: string) =>
          st === 'pass' ? '\u2713' : st === 'partial' ? '\u25CB' : '\u2717';
        const sevColor = (sev: string) =>
          sev === 'critical' ? COLORS.red : sev === 'high' ? COLORS.orange : COLORS.yellow;

        return (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a1040 50%, #0f172a 100%)', border: `1px solid ${COLORS.purple}30` }}>
            {/* Header */}
            <div className="p-5 sm:p-6" style={{ borderBottom: `1px solid ${COLORS.purple}20` }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: COLORS.purple + '20' }}>
                  <span className="text-lg" style={{ color: COLORS.purple }}>{ICON.shield}</span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold" style={{ color: COLORS.textPrimary }}>{s.compliancePreview}</h3>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>{s.compliancePreviewDesc}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: COLORS.cyan + '12', color: COLORS.cyan, border: `1px solid ${COLORS.cyan}25` }}>
                  <span className="font-bold">70</span> {s.complianceTotalControls}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: COLORS.purple + '12', color: COLORS.purple, border: `1px solid ${COLORS.purple}25` }}>
                  <span className="font-bold">5</span> {s.complianceFrameworks}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full" style={{ background: COLORS.yellow + '12', color: COLORS.yellow, border: `1px solid ${COLORS.yellow}25` }}>
                  {s.complianceSampleOf} 5
                </span>
              </div>
            </div>

            {/* Sample Controls Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: '#0c0f1a' }}>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: COLORS.textMuted }}>Framework</th>
                    <th className="px-4 py-3 text-left font-semibold" style={{ color: COLORS.textMuted }}>{s.complianceControl}</th>
                    <th className="px-4 py-3 text-center font-semibold" style={{ color: COLORS.textMuted }}>{s.complianceStatus}</th>
                    <th className="px-4 py-3 text-left font-semibold hidden sm:table-cell" style={{ color: COLORS.textMuted }}>{s.complianceCurrent}</th>
                    <th className="px-4 py-3 text-left font-semibold hidden md:table-cell" style={{ color: COLORS.textMuted }}>{s.complianceExpected}</th>
                  </tr>
                </thead>
                <tbody>
                  {previewControls.map((ctrl, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${COLORS.border}`, background: ctrl.status === 'fail' ? COLORS.red + '04' : 'transparent' }}>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold" style={{ background: COLORS.purple + '15', color: COLORS.purple }}>
                          {ctrl.framework}
                        </span>
                        <span className="block text-xs mt-0.5 font-mono" style={{ color: COLORS.textMuted }}>{ctrl.clause}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: COLORS.textPrimary }}>{ctrl.title}</span>
                        <span className="inline-block ml-2 px-1.5 py-0.5 rounded text-xs" style={{ background: sevColor(ctrl.severity) + '15', color: sevColor(ctrl.severity) }}>
                          {ctrl.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: statusColor(ctrl.status) + '15', color: statusColor(ctrl.status), border: `1px solid ${statusColor(ctrl.status)}30` }}>
                          {statusIcon(ctrl.status)} {statusLabel(ctrl.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs" style={{ color: COLORS.textSecondary }}>{ctrl.current}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="font-mono text-xs" style={{ color: COLORS.green }}>{ctrl.expected}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* CTA Section */}
            <div className="p-5 sm:p-6" style={{ borderTop: `1px solid ${COLORS.purple}20`, background: '#0c0f1a80' }}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{s.complianceUnlock}</p>
                  <div className="flex flex-wrap gap-3 mt-1.5">
                    <span className="text-xs" style={{ color: COLORS.cyan }}>
                      {ICON.shield} {s.complianceBundleLabel} {'\u2014'} <span className="font-bold">{s.complianceBundlePrice}</span>
                    </span>
                    <span className="text-xs" style={{ color: COLORS.green }}>
                      {'\u2713'} {s.complianceBundleSave}
                    </span>
                  </div>
                  <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>{s.complianceIndividual}</p>
                </div>
                <button
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap"
                  style={{ background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.cyan})`, color: '#fff', boxShadow: `0 4px 15px ${COLORS.purple}40` }}
                  onClick={() => {
                    // Navigate to dashboard compliance tab - dispatch custom event
                    window.dispatchEvent(new CustomEvent('anga:open-compliance', {
                      detail: { auditId: report.zone_id, tier: report.tier },
                    }));
                  }}
                >
                  {s.complianceCta} {'\u2192'}
                </button>
              </div>
              <p className="text-xs mt-3 opacity-60" style={{ color: COLORS.textMuted }}>{s.complianceDisclaimer}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Category Card Sub-component ──────────────────────────────────────────────
function CategoryCard({ cat, lang, s }: { cat: AuditCategoryScore; lang: 'es' | 'en'; s: any }) {
  const [expanded, setExpanded] = useState(false);
  const color = gradeColor(cat.score);

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all"
      style={{ background: COLORS.card, border: `1px solid ${expanded ? color + '40' : COLORS.border}` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: color + '15', color }}>
            {cat.grade}
          </div>
          <div>
            <h4 className="font-semibold text-sm" style={{ color: COLORS.textPrimary }}>{cat.label[lang]}</h4>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>
              {cat.findings.length} {s.findings}
              {cat.plan_limited && <span style={{ color: COLORS.yellow }}> {'\u00B7'} {s.planLimited}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: COLORS.textMuted }}>{Math.round(cat.weight * 100)}%</span>
          <div className="text-right">
            <span className="text-xl font-bold font-mono" style={{ color }}>{cat.score}</span>
            <span className="text-xs" style={{ color: COLORS.textMuted }}>/100</span>
          </div>
          <span className="text-xs transition-transform" style={{ color: COLORS.textMuted, transform: expanded ? 'rotate(180deg)' : 'none' }}>{'\u25BC'}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${COLORS.border}` }}>
          <div className="pt-3 space-y-2">
            {cat.findings.map((finding, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex-shrink-0" style={{ color: COLORS.textSecondary }}>{'\u2022'}</span>
                <span style={{ color: '#cbd5e1' }}>{finding}</span>
              </div>
            ))}
          </div>
          {cat.plan_note && (
            <div className="mt-3 p-3 rounded-lg" style={{ background: COLORS.yellow + '08', border: `1px dashed ${COLORS.yellow}30` }}>
              <p className="text-xs" style={{ color: COLORS.yellow }}>{cat.plan_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Recommendation Row Sub-component ─────────────────────────────────────────
function RecommendationRow({ rec, s }: { rec: AuditRecommendation; s: any }) {
  const priorityColors: Record<string, string> = { critical: COLORS.red, high: COLORS.orange, medium: COLORS.yellow };
  const color = priorityColors[rec.priority] || COLORS.textMuted;

  return (
    <div className="p-4" style={{ borderColor: COLORS.border }}>
      <div className="flex items-start gap-3">
        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-semibold flex-shrink-0 mt-0.5" style={{ background: color + '15', color }}>
          {(s.priority as any)[rec.priority] || rec.priority}
        </span>
        <div className="flex-1">
          <h4 className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>{rec.title}</h4>
          <p className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>{rec.description}</p>
          <div className="flex flex-wrap gap-4 mt-2 text-xs" style={{ color: COLORS.textMuted }}>
            {rec.product && (
              <span className="flex items-center gap-1">
                <span style={{ color: COLORS.cyan }}>{'\u25CF'}</span> {s.product}: <span className="font-medium" style={{ color: COLORS.textPrimary }}>{rec.product}</span>
              </span>
            )}
            {rec.min_plan && (
              <span className="flex items-center gap-1">
                <span style={{ color: COLORS.purple }}>{'\u25CF'}</span> {s.minPlan}: <span className="font-medium capitalize" style={{ color: COLORS.textPrimary }}>{rec.min_plan}</span>
              </span>
            )}
            {rec.estimated_value && (
              <span className="flex items-center gap-1">
                <span style={{ color: COLORS.green }}>{'\u25CF'}</span> {s.estimatedValue}: <span className="font-medium" style={{ color: COLORS.textPrimary }}>{rec.estimated_value}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
