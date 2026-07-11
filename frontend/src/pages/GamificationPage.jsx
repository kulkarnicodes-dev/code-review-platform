import { useState, useEffect, useRef } from "react";

/* ─── Paste your auth token getter here ─────────────────────────── */
const getToken = () => localStorage.getItem("token") || localStorage.getItem("access_token") || "";
const API = "http://localhost:8000/api/v1";

/* ─── Tiny API helpers ───────────────────────────────────────────── */
const apiFetch = (path) =>
  fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } }).then((r) => r.json());

/* ─── Data ───────────────────────────────────────────────────────── */
const LEVEL_COLORS = {
  1: "#6b7280", 2: "#22c55e", 3: "#22c55e", 4: "#06b6d4",
  5: "#06b6d4", 6: "#818cf8", 7: "#818cf8", 8: "#f59e0b",
  9: "#f59e0b", 10: "#ef4444",
};
const LEVEL_EMOJI = { 1:"🌱",2:"🌿",3:"🌾",4:"⚡",5:"⚡",6:"💜",7:"💜",8:"🔥",9:"🔥",10:"👑" };

/* ─── Radial XP Ring ─────────────────────────────────────────────── */
function XPRing({ pct, level, levelName, color }) {
  const r = 70, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
      <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="90" cy="90" r={r} fill="none" stroke="#1e293b" strokeWidth="12" />
        <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 8px ${color}88)` }} />
      </svg>
      <div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2 }}>
        <span style={{ fontSize: 32 }}>{LEVEL_EMOJI[level] || "⭐"}</span>
        <span style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color,lineHeight:1 }}>LV.{level}</span>
        <span style={{ fontSize:11,color:"#64748b",fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase" }}>{levelName}</span>
      </div>
    </div>
  );
}

/* ─── Badge Card ─────────────────────────────────────────────────── */
function BadgeCard({ badge, earned }) {
  return (
    <div style={{
      background: earned ? "#0f172a" : "#080d14",
      border: `1px solid ${earned ? "#334155" : "#1a2030"}`,
      borderRadius: 12,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      opacity: earned ? 1 : 0.45,
      transition: "all 0.2s",
      cursor: earned ? "default" : "not-allowed",
      position: "relative",
      overflow: "hidden",
    }}>
      {earned && (
        <div style={{
          position:"absolute",inset:0,
          background:`radial-gradient(ellipse at 0% 50%, ${badge.color || "#f59e0b"}11 0%, transparent 70%)`,
          pointerEvents:"none"
        }} />
      )}
      <span style={{ fontSize: 28, filter: earned ? "none" : "grayscale(1)" }}>{badge.emoji}</span>
      <div>
        <div style={{ fontSize:13,fontWeight:700,color: earned ? "#f1f5f9" : "#475569",marginBottom:2 }}>{badge.name}</div>
        <div style={{ fontSize:11,color:"#475569",lineHeight:1.4 }}>{badge.description}</div>
      </div>
      {earned && (
        <div style={{ marginLeft:"auto",flexShrink:0 }}>
          <div style={{ background:"#22c55e22",border:"1px solid #22c55e44",borderRadius:20,padding:"2px 8px",fontSize:10,color:"#22c55e",fontWeight:700 }}>EARNED</div>
        </div>
      )}
    </div>
  );
}

/* ─── Challenge Card ─────────────────────────────────────────────── */
function ChallengeCard({ ch }) {
  return (
    <div style={{
      background: ch.completed ? "#022c1a" : "#0a0f1a",
      border: `1px solid ${ch.completed ? "#16a34a55" : "#1e293b"}`,
      borderRadius: 12,
      padding: "14px 16px",
      display:"flex",alignItems:"center",gap:14,
      transition:"all 0.2s",
    }}>
      <div style={{
        width:38,height:38,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,
        background: ch.completed ? "#14532d" : "#1e293b",
        border: `2px solid ${ch.completed ? "#22c55e" : "#334155"}`,
      }}>
        {ch.completed ? "✓" : "○"}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:13,fontWeight:700,color: ch.completed ? "#4ade80" : "#e2e8f0",marginBottom:2 }}>{ch.name}</div>
        <div style={{ fontSize:11,color:"#475569" }}>{ch.description}</div>
      </div>
      <div style={{
        flexShrink:0,
        background: ch.completed ? "#14532d" : "#1e293b",
        border: `1px solid ${ch.completed ? "#22c55e44" : "#334155"}`,
        borderRadius:8,padding:"4px 10px",textAlign:"center",
      }}>
        <div style={{ fontSize:14,fontWeight:800,color:ch.completed?"#4ade80":"#f59e0b",fontFamily:"'Bebas Neue',sans-serif",lineHeight:1 }}>+{ch.xp_reward}</div>
        <div style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:"0.1em" }}>XP</div>
      </div>
    </div>
  );
}

/* ─── Leaderboard Row ────────────────────────────────────────────── */
function LeaderRow({ entry, isMe }) {
  const medals = ["🥇","🥈","🥉"];
  const rank = entry.rank;
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:14,padding:"12px 16px",
      background: isMe ? "#0f1f3d" : rank<=3 ? "#0c111d" : "transparent",
      border: isMe ? "1px solid #3b82f644" : rank<=3 ? `1px solid ${["#f59e0b44","#94a3b844","#cd7c2f44"][rank-1]}` : "1px solid transparent",
      borderRadius:10,marginBottom:6,transition:"all 0.15s",
    }}>
      <div style={{ width:32,textAlign:"center",fontSize: rank<=3?20:13,fontWeight:700,color:rank<=3?"auto":"#475569",flexShrink:0 }}>
        {rank<=3 ? medals[rank-1] : `#${rank}`}
      </div>
      <div style={{ width:36,height:36,borderRadius:"50%",background:"#1e293b",border:"2px solid #334155",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#94a3b8",flexShrink:0,overflow:"hidden" }}>
        {entry.profile_pic ? <img src={entry.profile_pic} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : (entry.name?.[0]||"?").toUpperCase()}
      </div>
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ fontSize:13,fontWeight:700,color: isMe?"#93c5fd":"#e2e8f0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
          {entry.name} {isMe && <span style={{fontSize:10,color:"#60a5fa"}}>(you)</span>}
        </div>
        <div style={{ fontSize:11,color:"#475569" }}>Lv.{entry.level} · {entry.level_name} · {entry.badges_count} badges</div>
      </div>
      <div style={{ textAlign:"right",flexShrink:0 }}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#f59e0b",lineHeight:1 }}>{(entry.xp||0).toLocaleString()}</div>
        <div style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:"0.1em" }}>XP</div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function GamificationPage() {
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState("overview"); // overview | badges | challenges | leaderboard
  const [loading, setLoading] = useState(true);
  const [xpAnimated, setXpAnimated] = useState(0);
  const animRef = useRef(null);

  useEffect(() => {
    Promise.all([
      apiFetch("/gamification/profile"),
      apiFetch("/gamification/leaderboard?limit=10"),
    ]).then(([p, l]) => {
      setProfile(p);
      setLeaderboard(l.leaderboard || []);
      setLoading(false);
      // Animate XP number
      const target = p.xp || 0;
      let start = null;
      const duration = 1200;
      const step = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        setXpAnimated(Math.floor(progress * target));
        if (progress < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    }).catch(() => setLoading(false));
    return () => animRef.current && cancelAnimationFrame(animRef.current);
  }, []);

  if (loading) return (
    <div style={styles.loadWrap}>
      <div style={styles.spinner} />
      <p style={{ color:"#475569",marginTop:16,fontWeight:600 }}>Loading your stats…</p>
    </div>
  );

  if (!profile) return (
    <div style={styles.loadWrap}>
      <p style={{ color:"#ef4444",fontSize:16 }}>⚠ Could not load gamification data</p>
      <p style={{ color:"#475569",fontSize:13,marginTop:8 }}>Make sure the backend is running and you're logged in.</p>
    </div>
  );

  const color = LEVEL_COLORS[profile.level] || "#06b6d4";
  const pct = profile.xp_progress_percent || 0;
  const earnedBadges = new Set(profile.badges || []);
  const allBadges = profile.all_badges || [];
  const dailyChallenges = profile.daily_challenges || [];

  const tabs = [
    { id:"overview", label:"Overview" },
    { id:"badges", label:`Badges · ${earnedBadges.size}/${allBadges.length}` },
    { id:"challenges", label:"Daily Challenges" },
    { id:"leaderboard", label:"Leaderboard" },
  ];

  return (
    <div style={styles.page}>
      {/* Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { background: #050810; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes xpFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .gam-tab { background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif;font-size:13px;font-weight:600;padding:8px 18px;border-radius:8px;transition:all .15s; }
        .gam-tab:hover { background:#1e293b; color:#e2e8f0; }
        .gam-tab.active { background:#1e40af22;color:#60a5fa;border:1px solid #3b82f644; }
        .stat-num { font-family:'Bebas Neue',sans-serif;font-size:34px;line-height:1; }
        .badge-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        @media(max-width:600px){.badge-grid{grid-template-columns:1fr;}}
        .section-anim { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{ background:"#080d18",borderBottom:"1px solid #1e293b",padding:"20px 28px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <h1 style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"#e2e8f0",letterSpacing:"0.06em",margin:0 }}>
            🏆 Your Progress
          </h1>
          <p style={{ fontSize:12,color:"#475569",margin:0,marginTop:2 }}>XP · Levels · Badges · Challenges</p>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ background:"#1e293b",border:"1px solid #334155",borderRadius:10,padding:"6px 14px",textAlign:"center" }}>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:color,lineHeight:1 }}>{(xpAnimated||0).toLocaleString()}</div>
            <div style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:"0.1em" }}>TOTAL XP</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background:"#080d18",borderBottom:"1px solid #1e293b",padding:"0 28px",display:"flex",gap:4 }}>
        {tabs.map(t => (
          <button key={t.id} className={`gam-tab ${tab===t.id?"active":""}`} onClick={() => setTab(t.id)} style={{ color: tab===t.id?"#60a5fa":"#64748b" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:860,margin:"0 auto",padding:"28px 24px" }}>

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <div className="section-anim" style={{ display:"flex",flexDirection:"column",gap:20 }}>
            {/* XP Ring + Stats */}
            <div style={{ display:"grid",gridTemplateColumns:"220px 1fr",gap:20,alignItems:"stretch" }}>
              <div style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:16,padding:"28px 20px",display:"flex",flexDirection:"column",alignItems:"center",gap:16 }}>
                <XPRing pct={pct} level={profile.level} levelName={profile.level_name} color={color} />
                <div style={{ width:"100%",textAlign:"center" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569",fontWeight:600,marginBottom:6,letterSpacing:"0.08em",textTransform:"uppercase" }}>
                    <span>{profile.xp?.toLocaleString()} XP</span>
                    <span>{(profile.xp + (profile.xp_to_next_level||0))?.toLocaleString()} XP</span>
                  </div>
                  <div style={{ height:6,background:"#1e293b",borderRadius:3,overflow:"hidden" }}>
                    <div style={{ height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${color}88,${color})`,borderRadius:3,transition:"width 1s ease",boxShadow:`0 0 8px ${color}66` }} />
                  </div>
                  <div style={{ fontSize:11,color:"#475569",marginTop:6 }}>{profile.xp_to_next_level?.toLocaleString()} XP to next level</div>
                </div>
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                {[
                  { label:"Total Reviews", value:profile.total_reviews||0, icon:"📋", color:"#06b6d4" },
                  { label:"Bugs Found", value:profile.bugs_found||0, icon:"🐛", color:"#ef4444" },
                  { label:"Current Streak", value:`${profile.current_streak||0}d`, icon:"🔥", color:"#f59e0b" },
                  { label:"Badges Earned", value:earnedBadges.size, icon:"🏅", color:"#a78bfa" },
                  { label:"Max Score", value:(profile.max_score||0).toFixed(1), icon:"⭐", color:"#f59e0b" },
                  { label:"Languages", value:(profile.unique_languages||[]).length, icon:"🌐", color:"#22c55e" },
                ].map(s => (
                  <div key={s.label} style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:12,padding:"14px 16px",position:"relative",overflow:"hidden" }}>
                    <div style={{ position:"absolute",top:10,right:12,fontSize:22,opacity:0.25 }}>{s.icon}</div>
                    <div style={{ fontSize:10,color:"#475569",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4 }}>{s.label}</div>
                    <div className="stat-num" style={{ color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Languages used */}
            {(profile.unique_languages||[]).length > 0 && (
              <div style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:14,padding:"16px 20px" }}>
                <div style={{ fontSize:11,color:"#475569",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12 }}>Languages You've Reviewed</div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {(profile.unique_languages||[]).map(lang => (
                    <div key={lang} style={{ background:"#1e293b",border:"1px solid #334155",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#94a3b8",fontWeight:600 }}>
                      {lang}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent badges */}
            {earnedBadges.size > 0 && (
              <div style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:14,padding:"16px 20px" }}>
                <div style={{ fontSize:11,color:"#475569",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12,display:"flex",justifyContent:"space-between" }}>
                  <span>Earned Badges</span>
                  <button onClick={() => setTab("badges")} style={{ background:"none",border:"none",color:"#3b82f6",fontSize:11,cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontWeight:600 }}>View all →</button>
                </div>
                <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                  {allBadges.filter(b => earnedBadges.has(b.id)).slice(0,6).map(b => (
                    <div key={b.id} title={b.description} style={{ background:"#0f172a",border:"1px solid #334155",borderRadius:20,padding:"6px 12px",fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
                      <span>{b.emoji}</span>
                      <span style={{ color:"#94a3b8",fontSize:11,fontWeight:600 }}>{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── BADGES ── */}
        {tab === "badges" && (
          <div className="section-anim">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
              <div>
                <h2 style={{ fontSize:18,fontWeight:800,color:"#e2e8f0",margin:0 }}>All Badges</h2>
                <p style={{ fontSize:12,color:"#475569",margin:0,marginTop:2 }}>{earnedBadges.size} of {allBadges.length} earned</p>
              </div>
              <div style={{ background:"#1e293b",borderRadius:20,padding:"4px 14px",fontSize:12,color:"#f59e0b",fontWeight:700,border:"1px solid #334155" }}>
                🏅 {earnedBadges.size}/{allBadges.length}
              </div>
            </div>

            {/* Progress */}
            <div style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:12,padding:"12px 16px",marginBottom:20 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12,color:"#475569",fontWeight:600 }}>
                <span>Badge Collection Progress</span>
                <span style={{ color:"#f59e0b" }}>{Math.round((earnedBadges.size/allBadges.length)*100)||0}%</span>
              </div>
              <div style={{ height:8,background:"#1e293b",borderRadius:4,overflow:"hidden" }}>
                <div style={{ height:"100%",width:`${(earnedBadges.size/allBadges.length)*100||0}%`,background:"linear-gradient(90deg,#f59e0b88,#f59e0b)",borderRadius:4,transition:"width 0.8s ease" }} />
              </div>
            </div>

            <div className="badge-grid">
              {allBadges.map(b => (
                <BadgeCard key={b.id} badge={b} earned={earnedBadges.has(b.id)} />
              ))}
              {allBadges.length === 0 && (
                <div style={{ gridColumn:"1/-1",textAlign:"center",padding:40,color:"#475569" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🏅</div>
                  <p style={{ fontSize:14 }}>No badge data — make sure the backend endpoint /gamification/profile is connected.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CHALLENGES ── */}
        {tab === "challenges" && (
          <div className="section-anim">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <div>
                <h2 style={{ fontSize:18,fontWeight:800,color:"#e2e8f0",margin:0 }}>Daily Challenges</h2>
                <p style={{ fontSize:12,color:"#475569",margin:0,marginTop:2 }}>Resets every day at midnight</p>
              </div>
              <div style={{ background:"#14532d22",border:"1px solid #16a34a44",borderRadius:20,padding:"4px 14px",fontSize:12,color:"#4ade80",fontWeight:700 }}>
                {dailyChallenges.filter(c=>c.completed).length}/{dailyChallenges.length} done
              </div>
            </div>

            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {dailyChallenges.map(ch => <ChallengeCard key={ch.id} ch={ch} />)}
              {dailyChallenges.length === 0 && (
                <div style={{ textAlign:"center",padding:48,color:"#475569" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>📅</div>
                  <p>No challenges loaded. Check your API connection.</p>
                </div>
              )}
            </div>

            {/* How challenges work */}
            <div style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:14,padding:"16px 20px",marginTop:24 }}>
              <div style={{ fontSize:11,color:"#475569",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12 }}>How It Works</div>
              {[
                ["Complete challenges","Earn bonus XP on top of your review XP"],
                ["Automatic tracking","Challenges complete automatically when you review code"],
                ["Daily reset","All challenges refresh at midnight UTC"],
                ["Stack rewards","Multiple challenges can complete from one review"],
              ].map(([t,d]) => (
                <div key={t} style={{ display:"flex",gap:10,padding:"8px 0",borderBottom:"1px solid #1e293b" }}>
                  <span style={{ color:"#22c55e",fontSize:14,marginTop:1 }}>✓</span>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#e2e8f0" }}>{t}</div>
                    <div style={{ fontSize:11,color:"#475569" }}>{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── LEADERBOARD ── */}
        {tab === "leaderboard" && (
          <div className="section-anim">
            <div style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:18,fontWeight:800,color:"#e2e8f0",margin:0 }}>🏆 Global Leaderboard</h2>
              <p style={{ fontSize:12,color:"#475569",margin:0,marginTop:2 }}>Top players ranked by XP</p>
            </div>

            <div>
              {leaderboard.map(entry => (
                <LeaderRow key={entry.user_id} entry={entry} isMe={false} />
              ))}
              {leaderboard.length === 0 && (
                <div style={{ textAlign:"center",padding:48,color:"#475569" }}>
                  <div style={{ fontSize:40,marginBottom:12 }}>🏆</div>
                  <p>No leaderboard data yet. Be the first to review code!</p>
                </div>
              )}
            </div>

            {/* XP Guide */}
            <div style={{ background:"#080d18",border:"1px solid #1e293b",borderRadius:14,padding:"16px 20px",marginTop:24 }}>
              <div style={{ fontSize:11,color:"#475569",fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:14 }}>How to Earn XP</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {[
                  ["📋","Complete review","20 base XP"],
                  ["🐛","Per bug found","+3 XP"],
                  ["🔒","Security issue","+4 XP"],
                  ["⭐","High score bonus","up to +20 XP"],
                  ["📅","Daily challenge","+30–60 XP"],
                  ["🔝","Max per review","100 XP cap"],
                ].map(([icon,action,reward]) => (
                  <div key={action} style={{ display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#0a1020",borderRadius:8,border:"1px solid #1e293b" }}>
                    <span style={{ fontSize:18 }}>{icon}</span>
                    <div>
                      <div style={{ fontSize:12,color:"#94a3b8",fontWeight:600 }}>{action}</div>
                      <div style={{ fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:"#f59e0b",lineHeight:1 }}>{reward}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: { minHeight:"100vh",background:"#050810",fontFamily:"'Outfit',sans-serif",color:"#e2e8f0" },
  loadWrap: { display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"60vh",gap:8 },
  spinner: { width:36,height:36,border:"3px solid #1e293b",borderTop:"3px solid #06b6d4",borderRadius:"50%",animation:"spin 0.8s linear infinite" },
};
