"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, ShieldAlert, Store, MapPin, Check, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { addEmployee, deleteEmployee, updateEmployeeBranches } from "./actions";

interface StoreOption {
  id: number;
  name: string;
}

const STORES: StoreOption[] = [
  { id: 1, name: "Condet" },
  { id: 2, name: "Rawa Belong" },
  { id: 3, name: "Tangerang" },
];

export default function KaryawanPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit branch state
  const [editingEmp, setEditingEmp] = useState<any | null>(null);
  const [editStoreIds, setEditStoreIds] = useState<number[]>([]);
  const [isUpdatingBranches, setIsUpdatingBranches] = useState(false);

  const supabase = createClient(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const res = await addEmployee(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("Pegawai berhasil ditambahkan");
      setShowAddModal(false);
      fetchEmployees();
    }
    setIsSubmitting(false);
  };

  const handleOpenEditBranches = (emp: any) => {
    setEditingEmp(emp);
    setEditStoreIds(emp.assigned_store_ids || [1, 2, 3]);
  };

  const handleSaveBranches = async () => {
    if (!editingEmp) return;
    setIsUpdatingBranches(true);
    const res = await updateEmployeeBranches(editingEmp.id, editStoreIds);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`Cabang kasir ${editingEmp.full_name} berhasil diperbarui`);
      setEditingEmp(null);
      fetchEmployees();
    }
    setIsUpdatingBranches(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Yakin ingin menghapus akses ${name}?`)) {
      const res = await deleteEmployee(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Pegawai berhasil dihapus");
        fetchEmployees();
      }
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return <span style={{ background: "var(--c-gold)", color: "#000", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>Owner</span>;
      case "developer":
        return <span style={{ background: "#13d7ed", color: "#000", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>Developer</span>;
      case "admin":
        return <span style={{ background: "var(--c-surface-2)", color: "var(--c-ink)", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>Admin</span>;
      case "HRD":
        return <span style={{ background: "var(--c-rose)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>HRD</span>;
      default:
        return <span style={{ background: "var(--c-surface-1)", color: "var(--c-ink-dim)", padding: "4px 8px", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600, border: "1px solid var(--c-border)" }}>Employee</span>;
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--c-ink)", marginBottom: 4 }}>Daftar Karyawan & Kasir</h1>
          <p style={{ color: "var(--c-ink-dim)", fontSize: "0.9rem" }}>Kelola hak akses internal dan penugasan kasir cabang toko.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "var(--c-gold)", color: "#000", border: "none", borderRadius: "var(--r-md)", fontWeight: 600, cursor: "pointer" }}
        >
          <Plus size={18} /> Tambah Pegawai
        </button>
      </div>

      <div style={{ background: "var(--c-surface-1)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "var(--glass-bg)", borderBottom: "1px solid var(--c-border)" }}>
              <th style={{ padding: "16px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)" }}>Nama Lengkap</th>
              <th style={{ padding: "16px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)" }}>Email / Username</th>
              <th style={{ padding: "16px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)" }}>Role Akses</th>
              <th style={{ padding: "16px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)" }}>Penugasan Kasir Cabang</th>
              <th style={{ padding: "16px", fontSize: "0.85rem", fontWeight: 600, color: "var(--c-ink-dim)", textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--c-ink-dim)" }}>Memuat data...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: "center", color: "var(--c-ink-dim)" }}>Belum ada data pegawai.</td>
              </tr>
            ) : (
              employees.map((emp) => {
                const assigned = emp.assigned_store_ids || [1, 2, 3];
                return (
                  <tr key={emp.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <td style={{ padding: "16px", fontWeight: 500, color: "var(--c-ink)" }}>{emp.full_name}</td>
                    <td style={{ padding: "16px", color: "var(--c-ink-dim)" }}>{emp.email}</td>
                    <td style={{ padding: "16px" }}>{getRoleBadge(emp.role)}</td>
                    <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {STORES.map((s) => {
                          const isActive = assigned.includes(s.id);
                          return (
                            <span
                              key={s.id}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                padding: "2px 8px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                background: isActive ? "rgba(217, 119, 6, 0.15)" : "rgba(255, 255, 255, 0.05)",
                                color: isActive ? "var(--c-gold)" : "var(--c-ink-dim)",
                                border: isActive ? "1px solid rgba(217, 119, 6, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
                              }}
                            >
                              <MapPin size={10} />
                              {s.name}
                            </span>
                          );
                        })}
                        <button
                          onClick={() => handleOpenEditBranches(emp)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--c-gold)",
                            cursor: "pointer",
                            padding: "2px 6px",
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: "0.75rem",
                            marginLeft: 4,
                          }}
                          title="Ubah Cabang Penugasan"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "16px", textAlign: "right" }}>
                      <button
                        onClick={() => handleDelete(emp.id, emp.full_name)}
                        style={{ padding: 8, background: "transparent", border: "none", color: "var(--c-rose)", cursor: "pointer", borderRadius: 4 }}
                        title="Hapus Akses"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Cabang Penugasan */}
      {editingEmp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110 }}>
          <div style={{ background: "var(--c-surface-1)", width: "100%", maxWidth: 440, borderRadius: "var(--r-md)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
            <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Store size={18} color="var(--c-gold)" />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--c-ink)", margin: 0 }}>Penugasan Kasir Cabang</h3>
              </div>
              <button onClick={() => setEditingEmp(null)} style={{ background: "transparent", border: "none", color: "var(--c-ink-dim)", cursor: "pointer", fontSize: "1.25rem", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: "0.85rem", color: "var(--c-ink-dim)", marginBottom: 16 }}>
                Pilih cabang toko fisik yang dapat diakses oleh <strong>{editingEmp.full_name}</strong> saat login di terminal kasir:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {STORES.map((s) => {
                  const checked = editStoreIds.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: checked ? "rgba(217, 119, 6, 0.1)" : "var(--bg-color)",
                        border: checked ? "1px solid rgba(217, 119, 6, 0.4)" : "1px solid var(--c-border)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditStoreIds([...editStoreIds, s.id]);
                          } else {
                            if (editStoreIds.length === 1) {
                              toast.warning("Karyawan wajib memiliki minimal 1 cabang aktif.");
                              return;
                            }
                            setEditStoreIds(editStoreIds.filter((id) => id !== s.id));
                          }
                        }}
                        style={{ accentColor: "var(--c-gold)", width: 16, height: 16 }}
                      />
                      <span style={{ fontSize: "0.9rem", color: "var(--c-ink)", fontWeight: 500 }}>
                        Cabang {s.name} (Toko {s.id})
                      </span>
                    </label>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink)", borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: "0.85rem" }}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isUpdatingBranches}
                  onClick={handleSaveBranches}
                  style={{ padding: "8px 16px", background: "var(--c-gold)", border: "none", color: "#000", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}
                >
                  {isUpdatingBranches ? "Menyimpan..." : "Simpan Cabang"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Pegawai */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--c-surface-1)", width: "100%", maxWidth: 500, borderRadius: "var(--r-md)", border: "1px solid var(--c-border)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--c-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--c-ink)" }}>Tambah Pegawai & Kasir Baru</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: "var(--c-ink-dim)", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1 }}>&times;</button>
            </div>

            <form onSubmit={handleAddSubmit} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16, padding: "12px", background: "rgba(224, 185, 118, 0.1)", border: "1px solid var(--c-gold)", borderRadius: "var(--r-sm)", display: "flex", gap: 12 }}>
                <ShieldAlert size={24} color="var(--c-gold)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: "0.85rem", color: "var(--c-ink)", margin: 0 }}>Pegawai akan otomatis terverifikasi dan dapat login di terminal kasir toko.</p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--c-ink)" }}>Nama Lengkap</label>
                <input required name="full_name" type="text" style={{ width: "100%", padding: "10px 12px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", outline: "none" }} placeholder="Cth: Budi Santoso" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--c-ink)" }}>Alamat Email (Username)</label>
                <input required name="email" type="email" style={{ width: "100%", padding: "10px 12px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", outline: "none" }} placeholder="budi@minyakwangi.com" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--c-ink)" }}>Password Sementara</label>
                <input required name="password" type="password" style={{ width: "100%", padding: "10px 12px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", outline: "none" }} placeholder="Minimal 6 karakter" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--c-ink)" }}>Role Akses</label>
                <select required name="role" style={{ width: "100%", padding: "10px 12px", background: "var(--bg-color)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c-ink)", outline: "none" }}>
                  <option value="employee">Employee / Kasir</option>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                  <option value="HRD">HRD</option>
                  <option value="owner">Owner</option>
                </select>
              </div>

              {/* Cabang Penugasan Kasir */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 8, fontSize: "0.85rem", fontWeight: 500, color: "var(--c-ink)" }}>
                  Penugasan Kasir Toko Cabang
                </label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {STORES.map((s) => (
                    <label
                      key={s.id}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "var(--bg-color)",
                        border: "1px solid var(--c-border)",
                        fontSize: "0.85rem",
                        color: "var(--c-ink)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        name="assigned_store_ids"
                        value={s.id}
                        defaultChecked
                        style={{ accentColor: "var(--c-gold)" }}
                      />
                      <span>{s.name}</span>
                    </label>
                  ))}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--c-ink-dim)", marginTop: 4, display: "block" }}>
                  Centang cabang yang boleh diakses kasir (bisa 1 atau semua cabang).
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-ink)", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 500 }}>Batal</button>
                <button type="submit" disabled={isSubmitting} style={{ padding: "10px 16px", background: "var(--c-gold)", border: "none", color: "#000", borderRadius: "var(--r-sm)", cursor: "pointer", fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}>
                  {isSubmitting ? "Menyimpan..." : "Tambah Pegawai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
