"use client";
import { useState, useEffect, useRef } from "react";
import {
  Shield, Activity, AlertTriangle, CheckCircle,
  XCircle, TrendingUp, Lock, Zap, ExternalLink,
  Radio, Eye, Server, ChevronRight, Clock,
  BarChart2, Cpu
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

// ── Types ──────────────────────────────────────────────
interface CouncilVote {
  vote: "suspicious" | "normal";
  reason: string;
}
interface Council {
  behavior_agent: CouncilVote;
  risk_agent: CouncilVote;
  compliance_agent: CouncilVote;
  verdict: string;
  anomaly_score: number;
  anomaly: boolean;
}
interface Event {
  id: string;
  timestamp: number;
  agent_id: string;
  action: string;
  amount: number;
  target: string;
  status: "approved" | "blocked";
  anomaly: boolean;
  council: Council | null;
  hedera_tx_id: string | null;
}

// ── Fake Data ───────────────────────────────────────────
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

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function truncate(str: string, len = 16) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Custom Tooltip ──────────────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (active && payload && payload.length) {
    const score = payload[0].value;
    return (
      <div style={{ background: "#0f0f18", border: "1px solid #1e1e2e", borderRadius: 8, padding: "8px 12px" }}>
        <p style={{ fontSize: 12, color: score > 0.7 ? "#f87171" : "#4ade80", fontWeight: 700 }}>
          {(score * 100).toFixed(0)}% suspicious
        </p>
      </div>
    );
  }
  return null;
}

// ── Stat Card ───────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub, glow }: {
  label: string; value: string | number;
  icon: React.ElementType; color: string; sub?: string; glow?: string;
}) {
  return (
    <div className={`glass ${glow || ""}`} style={{ borderRadius: 16, padding: "20px 22px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}40, transparent)` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: color + "15", border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#475569" }}>{sub}</div>}
      <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: color + "08" }} />
    </div>
  );
}

// ── Agent Vote Card ─────────────────────────────────────
function AgentVote({ icon, name, vote, reason }: { icon: string; name: string; vote: "suspicious" | "normal"; reason: string; }) {
  const sus = vote === "suspicious";
  return (
    <div style={{ background: sus ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${sus ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, borderRadius: 12, padding: "14px 16px", transition: "all 0.2s" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: sus ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, background: sus ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)" }}>
          {sus ? <XCircle size={10} color="#f87171" /> : <CheckCircle size={10} color="#4ade80" />}
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", color: sus ? "#f87171" : "#4ade80" }}>{sus ? "SUSPICIOUS" : "NORMAL"}</span>
        </div>
      </div>
      <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{reason}</p>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────
export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>(FAKE_EVENTS);
  const [chartData, setChartData] = useState(INITIAL_CHART);
  const [alert, setAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [attacking, setAttacking] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [activeTab, setActiveTab] = useState<"feed" | "audit">("feed");
  const [, setTick] = useState(0);
  const alertTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
      setTick(x => x + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/events");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            setEvents(data);
            const latest = data[0];
            setChartData(prev => {
              const next = [...prev, { time: formatTime(latest.timestamp), score: latest.anomaly ? (latest.council?.anomaly_score ?? 0.9) : Math.random() * 0.15 + 0.05 }];
              return next.slice(-12);
            });
          }
        }
      } catch { /* Backend not ready yet */ }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const total = events.length;
  const blocked = events.filter(e => e.anomaly).length;
  const protected$ = events.filter(e => e.anomaly).reduce((s, e) => s + e.amount, 0);
  const latestAnomaly = events.find(e => e.anomaly);
  const threatLevel = latestAnomaly ? "HIGH" : "LOW";

  async function simulateAttack() {
    setAttacking(true);
    const fakeAttack: Event = {
      id: `evt_${Date.now()}`,
      timestamp: Date.now(),
      agent_id: "agent_01",
      action: "transfer",
      amount: 9999,
      target: "0x000HACKER9f3a000",
      status: "blocked",
      anomaly: true,
      council: {
        behavior_agent: { vote: "suspicious", reason: "Transfer amount is 66x above the agent's normal baseline of $150" },
        risk_agent: { vote: "suspicious", reason: "Destination wallet flagged — zero prior transaction history detected" },
        compliance_agent: { vote: "normal", reason: "No AML or regulatory flags found in compliance database" },
        verdict: "BLOCK",
        anomaly_score: 0.95,
        anomaly: true,
      },
      hedera_tx_id: null,
    };

    try {
      const res = await fetch("http://localhost:8000/attack", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setEvents(prev => [data, ...prev]);
        setAlertMsg(`$${data.amount.toLocaleString()} USDC intercepted → ${truncate(data.target, 22)}`);
      } else {
        setEvents(prev => [fakeAttack, ...prev]);
        setAlertMsg("$9,999 USDC intercepted → 0x000HACKER9f3a000");
      }
    } catch {
      setEvents(prev => [fakeAttack, ...prev]);
      setAlertMsg("$9,999 USDC intercepted → 0x000HACKER9f3a000");
    }

    setChartData(prev => [...prev.slice(-11), { time: formatTime(Date.now()), score: 0.95 }]);
    if (alertTimeout.current) clearTimeout(alertTimeout.current);
    setAlert(true);
    alertTimeout.current = setTimeout(() => setAlert(false), 6000);
    setAttacking(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#060608", display: "flex", flexDirection: "column" }}>

      {/* Threat Alert Banner */}
      {alert && (
        <div className="animate-slide-down" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "linear-gradient(90deg, #450a0a, #7f1d1d, #450a0a)", borderBottom: "1px solid rgba(239,68,68,0.4)", padding: "12px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fca5a5", letterSpacing: "0.05em" }}>THREAT NEUTRALIZED</span>
            <span style={{ width: 1, height: 14, background: "rgba(239,68,68,0.3)" }} />
            <span style={{ fontSize: 13, color: "#fecaca" }}>{alertMsg}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={12} color="#f87171" />
            <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>COUNCIL VOTED 2/3 · BLOCKED ON ARC TESTNET</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(6,6,8,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}>
              <Shield size={17} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>SentinelAI</div>
              <div style={{ fontSize: 10, color: "#334155", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: -2 }}>Security Operations</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Server size={11} color="#475569" />
            <span style={{ fontSize: 11, color: "#475569" }}>Arc Testnet</span>
            <ChevronRight size={11} color="#334155" />
            <span style={{ fontSize: 11, color: "#475569" }}>Hedera HCS</span>
            <ChevronRight size={11} color="#334155" />
            <span style={{ fontSize: 11, color: "#475569" }}>Chainlink AI</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Clock size={12} color="#475569" />
            <span style={{ fontSize: 12, color: "#475569", fontFamily: "monospace" }}>{currentTime}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: threatLevel === "HIGH" ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)", border: `1px solid ${threatLevel === "HIGH" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}` }}>
            <div style={{ position: "relative", width: 8, height: 8 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: threatLevel === "HIGH" ? "#ef4444" : "#10b981" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: threatLevel === "HIGH" ? "#ef4444" : "#10b981", animation: "pulse-ring 1.5s ease infinite" }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: threatLevel === "HIGH" ? "#f87171" : "#4ade80" }}>
              THREAT: {threatLevel}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Radio size={11} color="#4ade80" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", letterSpacing: "0.06em" }}>LIVE</span>
          </div>

          <button onClick={simulateAttack} disabled={attacking} style={{ display: "flex", alignItems: "center", gap: 7, background: attacking ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg, #dc2626, #991b1b)", border: attacking ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "8px 16px", color: attacking ? "#475569" : "white", fontSize: 12, fontWeight: 700, cursor: attacking ? "not-allowed" : "pointer", letterSpacing: "0.03em", transition: "all 0.2s", boxShadow: attacking ? "none" : "0 0 20px rgba(220,38,38,0.3)" }}>
            <Zap size={13} />
            {attacking ? "SIMULATING..." : "SIMULATE ATTACK"}
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: "24px 28px", maxWidth: 1600, width: "100%", margin: "0 auto" }}>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
          <StatCard label="Transactions Monitored" value={total} icon={Activity} color="#3b82f6" sub="Last 30 minutes" glow="glow-blue" />
          <StatCard label="Threats Blocked" value={blocked} icon={XCircle} color="#ef4444" sub={blocked > 0 ? "Attacks neutralized" : "All clear"} glow={blocked > 0 ? "glow-red" : ""} />
          <StatCard label="Value Protected" value={"$" + protected$.toLocaleString()} icon={TrendingUp} color="#10b981" sub="USDC on Arc testnet" glow="glow-green" />
          <StatCard label="AI Decisions" value={total} icon={Cpu} color="#8b5cf6" sub="Council votes cast" />
        </div>

        {/* Chart + Council Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14, marginBottom: 14 }}>

          {/* Threat Score Chart */}
          <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart2 size={15} color="#3b82f6" />
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Threat Score Timeline</span>
              </div>
              <span style={{ fontSize: 11, color: "#334155" }}>Real-time suspicion index</span>
            </div>
            <div style={{ padding: "16px 8px 8px" }}>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData} margin={{ top: 0, right: 16, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="dangerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} fill="url(#scoreGrad)" dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (payload.score > 0.7) {
                      return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#1a0505" strokeWidth={2} />;
                    }
                    return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#3b82f6" stroke="#060608" strokeWidth={1} />;
                  }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Council */}
          <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
              <Eye size={15} color="#8b5cf6" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>AI Security Council</span>
            </div>
            <div style={{ padding: 16 }}>
              {latestAnomaly?.council ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <AgentVote icon="🔍" name="Behavior Agent" vote={latestAnomaly.council.behavior_agent.vote} reason={latestAnomaly.council.behavior_agent.reason} />
                  <AgentVote icon="⚠️" name="Risk Agent" vote={latestAnomaly.council.risk_agent.vote} reason={latestAnomaly.council.risk_agent.reason} />
                  <AgentVote icon="📋" name="Compliance Agent" vote={latestAnomaly.council.compliance_agent.vote} reason={latestAnomaly.council.compliance_agent.reason} />
                  <div style={{ marginTop: 4, padding: "14px 16px", borderRadius: 12, background: "linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.05))", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 6 }}>COUNCIL VERDICT</div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                      <Lock size={14} color="#f87171" />
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#fca5a5", letterSpacing: "-0.01em" }}>Transaction Blocked</span>
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,0.1)", borderRadius: 20, padding: "4px 12px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                      <span style={{ fontSize: 11, color: "#f87171", fontWeight: 600 }}>
                        {((latestAnomaly.council.anomaly_score) * 100).toFixed(0)}% Suspicion Score
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 240, gap: 12 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Shield size={22} color="#10b981" />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 13, color: "#4ade80", fontWeight: 600, marginBottom: 4 }}>All Systems Normal</div>
                    <div style={{ fontSize: 11, color: "#334155" }}>Council standing by · No threats detected</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Panel */}
        <div className="glass" style={{ borderRadius: 16, overflow: "hidden" }}>
          {/* Tabs */}
          <div style={{ padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 0 }}>
            {[
              { id: "feed", label: "Live Transaction Feed", icon: Activity },
              { id: "audit", label: "Hedera Audit Trail", icon: ExternalLink },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as "feed" | "audit")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "14px 18px", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#3b82f6" : "transparent"}`, color: activeTab === tab.id ? "#e2e8f0" : "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", marginBottom: -1 }}>
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "5px 0" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
              <span style={{ fontSize: 11, color: "#475569" }}>{total} events · {blocked} blocked</span>
            </div>
          </div>

          {/* Feed Tab */}
          {activeTab === "feed" && (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              {events.map((e, i) => (
                <div key={e.id} className="animate-fade-in" style={{ display: "flex", alignItems: "center", padding: "12px 20px", borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none", background: e.anomaly ? "rgba(239,68,68,0.04)" : "transparent", transition: "background 0.2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, width: 120 }}>
                    <div style={{ position: "relative", width: 8, height: 8, flexShrink: 0 }}>
                      <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: e.anomaly ? "#ef4444" : "#10b981" }} />
                    </div>
                    <span style={{ fontSize: 11, color: "#334155", fontFamily: "monospace" }}>{e.agent_id}</span>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 16 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", textTransform: "capitalize", width: 70 }}>{e.action}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: e.anomaly ? "#f87171" : "#fbbf24", width: 100 }}>${e.amount.toLocaleString()} USDC</span>
                    <span style={{ fontSize: 11, color: "#334155", fontFamily: "monospace", flex: 1 }}>→ {truncate(e.target, 24)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "#1e293b", fontFamily: "monospace" }}>{timeAgo(e.timestamp)}</span>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: e.anomaly ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${e.anomaly ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}` }}>
                      {e.anomaly ? <XCircle size={11} color="#f87171" /> : <CheckCircle size={11} color="#4ade80" />}
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: e.anomaly ? "#f87171" : "#4ade80" }}>{e.anomaly ? "BLOCKED" : "APPROVED"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === "audit" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {["Event ID", "Action", "Amount", "Target", "Status", "Hedera Consensus"].map(h => (
                      <th key={h} style={{ padding: "10px 20px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={e.id} style={{ borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.02)" : "none", background: e.anomaly ? "rgba(239,68,68,0.03)" : "transparent" }}>
                      <td style={{ padding: "13px 20px", fontFamily: "monospace", fontSize: 11, color: "#334155" }}>{e.id}</td>
                      <td style={{ padding: "13px 20px", fontSize: 12, color: "#64748b", textTransform: "capitalize" }}>{e.action}</td>
                      <td style={{ padding: "13px 20px", fontSize: 12, fontWeight: 700, color: e.anomaly ? "#f87171" : "#fbbf24" }}>${e.amount.toLocaleString()}</td>
                      <td style={{ padding: "13px 20px", fontFamily: "monospace", fontSize: 11, color: "#475569" }}>{truncate(e.target, 20)}</td>
                      <td style={{ padding: "13px 20px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6, background: e.anomaly ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", border: `1px solid ${e.anomaly ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}` }}>
                          {e.anomaly ? <XCircle size={10} color="#f87171" /> : <CheckCircle size={10} color="#4ade80" />}
                          <span style={{ fontSize: 10, fontWeight: 700, color: e.anomaly ? "#f87171" : "#4ade80" }}>{e.anomaly ? "BLOCKED" : "APPROVED"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        {e.hedera_tx_id ? (
                          <a href={"https://hashscan.io/testnet/topic/0.0.5715785"} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#06b6d4", textDecoration: "none", fontWeight: 600 }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(6,182,212,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 8, fontWeight: 800, color: "#06b6d4" }}>H</span>
                            </div>
                            View on Hashscan
                            <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span style={{ fontSize: 11, color: "#1e293b" }}>Logging to HCS...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Architecture */}
        <div className="glass" style={{ borderRadius: 16, marginTop: 14, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Server size={14} color="#475569" />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#334155", letterSpacing: "0.08em", textTransform: "uppercase" }}>How SentinelAI Works</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {[
              { icon: "💰", label: "Arc Testnet", sub: "USDC payments", color: "#3b82f6" },
              { icon: "🤖", label: "AI Agent", sub: "Autonomous transactions", color: "#8b5cf6" },
              { icon: "🛡️", label: "SentinelAI", sub: "Real-time monitoring", color: "#06b6d4" },
              { icon: "⚖️", label: "AI Council", sub: "3-agent voting", color: "#f59e0b" },
              { icon: "🔗", label: "Hedera HCS", sub: "Immutable audit log", color: "#10b981" },
            ].map((step, i) => (
              <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: step.color + "10", border: `1px solid ${step.color}25`, textAlign: "center" }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{step.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>{step.label}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{step.sub}</div>
                </div>
                {i < 4 && (
                  <div style={{ display: "flex", alignItems: "center", padding: "0 6px" }}>
                    <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.08)" }} />
                    <ChevronRight size={12} color="#334155" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}