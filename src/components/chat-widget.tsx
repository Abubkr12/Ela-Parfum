'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Droplets, Bot } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget({ userId: initialUserId }: { userId?: string }) {
  const [userId, setUserId] = useState<string | undefined>(initialUserId);
  const [isCashierHost, setIsCashierHost] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname.startsWith('cashier.')) {
      setIsCashierHost(true);
      return;
    }
    if (initialUserId) {
      setUserId(initialUserId);
      return;
    }
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/kasir')) {
      const supabase = createClient();
      supabase.auth.getUser().then((res: any) => {
        if (res?.data?.user?.id) {
          setUserId(res.data.user.id);
        }
      });
    }
  }, [initialUserId, pathname]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        toggleBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!userId || isCashierHost || pathname.startsWith('/admin') || pathname.startsWith('/kasir') || pathname.includes('/invoice')) {
    return null;
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            text: m.content,
          })),
        }),
      });

      const data = await res.json();
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Maaf, terjadi kendala. Coba lagi ya.',
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Maaf, terjadi kesalahan koneksi. Silakan coba lagi.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        ref={toggleBtnRef}
        id="chatbot-toggle"
        type="button"
        className="no-print chat-widget-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Tutup Scent Advisor AI' : 'Buka Scent Advisor AI'}
        aria-expanded={isOpen}
        aria-controls="ela-chat-dialog"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 4px 20px rgba(37, 99, 235, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.25s var(--ease-spring), background-color 0.2s, box-shadow 0.25s',
          transform: isOpen ? 'scale(0.92) rotate(90deg)' : 'scale(1)',
        }}
      >
        {isOpen ? <X size={22} aria-hidden="true" /> : <MessageCircle size={26} aria-hidden="true" />}
      </button>

      {isOpen && (
        <div
          id="ela-chat-dialog"
          role="dialog"
          aria-modal="false"
          aria-label="Asisten Parfum Ela"
          className="no-print chat-widget"
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            width: 370,
            maxWidth: 'calc(100vw - 48px)',
            height: 520,
            maxHeight: 'calc(100dvh - 140px)',
            background: 'var(--c-surface-1)',
            border: '1px solid var(--cw-border-ctrl)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-float)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            overflow: 'hidden',
            animation: 'chatFadeIn 0.25s var(--ease-out)',
          }}
        >
          <div
            style={{
              padding: '14px 16px',
              background: 'var(--c-surface-2)',
              borderBottom: '1px solid var(--c-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--c-gold-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <Droplets size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h2
                style={{
                  margin: 0,
                  color: 'var(--c-ink)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                }}
              >
                Scent Advisor AI
              </h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#16a34a',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    color: 'var(--c-ink-muted)',
                    fontSize: '0.75rem',
                  }}
                >
                  Online 24 Jam
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                toggleBtnRef.current?.focus();
              }}
              aria-label="Tutup jendela obrolan"
              className="chat-widget-close"
              style={{
                background: 'var(--c-surface-1)',
                border: '1px solid var(--cw-border-ctrl)',
                color: 'var(--c-ink-muted)',
                cursor: 'pointer',
                minWidth: 44,
                minHeight: 44,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s, border-color 0.2s, transform 0.15s',
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  color: 'var(--c-ink-muted)',
                  marginTop: 48,
                  padding: '0 16px',
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: 'var(--c-gold-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: '#2563eb',
                  }}
                >
                  <Bot size={28} />
                </div>
                <p
                  style={{
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Halo! Saya <strong style={{ color: 'var(--c-ink)' }}>Scent Advisor</strong> dari Ela Parfum. Tanya apa saja seputar parfum, aroma, atau layanan kami!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '82%',
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-end',
                      gap: 8,
                    }}
                  >
                    {!isUser && (
                      <div
                        aria-hidden="true"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          background: 'var(--c-gold-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: '#2563eb',
                        }}
                      >
                        <Bot size={14} />
                      </div>
                    )}
                    <div
                      style={{
                        background: isUser ? '#2563eb' : 'var(--c-surface-2)',
                        color: isUser ? '#ffffff' : 'var(--c-ink)',
                        padding: '10px 14px',
                        borderRadius: 14,
                        borderBottomRightRadius: isUser ? 4 : 14,
                        borderBottomLeftRadius: !isUser ? 4 : 14,
                        fontSize: '0.88rem',
                        lineHeight: 1.55,
                        border: !isUser ? '1px solid var(--cw-border-ctrl)' : 'none',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: 'var(--c-gold-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#2563eb',
                  }}
                >
                  <Bot size={14} />
                </div>
                <div
                  style={{
                    background: 'var(--c-surface-2)',
                    border: '1px solid var(--cw-border-ctrl)',
                    padding: '12px 16px',
                    borderRadius: 14,
                    borderBottomLeftRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span className="chat-widget-spinner" aria-hidden="true" />
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--c-ink-muted)',
                    }}
                  >
                    Mengetik...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={sendMessage}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--c-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--c-surface-2)',
            }}
          >
            <input
              type="text"
              aria-label="Tulis pesan tentang parfum"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya seputar parfum..."
              disabled={loading}
              className="chat-widget-input"
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: 44,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--cw-border-ctrl)',
                background: 'var(--c-surface-1)',
                color: 'var(--c-ink)',
                fontSize: '1rem',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Kirim pesan"
              className="chat-widget-send"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: loading || !input.trim() ? 'var(--c-surface-1)' : '#2563eb',
                color: loading || !input.trim() ? 'var(--c-ink-muted)' : '#ffffff',
                border: loading || !input.trim() ? '1px solid var(--cw-border-ctrl)' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s, border-color 0.2s, transform 0.15s',
                flexShrink: 0,
              }}
            >
              <Send size={16} aria-hidden="true" style={{ marginLeft: -1 }} />
            </button>
          </form>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .chat-widget {
              --cw-border-ctrl: #6c7a76;
            }
            [data-theme="light"] .chat-widget {
              --cw-border-ctrl: #64748b;
            }
            #chatbot-toggle:focus-visible,
            .chat-widget :is(button, input):focus-visible {
              outline: 2px solid #2563eb;
              outline-offset: 2px;
            }
            @media (hover: hover) and (pointer: fine) {
              .chat-widget-toggle:hover {
                background-color: #1d4ed8 !important;
              }
              .chat-widget-close:hover {
                color: var(--c-ink) !important;
                border-color: #2563eb !important;
              }
              .chat-widget-send:not(:disabled):hover {
                background-color: #1d4ed8 !important;
              }
            }
            .chat-widget-toggle:active,
            .chat-widget-close:active,
            .chat-widget-send:not(:disabled):active {
              transform: scale(0.95);
            }
            .chat-widget-input::placeholder {
              color: var(--c-ink-muted);
              opacity: 1;
            }
            .chat-widget-spinner {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              border: 2px solid var(--c-border-mid);
              border-top-color: #2563eb;
              animation: cwSpin 0.8s linear infinite;
              flex-shrink: 0;
            }
            @keyframes cwSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes chatFadeIn {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @media (prefers-reduced-motion: reduce) {
              .chat-widget, .chat-widget-toggle, .chat-widget * {
                animation-duration: 0.01ms !important;
                transition-duration: 0.01ms !important;
              }
            }
            @media print {
              #chatbot-toggle, .chat-widget, .no-print {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
              }
            }
          `,
        }}
      />
    </>
  );
}
