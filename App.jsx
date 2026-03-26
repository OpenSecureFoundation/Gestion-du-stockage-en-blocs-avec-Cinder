import { useState, useEffect, useCallback } from "react";

const API_BASE = "/api";

function apiHeaders(session) {
  return {
    "Content-Type": "application/json",
    "X-Auth-Token": session?.token || "",
    "X-Auth-Url": session?.auth_url || "",
    "X-Project-Id": session?.project_id || "",
  };
}

async function api(path, options = {}, session = null) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...apiHeaders(session), ...(options.headers || {}) },
  });
  return res.json();
}

const C = {
  bg: "#C4956A",
  card: "#2D4A30",
  orange: "#D4611A",
  orangeLight: "#F07830",
  green: "#2D6A4F",
  greenLight: "#40916C",
  brown: "#5C3D2E",
  text: "#F5EDD8",
  textMuted: "#B8C8A8",
  border: "#3D6A40",
  red: "#C0392B",
  yellow: "#E8A020",
  white: "#2D4A30",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; font-family: 'DM Sans', sans-serif; color: ${C.text}; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
  input::placeholder { color: ${C.textMuted}; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  .fade-up { animation: fadeUp 0.4s ease forwards; }
`;

function Toast({ toasts, remove }) {
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} onClick={() => remove(t.id)} style={{
          background: t.type === "error" ? C.red : t.type === "warning" ? C.yellow : C.green,
          color: "#fff", padding:"12px 20px", borderRadius:12, cursor:"pointer",
          fontFamily:"'DM Sans', sans-serif", fontSize:14, fontWeight:500,
          boxShadow:"0 4px 20px rgba(0,0,0,0.15)", maxWidth:340,
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom:16 }}>
      {label && <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#1A0A00", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.8px" }}>{label}</label>}
      <input {...props} style={{
        width:"100%", padding:"12px 16px", background:"#F5EDD8",
        border:`1.5px solid ${C.border}`, borderRadius:10, color:"#1A0A00",
        fontSize:15, outline:"none", fontFamily:"'DM Sans', sans-serif",
        transition:"border-color 0.2s",
        ...(props.style || {})
      }}
      onFocus={e => e.target.style.borderColor = C.orange}
      onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
}

function Btn({ children, variant="primary", onClick, disabled, style={} }) {
  const variants = {
    primary: { background:`linear-gradient(135deg, ${C.orange}, ${C.orangeLight})`, color:"#fff", border:"none", boxShadow:`0 4px 16px rgba(212,97,26,0.3)` },
    secondary: { background:"transparent", color:C.text, border:`1.5px solid ${C.border}` },
    green: { background:`linear-gradient(135deg, ${C.green}, ${C.greenLight})`, color:"#fff", border:"none", boxShadow:`0 4px 16px rgba(45,106,79,0.3)` },
    danger: { background:"transparent", color:C.red, border:`1.5px solid ${C.red}22` },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"12px 20px", borderRadius:10, fontSize:14, fontWeight:600,
      cursor: disabled ? "not-allowed" : "pointer", fontFamily:"'DM Sans', sans-serif",
      opacity: disabled ? 0.6 : 1, transition:"all 0.2s", width:"100%",
      ...variants[variant], ...style,
    }}>
      {children}
    </button>
  );
}

// ─── REGISTER ──────────────────────────────────────────────────────────────────
function RegisterPage({ onBack }) {
  const [form, setForm] = useState({ username:"", email:"", password:"", confirm_password:"", auth_url:"http://192.168.43.15/identity" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (form.password !== form.confirm_password) { setError("Les mots de passe ne correspondent pas"); return; }
    if (form.password.length < 6) { setError("Mot de passe trop court (6 caractères min.)"); return; }
    setLoading(true); setError("");
    try {
      const res = await api("/auth/register", { method:"POST", body:JSON.stringify(form) });
      if (res.success) setSuccess(true);
      else setError(res.error || "Erreur lors de la création");
    } catch { setError("Impossible de joindre le serveur"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{styles}</style>
      <div style={{ width:"100%", maxWidth:480, background:C.card, borderRadius:24, padding:"48px 40px", boxShadow:"0 24px 80px rgba(92,61,46,0.12)" }}>
        {success ? (
          <div style={{ textAlign:"center" }} className="fade-up">
            <div style={{ fontSize:72, marginBottom:20 }}>🎉</div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:30, color:C.text, marginBottom:12 }}>
              Enregistrement effectué !
            </h2>
            <p style={{ color:C.textMuted, fontSize:15, lineHeight:1.7, marginBottom:32 }}>
              Votre compte a été créé avec succès.<br/>Vous pouvez maintenant vous connecter.
            </p>
            <Btn onClick={onBack} variant="green">→ Se connecter</Btn>
          </div>
        ) : (
          <>
            <div style={{ marginBottom:32 }}>
              <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, color:C.text, marginBottom:6 }}>Créer un compte</h2>
              <p style={{ color:C.textMuted, fontSize:14 }}>Rejoignez CinderAuto gratuitement</p>
            </div>
            <Input label="Nom d'utilisateur" type="text" value={form.username} onChange={e => setForm({...form, username:e.target.value})} placeholder="ex: jean_dupont" />
            <Input label="Adresse email" type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="jean@example.com" />
            <Input label="Mot de passe" type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="••••••••" />
            <Input label="Confirmer le mot de passe" type="password" value={form.confirm_password} onChange={e => setForm({...form, confirm_password:e.target.value})} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            {error && (
              <div style={{ background:`${C.red}22`, border:`1px solid ${C.red}50`, borderRadius:8, padding:"10px 14px", color:"#ffaaaa", fontSize:13, marginBottom:16 }}>
                ⚠ {error}
              </div>
            )}
            <Btn onClick={handleSubmit} disabled={loading} style={{ marginBottom:12 }}>
              {loading ? "Création en cours..." : "🚀 Créer mon compte"}
            </Btn>
            <Btn onClick={onBack} variant="secondary">← Retour à la connexion</Btn>
          </>
        )}
      </div>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin, onRegister }) {
  const [form, setForm] = useState({ auth_url:"http://192.168.43.15/identity", username:"", password:"", project_name:"", domain_name:"Default" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await api("/auth/login", { method:"POST", body:JSON.stringify(form) });
      if (res.success) onLogin(res);
      else setError(res.error || "Identifiants incorrects");
    } catch { setError("Impossible de joindre le serveur"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <style>{styles}</style>
      <div style={{ display:"flex", width:"100%", maxWidth:900, minHeight:520, borderRadius:24, overflow:"hidden", boxShadow:"0 24px 80px rgba(92,61,46,0.15)" }}>

        {/* Panneau gauche */}
        <div style={{
          flex:1, background:`linear-gradient(160deg, ${C.brown} 0%, ${C.orange} 60%, ${C.yellow} 100%)`,
          padding:48, display:"flex", flexDirection:"column", justifyContent:"space-between",
          position:"relative", overflow:"hidden",
        }}>
          <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
          <div style={{ position:"absolute", bottom:-40, left:-40, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />
          <div>
            <div style={{ fontSize:36, marginBottom:8 }}>📸</div>
            <h1 style={{ fontFamily:"'Playfair Display', serif", color:"#fff", fontSize:32, fontWeight:800, lineHeight:1.2, marginBottom:12 }}>
              CinderAuto
            </h1>
            <p style={{ color:"rgba(255,255,255,0.75)", fontSize:15, lineHeight:1.7 }}>
              Gérez vos snapshots OpenStack automatiquement. Simple, fiable, efficace.
            </p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {["✓ Snapshots automatiques", "✓ Planification flexible", "✓ Restauration en 1 clic"].map(t => (
              <div key={t} style={{ color:"rgba(255,255,255,0.85)", fontSize:14, fontWeight:500 }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Panneau droit */}
        <div style={{ flex:1, background:C.card, padding:"48px 40px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:26, color:C.text, marginBottom:6 }}>Bon retour !</h2>
          <p style={{ color:C.textMuted, fontSize:14, marginBottom:32 }}>Connectez-vous à votre espace</p>

          <Input label="Nom d'utilisateur" type="text" value={form.username} onChange={e => setForm({...form, username:e.target.value})} placeholder="votre_nom" />
          <Input label="Mot de passe" type="password" value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleSubmit()} />

          {error && (
            <div style={{ background:`${C.red}22`, border:`1px solid ${C.red}50`, borderRadius:8, padding:"10px 14px", color:"#ffaaaa", fontSize:13, marginBottom:16 }}>
              ⚠ {error}
            </div>
          )}

          <Btn onClick={handleSubmit} disabled={loading}>
            {loading ? "Connexion..." : "Se connecter →"}
          </Btn>

          <div style={{ textAlign:"center", marginTop:20 }}>
            <span style={{ color:C.textMuted, fontSize:14 }}>Pas encore de compte ? </span>
            <span onClick={onRegister} style={{ color:C.orange, fontSize:14, fontWeight:600, cursor:"pointer" }}>
              Créer un compte
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE VOLUME MODAL ───────────────────────────────────────────────────────
function CreateVolumeModal({ session, onClose, onCreated, toast }) {
  const [form, setForm] = useState({ name:"", size:1, description:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const create = async () => {
    if (!form.name) { setError("Le nom du volume est requis"); return; }
    if (form.size < 1) { setError("La taille minimum est 1 GB"); return; }
    setLoading(true);
    try {
      const res = await api("/volumes", { method:"POST", body:JSON.stringify(form) }, session);
      if (res.success) { toast(`✅ Volume "${form.name}" créé !`, "success"); onCreated(); }
      else setError(res.error || "Erreur lors de la création");
    } catch { setError("Erreur réseau"); }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(26,18,8,0.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:460, background:C.card, borderRadius:20, padding:"36px 32px", boxShadow:"0 40px 80px rgba(92,61,46,0.2)" }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, color:C.text, marginBottom:4 }}>Créer un volume</h2>
        <p style={{ color:C.textMuted, fontSize:14, marginBottom:28 }}>Nouveau volume Cinder dans votre projet</p>

        <Input label="Nom du volume" type="text" placeholder="ex: volume-production" value={form.name} onChange={e => setForm({...form, name:e.target.value})} />

        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#1A0A00", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.8px" }}>Taille (GB)</label>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <input type="range" min="1" max="100" value={form.size} onChange={e => setForm({...form, size:Number(e.target.value)})} style={{ flex:1, accentColor:C.orange }} />
            <span style={{ color:C.orange, fontWeight:700, minWidth:60, fontSize:16 }}>{form.size} GB</span>
          </div>
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            {[1,5,10,20,50,100].map(v => (
              <button key={v} onClick={() => setForm({...form, size:v})} style={{
                padding:"5px 10px", borderRadius:8,
                border: form.size === v ? `2px solid ${C.orange}` : `1.5px solid ${C.border}`,
                background: form.size === v ? `${C.orange}25` : "transparent",
                color: form.size === v ? C.orange : C.textMuted,
                fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
              }}>{v}G</button>
            ))}
          </div>
        </div>

        <Input label="Description (optionnel)" type="text" placeholder="Description du volume..." value={form.description} onChange={e => setForm({...form, description:e.target.value})} />

        {error && (
          <div style={{ background:`${C.red}22`, border:`1px solid ${C.red}50`, borderRadius:8, padding:"10px 14px", color:"#ffaaaa", fontSize:13, marginBottom:16 }}>⚠ {error}</div>
        )}

        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={onClose} variant="secondary" style={{ flex:1 }}>Annuler</Btn>
          <button onClick={create} disabled={loading} style={{
            flex:2, padding:"12px 0", borderRadius:10, border:"none",
            background:`linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
            color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer",
            fontFamily:"'DM Sans', sans-serif", boxShadow:`0 4px 16px ${C.green}40`,
          }}>
            {loading ? "Création..." : "✅ Créer le volume"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── VOLUME CARD ───────────────────────────────────────────────────────────────
function VolumeCard({ volume, onActivate, onViewSnapshots }) {
  const statusColor = { available: C.greenLight, in_use: C.orange, error: C.red };
  const color = statusColor[volume.status] || C.textMuted;

  return (
    <div style={{
      background: C.card, border:`1.5px solid ${C.border}`, borderRadius:16,
      padding:"20px 22px", transition:"all 0.2s", position:"relative",
      boxShadow:"0 2px 8px rgba(0,0,0,0.1)",
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"}
    onMouseLeave={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"}
    >
      {volume.schedule?.enabled && (
        <div style={{
          position:"absolute", top:14, right:14,
          background:`${C.greenLight}30`, border:`1px solid ${C.greenLight}60`,
          borderRadius:20, padding:"3px 10px", fontSize:11, color:C.greenLight, fontWeight:700,
          display:"flex", alignItems:"center", gap:4,
        }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:C.greenLight, animation:"pulse 2s infinite" }} />
          AUTO
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
        <div style={{
          width:44, height:44, borderRadius:12, background:`${color}25`,
          border:`1.5px solid ${color}40`, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:20,
        }}>🗄️</div>
        <div>
          <div style={{ color:C.text, fontWeight:600, fontSize:15 }}>{volume.name}</div>
          <div style={{ color:C.textMuted, fontSize:11, fontFamily:"monospace" }}>{volume.id.substring(0,16)}...</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:20, marginBottom:16 }}>
        {[
          { label:"Taille", value:`${volume.size} GB` },
          { label:"Statut", value:volume.status, c:color },
          { label:"Type", value:volume.volume_type || "standard" },
        ].map(({ label, value, c }) => (
          <div key={label}>
            <div style={{ color:C.textMuted, fontSize:11, marginBottom:2 }}>{label}</div>
            <div style={{ color: c || C.text, fontSize:13, fontWeight:600 }}>{value}</div>
          </div>
        ))}
      </div>

      {volume.schedule?.enabled && (
        <div style={{ padding:"8px 12px", background:`${C.green}25`, borderRadius:8, marginBottom:12, fontSize:12, color:C.greenLight }}>
          ⏱ Snapshot toutes les {volume.schedule.frequency_hours}h
        </div>
      )}

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onActivate(volume)} style={{
          flex:1, padding:"8px 0", borderRadius:8,
          border:`1.5px solid ${volume.schedule?.enabled ? C.yellow : C.orange}`,
          background: volume.schedule?.enabled ? `${C.yellow}20` : `${C.orange}20`,
          color: volume.schedule?.enabled ? C.yellow : C.orange,
          fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
        }}>
          {volume.schedule?.enabled ? "✏ Modifier" : "⚡ Activer auto"}
        </button>
        <button onClick={() => onViewSnapshots(volume)} style={{
          flex:1, padding:"8px 0", borderRadius:8,
          border:`1.5px solid ${C.orange}60`,
          background:`${C.orange}20`, color:C.orange,
          fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
        }}>
          📸 Snapshots
        </button>
      </div>
    </div>
  );
}

// ─── MODAL ACTIVATION ──────────────────────────────────────────────────────────
function ActivationModal({ volume, session, onClose, onSaved, toast }) {
  const [freq, setFreq] = useState(volume.schedule?.frequency_hours || 24);
  const [retention, setRetention] = useState(5);
  const [loading, setLoading] = useState(false);

  const presets = [{ label:"1h",value:1},{ label:"6h",value:6},{ label:"12h",value:12},{ label:"24h",value:24},{ label:"48h",value:48},{ label:"7j",value:168}];

  const save = async () => {
    setLoading(true);
    const res = await api("/schedules", { method:"POST", body:JSON.stringify({ volume_id:volume.id, volume_name:volume.name, frequency_hours:freq, retention_count:retention }) }, session);
    if (res.success) { toast("✅ Planification activée !", "success"); onSaved(); onClose(); }
    else toast(res.error || "Erreur", "error");
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:480, background:C.card, borderRadius:20, padding:"36px 32px", boxShadow:"0 40px 80px rgba(0,0,0,0.3)" }}>
        <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:22, color:C.text, marginBottom:4 }}>Snapshot Automatique</h2>
        <p style={{ color:C.textMuted, fontSize:14, marginBottom:28 }}>Volume : <strong style={{ color:C.orange }}>{volume.name}</strong></p>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.textMuted, marginBottom:12, textTransform:"uppercase", letterSpacing:"0.8px" }}>Fréquence</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
            {presets.map(({ label, value }) => (
              <button key={value} onClick={() => setFreq(value)} style={{
                padding:"7px 14px", borderRadius:8,
                border: freq === value ? `2px solid ${C.orange}` : `1.5px solid ${C.border}`,
                background: freq === value ? `${C.orange}25` : "transparent",
                color: freq === value ? C.orange : C.textMuted,
                fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
              }}>{label}</button>
            ))}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <input type="range" min="1" max="168" value={freq} onChange={e => setFreq(Number(e.target.value))} style={{ flex:1, accentColor:C.orange }} />
            <span style={{ color:C.orange, fontWeight:700, minWidth:40 }}>{freq >= 24 ? `${freq/24}j` : `${freq}h`}</span>
          </div>
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:C.textMuted, marginBottom:10, textTransform:"uppercase", letterSpacing:"0.8px" }}>Rétention</label>
          <div style={{ display:"flex", gap:8 }}>
            {[3,5,7,10,14,30].map(v => (
              <button key={v} onClick={() => setRetention(v)} style={{
                padding:"7px 12px", borderRadius:8,
                border: retention === v ? `2px solid ${C.greenLight}` : `1.5px solid ${C.border}`,
                background: retention === v ? `${C.greenLight}25` : "transparent",
                color: retention === v ? C.greenLight : C.textMuted,
                fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
              }}>{v}</button>
            ))}
          </div>
        </div>

        <div style={{ background:`${C.orange}15`, border:`1px solid ${C.orange}30`, borderRadius:10, padding:"12px 16px", marginBottom:24, color:C.text, fontSize:13 }}>
          📌 Snapshot toutes les <strong>{freq}h</strong>, les <strong>{retention} derniers</strong> conservés.
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <Btn onClick={onClose} variant="secondary" style={{ flex:1 }}>Annuler</Btn>
          <button onClick={save} disabled={loading} style={{
            flex:2, padding:"12px 0", borderRadius:10, border:"none",
            background:`linear-gradient(135deg, ${C.orange}, ${C.orangeLight})`,
            color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer",
            fontFamily:"'DM Sans', sans-serif", boxShadow:`0 4px 16px ${C.orange}40`,
          }}>
            {loading ? "Activation..." : "✅ Activer la planification"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── SNAPSHOTS PANEL ───────────────────────────────────────────────────────────
function SnapshotsPanel({ volume, session, onClose, toast }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoreName, setRestoreName] = useState("");
  const [restoring, setRestoring] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api(`/snapshots?volume_id=${volume.id}`, {}, session);
    setSnapshots(res.snapshots || []);
    setLoading(false);
  }, [volume.id, session]);

  useEffect(() => { load(); }, [load]);

  const restore = async (snap) => {
    const name = restoreName || `restored-${snap.name}-${Date.now()}`;
    setRestoring(snap.id);
    const res = await api("/restore", { method:"POST", body:JSON.stringify({ snapshot_id:snap.id, volume_name:name }) }, session);
    if (res.success) { toast(`✅ Restauration lancée : "${name}"`, "success"); setRestoreName(""); }
    else toast(res.error || "Erreur", "error");
    setRestoring(null);
  };

  const deleteSnap = async (snap) => {
    if (!confirm(`Supprimer "${snap.name}" ?`)) return;
    await api(`/snapshots/${snap.id}`, { method:"DELETE" }, session);
    toast("Snapshot supprimé", "success");
    load();
  };

  const statusColor = { available:C.greenLight, creating:C.yellow, error:C.red };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(4px)" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width:680, maxHeight:"85vh", background:C.card, borderRadius:20, padding:"32px", overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 40px 80px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, color:C.text, marginBottom:4 }}>Snapshots</h2>
            <p style={{ color:C.textMuted, fontSize:13 }}>{volume.name} — {snapshots.length} snapshot(s)</p>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:"50%", border:`1.5px solid ${C.border}`, background:"transparent", color:C.textMuted, cursor:"pointer", fontSize:16 }}>×</button>
        </div>

        <input type="text" placeholder="Nom du volume restauré (optionnel)..." value={restoreName} onChange={e => setRestoreName(e.target.value)}
          style={{ width:"100%", padding:"10px 14px", background:`${C.bg}30`, border:`1.5px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:13, outline:"none", marginBottom:16, fontFamily:"'DM Sans', sans-serif" }} />

        <div style={{ overflowY:"auto", flex:1 }}>
          {loading ? (
            <div style={{ textAlign:"center", padding:40, color:C.textMuted }}>Chargement...</div>
          ) : snapshots.length === 0 ? (
            <div style={{ textAlign:"center", padding:40, color:C.textMuted }}>Aucun snapshot disponible</div>
          ) : snapshots.map(snap => (
            <div key={snap.id} style={{ background:`${C.bg}20`, border:`1.5px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                  <span style={{ color:C.text, fontWeight:600, fontSize:14 }}>{snap.name}</span>
                  {snap.is_auto && <span style={{ background:`${C.greenLight}25`, border:`1px solid ${C.greenLight}40`, borderRadius:20, padding:"1px 8px", fontSize:10, color:C.greenLight, fontWeight:700 }}>AUTO</span>}
                </div>
                <div style={{ display:"flex", gap:16, color:C.textMuted, fontSize:12 }}>
                  <span style={{ color: statusColor[snap.status] || C.textMuted }}>● {snap.status}</span>
                  <span>{snap.size} GB</span>
                  <span>{snap.created_at ? new Date(snap.created_at).toLocaleString("fr-FR") : "—"}</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => restore(snap)} disabled={restoring === snap.id || snap.status !== "available"} style={{
                  padding:"6px 12px", borderRadius:8, border:`1.5px solid ${C.greenLight}50`,
                  background:`${C.greenLight}20`, color:C.greenLight, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
                }}>
                  {restoring === snap.id ? "..." : "↩ Restaurer"}
                </button>
                <button onClick={() => deleteSnap(snap)} style={{
                  padding:"6px 10px", borderRadius:8, border:`1.5px solid ${C.red}40`,
                  background:`${C.red}15`, color:C.red, cursor:"pointer", fontSize:13,
                }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ session, onLogout }) {
  const [volumes, setVolumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activateModal, setActivateModal] = useState(null);
  const [snapshotsPanel, setSnapshotsPanel] = useState(null);
  const [createVolumeModal, setCreateVolumeModal] = useState(false);
  const [tab, setTab] = useState("volumes");
  const [history, setHistory] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [search, setSearch] = useState("");

  const addToast = (message, type="success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const loadVolumes = useCallback(async () => {
    setLoading(true);
    const res = await api("/volumes", {}, session);
    setVolumes(res.volumes || []);
    setLoading(false);
  }, [session]);

  const loadHistory = useCallback(async () => {
    const res = await api("/history", {}, session);
    setHistory(res.history || []);
  }, [session]);

  useEffect(() => {
    loadVolumes(); loadHistory();
    const interval = setInterval(() => { loadVolumes(); loadHistory(); }, 30000);
    return () => clearInterval(interval);
  }, [loadVolumes, loadHistory]);

  const filtered = volumes.filter(v => v.name.toLowerCase().includes(search.toLowerCase()));
  const autoCount = volumes.filter(v => v.schedule?.enabled).length;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"'DM Sans', sans-serif" }}>
      <style>{styles}</style>
      <Toast toasts={toasts} remove={id => setToasts(p => p.filter(t => t.id !== id))} />

      {/* Header */}
      <div style={{ background:C.card, borderBottom:`1.5px solid ${C.border}`, padding:"0 32px", display:"flex", alignItems:"center", height:64, gap:24, boxShadow:"0 2px 8px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24 }}>📸</span>
          <span style={{ fontFamily:"'Playfair Display', serif", fontWeight:700, fontSize:20, color:C.text }}>CinderAuto</span>
        </div>

        <div style={{ display:"flex", gap:4, marginLeft:8 }}>
          {["volumes","history"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding:"6px 16px", borderRadius:8, border:"none",
              background: tab === t ? `${C.orange}25` : "transparent",
              color: tab === t ? C.orange : C.textMuted,
              fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
              borderBottom: tab === t ? `2px solid ${C.orange}` : "2px solid transparent",
            }}>
              {t === "volumes" ? "📦 Volumes" : "📋 Historique"}
            </button>
          ))}
        </div>

        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{session.username}</div>
            <div style={{ fontSize:11, color:C.textMuted }}>{session.project_name}</div>
          </div>
          <button onClick={onLogout} style={{
            display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
            borderRadius:8, border:`1.5px solid ${C.border}`, background:"transparent",
            color:C.textMuted, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans', sans-serif",
          }}>
            Déconnexion →
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding:"24px 32px 0" }}>
        <div style={{ display:"flex", gap:16, marginBottom:28 }}>
          {[
            { label:"Volumes totaux", value:volumes.length, color:C.orange, icon:"🗄️" },
            { label:"Auto-snapshots actifs", value:autoCount, color:C.greenLight, icon:"⚡" },
            { label:"Snapshots créés", value:history.filter(h => h.status !== "error").length, color:C.yellow, icon:"📸" },
            { label:"Erreurs", value:history.filter(h => h.status === "error").length, color:C.red, icon:"⚠️" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ flex:1, background:C.card, border:`1.5px solid ${C.border}`, borderRadius:16, padding:"18px 20px", borderLeft:`4px solid ${color}` }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:30, fontWeight:800, color, fontFamily:"'Playfair Display', serif" }}>{value}</div>
              <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding:"0 32px 32px" }}>
        {tab === "volumes" && (
          <>
            <button onClick={() => setCreateVolumeModal(true)} style={{
              padding:"10px 20px", borderRadius:8, border:"none",
              background:`linear-gradient(135deg, ${C.green}, ${C.greenLight})`,
              color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
              fontFamily:"'DM Sans', sans-serif", boxShadow:`0 4px 12px ${C.green}40`,
              marginBottom:20,
            }}>
              + Créer un volume
            </button>

            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, color:"#1A0A00" }}>Volumes Cinder</h2>
              <div style={{ display:"flex", gap:10 }}>
                <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
                  style={{ padding:"8px 14px", background:C.card, border:`1.5px solid ${C.border}`, borderRadius:8, color:C.text, fontSize:13, outline:"none", fontFamily:"'DM Sans', sans-serif" }} />
                <button onClick={loadVolumes} style={{
                  padding:"8px 16px", borderRadius:8,
                  border:`1.5px solid ${C.green}60`,
                  background:`${C.green}20`, color:C.greenLight,
                  fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
                }}>↻ Actualiser</button>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign:"center", padding:80, color:C.textMuted }}>
                <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Chargement des volumes...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign:"center", padding:80, color:C.textMuted }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📭</div>Aucun volume trouvé
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:16 }}>
                {filtered.map(v => (
                  <VolumeCard key={v.id} volume={v} onActivate={setActivateModal} onViewSnapshots={setSnapshotsPanel} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === "history" && (
          <>
            <h2 style={{ fontFamily:"'Playfair Display', serif", fontSize:20, color:"#1A0A00", marginBottom:20 }}>Historique des snapshots automatiques</h2>
            <div style={{ background:C.card, border:`1.5px solid ${C.border}`, borderRadius:16, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:`${C.border}30` }}>
                    {["Volume","Snapshot","Statut","Date","Schedule"].map(h => (
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, color:C.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.8px", borderBottom:`1.5px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"12px 16px", fontSize:13, color:C.text, fontWeight:500 }}>{h.volume_name || h.volume_id?.substring(0,12)}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted, fontFamily:"monospace" }}>{h.snapshot_name?.substring(0,28)}...</td>
                      <td style={{ padding:"12px 16px" }}>
                        <span style={{ padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, background: h.status === "available" ? `${C.greenLight}25` : `${C.red}25`, color: h.status === "available" ? C.greenLight : C.red }}>
                          {h.status}
                        </span>
                      </td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted }}>{h.created_at ? new Date(h.created_at).toLocaleString("fr-FR") : "—"}</td>
                      <td style={{ padding:"12px 16px", fontSize:12, color:C.textMuted }}>#{h.schedule_id}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={5} style={{ padding:40, textAlign:"center", color:C.textMuted }}>Aucun historique</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {createVolumeModal && <CreateVolumeModal session={session} onClose={() => setCreateVolumeModal(false)} onCreated={() => { loadVolumes(); setCreateVolumeModal(false); }} toast={addToast} />}
      {activateModal && <ActivationModal volume={activateModal} session={session} onClose={() => setActivateModal(null)} onSaved={loadVolumes} toast={addToast} />}
      {snapshotsPanel && <SnapshotsPanel volume={snapshotsPanel} session={session} onClose={() => setSnapshotsPanel(null)} toast={addToast} />}
    </div>
  );
}

// ─── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("cinder_session")); }
    catch { return null; }
  });
  const [showRegister, setShowRegister] = useState(false);

  const handleLogin = (data) => {
    sessionStorage.setItem("cinder_session", JSON.stringify(data));
    setSession(data);
    setShowRegister(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("cinder_session");
    setSession(null);
  };

  return (
    <>
      {session ? (
        <Dashboard session={session} onLogout={handleLogout} />
      ) : showRegister ? (
        <RegisterPage onBack={() => setShowRegister(false)} />
      ) : (
        <LoginPage onLogin={handleLogin} onRegister={() => setShowRegister(true)} />
      )}
    </>
  );
}
