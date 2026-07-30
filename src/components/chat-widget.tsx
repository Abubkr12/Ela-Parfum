'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User as UserIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatWidget({ userId }: { userId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Don't show on admin pages or if not logged in
  if (!userId || pathname.startsWith('/admin')) return null;

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
      {/* Floating Toggle Button */}
      <button
        id="chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Buka Scent Advisor AI"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--c-gold), var(--c-gold-light))',
          color: '#fff',
          border: 'none',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'transform 0.25s var(--ease-spring), box-shadow 0.25s',
          transform: isOpen ? 'scale(0.92) rotate(90deg)' : 'scale(1)',
        }}
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={26} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 92,
            right: 24,
            width: 370,
            maxWidth: 'calc(100vw - 48px)',
            height: 520,
            maxHeight: 'calc(100vh - 140px)',
            background: 'var(--c-surface-1)',
            border: '1px solid var(--c-border)',
            borderRadius: 'var(--r-xl)',
            boxShadow: 'var(--shadow-float)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9998,
            overflow: 'hidden',
            animation: 'chatFadeIn 0.25s var(--ease-out)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--c-surface-2)',
              borderBottom: '1px solid var(--c-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: 'var(--c-gold-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-gold)',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <h4
                style={{
                  margin: 0,
                  color: 'var(--c-ink)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                }}
              >
                Scent Advisor AI
              </h4>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#22c55e',
                    animation: 'pulse-dot 2s infinite',
                  }}
                />
                <span
                  style={{
                    color: 'var(--c-ink-dim)',
                    fontSize: '0.75rem',
                  }}
                >
                  Online 24 Jam
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--c-ink-muted)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 8,
                display: 'flex',
                transition: 'color 0.2s',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
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
                  color: 'var(--c-ink-dim)',
                  marginTop: 48,
                  padding: '0 16px',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: 'var(--c-gold-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    color: 'var(--c-gold)',
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
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 8,
                          background: 'var(--c-gold-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: 'var(--c-gold)',
                        }}
                      >
                        <Bot size={14} />
                      </div>
                    )}
                    <div
                      style={{
                        background: isUser
                          ? 'linear-gradient(135deg, var(--c-gold), var(--c-gold-light))'
                          : 'var(--c-surface-2)',
                        color: isUser ? '#fff' : 'var(--c-ink)',
                        padding: '10px 14px',
                        borderRadius: 14,
                        borderBottomRightRadius: isUser ? 4 : 14,
                        borderBottomLeftRadius: !isUser ? 4 : 14,
                        fontSize: '0.88rem',
                        lineHeight: 1.55,
                        border: !isUser
                          ? '1px solid var(--c-border)'
                          : 'none',
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
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    background: 'var(--c-gold-dim)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--c-gold)',
                  }}
                >
                  <Bot size={14} />
                </div>
                <div
                  style={{
                    background: 'var(--c-surface-2)',
                    border: '1px solid var(--c-border)',
                    padding: '12px 16px',
                    borderRadius: 14,
                    borderBottomLeftRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div className="loader" style={{ width: 16, height: 16 }} />
                  <span
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--c-ink-dim)',
                    }}
                  >
                    Mengetik...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--c-border)',
              display: 'flex',
              gap: 8,
              background: 'var(--c-surface-2)',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tanya seputar parfum..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 12,
                border: '1px solid var(--c-border)',
                background: 'var(--c-surface-1)',
                color: 'var(--c-ink)',
                fontSize: '0.88rem',
                outline: 'none',
                fontFamily: 'var(--font-body)',
                transition: 'border-color 0.2s',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background:
                  loading || !input.trim()
                    ? 'var(--c-surface-1)'
                    : 'linear-gradient(135deg, var(--c-gold), var(--c-gold-light))',
                color: loading || !input.trim() ? 'var(--c-ink-dim)' : '#fff',
                border: loading || !input.trim() ? '1px solid var(--c-border)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={16} style={{ marginLeft: -1 }} />
            </button>
          </form>
        </div>
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes chatFadeIn {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `,
        }}
      />
    </>
  );
}
