/**
 * AI Chat Component
 * 
 * Provides an AI-powered chat interface for security questions,
 * report analysis, and remediation guidance.
 */

import { useState, useRef, useEffect } from 'react';
import { getSession } from '../lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  context?: 'general' | 'audit' | 'simulation' | 'compliance';
  reportId?: string;
  onClose?: () => void;
  lang?: 'es' | 'en';
}

const API_URL = import.meta.env.PUBLIC_API_URL || 'https://api.angaflow.com';

// ── Lightweight Markdown → HTML parser (no dependencies) ──────────────────
function parseMarkdown(text: string): string {
  // Escape HTML entities first (before adding our own tags)
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const lines = text.split('\n');
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false; }
    if (inOl) { out.push('</ol>'); inOl = false; }
  };

  const inlineFormat = (line: string): string => {
    // Bold **text** or __text__
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    line = line.replace(/__(.+?)__/g, '<strong>$1</strong>');
    // Italic *text* or _text_ (not inside words)
    line = line.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
    line = line.replace(/(?<![a-zA-Z])_([^_\n]+?)_(?![a-zA-Z])/g, '<em>$1</em>');
    // Inline code `code`
    line = line.replace(/`([^`\n]+?)`/g, '<code style="background:#1e293b;padding:1px 5px;border-radius:4px;font-size:0.85em;font-family:monospace;color:#06b6d4;">$1</code>');
    // URLs → links
    line = line.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#06b6d4;text-decoration:underline;">$1</a>');
    return line;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = esc(raw);

    // Headings
    if (/^#{1,3}\s/.test(raw)) {
      closeList();
      const level = raw.match(/^(#{1,3})/)?.[1].length ?? 1;
      const content = inlineFormat(line.replace(/^#{1,3}\s+/, ''));
      const sizes = ['1.05em', '1em', '0.95em'];
      out.push(`<p style="font-weight:700;font-size:${sizes[level-1]};color:#f1f5f9;margin:10px 0 4px;">${content}</p>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(raw.trim()) || /^\*\*\*+$/.test(raw.trim())) {
      closeList();
      out.push('<hr style="border:none;border-top:1px solid #334155;margin:8px 0;">');
      continue;
    }

    // Unordered list
    if (/^[\*\-]\s+/.test(raw)) {
      if (inOl) { out.push('</ol>'); inOl = false; }
      if (!inUl) { out.push('<ul style="margin:4px 0 4px 16px;padding:0;list-style:disc;">'); inUl = true; }
      const content = inlineFormat(line.replace(/^[\*\-]\s+/, ''));
      out.push(`<li style="margin:2px 0;color:#e2e8f0;">${content}</li>`);
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(raw)) {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (!inOl) { out.push('<ol style="margin:4px 0 4px 16px;padding:0;list-style:decimal;">'); inOl = true; }
      const content = inlineFormat(line.replace(/^\d+\.\s+/, ''));
      out.push(`<li style="margin:2px 0;color:#e2e8f0;">${content}</li>`);
      continue;
    }

    // Empty line → close lists, add spacing
    if (raw.trim() === '') {
      closeList();
      out.push('<div style="height:6px;"></div>');
      continue;
    }

    // Normal paragraph line
    closeList();
    out.push(`<span style="display:block;margin:1px 0;color:#e2e8f0;">${inlineFormat(line)}</span>`);
  }

  closeList();
  return out.join('');
}

const chatStrings = {
  es: {
    title: 'Mariel - Asistente AI',
    placeholder: 'Pregunta a Mariel...',
    send: 'Enviar',
    typing: 'Escribiendo...',
    greeting: '¡Hola! Soy Mariel, tu asistente de seguridad de Anga. ¿En qué puedo ayudarte hoy?',
    greetingContext: (ctx: string) => `¡Hola! Soy Mariel. Estoy aquí para ayudarte a entender este reporte de ${ctx}. ¿Qué te gustaría saber?`,
    errAuth: 'Tu sesión ha expirado. Por favor vuelve a iniciar sesión.',
    errAuthLink: 'Iniciar sesión',
    errAI: 'El servicio de IA no está disponible en este momento. Intenta de nuevo en unos segundos.',
    errGeneric: 'Ocurrió un error al procesar tu mensaje. Por favor intenta de nuevo.',
  },
  en: {
    title: 'Mariel - AI Assistant',
    placeholder: 'Ask Mariel...',
    send: 'Send',
    typing: 'Typing...',
    greeting: 'Hi! I\'m Mariel, your Anga security assistant. How can I help you today?',
    greetingContext: (ctx: string) => `Hi! I'm Mariel. I'm here to help you understand this ${ctx} report. What would you like to know?`,
    errAuth: 'Your session has expired. Please sign in again.',
    errAuthLink: 'Sign in',
    errAI: 'The AI service is currently unavailable. Please try again in a few seconds.',
    errGeneric: 'An error occurred while processing your message. Please try again.',
  },
};

async function sendChatMessage(
  messages: { role: string; content: string }[],
  context: string,
  reportId?: string
): Promise<{ text: string; errorType?: 'auth' | 'ai' | 'generic' }> {
  const session = await getSession();
  if (!session?.access_token) {
    return { text: '', errorType: 'auth' };
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages, context, report_id: reportId }),
    });
  } catch {
    return { text: '', errorType: 'ai' };
  }

  if (response.status === 401 || response.status === 403) {
    return { text: '', errorType: 'auth' };
  }

  if (!response.ok) {
    return { text: '', errorType: response.status >= 500 ? 'ai' : 'generic' };
  }

  const data = await response.json();
  return { text: data.message };
}

export default function AIChat({ context = 'general', reportId, onClose, lang = 'es' }: AIChatProps) {
  const s = chatStrings[lang];
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: context === 'general' ? s.greeting : s.greetingContext(context),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await sendChatMessage(
        [...chatHistory, { role: 'user', content: userMessage.content }],
        context,
        reportId
      );

      if (result.errorType) {
        let content = s.errGeneric;
        if (result.errorType === 'auth') content = s.errAuth;
        else if (result.errorType === 'ai') content = s.errAI;
        setMessages((prev) => [...prev, { role: 'assistant', content, timestamp: new Date() }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: result.text, timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: s.errGeneric, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <style>{`
        .mariel-chat {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 400px;
          height: 600px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          background: #1a1a1f;
          border: 1px solid #2a2a3a;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          z-index: 1000;
        }
        @media (max-width: 639px) {
          .mariel-chat {
            bottom: 0;
            right: 0;
            left: 0;
            width: 100%;
            height: 85dvh;
            border-radius: 16px 16px 0 0;
          }
        }
      `}</style>
    <div className="mariel-chat">
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #2a2a3a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#10b981',
            }}
          />
          <span style={{ color: '#e2e8f0', fontWeight: '600' }}>
            {s.title}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '0',
              width: '24px',
              height: '24px',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: '12px',
                background: msg.role === 'user' ? '#3b82f6' : '#1e2a3a',
                color: '#e2e8f0',
                fontSize: '14px',
                lineHeight: '1.6',
                wordBreak: 'break-word',
                border: msg.role === 'assistant' ? '1px solid #1e293b' : 'none',
              }}
            >
              {msg.content === s.errAuth ? (
                <span>
                  {s.errAuth}{' '}
                  <a href={`/${lang}/login`} style={{ color: '#06b6d4', textDecoration: 'underline' }}>
                    {s.errAuthLink}
                  </a>
                </span>
              ) : msg.role === 'assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }} />
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: '#2a2a3a',
                color: '#94a3b8',
                fontSize: '14px',
              }}
            >
              {s.typing}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #2a2a3a',
          display: 'flex',
          gap: '8px',
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={s.placeholder}
          disabled={loading}
          style={{
            flex: 1,
            background: '#0a0a0f',
            border: '1px solid #2a2a3a',
            borderRadius: '6px',
            padding: '8px 12px',
            color: '#e2e8f0',
            fontSize: '14px',
            resize: 'none',
            minHeight: '40px',
            maxHeight: '120px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            background: input.trim() && !loading ? '#3b82f6' : '#2a2a3a',
            border: 'none',
            borderRadius: '6px',
            padding: '0 16px',
            color: '#fff',
            fontWeight: '600',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            opacity: input.trim() && !loading ? 1 : 0.5,
          }}
        >
          {s.send}
        </button>
      </div>
    </div>
    </>
  );
}
