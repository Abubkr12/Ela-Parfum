"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, AlertCircle, ArrowRight, Upload, Loader2, MessageSquare, FileImage } from 'lucide-react';
import { ThemeToggle } from "@/components/theme-toggle";
import { PageHeader } from "@/components/page-header";
import { formatRupiah } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { uploadPaymentProof } from './actions';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const supabase = createClient();

  const [order, setOrder] = useState<any>(null);
  const [bankMethods, setBankMethods] = useState<any[]>([]);
  const [qrisMethods, setQrisMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!orderId) {
        router.push('/pesanan');
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: o } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .eq('customer_id', user.id)
        .single();

      if (!o) {
        router.push('/pesanan');
        return;
      }

      setOrder(o);
      if (o.payment_proof && o.payment_proof.startsWith('http')) {
        setUploaded(true);
      }

      const { data: methods } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true);

      setBankMethods(methods?.filter((p: any) => p.type === 'bank_transfer') || []);
      setQrisMethods(methods?.filter((p: any) => p.type === 'qris') || []);
      setLoading(false);
    }
    loadData();
  }, [orderId, router, supabase]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG 70% quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (!selected.type.startsWith('image/')) {
        setUploadError('Harap pilih file gambar (JPG/PNG).');
        return;
      }
      if (selected.size > 5 * 1024 * 1024) {
        setUploadError('Ukuran file maksimal 5MB.');
        return;
      }
      setFile(selected);
      setUploadError('');
      
      const objectUrl = URL.createObjectURL(selected);
      setPreview(objectUrl);
    }
  };

  const handleUpload = async () => {
    if (!file || !order) return;
    setUploading(true);
    setUploadError('');

    try {
      const base64Compressed = await compressImage(file);
      const res = await uploadPaymentProof(order.id, base64Compressed);

      if (res.error) {
        setUploadError(res.error);
      } else {
        setUploaded(true);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Terjadi kesalahan saat mengunggah.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !order) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--c-gold)' }} size={32} />
      </div>
    );
  }

  return (
    <div className="customer-page">
      <PageHeader />

      <main className="workspace" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <div style={{ width: 'min(100%, 800px)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Status Header */}
          <div style={{ background: 'var(--glass-bg)', padding: '48px 32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--glass-border)', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(21, 138, 114, 0.1)', color: 'var(--c-teal)', marginBottom: '24px' }}>
              <CheckCircle2 size={40} />
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--c-ink)', marginBottom: '12px' }}>Pesanan Berhasil Dibuat!</h1>
            <p style={{ color: 'var(--c-ink-dim)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
              Satu langkah lagi. Silakan lakukan pembayaran sesuai dengan nominal di bawah ini agar pesanan Anda segera kami proses.
            </p>
            {order.payment_method && (
              <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 100, background: 'var(--c-surface-2)', color: 'var(--c-ink)', fontSize: '0.88rem', border: '1px solid var(--c-border)' }}>
                Metode dipilih: <strong>{order.payment_method}</strong>
              </div>
            )}
          </div>

          {/* Total Box */}
          <div style={{ background: 'var(--c-surface-1)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-gold)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'var(--c-gold)' }} />
            <p style={{ color: 'var(--c-ink-dim)', fontSize: '0.95rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Pembayaran</p>
            <h2 style={{ fontSize: '3rem', color: 'var(--c-gold)', fontWeight: 700, margin: '0 0 16px 0', fontFamily: 'var(--font-display)' }}>
              {formatRupiah(order.total)}
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(220, 165, 74, 0.1)', padding: '12px 24px', borderRadius: '100px', color: 'var(--c-gold)', fontSize: '0.9rem' }}>
              <AlertCircle size={16} />
              <span>Penting: Transfer <strong>tepat hingga 3 digit terakhir</strong> (Kode Unik) untuk mempercepat verifikasi.</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Link href={`/pesanan/invoice/${orderId}`} target="_blank" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 100, border: '1px solid var(--c-gold)', color: 'var(--c-gold)' }}>
                Lihat Invoice
              </Link>
            </div>
            
            {order.payment_method?.includes('Mayar') && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <div style={{ padding: '16px', width: '100%', borderRadius: 'var(--r-md)', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--c-teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <CheckCircle2 size={24} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>Sistem memverifikasi otomatis.</span>
                </div>
                {order.payment_link && (
                  <Link href={order.payment_link} className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '14px', fontSize: '1rem', fontWeight: 600 }}>
                    Lanjutkan Pembayaran
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Payment Instructions - Hide for Mayar */}
          {!order.payment_method?.includes('Mayar') && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {/* Transfer Bank */}
                <div style={{ background: 'var(--c-surface-1)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--c-ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--c-surface-2)', borderRadius: '50%', fontSize: '0.9rem' }}>1</span>
                    Transfer Bank
                  </h3>
                  {bankMethods.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {bankMethods.map((method) => (
                        <div key={method.id} style={{ padding: '16px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', background: 'var(--bg-color)' }}>
                          <div style={{ fontWeight: 700, color: 'var(--c-ink)', fontSize: '1.1rem', marginBottom: '8px' }}>{method.bank_name}</div>
                          <div style={{ color: 'var(--c-ink-dim)', fontSize: '0.9rem', marginBottom: '4px' }}>No. Rekening:</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-surface-2)', padding: '12px', borderRadius: 'var(--r-sm)', marginBottom: '8px' }}>
                            <span style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: 'var(--c-ink)', fontWeight: 600 }}>{method.account_number}</span>
                          </div>
                          <div style={{ color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>a.n. <strong style={{ color: 'var(--c-ink)' }}>{method.account_name}</strong></div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>Metode transfer bank belum tersedia.</p>
                  )}
                </div>

                {/* QRIS */}
                <div style={{ background: 'var(--c-surface-1)', padding: '32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--c-ink)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--c-surface-2)', borderRadius: '50%', fontSize: '0.9rem' }}>Atau</span>
                    Scan QRIS
                  </h3>
                  {qrisMethods.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      {qrisMethods.map((method) => (
                        <div key={method.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', background: 'var(--bg-color)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--c-ink)', marginBottom: '16px' }}>{method.bank_name}</div>
                          {method.qr_image_url && (
                            <div style={{ background: '#fff', padding: '16px', borderRadius: 'var(--r-md)', border: '1px solid #eee' }}>
                              <img src={method.qr_image_url} alt={`QRIS ${method.bank_name}`} style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--c-ink-dim)', fontSize: '0.9rem' }}>Metode QRIS belum tersedia.</p>
                  )}
                </div>
              </div>

              {/* Upload Action */}
              <div id="upload-section" style={{ background: 'var(--c-surface-1)', padding: '40px 32px', borderRadius: 'var(--r-lg)', border: '1px solid var(--c-border)', textAlign: 'center', marginTop: '16px' }}>
                {uploaded ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                 <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--c-teal)', display: 'grid', placeItems: 'center', marginBottom: 20 }}>
                   <CheckCircle2 size={32} />
                 </div>
                 <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--c-ink)', marginBottom: 12 }}>Bukti Pembayaran Terkirim</h3>
                 <p style={{ color: 'var(--c-ink-dim)', fontSize: '1rem', maxWidth: '500px', marginBottom: 32 }}>
                   Terima kasih, pembayaran Anda sedang diproses. Status pesanan diubah menjadi Menunggu Konfirmasi.
                 </p>
                 <div style={{ display: 'flex', gap: 16 }}>
                    <Link href="/pesanan" className="btn btn-primary" style={{ padding: '0 32px', height: '48px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      Lihat Pesanan Saya
                    </Link>
                    <Link href={`/pesanan/invoice/${orderId}`} target="_blank" className="btn" style={{ padding: '0 24px', height: '48px', borderRadius: 100, border: '1px solid var(--c-gold)', color: 'var(--c-gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                      Lihat Invoice
                    </Link>
                    <button onClick={() => {
                        // Open Chat widget if possible by triggering a custom event or using a ref
                        document.getElementById('chatbot-toggle')?.click();
                    }} className="btn btn-ghost" style={{ padding: '0 24px', height: '48px', borderRadius: 100, display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', color: 'var(--c-ink)' }}>
                        <MessageSquare size={18} /> Tanya Status
                    </button>
                 </div>
               </div>
            ) : (
                <>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(201, 168, 76, 0.1)', color: 'var(--c-gold)', marginBottom: '20px' }}>
                    <Upload size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--c-ink)', marginBottom: '12px' }}>Upload Bukti Pembayaran</h3>
                <p style={{ color: 'var(--c-ink-dim)', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 32px auto', lineHeight: 1.6 }}>
                    Setelah Anda melakukan transfer atau scan QRIS, silakan unggah tangkapan layar (screenshot) bukti transaksi agar pesanan Anda ({order.order_code}) dapat segera dikirim.
                </p>

                <div style={{ maxWidth: 400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!file ? (
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            style={{ border: '2px dashed var(--c-border)', padding: '40px 20px', borderRadius: 'var(--r-md)', cursor: 'pointer', background: 'var(--bg-color)', transition: 'all 0.2s' }}
                        >
                            <FileImage size={32} style={{ color: 'var(--c-ink-muted)', marginBottom: 12 }} />
                            <div style={{ fontWeight: 500, color: 'var(--c-ink)', marginBottom: 4 }}>Pilih atau letakkan gambar di sini</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--c-ink-dim)' }}>Format JPG/PNG, Maks. 5MB</div>
                        </div>
                    ) : (
                        <div style={{ border: '1px solid var(--c-border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--bg-color)' }}>
                            <div style={{ position: 'relative', width: '100%', height: 200, background: '#f8f8f8' }}>
                                {preview && <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                            </div>
                            <div style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--c-border)' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--c-ink)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 200 }}>{file.name}</span>
                                <button onClick={() => { setFile(null); setPreview(null); }} style={{ color: 'var(--c-rose)', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer' }}>Ganti</button>
                            </div>
                        </div>
                    )}

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/png, image/jpeg" 
                        style={{ display: 'none' }} 
                    />

                    {uploadError && (
                        <div style={{ color: 'var(--c-rose)', fontSize: '0.9rem', padding: 12, background: 'rgba(225, 29, 72, 0.1)', borderRadius: 'var(--r-sm)' }}>
                            {uploadError}
                        </div>
                    )}

                    <button 
                        onClick={handleUpload} 
                        disabled={!file || uploading} 
                        className="btn btn-primary" 
                        style={{ height: 50, fontSize: '1.05rem', borderRadius: 100, marginTop: 8 }}
                    >
                        {uploading ? (
                            <><Loader2 className="animate-spin" size={20} /> Mengunggah...</>
                        ) : 'Kirim Bukti Pembayaran'}
                    </button>
                </div>
                </>
            )}
          </div>
          </>
          )}
        </div>
      </main>
    </div>
  );
}

