"use client";
import { useState, useEffect, useRef } from "react";
import {
  Shield, Activity, CheckCircle, XCircle, Lock, Zap,
  ExternalLink, Server, Clock, BarChart2, TrendingUp,
  Cpu, ChevronRight, Eye
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts";
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const publicClient = createPublicClient({ chain: mainnet, transport: http("https://cloudflare-eth.com") });
const VITALIK_KNOWN = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

interface CouncilVote { vote: "suspicious" | "normal"; reason: string; }
interface Council {
  behavior_agent: CouncilVote; risk_agent: CouncilVote; compliance_agent: CouncilVote;
  verdict: string; anomaly_score: number; anomaly: boolean;
}
interface Event {
  id: string; timestamp: number; agent_id: string; action: string;
  amount: number; target: string; status: "approved" | "blocked";
  anomaly: boolean; council: Council | null; hedera_tx_id: string | null;
}

const FAKE_EVENTS: Event[] = [
  { id: "evt_001", timestamp: Date.now() - 4000, agent_id: "agent_01", action: "transfer", amount: 50, target: "0xA3f9b2c1d4e5f678", status: "approved", anomaly: false, council: null, hedera_tx_id: "0.0.1234@1718190000" },
  { id: "evt_002", timestamp: Date.now() - 9000, agent_id: "agent_01", action: "api_call", amount: 12, target: "0xB2c1d4e5f6789012", status: "approved", anomaly: false, council: null, hedera_tx_id: "0.0.1235@1718190010" },
  { id: "evt_003", timestamp: Date.now() - 18000, agent_id: "agent_01", action: "transfer", amount: 9999, target: "0x000HACKER000x9f3a", status: "blocked", anomaly: true, council: { behavior_agent: { vote: "suspicious", reason: "Amount is 66x above normal baseline of $150" }, risk_agent: { vote: "suspicious", reason: "Destination wallet has zero transaction history" }, compliance_agent: { vote: "normal", reason: "No AML regulatory flags detected" }, verdict: "BLOCK", anomaly_score: 0.92, anomaly: true }, hedera_tx_id: "0.0.1236@1718190020" },
  { id: "evt_004", timestamp: Date.now() - 26000, agent_id: "agent_01", action: "withdraw", amount: 75, target: "0xC3d4e5f678901234", status: "approved", anomaly: false, council: null, hedera_tx_id: "0.0.1237@1718190030" },
  { id: "evt_005", timestamp: Date.now() - 35000, agent_id: "agent_01", action: "transfer", amount: 130, target: "0xD4e5f67890123456", status: "approved", anomaly: false, council: null, hedera_tx_id: "0.0.1238@1718190040" },
];

const INITIAL_CHART = [
  { time: "09:00", score: 0.1 }, { time: "09:05", score: 0.15 },
  { time: "09:10", score: 0.08 }, { time: "09:15", score: 0.12 },
  { time: "09:20", score: 0.09 }, { time: "09:25", score: 0.92 },
  { time: "09:30", score: 0.11 }, { time: "09:35", score: 0.07 },
];

const randomDelay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const ATTACK_STAGES = [
  { text: "Intercepting transaction...", min: 300, max: 700 },
  { text: "Running behavioral analysis...", min: 400, max: 900 },
  { text: "AI Council convening...", min: 500, max: 1000 },
  { text: "Dr. Aria Chen voting...", min: 300, max: 700 },
  { text: "Marcus Reid voting...", min: 300, max: 700 },
  { text: "Sarah Okonkwo voting...", min: 300, max: 700 },
  { text: "Council verdict: BLOCK", min: 200, max: 500 },
  { text: "Blocking on Arc testnet...", min: 400, max: 800 },
  { text: "Logging to Hedera blockchain...", min: 300, max: 700 },
];

function timeAgo(ts: number, mounted: boolean) {
  if (!mounted) return "just now";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}
function truncate(str: string, len = 16) { return str.length > len ? str.slice(0, len) + "..." : str; }
function formatTime(ts: number) { return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }

const BG = "#0a0a0f";
const CARD = "#111118";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT = "#f8fafc";
const MUTED = "#64748b";
const ACCENT = "#6366f1";
const BLUE = "#3b82f6";
const GREEN = "#22c55e";
const RED = "#ef4444";

const CSS = `
  * { box-sizing: border-box; }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes reveal    { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes ringExpand { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.8);opacity:0} }
  @keyframes slideInRight { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
  @keyframes slideInRow   { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes btnPulse  { 0%,100%{box-shadow:0 0 0 rgba(239,68,68,0)} 50%{box-shadow:0 0 20px rgba(239,68,68,0.4)} }
  @keyframes pageFlash { 0%{opacity:0} 20%{opacity:1} 100%{opacity:0} }
  @keyframes numHl     { 0%,100%{color:#f8fafc} 40%{color:#3b82f6} }
  .alert-in   { animation: slideDown 0.3s ease; }
  .live-ring  { animation: ringExpand 2s ease-out infinite; }
  .hover-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
  .hover-card:hover { border-color:rgba(99,102,241,0.25)!important; box-shadow:0 0 0 1px rgba(99,102,241,0.08), 0 8px 24px rgba(0,0,0,0.3); transform:translateY(-2px); }
  .hover-row  { transition: background 0.12s; }
  .hover-row:hover { background:rgba(255,255,255,0.018)!important; }
  .btn-atk    { transition: opacity 0.15s; }
  .btn-idle   { animation: btnPulse 3s ease-in-out infinite; }
  .btn-atk:hover:not(:disabled) { animation:none; opacity:0.88; box-shadow:0 0 18px rgba(239,68,68,0.4); }
  .s0 { animation: fadeIn 0.4s ease 0.00s both; }
  .s1 { animation: reveal 0.5s ease 0.10s both; }
  .s2 { animation: reveal 0.5s ease 0.20s both; }
  .s3 { animation: reveal 0.5s ease 0.30s both; }
  .s4 { animation: reveal 0.5s ease 0.40s both; }
  .s5 { animation: reveal 0.5s ease 0.45s both; }
  .s6 { animation: reveal 0.5s ease 0.50s both; }
  .s7 { animation: reveal 0.5s ease 0.55s both; }
  .agent-0       { animation: slideInRight 0.35s ease 0.00s both; }
  .agent-1       { animation: slideInRight 0.35s ease 0.15s both; }
  .agent-2       { animation: slideInRight 0.35s ease 0.30s both; }
  .agent-verdict { animation: slideInRight 0.35s ease 0.45s both; }
  .new-row { animation: slideInRow 0.3s ease both; }
  .num-hl  { animation: numHl 0.6s ease both; }
  ::-webkit-scrollbar { width:4px; background:transparent; }
  ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }
`;

function useCountUp(target: number, duration = 1500): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) { setVal(target); return; }
    ran.current = true;
    const t0 = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - t0) / duration, 1);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div style={{ background: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px" }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: v > 0.7 ? "#f87171" : "#e2e8f0" }}>{(v * 100).toFixed(0)}% suspicious</p>
    </div>
  );
}

function StatCard({ label, countTarget, prefix = "", icon: Icon, color, sub, flash }: {
  label: string; countTarget: number; prefix?: string;
  icon: React.ElementType; color: string; sub?: string; flash?: boolean;
}) {
  const counted = useCountUp(countTarget);
  const display = prefix ? `${prefix}${counted.toLocaleString()}` : counted;
  return (
    <div className="hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}70, transparent)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{label}</span>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={15} color={color} />
        </div>
      </div>
      <div className={flash ? "num-hl" : ""} style={{ fontSize: 30, fontWeight: 700, color: TEXT, letterSpacing: "-0.03em", marginBottom: 5 }}>{display}</div>
      {sub && <div style={{ fontSize: 12, color: MUTED }}>{sub}</div>}
    </div>
  );
}

function AgentVote({ icon, name, vote, reason }: { icon: string; name: string; vote: "suspicious" | "normal"; reason: string }) {
  const sus = vote === "suspicious";
  return (
    <div style={{ borderLeft: `3px solid ${sus ? RED : GREEN}`, background: "rgba(255,255,255,0.02)", borderRadius: "0 8px 8px 0", padding: "10px 13px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{name}</span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: sus ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${sus ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}` }}>
          {sus ? <XCircle size={9} color="#f87171" /> : <CheckCircle size={9} color="#4ade80" />}
          <span style={{ fontSize: 10, fontWeight: 700, color: sus ? "#f87171" : "#4ade80", letterSpacing: "0.04em" }}>{sus ? "SUSPICIOUS" : "NORMAL"}</span>
        </div>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: MUTED, lineHeight: 1.5 }}>{reason}</p>
    </div>
  );
}

export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>(FAKE_EVENTS);
  const [chartData, setChartData] = useState(INITIAL_CHART);
  const [alert, setAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [attacking, setAttacking] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [activeAnomaly, setActiveAnomaly] = useState<Event | null>(FAKE_EVENTS.find(e => e.anomaly) ?? null);
  const [ensAddress, setEnsAddress] = useState("");
  const [ensLoading, setEnsLoading] = useState(true);
  const [attackStage, setAttackStage] = useState("");
  const [attackStep, setAttackStep] = useState(0);
  const [attackLogs, setAttackLogs] = useState<string[]>([]);
  const [councilAnimKey, setCouncilAnimKey] = useState(0);
  const [threatFlash, setThreatFlash] = useState(false);
  const [newestEventId, setNewestEventId] = useState<string | null>(null);
  const [flashMetrics, setFlashMetrics] = useState(false);
  const alertTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = events.length;
  const blocked = events.filter(e => e.anomaly).length;
  const protected$ = events.filter(e => e.anomaly).reduce((s, e) => s + e.amount, 0);
  const threatLevel = activeAnomaly ? "HIGH" : "LOW";

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString());
    const t = setInterval(() => { setCurrentTime(new Date().toLocaleTimeString()); setTick(x => x + 1); }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/events`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setEvents(prev => {
              const local = prev.filter(e => e.anomaly);
              const ids = new Set(data.map((e: Event) => e.id));
              return [...local.filter(e => !ids.has(e.id)), ...data];
            });
            const latest = data[0];
            setChartData(prev => [...prev, { time: formatTime(latest.timestamp), score: latest.anomaly ? (latest.council?.anomaly_score ?? 0.9) : Math.random() * 0.15 + 0.05 }].slice(-12));
          }
        }
      } catch { /* offline */ }
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    publicClient.getEnsAddress({ name: "vitalik.eth" })
      .then(a => { setEnsAddress(a ?? VITALIK_KNOWN); setEnsLoading(false); })
      .catch(() => { setEnsAddress(VITALIK_KNOWN); setEnsLoading(false); });
  }, []);

  async function simulateAttack() {
    setAttacking(true); setAttackStep(0); setAttackStage(""); setAttackLogs([]);
    const fakeAttack: Event = {
      id: `evt_${Date.now()}`, timestamp: Date.now(), agent_id: "agent_01", action: "transfer",
      amount: 9999, target: "0x000HACKER9f3a000", status: "blocked", anomaly: true,
      council: {
        behavior_agent: { vote: "suspicious", reason: "Transfer amount is 66x above the agent's normal baseline of $150" },
        risk_agent: { vote: "suspicious", reason: "Destination wallet flagged — zero prior transaction history" },
        compliance_agent: { vote: "normal", reason: "No AML or regulatory flags found in compliance database" },
        verdict: "BLOCK", anomaly_score: 0.95, anomaly: true,
      },
      hedera_tx_id: null,
    };
    const raw = ATTACK_STAGES.map(s => Math.floor(Math.random() * (s.max - s.min + 1)) + s.min);
    const total_raw = raw.reduce((a, b) => a + b, 0);
    const scale = total_raw > 7500 ? 7500 / total_raw : 1;
    const delays = raw.map(d => Math.max(100, Math.floor(d * scale)));
    const ctrl = new AbortController();
    const ft = setTimeout(() => ctrl.abort(), 7800);
    const fp = fetch(`${API_URL}/attack`, { method: "POST", signal: ctrl.signal })
      .then(async r => { if (r.ok) { const d = await r.json(); return { ...fakeAttack, ...d, anomaly: true } as Event; } return fakeAttack; })
      .catch(() => fakeAttack);
    for (let i = 0; i < ATTACK_STAGES.length; i++) {
      setAttackStage(ATTACK_STAGES[i].text);
      setAttackStep(i + 1);
      setAttackLogs(prev => [...prev, ATTACK_STAGES[i].text]);
      await randomDelay(delays[i]);
    }
    clearTimeout(ft);
    const ev = await fp;
    setEvents(prev => [ev, ...prev]);
    setActiveAnomaly(ev);
    setCouncilAnimKey(k => k + 1);
    setNewestEventId(ev.id);
    setThreatFlash(true);
    setFlashMetrics(true);
    setAlertMsg(`$${ev.amount.toLocaleString()} USDC intercepted → ${truncate(ev.target, 22)}`);
    setChartData(prev => [...prev.slice(-11), { time: formatTime(Date.now()), score: 0.95 }]);
    if (alertTimeout.current) clearTimeout(alertTimeout.current);
    setAlert(true);
    alertTimeout.current = setTimeout(() => setAlert(false), 6000);
    setTimeout(() => setNewestEventId(null), 400);
    setTimeout(() => setThreatFlash(false), 1600);
    setTimeout(() => setFlashMetrics(false), 700);
    setTimeout(() => setAttackLogs([]), 6000);
    setAttackStage(""); setAttackStep(0); setAttacking(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "system-ui, -apple-system, 'Inter', BlinkMacSystemFont, sans-serif" }}>
      <style>{CSS}</style>

      {/* Page border flash on threat */}
      {threatFlash && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", border: "2px solid rgba(239,68,68,0.85)", animation: "pageFlash 1.5s ease forwards" }} />
      )}

      {/* Alert banner */}
      {alert && (
        <div className="alert-in" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(127,29,29,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(239,68,68,0.3)", padding: "10px 28px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED, boxShadow: `0 0 8px ${RED}`, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5" }}>Threat Intercepted</span>
          <span style={{ fontSize: 13, color: "#fca5a5", opacity: 0.85 }}>{alertMsg}</span>
          <button onClick={() => setAlert(false)} style={{ marginLeft: "auto", background: "none", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 6, color: "#fca5a5", cursor: "pointer", fontSize: 12, padding: "3px 10px", fontFamily: "inherit" }}>Dismiss</button>
        </div>
      )}

      {/* Attack stage log panel */}
      {attackLogs.length > 0 && (
        <div style={{ position: "fixed", top: 68, right: 28, zIndex: 90, background: "rgba(13,13,20,0.97)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 16px", minWidth: 268, backdropFilter: "blur(16px)" }}>
          <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>Attack Simulation</div>
          {attackLogs.map((line, i) => (
            <div key={i} style={{ fontSize: 12, color: i === attackLogs.length - 1 ? "#e2e8f0" : "#475569", display: "flex", alignItems: "center", gap: 7, marginBottom: i < attackLogs.length - 1 ? 6 : 0, animation: "slideInRow 0.25s ease both" }}>
              <span style={{ fontSize: 7, color: i === attackLogs.length - 1 ? RED : GREEN }}>●</span>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Attack progress bar */}
      {attacking && (
        <div style={{ position: "sticky", top: 60, zIndex: 30, background: "rgba(10,10,15,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(239,68,68,0.12)", padding: "9px 28px" }}>
          <div style={{ maxWidth: 1440, margin: "0 auto", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: RED, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 500, flexShrink: 0 }}>{attackStage}</span>
            <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 1 }}>
              <div style={{ height: "100%", borderRadius: 1, background: `linear-gradient(90deg, ${RED}, #f87171)`, width: `${(attackStep / ATTACK_STAGES.length) * 100}%`, transition: "width 0.3s ease" }} />
            </div>
            <span style={{ fontSize: 11, color: MUTED, flexShrink: 0 }}>{attackStep}/{ATTACK_STAGES.length}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="s0" style={{ position: "sticky", top: 0, zIndex: 40, height: 60, background: "rgba(10,10,15,0.9)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", padding: "0 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(99,102,241,0.35)" }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, letterSpacing: "-0.01em" }}>SentinelAI</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: -1 }}>Security Operations</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {[{ label: "Arc Testnet", color: BLUE }, { label: "Hedera HCS", color: "#06b6d4" }].map(p => (
            <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: p.color + "12", border: `1px solid ${p.color}28` }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: p.color }} />
              <span style={{ fontSize: 11, color: p.color, fontWeight: 500 }}>{p.label}</span>
            </div>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
            <Clock size={11} color={MUTED} />
            <span style={{ fontSize: 11, color: MUTED }}>{currentTime}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 11px", borderRadius: 20, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <div style={{ position: "relative", width: 7, height: 7 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: GREEN }} />
              <div className="live-ring" style={{ position: "absolute", top: "-3px", left: "-3px", width: 13, height: 13, borderRadius: "50%", border: "1px solid rgba(34,197,94,0.5)" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#4ade80" }}>Live</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: threatLevel === "HIGH" ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)", border: `1px solid ${threatLevel === "HIGH" ? "rgba(239,68,68,0.25)" : BORDER}` }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: threatLevel === "HIGH" ? RED : MUTED }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: threatLevel === "HIGH" ? "#f87171" : MUTED }}>Threat: {threatLevel}</span>
          </div>

          <button
            onClick={simulateAttack}
            disabled={attacking}
            className={`btn-atk${!attacking ? " btn-idle" : ""}`}
            style={{ display: "flex", alignItems: "center", gap: 6, background: RED, border: "none", borderRadius: 8, padding: "7px 16px", color: "white", fontSize: 12, fontWeight: 600, cursor: attacking ? "not-allowed" : "pointer", opacity: attacking ? 0.55 : 1, fontFamily: "inherit" }}
          >
            <Zap size={13} />
            {attacking ? "Simulating..." : "Simulate Attack"}
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 28px" }}>

        {/* Metric cards */}
        <div className="s1" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Transactions"    countTarget={total}      icon={Activity}   color={ACCENT}    sub="Monitored"                             flash={flashMetrics} />
          <StatCard label="Threats Blocked" countTarget={blocked}    icon={XCircle}    color={RED}       sub={blocked > 0 ? "Neutralized" : "All clear"} flash={flashMetrics} />
          <StatCard label="Value Protected" countTarget={protected$} prefix="$"        icon={TrendingUp} color={GREEN}     sub="USDC on Arc testnet" flash={flashMetrics} />
          <StatCard label="AI Decisions"    countTarget={total}      icon={Cpu}        color="#8b5cf6"   sub="Council votes cast"                    flash={flashMetrics} />
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 16, marginBottom: 16 }}>

          {/* LEFT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Chart */}
            <div className="s2 hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={14} color={BLUE} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Threat Timeline</span>
                </div>
                <span style={{ fontSize: 11, color: MUTED }}>Real-time suspicion index</span>
              </div>
              <div style={{ padding: "12px 4px 8px" }}>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BLUE} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={BLUE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} width={38} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={0.7} stroke={RED} strokeDasharray="5 3" strokeWidth={1} label={{ value: "Alert Threshold", position: "insideTopRight", fill: RED, fontSize: 10 }} />
                    <Area type="linear" dataKey="score" stroke={BLUE} strokeWidth={2} fill="url(#blueGrad)" dot={(props) => {
                      const cx = props.cx ?? 0; const cy = props.cy ?? 0;
                      const score = (props.payload as { score: number }).score;
                      if (score > 0.7) return <circle key={`d-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill={RED} stroke={CARD} strokeWidth={2} />;
                      return <circle key={`d-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill={BLUE} stroke={CARD} strokeWidth={1} />;
                    }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Transaction Feed */}
            <div className="s3 hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={14} color={BLUE} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Live Transaction Feed</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN }} />
                  <span style={{ fontSize: 11, color: MUTED }}>{total} events · {blocked} blocked</span>
                </div>
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {events.map((e, i) => (
                  <div key={e.id} className={`hover-row${e.id === newestEventId ? " new-row" : ""}`} style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", gap: 12, background: "transparent" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: e.anomaly ? RED : GREEN, boxShadow: `0 0 6px ${e.anomaly ? RED : GREEN}50`, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>${e.amount.toLocaleString()} USDC</span>
                        <span style={{ fontSize: 11, color: MUTED, textTransform: "capitalize" }}>{e.action}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "#475569" }}>
                        agent01.sentinel.eth
                        <span style={{ margin: "0 5px", color: "#334155" }}>→</span>
                        <span style={{ fontFamily: "monospace", fontSize: 10 }}>{truncate(e.target, 24)}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "#334155" }}>{timeAgo(e.timestamp, mounted)}</span>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, background: e.anomaly ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${e.anomaly ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}` }}>
                        {e.anomaly ? <XCircle size={9} color="#f87171" /> : <CheckCircle size={9} color="#4ade80" />}
                        <span style={{ fontSize: 10, fontWeight: 600, color: e.anomaly ? "#f87171" : "#4ade80" }}>{e.anomaly ? "Blocked" : "Approved"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* AI Council */}
            <div className="s4 hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={14} color="#8b5cf6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>AI Security Council</span>
              </div>
              <div style={{ padding: 14 }}>
                {activeAnomaly?.council ? (() => {
                  const council = activeAnomaly.council!;
                  return (
                    <div key={councilAnimKey}>
                      <div className="agent-0"><AgentVote icon="🔍" name="Dr. Aria Chen"    vote={council.behavior_agent.vote}   reason={council.behavior_agent.reason} /></div>
                      <div className="agent-1"><AgentVote icon="⚠️"  name="Marcus Reid"     vote={council.risk_agent.vote}       reason={council.risk_agent.reason} /></div>
                      <div className="agent-2"><AgentVote icon="📋" name="Sarah Okonkwo"    vote={council.compliance_agent.vote} reason={council.compliance_agent.reason} /></div>
                      <div className="agent-verdict">
                        <div style={{ marginTop: 10, padding: "14px", borderRadius: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center" }}>
                          <div style={{ fontSize: 10, color: RED, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>Council Verdict</div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginBottom: 6 }}>
                            <Lock size={13} color="#f87171" />
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#fca5a5" }}>Transaction Blocked</span>
                          </div>
                          <div style={{ fontSize: 12, color: "#f87171", fontWeight: 600 }}>{(council.anomaly_score * 100).toFixed(0)}% Suspicion Score</div>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 10 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Shield size={20} color={GREEN} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 3 }}>All Clear</div>
                      <div style={{ fontSize: 12, color: MUTED }}>Council standing by · No threats</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agent Identity */}
            <div className="s5 hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #4ade80, #22d3ee)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>⬡</div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>agent01.sentinel.eth</span>
                    <div style={{ padding: "1px 6px", borderRadius: 4, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", fontSize: 9, fontWeight: 700, color: "#4ade80", letterSpacing: "0.04em" }}>ENS</div>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED }}>
                    vitalik.eth → {ensLoading ? "Resolving..." : `${ensAddress.slice(0, 6)}...${ensAddress.slice(-4)}`}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {[{ label: "ENS Name", value: "agent01.sentinel.eth" }, { label: "Network", value: "Ethereum" }, { label: "Standard", value: "EIP-137" }].map(item => (
                  <div key={item.label} style={{ background: "rgba(255,255,255,0.025)", borderRadius: 8, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Hedera Audit Trail */}
        <div className="s6 hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Server size={14} color={MUTED} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Hedera Audit Trail</span>
            <span style={{ fontSize: 11, color: MUTED }}>· Immutable on-chain record</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {["Event ID", "Action", "Amount", "Target", "Status", "Hedera Consensus"].map(h => (
                    <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, color: MUTED, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={e.id} className={`hover-row${e.id === newestEventId ? " new-row" : ""}`} style={{ borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", background: e.anomaly ? "rgba(239,68,68,0.02)" : "transparent" }}>
                    <td style={{ padding: "12px 20px", fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{e.id}</td>
                    <td style={{ padding: "12px 20px", fontSize: 12, color: "#94a3b8", textTransform: "capitalize" }}>{e.action}</td>
                    <td style={{ padding: "12px 20px", fontSize: 13, fontWeight: 600, color: e.anomaly ? "#f87171" : "#fbbf24" }}>${e.amount.toLocaleString()}</td>
                    <td style={{ padding: "12px 20px", fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{truncate(e.target, 20)}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, background: e.anomaly ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${e.anomaly ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}` }}>
                        {e.anomaly ? <XCircle size={10} color="#f87171" /> : <CheckCircle size={10} color="#4ade80" />}
                        <span style={{ fontSize: 11, fontWeight: 600, color: e.anomaly ? "#f87171" : "#4ade80" }}>{e.anomaly ? "Blocked" : "Approved"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      {e.hedera_tx_id ? (
                        <a href="https://hashscan.io/testnet/topic/0.0.9228035" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: ACCENT, textDecoration: "none", fontWeight: 500 }}>
                          View on Hashscan <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: "#334155" }}>Logging to HCS...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Architecture */}
        <div className="s7 hover-card" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "18px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
            <Server size={13} color={MUTED} />
            <span style={{ fontSize: 11, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em" }}>How SentinelAI Works</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {[
              { icon: "💰", label: "Arc Testnet",  sub: "USDC Payments",  color: BLUE },
              { icon: "🤖", label: "AI Agent",     sub: "Transactions",   color: "#8b5cf6" },
              { icon: "🛡️", label: "SentinelAI",  sub: "Monitoring",     color: ACCENT },
              { icon: "⚖️", label: "AI Council",  sub: "3-Agent Voting", color: "#f59e0b" },
              { icon: "🔗", label: "Hedera HCS",  sub: "Audit Log",      color: GREEN },
            ].map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ flex: 1, background: step.color + "0e", border: `1px solid ${step.color}22`, borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{step.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{step.sub}</div>
                </div>
                {i < 4 && <div style={{ padding: "0 6px" }}><ChevronRight size={14} color="#334155" /></div>}
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
