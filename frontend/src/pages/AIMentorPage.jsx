import { useState, useRef, useEffect } from "react";

/* ─── Config ─────────────────────────────────────────────────────── */
const getToken = () => localStorage.getItem("token") || localStorage.getItem("access_token") || "";
const API = "http://localhost:8000/api/v1";

/* ─── Language Detection ─────────────────────────────────────────── */
const LANGUAGE_PATTERNS = {
  python: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w+/, /\bprint\s*\(/, /\bclass\s+\w+\s*:/, /:\s*\n\s+/, /\belif\b/, /\bself\b/, /#.*$/m, /"""[\s\S]*?"""/, /f["']\{/],
  javascript: [/\bconst\b|\blet\b|\bvar\b/, /=>\s*\{/, /\bfunction\b/, /console\.log/, /\brequire\s*\(/, /\bexport\b/, /\$\{/, /\bdocument\./, /\basync\b/],
  typescript: [/:\s*(string|number|boolean|any|void|null|undefined)\b/, /interface\s+\w+/, /type\s+\w+\s*=/, /<\w+>/, /as\s+\w+/, /readonly\b/, /public\s+|private\s+|protected\s+/],
  java: [/public\s+(static\s+)?void\s+main/, /System\.out\.print/, /\bimport\s+java\./, /new\s+\w+\s*\(/, /\bpublic\s+class\b/, /@Override/],
  "c++": [/#include\s*</, /std::/, /cout\s*<</, /cin\s*>>/, /\btemplate\s*</, /\bnamespace\b/, /\bvector\s*</, /->/],
  "c#": [/using\s+System/, /Console\.Write/, /\bnamespace\b/, /\bpublic\s+static\b/],
  go: [/\bfunc\s+\w+/, /\bpackage\s+\w+/, /fmt\.Print/, /\bgo\s+func/, /:=/, /\bimport\s+\(/, /\bdefer\b/],
  rust: [/\bfn\s+\w+/, /let\s+mut\b/, /println!\s*\(/, /\buse\s+std::/, /\bimpl\b/, /\bmatch\b/, /\bSome\b|\bNone\b/],
  php: [/<\?php/, /\$\w+/, /echo\s+/, /->\w+\s*\(/, /require_once/],
  ruby: [/\bdef\s+\w+/, /puts\s+/, /\.each\s+do/, /\bend\b/, /require\s+['"]/, /\|.*\|/, /@\w+/],
  sql: [/SELECT\s+/i, /FROM\s+\w+/i, /WHERE\s+/i, /INSERT\s+INTO/i, /CREATE\s+TABLE/i, /JOIN\s+/i],
  c: [/#include\s*<stdio\.h>/, /printf\s*\(/, /scanf\s*\(/, /\bint\s+main\s*\(/, /malloc\s*\(/],
};

function detectLanguage(code) {
  if (!code || code.trim().length < 15) return null;
  const scores = {};
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    scores[lang] = patterns.reduce((acc, p) => acc + (p.test(code) ? 1 : 0), 0);
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return top[1] >= 2 ? top[0] : null;
}

/* ─── Snippets ───────────────────────────────────────────────────── */
const SNIPPETS = {
  python: [
    { trigger: "def ", suggestion: "def function_name(param):\n    pass", label: "Function" },
    { trigger: "class ", suggestion: "class ClassName:\n    def __init__(self):\n        pass", label: "Class" },
    { trigger: "for ", suggestion: "for item in iterable:\n    pass", label: "For Loop" },
    { trigger: "try", suggestion: "try:\n    pass\nexcept Exception as e:\n    print(e)", label: "Try/Except" },
    { trigger: "if __", suggestion: 'if __name__ == "__main__":\n    main()', label: "Main Guard" },
    { trigger: "with ", suggestion: 'with open("file.txt", "r") as f:\n    content = f.read()', label: "Context Manager" },
    { trigger: "lambda", suggestion: "lambda x: x * 2", label: "Lambda" },
    { trigger: "list", suggestion: "list_comp = [x for x in range(10) if x % 2 == 0]", label: "List Comp" },
    { trigger: "dict", suggestion: "data = {k: v for k, v in items.items()}", label: "Dict Comp" },
    { trigger: "import", suggestion: "import os\nimport sys", label: "Imports" },
  ],
  javascript: [
    { trigger: "const ", suggestion: "const fn = async () => {\n  try {\n    \n  } catch (error) {\n    console.error(error);\n  }\n};", label: "Async Arrow Fn" },
    { trigger: "function", suggestion: "function name(params) {\n  return;\n}", label: "Function" },
    { trigger: "class ", suggestion: "class ClassName {\n  constructor() {\n    \n  }\n}", label: "Class" },
    { trigger: "for", suggestion: "for (const item of array) {\n  console.log(item);\n}", label: "For Of" },
    { trigger: "promise", suggestion: "new Promise((resolve, reject) => {\n  resolve(value);\n});", label: "Promise" },
    { trigger: "fetch", suggestion: 'const res = await fetch("/api", {\n  method: "POST",\n  headers: { "Content-Type": "application/json" },\n  body: JSON.stringify(data),\n});', label: "Fetch" },
    { trigger: "usestate", suggestion: "const [state, setState] = useState(initialValue);", label: "useState" },
    { trigger: "useeffect", suggestion: "useEffect(() => {\n  return () => {};\n}, [deps]);", label: "useEffect" },
  ],
  typescript: [
    { trigger: "interface", suggestion: "interface MyInterface {\n  id: number;\n  name: string;\n}", label: "Interface" },
    { trigger: "type ", suggestion: "type MyType = {\n  prop: string;\n  optional?: number;\n};", label: "Type" },
    { trigger: "enum", suggestion: "enum Direction {\n  Up = 'UP',\n  Down = 'DOWN',\n}", label: "Enum" },
    { trigger: "generic", suggestion: "function identity<T>(arg: T): T {\n  return arg;\n}", label: "Generic Fn" },
  ],
  go: [
    { trigger: "func ", suggestion: "func name(param string) (string, error) {\n  return \"\", nil\n}", label: "Function" },
    { trigger: "if err", suggestion: "if err != nil {\n  return err\n}", label: "Error Check" },
    { trigger: "goroutine", suggestion: "go func() {\n  defer wg.Done()\n}()", label: "Goroutine" },
  ],
  rust: [
    { trigger: "fn ", suggestion: "fn name(param: &str) -> Result<(), String> {\n  Ok(())\n}", label: "Function" },
    { trigger: "match", suggestion: "match value {\n  Some(v) => println!(\"{}\", v),\n  None => println!(\"nothing\"),\n}", label: "Match" },
    { trigger: "struct", suggestion: "#[derive(Debug, Clone)]\nstruct MyStruct {\n  field: String,\n}", label: "Struct" },
  ],
};

/* ─── Constants ──────────────────────────────────────────────────── */
const LEVELS = [
  { id: "beginner", label: "Beginner", emoji: "🌱", desc: "New to coding · Simple explanations · Basic resources", color: "#22c55e", bg: "#052e16", border: "#166534" },
  { id: "intermediate", label: "Intermediate", emoji: "⚡", desc: "1–3 years exp · Patterns & best practices · Trade-offs", color: "#f59e0b", bg: "#1c1003", border: "#854d0e" },
  { id: "expert", label: "Expert", emoji: "🔥", desc: "Senior dev · Architecture · Advanced optimization", color: "#ef4444", bg: "#2d0a0a", border: "#991b1b" },
];

const LANGUAGES = ["python","javascript","typescript","java","c","c++","c#","go","rust","swift","kotlin","php","ruby","scala","sql"];

const CATEGORY_META = {
  bug:          { icon:"🐛", label:"Bug",           color:"#ef4444", bg:"#2d0a0a" },
  performance:  { icon:"⚡", label:"Performance",   color:"#f59e0b", bg:"#1c1003" },
  style:        { icon:"✨", label:"Style",          color:"#a78bfa", bg:"#1e0a3c" },
  security:     { icon:"🔒", label:"Security",       color:"#06b6d4", bg:"#0a1e2a" },
  best_practice:{ icon:"📐", label:"Best Practice",  color:"#22c55e", bg:"#052e16" },
};

const KEYWORDS = {
  python: ["def","class","import","from","return","if","elif","else","for","while","try","except","finally","with","as","pass","break","continue","and","or","not","in","is","lambda","yield","async","await","True","False","None","raise","global","nonlocal","assert","del"],
  javascript: ["const","let","var","function","return","if","else","for","while","do","try","catch","finally","class","extends","import","export","default","async","await","new","this","typeof","instanceof","switch","case","break","continue","throw","yield","null","undefined","true","false"],
  typescript: ["const","let","var","function","return","if","else","for","while","class","extends","import","export","async","await","interface","type","enum","implements","abstract","readonly","public","private","protected","namespace","declare"],
};

/* ─── Syntax Highlighter ─────────────────────────────────────────── */
function highlightCode(code, language) {
  if (!code) return "";
  const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const kws = KEYWORDS[language] || KEYWORDS.javascript;
  const kwPattern = new RegExp(`\\b(${kws.join("|")})\\b`, "g");
  return escaped
    .replace(/(\/\/.*$|#.*$)/gm, '<span style="color:#64748b;font-style:italic">$1</span>')
    .replace(/(".*?"|'.*?'|`.*?`)/g, '<span style="color:#86efac">$1</span>')
    .replace(kwPattern, '<span style="color:#818cf8;font-weight:700">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#fb923c">$1</span>');
}

/* ─── CodeEditor ─────────────────────────────────────────────────── */
function CodeEditor({ value, onChange, language, onLanguageChange, detectedLang }) {
  const textareaRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestIdx, setSuggestIdx] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  const getWordBefore = (text, pos) => {
    const before = text.slice(0, pos);
    const match = before.match(/[\w.]+$/);
    return match ? match[0].toLowerCase() : "";
  };

  const handleChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);
    const pos = e.target.selectionStart;
    const word = getWordBefore(newVal, pos);
    const langSnippets = SNIPPETS[language] || [];
    const matches = word.length >= 2 ? langSnippets.filter(s => s.trigger.toLowerCase().startsWith(word)).slice(0, 5) : [];
    setSuggestions(matches);
    setSuggestIdx(0);
    const lines = newVal.slice(0, pos).split("\n");
    setCursorPos({ line: lines.length, col: lines[lines.length - 1].length + 1 });
  };

  const applySuggestion = (snippet) => {
    const ta = textareaRef.current;
    const pos = ta.selectionStart;
    const word = getWordBefore(value, pos);
    const newVal = value.slice(0, pos - word.length) + snippet.suggestion + value.slice(pos);
    onChange(newVal);
    setSuggestions([]);
    setTimeout(() => {
      const newPos = (value.slice(0, pos - word.length) + snippet.suggestion).length;
      ta.setSelectionRange(newPos, newPos);
      ta.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSuggestIdx(i => (i + 1) % suggestions.length); return; }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSuggestIdx(i => (i - 1 + suggestions.length) % suggestions.length); return; }
      if (e.key === "Tab" || e.key === "Enter") { e.preventDefault(); applySuggestion(suggestions[suggestIdx]); return; }
      if (e.key === "Escape") { setSuggestions([]); return; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      const start = ta.selectionStart;
      const newVal = value.slice(0, start) + "    " + value.slice(ta.selectionEnd);
      onChange(newVal);
      setTimeout(() => ta.setSelectionRange(start + 4, start + 4), 0);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Paste Your Code
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {detectedLang && detectedLang !== language && (
            <button onClick={() => onLanguageChange(detectedLang)} style={{
              background: "#0a1e2a", border: "1px solid #06b6d4", borderRadius: 20,
              padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#06b6d4",
              cursor: "pointer", fontFamily: "'Outfit',sans-serif",
            }}>
              ⚡ Switch to {detectedLang.toUpperCase()}?
            </button>
          )}
          <button onClick={() => setShowPreview(p => !p)} style={{
            background: showPreview ? "#1e293b" : "transparent", border: "1px solid #1e293b",
            borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700,
            color: showPreview ? "#e2e8f0" : "#475569", cursor: "pointer",
            fontFamily: "'Outfit',sans-serif", transition: "all 0.15s",
          }}>
            {showPreview ? "✏️ Edit" : "🎨 Preview"}
          </button>
          <select value={language} onChange={e => onLanguageChange(e.target.value)} style={{
            background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
            color: "#94a3b8", fontSize: 12, fontWeight: 700, padding: "5px 10px",
            cursor: "pointer", fontFamily: "'Outfit',sans-serif",
          }}>
            {LANGUAGES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
      </div>

      {/* Editor or Preview */}
      {showPreview ? (
        <div style={{
          width: "100%", minHeight: 240, padding: 16, overflow: "auto",
          background: "#080d18", border: "1px solid #3b82f6", borderRadius: 14,
          fontSize: 13, lineHeight: 1.65, fontFamily: "'JetBrains Mono','Fira Code',monospace",
          color: "#a5f3fc", whiteSpace: "pre-wrap", wordBreak: "break-all",
        }} dangerouslySetInnerHTML={{ __html: highlightCode(value, language) || '<span style="color:#334155">Start typing to see highlighting…</span>' }} />
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          placeholder={`# Paste your ${language} code here…\n# Type 2+ chars for snippet suggestions\n# Tab = insert snippet or 4 spaces`}
          style={{
            width: "100%", minHeight: 240, padding: 16, resize: "vertical",
            background: "#080d18", border: "1px solid #1e293b", borderRadius: 14,
            color: "#a5f3fc", fontSize: 13, lineHeight: 1.65,
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            transition: "border-color 0.15s",
          }}
        />
      )}

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && !showPreview && (
        <div style={{
          position: "absolute", left: 16, bottom: 48, zIndex: 999,
          background: "#0d1424", border: "1px solid #3b82f6", borderRadius: 10,
          overflow: "hidden", minWidth: 280, boxShadow: "0 8px 32px #00000088",
          animation: "fadeUp 0.15s ease",
        }}>
          <div style={{ padding: "6px 10px", fontSize: 10, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.1em", borderBottom: "1px solid #1e293b" }}>
            💡 SNIPPETS — Tab/Enter to insert · Esc to dismiss
          </div>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => applySuggestion(s)} onMouseEnter={() => setSuggestIdx(i)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              background: i === suggestIdx ? "#1e293b" : "transparent", border: "none",
              borderLeft: i === suggestIdx ? "2px solid #3b82f6" : "2px solid transparent",
              cursor: "pointer", fontFamily: "'Outfit',sans-serif", textAlign: "left",
            }}>
              <span style={{ fontSize: 16 }}>📝</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{s.label}</div>
                <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{s.trigger}…</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Status bar */}
      {value && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "0 4px" }}>
          <span style={{ fontSize: 11, color: "#334155" }}>Ln {cursorPos.line}, Col {cursorPos.col}</span>
          <span style={{ fontSize: 11, color: "#334155" }}>
            {value.split("\n").length} lines · {value.length} chars
            {detectedLang && <span style={{ marginLeft: 8, color: "#06b6d4", fontWeight: 700 }}>🔍 {detectedLang.toUpperCase()} detected</span>}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── LevelPicker ────────────────────────────────────────────────── */
function LevelPicker({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
      {LEVELS.map(lvl => (
        <button key={lvl.id} onClick={() => onChange(lvl.id)} style={{
          background: value === lvl.id ? lvl.bg : "#080d18",
          border: `2px solid ${value === lvl.id ? lvl.color : "#1e293b"}`,
          borderRadius: 14, padding: "14px 12px", cursor: "pointer", textAlign: "left",
          transition: "all 0.2s", fontFamily: "'Outfit',sans-serif",
          boxShadow: value === lvl.id ? `0 0 20px ${lvl.color}22` : "none",
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>{lvl.emoji}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: value === lvl.id ? lvl.color : "#94a3b8", marginBottom: 4 }}>{lvl.label}</div>
          <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>{lvl.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ─── MistakeCard ────────────────────────────────────────────────── */
function MistakeCard({ mistake, idx }) {
  const [open, setOpen] = useState(idx === 0);
  const meta = CATEGORY_META[mistake.category] || CATEGORY_META.best_practice;
  return (
    <div style={{ background: "#080d18", border: `1px solid ${open ? meta.color + "44" : "#1e293b"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", textAlign: "left" }}>
        <div style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: meta.bg, border: `1px solid ${meta.color}44` }}>{meta.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{meta.label}</span>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mistake.issue}</div>
        </div>
        <span style={{ color: "#475569", fontSize: 18, transform: `rotate(${open ? 180 : 0}deg)`, transition: "transform 0.2s", flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #1e293b" }}>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: meta.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>What's wrong</div>
            <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{mistake.explanation}</p>
          </div>
          {mistake.why_it_matters && (
            <div style={{ marginTop: 14, background: "#0a1020", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>⚡ Why This Matters</div>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.65, margin: 0 }}>{mistake.why_it_matters}</p>
            </div>
          )}
          {mistake.how_to_fix && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>✓ How to Fix</div>
              <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.65, margin: 0 }}>{mistake.how_to_fix}</p>
            </div>
          )}
          {mistake.example_fix && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Example Fix</div>
              <pre style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: "#a5f3fc", overflowX: "auto", lineHeight: 1.6, margin: 0, fontFamily: "'JetBrains Mono','Fira Code',monospace" }}>{mistake.example_fix}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── ResourceCard ───────────────────────────────────────────────── */
function ResourceCard({ resource }) {
  const typeStyle = { article: { icon: "📄", color: "#06b6d4" }, video: { icon: "🎥", color: "#ef4444" }, documentation: { icon: "📚", color: "#a78bfa" }, course: { icon: "🎓", color: "#f59e0b" } }[resource.type] || { icon: "🔗", color: "#94a3b8" };
  return (
    <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", background: "#080d18", border: "1px solid #1e293b", borderRadius: 12, textDecoration: "none", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.background = "#0a1020"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e293b"; e.currentTarget.style.background = "#080d18"; }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "#0a1020", border: `1px solid ${typeStyle.color}44` }}>{typeStyle.icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>{resource.title}</div>
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.4, marginBottom: 4 }}>{resource.description}</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: typeStyle.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{typeStyle.icon} {resource.type}</span>
      </div>
    </a>
  );
}

/* ─── FeedbackPanel ──────────────────────────────────────────────── */
function FeedbackPanel({ feedback }) {
  const lvlMeta = LEVELS.find(l => l.id === feedback.expertise_level) || LEVELS[0];
  const [activeSection, setActiveSection] = useState("mistakes");
  const sections = [
    { id: "mistakes", label: `Issues (${feedback.mistakes_explained?.length || 0})` },
    { id: "tips", label: "Tips & Next Steps" },
    { id: "resources", label: `Resources (${feedback.learning_resources?.length || 0})` },
    { id: "strengths", label: "Strengths" },
  ];
  return (
    <div>
      <div style={{ background: `linear-gradient(135deg, ${lvlMeta.bg}, #080d18)`, border: `1px solid ${lvlMeta.border}`, borderRadius: 16, padding: "20px 22px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, fontSize: 80, opacity: 0.08 }}>{lvlMeta.emoji}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 22 }}>{lvlMeta.emoji}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: lvlMeta.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{lvlMeta.label} Mode · Mentor Feedback</span>
        </div>
        <p style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.75, margin: 0 }}>{feedback.overall_assessment}</p>
        {feedback.encouragement && (
          <div style={{ marginTop: 12, background: "#0a1020", borderRadius: 10, padding: "10px 14px", borderLeft: `3px solid ${lvlMeta.color}` }}>
            <p style={{ fontSize: 13, color: lvlMeta.color, margin: 0, fontStyle: "italic" }}>"{feedback.encouragement}"</p>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "1px solid #1e293b" }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: "8px 8px 0 0", color: activeSection === s.id ? "#e2e8f0" : "#475569", borderBottom: activeSection === s.id ? "2px solid #3b82f6" : "2px solid transparent", transition: "all 0.15s" }}>
            {s.label}
          </button>
        ))}
      </div>
      {activeSection === "mistakes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(feedback.mistakes_explained || []).map((m, i) => <MistakeCard key={i} mistake={m} idx={i} />)}
          {!(feedback.mistakes_explained?.length) && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✨</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#22c55e" }}>No significant issues found!</p>
            </div>
          )}
        </div>
      )}
      {activeSection === "tips" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(feedback.personalized_tips || []).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>💡 Personalized Tips</div>
              {feedback.personalized_tips.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#080d18", border: "1px solid #1e293b", borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{tip}</p>
                </div>
              ))}
            </div>
          )}
          {(feedback.next_steps || []).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#06b6d4", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>🚀 Next Steps</div>
              {feedback.next_steps.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", background: "#080d18", border: "1px solid #1e293b", borderRadius: 10, marginBottom: 8 }}>
                  <span style={{ color: "#22c55e", fontWeight: 700, flexShrink: 0 }}>→</span>
                  <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 }}>{step}</p>
                </div>
              ))}
            </div>
          )}
          {(feedback.skill_areas_to_improve || []).length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>📈 Skills to Develop</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {feedback.skill_areas_to_improve.map((skill, i) => (
                  <div key={i} style={{ background: "#1c1003", border: "1px solid #854d0e44", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>{skill}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {activeSection === "resources" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(feedback.learning_resources || []).map((r, i) => <ResourceCard key={i} resource={r} />)}
          {!(feedback.learning_resources?.length) && (
            <div style={{ textAlign: "center", padding: 40, color: "#475569" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📚</div>
              <p>No resources available for this session.</p>
            </div>
          )}
        </div>
      )}
      {activeSection === "strengths" && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>✅ What You Did Well</div>
          {(feedback.strengths_identified || []).length > 0
            ? feedback.strengths_identified.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "#052e16", border: "1px solid #166534", borderRadius: 12, marginBottom: 8 }}>
                <span style={{ color: "#22c55e", fontSize: 18, flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 13, color: "#86efac", margin: 0, lineHeight: 1.65 }}>{s}</p>
              </div>
            ))
            : <div style={{ textAlign: "center", padding: 40, color: "#475569" }}><div style={{ fontSize: 36 }}>🌱</div><p>Keep practicing — strengths will show!</p></div>
          }
        </div>
      )}
    </div>
  );
}

/* ─── MentorLoading ──────────────────────────────────────────────── */
function MentorLoading({ level }) {
  const lvlMeta = LEVELS.find(l => l.id === level) || LEVELS[0];
  const phrases = ["Reading your code carefully…","Identifying learning opportunities…","Preparing personalized feedback…","Curating resources for you…","Almost ready…"];
  const [phraseIdx, setPhraseIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setPhraseIdx(i => (i + 1) % phrases.length), 1800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: "60px 40px" }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: "bounce 1s ease infinite" }}>{lvlMeta.emoji}</div>
      <h3 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: lvlMeta.color, letterSpacing: "0.06em", margin: "0 0 8px" }}>Your Mentor Is Reviewing…</h3>
      <p style={{ fontSize: 14, color: "#475569", animation: "pulse 1.8s ease infinite", margin: 0 }}>{phrases[phraseIdx]}</p>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: lvlMeta.color, animation: `pulse ${1+i*0.2}s ease infinite` }} />)}
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function AIMentorPage() {
  const [code, setCode]             = useState("");
  const [language, setLanguage]     = useState("python");
  const [expertiseLevel, setLevel]  = useState("beginner");
  const [focusAreas, setFocusAreas] = useState([]);
  const [question, setQuestion]     = useState("");
  const [feedback, setFeedback]     = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [detectedLang, setDetectedLang] = useState(null);
  const [autoDetect, setAutoDetect] = useState(true);
  const [history, setHistory]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const feedbackRef = useRef(null);
  const CHAR_LIMIT = 10000;
  const FOCUS_OPTIONS = ["security","performance","readability","best_practices","bugs","architecture"];

  useEffect(() => {
    if (!autoDetect || code.trim().length < 15) { setDetectedLang(null); return; }
    setDetectedLang(detectLanguage(code));
  }, [code, autoDetect]);

  const toggleFocus = f => setFocusAreas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);

  const submit = async () => {
    if (!code.trim()) { setError("Please paste some code to review."); return; }
    setError(""); setLoading(true); setFeedback(null);
    try {
      const res = await fetch(`${API}/mentor/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ language, code, expertise_level: expertiseLevel, focus_areas: focusAreas.length > 0 ? focusAreas : null, specific_question: question.trim() || null }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Request failed"); }
      const data = await res.json();
      setFeedback(data.feedback);
      setHistory(prev => [{ date: new Date().toLocaleDateString(), language, expertiseLevel, issues: data.feedback.mistakes_explained?.length || 0, snippet: code.slice(0, 80) }, ...prev.slice(0, 4)]);
      setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      setError(e.message || "Something went wrong. Is the backend running?");
    }
    setLoading(false);
  };

  const reset = () => { setFeedback(null); setCode(""); setQuestion(""); setDetectedLang(null); };
  const lvlMeta = LEVELS.find(l => l.id === expertiseLevel) || LEVELS[0];
  const overLimit = code.length > CHAR_LIMIT;

  return (
    <div style={{ minHeight: "100vh", background: "#050810", fontFamily: "'Outfit',sans-serif", color: "#e2e8f0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        textarea:focus { outline:none; border-color:#3b82f6 !important; box-shadow:0 0 0 3px #3b82f620; }
        select:focus, input:focus { outline:none; border-color:#3b82f6 !important; }
        ::-webkit-scrollbar{width:6px;height:6px} ::-webkit-scrollbar-track{background:#080d18} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:99px}
        .submit-btn{background:linear-gradient(135deg,#1d4ed8,#2563eb);border:none;border-radius:12px;color:#fff;font-family:'Outfit',sans-serif;font-size:15px;font-weight:800;padding:14px 32px;cursor:pointer;transition:all 0.2s;}
        .submit-btn:hover{filter:brightness(1.12);transform:translateY(-1px);box-shadow:0 4px 20px #3b82f644;}
        .submit-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none;}
        .focus-pill{background:none;border:1px solid #1e293b;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Outfit',sans-serif;color:#475569;transition:all 0.15s;letter-spacing:0.06em;text-transform:uppercase;}
        .focus-pill.active{border-color:#3b82f6;color:#60a5fa;background:#1e40af22;}
        .focus-pill:hover{border-color:#334155;color:#94a3b8;}
      `}</style>

      {/* Sticky Header */}
      <div style={{ background: "#080d18", borderBottom: "1px solid #1e293b", padding: "20px 28px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎓</div>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 26, color: "#e2e8f0", letterSpacing: "0.06em", margin: 0 }}>AI Code Mentor</h1>
            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>Auto-detect · Snippet suggestions · Syntax preview · Personalized feedback</p>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {history.length > 0 && (
              <button onClick={() => setShowHistory(p => !p)} style={{ background: showHistory ? "#1e293b" : "transparent", border: "1px solid #334155", borderRadius: 10, padding: "8px 14px", fontSize: 12, fontWeight: 700, color: "#94a3b8", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                📋 History ({history.length})
              </button>
            )}
            {feedback && (
              <button onClick={reset} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, color: "#94a3b8", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                ← New Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Drawer */}
      {showHistory && (
        <div style={{ background: "#080d18", borderBottom: "1px solid #1e293b", padding: "16px 28px", animation: "fadeUp 0.2s ease" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Recent Sessions</div>
            <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
              {history.map((h, i) => (
                <div key={i} style={{ flexShrink: 0, background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 10, padding: "10px 14px", minWidth: 180 }}>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 4 }}>{h.date}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>{h.language.toUpperCase()} · {h.expertiseLevel}</div>
                  <div style={{ fontSize: 11, color: "#ef4444" }}>{h.issues} issues found</div>
                  <div style={{ fontSize: 10, color: "#334155", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.snippet}…</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        {!feedback && !loading && (
          <div style={{ animation: "fadeUp 0.4s ease" }}>

            {/* Level */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Your Expertise Level</div>
              <LevelPicker value={expertiseLevel} onChange={setLevel} />
            </div>

            {/* Auto-detect toggle */}
            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setAutoDetect(p => !p)} style={{ width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer", background: autoDetect ? "#3b82f6" : "#1e293b", position: "relative", transition: "background 0.2s" }}>
                <div style={{ position: "absolute", top: 3, left: autoDetect ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
              <span style={{ fontSize: 12, color: autoDetect ? "#60a5fa" : "#475569", fontWeight: 600 }}>
                🔍 Auto-detect language {autoDetect && detectedLang && <span style={{ color: "#64748b" }}>— seeing <strong style={{ color: "#06b6d4" }}>{detectedLang.toUpperCase()}</strong></span>}
              </span>
            </div>

            {/* Code Editor */}
            <div style={{ marginBottom: 20 }}>
              <CodeEditor value={code} onChange={setCode} language={language} onLanguageChange={setLanguage} detectedLang={autoDetect ? detectedLang : null} />
              {code.length > CHAR_LIMIT * 0.8 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                  <div style={{ flex: 1, height: 3, background: "#1e293b", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (code.length / CHAR_LIMIT) * 100)}%`, background: overLimit ? "#ef4444" : "#f59e0b", transition: "width 0.2s" }} />
                  </div>
                  <span style={{ fontSize: 11, color: overLimit ? "#ef4444" : "#f59e0b" }}>{code.length}/{CHAR_LIMIT}</span>
                </div>
              )}
            </div>

            {/* Focus areas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                Focus Areas <span style={{ fontSize: 10, color: "#334155", fontWeight: 400 }}>(optional)</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {FOCUS_OPTIONS.map(f => <button key={f} onClick={() => toggleFocus(f)} className={`focus-pill ${focusAreas.includes(f) ? "active" : ""}`}>{f.replace("_", " ")}</button>)}
              </div>
            </div>

            {/* Question */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                Specific Question <span style={{ fontSize: 10, color: "#334155", fontWeight: 400 }}>(optional)</span>
              </div>
              <input type="text" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && code.trim() && submit()}
                placeholder="e.g. Why is this slow? How can I make this more secure?"
                style={{ width: "100%", padding: "11px 14px", background: "#080d18", border: "1px solid #1e293b", borderRadius: 10, color: "#e2e8f0", fontSize: 13, fontFamily: "'Outfit',sans-serif", transition: "border-color 0.15s" }} />
            </div>

            {error && (
              <div style={{ background: "#2d0a0a", border: "1px solid #991b1b", borderRadius: 10, padding: "10px 14px", color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <button className="submit-btn" onClick={submit} disabled={!code.trim() || overLimit}>
                {lvlMeta.emoji} Get Mentor Feedback
              </button>
              <span style={{ fontSize: 12, color: "#334155" }}>
                Mode: <strong style={{ color: lvlMeta.color }}>{lvlMeta.label}</strong> · Lang: <strong style={{ color: "#60a5fa" }}>{language.toUpperCase()}</strong>
              </span>
              {overLimit && <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>⚠ Too long (max {CHAR_LIMIT} chars)</span>}
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: "#334155" }}>
              ⌨ <kbd style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "#94a3b8" }}>Tab</kbd> inserts snippets or 4 spaces ·
              <kbd style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 4, padding: "1px 5px", fontSize: 10, color: "#94a3b8", marginLeft: 4 }}>Enter</kbd> in question box submits
            </div>

            <div style={{ marginTop: 36, background: "#080d18", border: "1px solid #1e293b", borderRadius: 16, padding: "20px 22px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>New Features</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { icon:"🔍", title:"Auto-Detection", text:"Paste code and language is detected from syntax patterns instantly." },
                  { icon:"💡", title:"Snippet Suggestions", text:"Type 2+ chars for context-aware snippets. Tab to insert, Esc to dismiss." },
                  { icon:"🎨", title:"Syntax Preview", text:"Toggle preview to see color-coded syntax highlighting of your code." },
                ].map(c => (
                  <div key={c.title} style={{ background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 6 }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {loading && <MentorLoading level={expertiseLevel} />}

        {feedback && !loading && (
          <div ref={feedbackRef} style={{ animation: "fadeUp 0.5s ease" }}>
            <FeedbackPanel feedback={feedback} level={expertiseLevel} />
            <div style={{ display: "flex", gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #1e293b" }}>
              <button onClick={reset} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#94a3b8", cursor: "pointer", fontFamily: "'Outfit',sans-serif", flex: 1 }}>
                ← Review Another Snippet
              </button>
              <button onClick={() => {
                const txt = [`AI MENTOR FEEDBACK — ${new Date().toLocaleDateString()}`,`Level: ${expertiseLevel.toUpperCase()} | Language: ${language.toUpperCase()}`,"\n"+feedback.overall_assessment,"\nISSUES FOUND:",...(feedback.mistakes_explained||[]).map((m,i)=>`${i+1}. [${m.category.toUpperCase()}] ${m.issue}\n   ${m.explanation}`),"\nNEXT STEPS:",...(feedback.next_steps||[]).map(s=>`→ ${s}`)].join("\n");
                navigator.clipboard.writeText(txt).then(()=>alert("Copied!"));
              }} style={{ background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "'Outfit',sans-serif" }}>
                📋 Copy Feedback
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}