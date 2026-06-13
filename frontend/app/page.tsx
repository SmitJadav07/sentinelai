"use client";
import { useState, useEffect } from "react";
import {
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Lock,
  Zap,
  ExternalLink,
  Radio,
} from "lucide-react";

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
  suspicion_score: number;
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

// ── Fake data ───────────────────────────────────────────
const FAKE_EVENTS: Event[] = [
  {
    id: "evt_001",
    timestamp: Date.now() - 8000,
    agent_id: "agent_01",
    action: "transfer",
    amount: 50,
    target: "0xA3f9b2c1d4e5f678",
    status: "approved",
    anomaly: false,
    council: null,
    hedera_tx_id: "0.0.1234@1718190000",
  },
  {
    id: "evt_002",
    timestamp: Date.now() - 16000,
    agent_id: "agent_01",
    action: "api_call",
    amount: 12,
    target: "0xB2c1d4e5f6789012",
    status: "approved",
    anomaly: false,
    council: null,
    hedera_tx_id: "0.0.1235@1718190010",
  },
  {
    id: "evt_003",
    timestamp: Date.now() - 24000,
    agent_id: "agent_01",
    action: "transfer",
    amount: 9999,
    target: "0x000HACKER000",
    status: "blocked",
    anomaly: true,
    council: {
      behavior_agent: {
        vote: "suspicious",
        reason: "Amount is 50x above normal baseline of $150",
      },
      risk_agent: {
        vote: "suspicious",
        reason: "Target wallet flagged — never transacted before",
      },
      compliance_agent: {
        vote: "normal",
        reason: "No regulatory flags detected",
      },
      verdict: "BLOCK",
      suspicion_score: 0.92,
    },
    hedera_tx_id: "0.0.1236@1718190020",
  },
  {
    id: "evt_004",
    timestamp: Date.now() - 32000,
    agent_id: "agent_01",
    action: "withdraw",
    amount: 75,
    target: "0xC3d4e5f678901234",
    status: "approved",
    anomaly: false,
    council: null,
    hedera_tx_id: "0.0.1237@1718190030",
  },
];

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

function truncate(str: string, len = 18) {
  return str.length > len ? str.slice(0, len) + "..." : str;
}

// ── Components ──────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: string;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: "#111118",
        border: "1px solid #1e1e2e",
        borderRadius: 16,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: accent + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={16} color={accent} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

function AgentCard({
  icon,
  name,
  vote,
  reason,
}: {
  icon: string;
  name: string;
  vote: "suspicious" | "normal";
  reason: string;
}) {
  const suspicious = vote === "suspicious";
  return (
    <div
      style={{
        background: suspicious ? "#1a0f0f" : "#0f1a0f",
        border: `1px solid ${suspicious ? "#3d1515" : "#153d15"}`,
        borderRadius: 12,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{name}</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: suspicious ? "#3d1515" : "#153d15",
            borderRadius: 6,
            padding: "3px 10px",
          }}
        >
          {suspicious ? (
            <XCircle size={12} color="#f87171" />
          ) : (
            <CheckCircle size={12} color="#4ade80" />
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: suspicious ? "#f87171" : "#4ade80",
              letterSpacing: "0.05em",
            }}
          >
            {suspicious ? "SUSPICIOUS" : "NORMAL"}
          </span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{reason}</p>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────
export default function Dashboard() {
  const [events, setEvents] = useState<Event[]>(FAKE_EVENTS);
  const [alert, setAlert] = useState(false);
  const [alertMsg, setAlertMsg] = useState("");
  const [attacking, setAttacking] = useState(false);
  const [, setTick] = useState(0);

  // Update timestamps every second
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll backend
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:8000/events");
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setEvents(data);
        }
      } catch {
        // Backend not running — keep fake data
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const total = events.length;
  const blocked = events.filter((e) => e.anomaly).length;
  const protected$ = events.filter((e) => e.anomaly).reduce((s, e) => s + e.amount, 0);
  const latestAnomaly = events.find((e) => e.anomaly);

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
        behavior_agent: { vote: "suspicious", reason: "Amount 66x above normal baseline of $150" },
        risk_agent: { vote: "suspicious", reason: "Destination flagged — zero transaction history" },
        compliance_agent: { vote: "normal", reason: "No AML regulatory flags detected" },
        verdict: "BLOCK",
        suspicion_score: 0.95,
      },
      hedera_tx_id: null,
    };

    try {
      const res = await fetch("http://localhost:8000/trigger-anomaly", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setEvents((prev) => [data, ...prev]);
        setAlertMsg(`$${data.amount} USDC transfer to ${truncate(data.target)} intercepted`);
      } else {
        setEvents((prev) => [fakeAttack, ...prev]);
        setAlertMsg("$9,999 USDC transfer to 0x000HACKER9f3a000 intercepted");
      }
    } catch {
      setEvents((prev) => [fakeAttack, ...prev]);
      setAlertMsg("$9,999 USDC transfer to 0x000HACKER9f3a000 intercepted");
    }

    setAlert(true);
    setTimeout(() => setAlert(false), 6000);
    setAttacking(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f" }}>

      {/* Alert */}
      {alert && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "linear-gradient(90deg, #7f1d1d, #991b1b)",
            borderBottom: "1px solid #dc2626",
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AlertTriangle size={18} color="#fca5a5" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fca5a5" }}>
              Threat Neutralized
            </span>
            <span style={{ fontSize: 14, color: "#fecaca" }}>{alertMsg}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={14} color="#f87171" />
            <span style={{ fontSize: 12, color: "#f87171" }}>Council voted 2/3 · Transaction blocked</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid #1e1e2e",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0a0a0f",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Shield size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
              SentinelAI
            </div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: -1 }}>
              Autonomous Agent Security
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Live indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "#0f2010",
              border: "1px solid #1a3a1a",
              borderRadius: 20,
              padding: "6px 14px",
            }}
          >
            <Radio size={12} color="#4ade80" />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#4ade80" }}>
              LIVE
            </span>
          </div>

          {/* Simulate Attack */}
          <button
            onClick={simulateAttack}
            disabled={attacking}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: attacking ? "#1e1e2e" : "linear-gradient(135deg, #dc2626, #b91c1c)",
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              cursor: attacking ? "not-allowed" : "pointer",
              opacity: attacking ? 0.6 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <Zap size={14} />
            {attacking ? "Simulating..." : "Simulate Attack"}
          </button>
        </div>
      </header>

      <main style={{ padding: "32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Metrics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <MetricCard
            label="Transactions Monitored"
            value={total}
            icon={Activity}
            accent="#3b82f6"
            sub="Last 30 minutes"
          />
          <MetricCard
            label="Anomalies Blocked"
            value={blocked}
            icon={XCircle}
            accent="#ef4444"
            sub={blocked > 0 ? "Threats neutralized" : "All clear"}
          />
          <MetricCard
            label="Value Protected"
            value={"$" + protected$.toLocaleString()}
            icon={TrendingUp}
            accent="#10b981"
            sub="USDC on Arc testnet"
          />
          <MetricCard
            label="Council Decisions"
            value={total}
            icon={Shield}
            accent="#8b5cf6"
            sub="AI votes cast"
          />
        </div>

        {/* Main grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 20 }}>

          {/* Transaction Feed */}
          <div
            style={{
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #1e1e2e",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Activity size={16} color="#3b82f6" />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                  Live Transaction Feed
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#475569" }}>
                Updating every 2s
              </span>
            </div>

            <div style={{ padding: "8px 0", maxHeight: 380, overflowY: "auto" }}>
              {events.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 24px",
                    borderBottom: "1px solid #0f0f18",
                    background: e.anomaly ? "#1a0a0a" : "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: e.anomaly ? "#ef4444" : "#10b981",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", textTransform: "capitalize" }}>
                          {e.action}
                        </span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: e.anomaly ? "#f87171" : "#fbbf24",
                          }}
                        >
                          ${e.amount.toLocaleString()} USDC
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
                          {e.agent_id}
                        </span>
                        <span style={{ fontSize: 11, color: "#334155" }}>→</span>
                        <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>
                          {truncate(e.target, 20)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, color: "#334155" }}>
                      {timeAgo(e.timestamp)}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 10px",
                        borderRadius: 6,
                        background: e.anomaly ? "#3d1515" : "#0f2010",
                        border: `1px solid ${e.anomaly ? "#5d2020" : "#1a3a1a"}`,
                      }}
                    >
                      {e.anomaly ? (
                        <XCircle size={12} color="#f87171" />
                      ) : (
                        <CheckCircle size={12} color="#4ade80" />
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: e.anomaly ? "#f87171" : "#4ade80",
                        }}
                      >
                        {e.anomaly ? "BLOCKED" : "APPROVED"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Council */}
          <div
            style={{
              background: "#111118",
              border: "1px solid #1e1e2e",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid #1e1e2e",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Shield size={16} color="#8b5cf6" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                AI Security Council
              </span>
            </div>

            <div style={{ padding: 20 }}>
              {latestAnomaly?.council ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <AgentCard
                    icon="🔍"
                    name="Behavior Agent"
                    vote={latestAnomaly.council.behavior_agent.vote}
                    reason={latestAnomaly.council.behavior_agent.reason}
                  />
                  <AgentCard
                    icon="⚠️"
                    name="Risk Agent"
                    vote={latestAnomaly.council.risk_agent.vote}
                    reason={latestAnomaly.council.risk_agent.reason}
                  />
                  <AgentCard
                    icon="📋"
                    name="Compliance Agent"
                    vote={latestAnomaly.council.compliance_agent.vote}
                    reason={latestAnomaly.council.compliance_agent.reason}
                  />

                  {/* Verdict */}
                  <div
                    style={{
                      marginTop: 4,
                      background: "linear-gradient(135deg, #1a0505, #200a0a)",
                      border: "1px solid #3d1515",
                      borderRadius: 12,
                      padding: "16px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#ef4444", fontWeight: 500, letterSpacing: "0.1em", marginBottom: 6 }}>
                      COUNCIL VERDICT
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <Lock size={16} color="#f87171" />
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#fca5a5" }}>
                        Transaction Blocked
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        background: "#0a0a0f",
                        borderRadius: 8,
                        padding: "6px 12px",
                        display: "inline-block",
                      }}
                    >
                      <span style={{ fontSize: 12, color: "#64748b" }}>Suspicion score · </span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#f87171" }}>
                        {((latestAnomaly.council.suspicion_score ?? 0) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 280,
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      background: "#0f2010",
                      border: "1px solid #1a3a1a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Shield size={24} color="#4ade80" />
                  </div>
                  <span style={{ fontSize: 14, color: "#475569", fontWeight: 500 }}>
                    All systems normal
                  </span>
                  <span style={{ fontSize: 12, color: "#334155" }}>
                    Council standing by
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hedera Audit Trail */}
        <div
          style={{
            background: "#111118",
            border: "1px solid #1e1e2e",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "18px 24px",
              borderBottom: "1px solid #1e1e2e",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                background: "linear-gradient(135deg, #06b6d4, #0891b2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, color: "white" }}>H</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
              Hedera Audit Trail
            </span>
            <span style={{ fontSize: 12, color: "#334155", marginLeft: 4 }}>
              · Immutable on-chain log
            </span>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e1e2e" }}>
                {["Event ID", "Action", "Amount", "Status", "Hedera TX"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "10px 24px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#475569",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr
                  key={e.id}
                  style={{
                    borderBottom: i < events.length - 1 ? "1px solid #0f0f18" : "none",
                    background: e.anomaly ? "#1a0a0a" : "transparent",
                  }}
                >
                  <td style={{ padding: "14px 24px", fontFamily: "monospace", fontSize: 12, color: "#475569" }}>
                    {e.id}
                  </td>
                  <td style={{ padding: "14px 24px", fontSize: 13, color: "#94a3b8", textTransform: "capitalize" }}>
                    {e.action}
                  </td>
                  <td style={{ padding: "14px 24px", fontSize: 13, fontWeight: 600, color: e.anomaly ? "#f87171" : "#fbbf24" }}>
                    ${e.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: "14px 24px" }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 10px",
                        borderRadius: 6,
                        background: e.anomaly ? "#3d1515" : "#0f2010",
                        border: `1px solid ${e.anomaly ? "#5d2020" : "#1a3a1a"}`,
                      }}
                    >
                      {e.anomaly ? (
                        <XCircle size={11} color="#f87171" />
                      ) : (
                        <CheckCircle size={11} color="#4ade80" />
                      )}
                      <span style={{ fontSize: 11, fontWeight: 700, color: e.anomaly ? "#f87171" : "#4ade80" }}>
                        {e.anomaly ? "BLOCKED" : "APPROVED"}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 24px" }}>
                    {e.hedera_tx_id ? (
                      <a
                        href={"https://hashscan.io/testnet/transaction/" + e.hedera_tx_id}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          fontSize: 12,
                          color: "#06b6d4",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                      >
                        View on Hedera
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "#334155" }}>Logging...</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}