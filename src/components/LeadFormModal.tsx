/**
 * Lead Form Modal
 * 
 * Contact form for "Need Help?" section
 * Validates domain and submits to /api/leads
 */

import { useState } from 'react';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'es' | 'en';
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.angaflow.com';

const translations = {
  es: {
    title: '¿Necesitas ayuda con seguridad?',
    subtitle: 'Cuéntanos sobre tu sitio y nos pondremos en contacto pronto.',
    name: 'Nombre completo',
    email: 'Email',
    company: 'Empresa (opcional)',
    domain: 'Dominio en Cloudflare',
    domainPlaceholder: 'ejemplo.com',
    message: 'Cuéntanos qué necesitas',
    messagePlaceholder: 'Describe el problema o servicio que buscas...',
    ownership: 'Confirmo que soy propietario o administrador autorizado de este dominio',
    submit: 'Enviar solicitud',
    cancel: 'Cancelar',
    sending: 'Enviando...',
    success: '¡Gracias! Nos pondremos en contacto pronto.',
    errorGeneric: 'Hubo un error. Por favor intenta de nuevo.',
  },
  en: {
    title: 'Need help with security?',
    subtitle: 'Tell us about your site and we\'ll get in touch soon.',
    name: 'Full name',
    email: 'Email',
    company: 'Company (optional)',
    domain: 'Cloudflare domain',
    domainPlaceholder: 'example.com',
    message: 'Tell us what you need',
    messagePlaceholder: 'Describe the problem or service you\'re looking for...',
    ownership: 'I confirm that I am the owner or authorized administrator of this domain',
    submit: 'Submit request',
    cancel: 'Cancel',
    sending: 'Sending...',
    success: 'Thank you! We will contact you soon.',
    errorGeneric: 'There was an error. Please try again.',
  },
};

export default function LeadFormModal({ isOpen, onClose, lang }: LeadFormModalProps) {
  const t = translations[lang];
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    domain: '',
    message: '',
    ownership_confirmed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.errorGeneric);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setFormData({
          name: '',
          email: '',
          company: '',
          domain: '',
          message: '',
          ownership_confirmed: false,
        });
      }, 2000);

    } catch (err: any) {
      setError(err.message || t.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1a1a1f',
          border: '1px solid #2a2a3a',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          padding: '32px',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '24px',
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {success ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <p style={{ color: '#10b981', fontSize: '18px', fontWeight: '600' }}>
              {t.success}
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ color: '#e2e8f0', fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              {t.title}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
              {t.subtitle}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {t.name} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {t.email} *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {t.company}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {t.domain} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={t.domainPlaceholder}
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value.toLowerCase().trim() })}
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '6px' }}>
                  {t.message} *
                </label>
                <textarea
                  required
                  placeholder={t.messagePlaceholder}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  style={{
                    width: '100%',
                    background: '#0a0a0f',
                    border: '1px solid #2a2a3a',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    color: '#e2e8f0',
                    fontSize: '14px',
                    resize: 'vertical',
                    minHeight: '100px',
                  }}
                />
              </div>

              <label style={{ display: 'flex', alignItems: 'start', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  required
                  checked={formData.ownership_confirmed}
                  onChange={(e) => setFormData({ ...formData, ownership_confirmed: e.target.checked })}
                  style={{ marginTop: '4px', cursor: 'pointer' }}
                />
                <span style={{ color: '#94a3b8', fontSize: '12px', lineHeight: '1.5' }}>
                  {t.ownership}
                </span>
              </label>

              {error && (
                <div style={{ background: '#991b1b', border: '1px solid #dc2626', borderRadius: '6px', padding: '12px', color: '#fecaca', fontSize: '14px' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid #2a2a3a',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#94a3b8',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: loading ? '#2a2a3a' : 'linear-gradient(to right, #3b82f6, #8b5cf6)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? t.sending : t.submit}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
