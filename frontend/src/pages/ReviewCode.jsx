import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { reviewAPI } from '../services/api';

const ReviewCode = () => {
  const [code, setCode] = useState('// Paste your code here or start typing...\n\n');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [autoDetected, setAutoDetected] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState('');

  const navigate = useNavigate();
  const detectionTimeoutRef = useRef(null);

  const languages = [
    { value: 'javascript', label: 'JavaScript', icon: '📜' },
    { value: 'python',     label: 'Python',     icon: '🐍' },
    { value: 'java',       label: 'Java',       icon: '☕' },
    { value: 'cpp',        label: 'C++',        icon: '⚙️' },
    { value: 'typescript', label: 'TypeScript', icon: '📘' },
    { value: 'go',         label: 'Go',         icon: '🔷' },
    { value: 'rust',       label: 'Rust',       icon: '🦀' },
    { value: 'csharp',     label: 'C#',         icon: '🎯' },
    { value: 'php',        label: 'PHP',        icon: '🐘' },
    { value: 'ruby',       label: 'Ruby',       icon: '💎' },
    { value: 'swift',      label: 'Swift',      icon: '🦅' },
    { value: 'kotlin',     label: 'Kotlin',     icon: '🅺' },
    { value: 'sql',        label: 'SQL',        icon: '🗄️' },
    { value: 'bash',       label: 'Bash',       icon: '🐚' },
  ];

  // ── Confidence-based language detector ──────────────────────────
  // Each language has an array of signal patterns with weights.
  // The language with the highest total score wins, provided it
  // clears a minimum confidence threshold (avoids false positives
  // on very short snippets).
  const detectLanguage = useCallback((codeString) => {
    const t = codeString.trim();
    if (!t || t === '// Paste your code here or start typing...') {
      return { lang: language, confidence: 0 };
    }

    const RULES = {
      python: [
        // Strong signals
        { re: /^\s*def\s+\w+\s*\(/m,               w: 10 }, // function def
        { re: /^\s*class\s+\w+.*:/m,                w: 10 }, // class def
        { re: /from\s+[\w.]+\s+import\s+/,          w:  9 }, // from x import
        { re: /^\s*import\s+\w+/m,                  w:  5 }, // import
        { re: /print\s*\(/,                          w:  4 }, // print()
        { re: /if\s+__name__\s*==\s*['"]__main__['"]/, w: 15 }, // main guard
        { re: /:\s*$\n\s+/m,                        w:  4 }, // colon + indented block
        { re: /^\s*(elif|else\s*:)/m,               w:  6 }, // elif / else:
        { re: /->\s*\w+\s*:/,                       w:  5 }, // return type annotation
        { re: /self\.\w+/,                          w:  7 }, // self.x
        { re: /@\w+\s*\n\s*def/,                   w:  8 }, // decorator + def
        { re: /f['"].*\{.*\}/,                      w:  6 }, // f-string
        { re: /lambda\s+\w+\s*:/,                   w:  7 }, // lambda
        { re: /"""[\s\S]*?"""/,                     w:  4 }, // docstring
        { re: /^\s*#.*/m,                           w:  1 }, // comment (weak)
        // Negative signals (penalise)
        { re: /\bvar\s+\w+\s*=/,                    w: -5 },
        { re: /\bfunc\s+\w+/,                       w: -5 },
      ],
      typescript: [
        { re: /interface\s+\w+\s*\{/,               w: 12 },
        { re: /type\s+\w+\s*=\s*/,                  w: 10 },
        { re: /:\s*(string|number|boolean|any|void|never|unknown)\b/, w: 8 },
        { re: /<[A-Z]\w*>/,                         w:  6 }, // generics
        { re: /as\s+(string|number|boolean|any)\b/, w:  7 },
        { re: /enum\s+\w+\s*\{/,                    w: 10 },
        { re: /readonly\s+\w+/,                     w:  8 },
        { re: /\?\s*:/,                             w:  5 }, // optional chaining type
        { re: /implements\s+\w+/,                   w:  7 },
        { re: /export\s+(interface|type|enum)\b/,   w: 10 },
        { re: /:\s*\w+\[\]/,                        w:  5 }, // array type
        { re: /Partial<|Required<|Readonly<|Record</, w: 10 }, // utility types
      ],
      javascript: [
        { re: /console\.(log|warn|error|info)\s*\(/, w: 8 },
        { re: /const\s+\w+\s*=/,                    w: 4 },
        { re: /let\s+\w+\s*=/,                      w: 4 },
        { re: /=>\s*[\{(]/,                         w: 6 }, // arrow fn
        { re: /function\s*\w*\s*\(/,                w: 5 },
        { re: /\.then\s*\(|\.catch\s*\(|\.finally\s*\(/, w: 7 },
        { re: /async\s+(function|\w+\s*=>|\(\s*\))/,w: 7 },
        { re: /require\s*\(['"]/,                   w: 8 },
        { re: /module\.exports\s*=/,                w: 9 },
        { re: /document\.|window\.|navigator\./,    w: 8 },
        { re: /\$\s*\(['"]/,                        w: 7 }, // jQuery
        { re: /import\s+\w+\s+from\s+['"]/,        w: 5 },
        { re: /export\s+default\b/,                 w: 5 },
        { re: /useState|useEffect|useRef|useCallback/, w: 8 }, // React hooks
        // Penalise TS signals
        { re: /:\s*(string|number|boolean)\b/,      w: -4 },
        { re: /interface\s+\w+/,                    w: -6 },
      ],
      java: [
        { re: /public\s+(class|interface|enum)\s+\w+/, w: 12 },
        { re: /System\.out\.(print|println)\s*\(/, w: 10 },
        { re: /package\s+[\w.]+;/,                  w: 10 },
        { re: /@Override\b/,                        w:  9 },
        { re: /public\s+static\s+void\s+main/,      w: 14 },
        { re: /new\s+\w+\s*\(/,                     w:  4 },
        { re: /import\s+java\./,                    w: 12 },
        { re: /throws\s+\w+/,                       w:  8 },
        { re: /extends\s+\w+/,                      w:  5 },
        { re: /implements\s+\w+/,                   w:  5 },
        { re: /private|protected|public/,           w:  2 },
        { re: /\bvoid\s+\w+\s*\(/,                  w:  5 },
        { re: /ArrayList|HashMap|LinkedList/,       w:  9 },
      ],
      cpp: [
        { re: /#include\s*<\w+>/,                   w: 12 },
        { re: /#include\s*["<][\w./]+[">]/,         w: 10 },
        { re: /std::/,                              w:  9 },
        { re: /cout\s*<</,                          w: 10 },
        { re: /cin\s*>>/,                           w: 10 },
        { re: /template\s*</,                       w: 10 },
        { re: /nullptr\b/,                          w:  9 },
        { re: /::\w+/,                              w:  5 },
        { re: /\bvector<|map<|pair<|set</,          w:  9 },
        { re: /->/,                                 w:  3 }, // pointer access
        { re: /new\s+\w+|delete\s+/,               w:  5 },
        { re: /int\s+main\s*\(/,                    w: 10 },
        { re: /\*\w+|\w+\s*\*/,                    w:  2 }, // pointers (weak)
        { re: /sizeof\s*\(/,                        w:  6 },
      ],
      go: [
        { re: /^package\s+\w+/m,                    w: 12 },
        { re: /func\s+\w+\s*\(/,                    w:  8 },
        { re: /fmt\.(Println?|Printf|Scanf?)\s*\(/, w: 10 },
        { re: /:=\s*/,                              w:  8 }, // short variable decl
        { re: /go\s+func/,                          w: 12 }, // goroutine
        { re: /chan\s+\w+/,                         w: 10 }, // channel
        { re: /import\s+\(/,                        w:  7 }, // multi-import block
        { re: /\bdefer\s+/,                         w: 10 },
        { re: /\bselect\s*\{/,                      w: 10 },
        { re: /\binterface\s*\{/,                   w:  6 },
        { re: /\bstruct\s*\{/,                      w:  7 },
        { re: /make\s*\(|append\s*\(/,              w:  6 },
        { re: /\berr\s*!=\s*nil/,                   w: 10 },
      ],
      rust: [
        { re: /fn\s+\w+\s*\(/,                      w:  8 },
        { re: /let\s+mut\s+/,                       w: 10 },
        { re: /println!\s*\(/,                      w: 10 },
        { re: /impl\s+\w+/,                         w:  9 },
        { re: /->\s*\w+\s*\{/,                      w:  7 }, // return type
        { re: /\buse\s+\w+::/,                      w:  9 },
        { re: /\bpub\s+(fn|struct|enum)\b/,         w: 10 },
        { re: /\bmatch\s+\w+\s*\{/,                 w:  8 },
        { re: /Some\(|None\b|Ok\(|Err\(/,           w:  9 },
        { re: /\bstruct\s+\w+\s*\{/,               w:  7 },
        { re: /\benum\s+\w+\s*\{/,                  w:  7 },
        { re: /\blifetime\b|'\w+\b/,               w:  8 }, // lifetimes
        { re: /\bunsafe\s*\{/,                      w: 10 },
        { re: /#\[derive\(/,                        w: 12 }, // derive macro
        { re: /vec!\[/,                             w:  9 },
      ],
      csharp: [
        { re: /using\s+System(\.\w+)*;/,            w: 10 },
        { re: /namespace\s+\w+/,                    w: 10 },
        { re: /public\s+(class|interface|struct|enum)\s+\w+/, w: 10 },
        { re: /Console\.(Write|WriteLine)\s*\(/,    w: 10 },
        { re: /async\s+Task(<|>|\s)/,               w: 10 },
        { re: /await\s+/,                           w:  6 },
        { re: /\.Where\s*\(|\.Select\s*\(|\.ToList\s*\(/, w: 8 }, // LINQ
        { re: /\bvar\s+\w+\s*=/,                    w:  5 },
        { re: /\bnew\s+List<|new\s+Dictionary</,   w:  8 },
        { re: /\[HttpGet\]|\[Route\]|\[ApiController\]/, w: 12 }, // ASP.NET
        { re: /get\s*;\s*set\s*;/,                  w:  9 }, // auto-property
        { re: /\$".*\{.*\}"/,                       w:  8 }, // string interpolation
        { re: /\boveride\b|\bvirtual\b|\babstract\b/, w: 6 },
      ],
      php: [
        { re: /<\?php\b/,                           w: 15 }, // definitive
        { re: /\$\w+\s*=/,                          w:  8 },
        { re: /echo\s+/,                            w:  7 },
        { re: /\$this->/,                           w: 10 },
        { re: /function\s+\w+\s*\(/,               w:  4 },
        { re: /\barray\s*\(/,                       w:  6 },
        { re: /->[\w]+\s*\(/,                       w:  4 },
        { re: /namespace\s+\w+;/,                   w:  8 },
        { re: /use\s+\w+\\+\w+;/,                  w:  9 }, // use with backslash
        { re: /\bpublic\s+function\b/,              w:  9 },
        { re: /\bextendssome\s+\w+/,               w:  5 },
      ],
      ruby: [
        { re: /^\s*def\s+\w+\s*$/m,                w:  9 }, // def without parens
        { re: /^\s*end\s*$/m,                       w:  8 },
        { re: /puts\s+/,                            w:  9 },
        { re: /require\s+['"]/,                     w:  7 },
        { re: /:\w+\s*=>/,                          w:  9 }, // symbol hash rocket
        { re: /@\w+\s*=/,                           w:  6 }, // instance var
        { re: /\bdo\s*\|.*\|/,                      w: 10 }, // block with args
        { re: /\.each\s*\{|\. map\s*\{/,           w:  8 },
        { re: /attr_accessor|attr_reader/,          w: 12 },
        { re: /class\s+\w+\s*<\s*\w+/,             w:  9 }, // class inheritance
        { re: /p\s+\w+|pp\s+\w+/,                  w:  4 },
        { re: /\bnil\b/,                            w:  4 },
      ],
      swift: [
        { re: /\bfunc\s+\w+\s*\(/,                  w:  7 },
        { re: /var\s+\w+\s*:\s*\w+/,               w:  8 },
        { re: /let\s+\w+\s*:\s*\w+/,               w:  8 },
        { re: /import\s+(Foundation|UIKit|SwiftUI|Combine)/, w: 13 },
        { re: /guard\s+let\b/,                      w: 11 },
        { re: /\boptional\b|\?\s*\./,              w:  6 }, // optional chaining
        { re: /\bstruct\s+\w+\s*:/,                w:  8 },
        { re: /\bprotocol\s+\w+/,                  w:  9 },
        { re: /@State|@Binding|@ObservedObject/,    w: 12 }, // SwiftUI
        { re: /print\s*\(/,                         w:  3 }, // weak (shared with others)
        { re: /\bnil\b/,                            w:  4 },
        { re: /override\s+func/,                   w:  8 },
        { re: /self\.\w+/,                          w:  3 },
      ],
      kotlin: [
        { re: /fun\s+\w+\s*\(/,                     w: 10 },
        { re: /\bval\s+\w+\s*(:|=)/,               w:  8 },
        { re: /\bvar\s+\w+\s*:\s*\w+/,             w:  7 },
        { re: /when\s*\(/,                          w: 10 },
        { re: /data\s+class\s+\w+/,                w: 13 },
        { re: /object\s+\w+\s*\{/,                 w: 10 },
        { re: /\bcompa nion\s+object\b/,            w: 12 },
        { re: /println\s*\(/,                       w:  8 },
        { re: /:\s*\w+\(\)/,                        w:  6 }, // class inheritance
        { re: /\bnullable\b|\?\s*:/,               w:  7 },
        { re: /import\s+kotlin\./,                  w: 12 },
        { re: /\.let\s*\{|\.also\s*\{|\.run\s*\{/, w:  9 }, // scope functions
        { re: /listOf\(|mapOf\(|setOf\(/,           w:  9 },
      ],
      sql: [
        { re: /\bSELECT\b/i,                        w:  9 },
        { re: /\bFROM\b/i,                          w:  7 },
        { re: /\bWHERE\b/i,                         w:  6 },
        { re: /\bINSERT\s+INTO\b/i,                 w: 11 },
        { re: /\bUPDATE\s+\w+\s+SET\b/i,            w: 11 },
        { re: /\bDELETE\s+FROM\b/i,                 w: 11 },
        { re: /\bCREATE\s+TABLE\b/i,                w: 12 },
        { re: /\bDROP\s+TABLE\b/i,                  w: 11 },
        { re: /\bJOIN\b/i,                          w:  7 },
        { re: /\bGROUP\s+BY\b/i,                    w:  9 },
        { re: /\bORDER\s+BY\b/i,                    w:  9 },
        { re: /\bHAVING\b/i,                        w:  8 },
        { re: /\bINNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN\b/i, w: 10 },
      ],
      bash: [
        { re: /^#!.*\/(ba)?sh\b/m,                  w: 15 }, // shebang
        { re: /\$\{?\w+\}?/,                        w:  5 }, // $VAR
        { re: /\becho\s+/,                          w:  6 },
        { re: /\bif\s+\[/,                          w: 10 }, // [ test ]
        { re: /\bfi\b/,                             w:  9 },
        { re: /\bdone\b/,                           w:  7 },
        { re: /\bfor\s+\w+\s+in\b/,                w:  9 },
        { re: /\bwhile\s+\[/,                       w:  9 },
        { re: /\|\s*grep\b|\|\s*awk\b|\|\s*sed\b/, w: 10 },
        { re: /\bsource\s+\.|^\.\s+\w+/m,          w:  8 },
        { re: /\bexport\s+\w+=/,                    w:  8 },
        { re: /\bchmod\b|\bchown\b|\bsudo\b/,       w:  8 },
        { re: /\b\d+\s*>/,                          w:  4 }, // redirect
      ],
    };

    // Score each language
    const scores = {};
    for (const [lang, rules] of Object.entries(RULES)) {
      scores[lang] = rules.reduce((sum, { re, w }) => sum + (re.test(t) ? w : 0), 0);
    }

    // Pick winner
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [winner, topScore] = sorted[0];
    const [, runnerUpScore] = sorted[1] || ['', 0];

    // Require a minimum score AND a meaningful gap over runner-up
    const MIN_SCORE = 8;
    const MIN_GAP   = 3;
    if (topScore < MIN_SCORE || topScore - runnerUpScore < MIN_GAP) {
      return { lang: language, confidence: topScore }; // keep current
    }

    return { lang: winner, confidence: topScore };
  }, [language]);

  // Auto-detect language as user types (debounced)
  useEffect(() => {
    if (detectionTimeoutRef.current) {
      clearTimeout(detectionTimeoutRef.current);
    }

    const trimmed = code.trim();
    if (!trimmed || trimmed === '// Paste your code here or start typing...') {
      return;
    }

    detectionTimeoutRef.current = setTimeout(() => {
      const { lang: detectedLang } = detectLanguage(code);
      if (detectedLang !== language) {
        const langMeta = languages.find(l => l.value === detectedLang);
        setLanguage(detectedLang);
        setDetectedLabel(langMeta ? `${langMeta.icon} ${langMeta.label}` : detectedLang);
        setAutoDetected(true);
        setTimeout(() => setAutoDetected(false), 3000);
      }
    }, 500);

    return () => {
      if (detectionTimeoutRef.current) {
        clearTimeout(detectionTimeoutRef.current);
      }
    };
  }, [code, detectLanguage, language]);

  const handleSubmit = async () => {
    const trimmedCode = code.trim();
    
    if (!trimmedCode || trimmedCode === '// Paste your code here or start typing...') {
      setError('Please enter some code to review');
      return;
    }

    const { lang: detectedLang } = detectLanguage(trimmedCode);
    if (detectedLang !== language) {
      setLanguage(detectedLang);
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data } = await reviewAPI.submitReview({
        code: trimmedCode,
        language: detectedLang,
      });
      
      if (!data || !data.scores) {
        throw new Error('Invalid response from server');
      }
      
      setResult(data);
    } catch (err) {
      console.error('Error submitting review:', err);
      const errorMessage = err.response?.data?.message || 'Failed to submit code for review. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit();
    }
  }, [code, language]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setCode(text);
      }
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  const handleClearCode = () => {
    setCode('// Paste your code here or start typing...\n\n');
    setResult(null);
    setError(null);
    setLanguage('javascript');
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-accent-emerald';
    if (score >= 6) return 'text-accent-amber';
    return 'text-accent-rose';
  };

  const getScoreBgColor = (score) => {
    if (score >= 8) return 'bg-accent-emerald/10 border-accent-emerald/30';
    if (score >= 6) return 'bg-accent-amber/10 border-accent-amber/30';
    return 'bg-accent-rose/10 border-accent-rose/30';
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-display font-bold text-gradient mb-2">Code Review</h1>
        <p className="text-gray-400">Submit your code for AI-powered analysis</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Code Editor */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold">Your Code</h2>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyCode}
                className="px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-sm transition-colors"
                title="Copy code (Ctrl+C)"
              >
                {copied ? '✓ Copied' : '📋 Copy'}
              </button>

              <button
                onClick={handlePasteCode}
                className="px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-sm transition-colors"
                title="Paste code (Ctrl+V)"
              >
                📥 Paste
              </button>

              <button
                onClick={handleClearCode}
                className="px-3 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg text-sm transition-colors"
                title="Clear code"
              >
                🗑️ Clear
              </button>

              {/* Language Selector */}
              <div className="relative">
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setAutoDetected(false);
                  }}
                  className="px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  aria-label="Select programming language"
                >
                  {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.icon} {lang.label}
                    </option>
                  ))}
                </select>
                
                {/* Auto-detected indicator — now shows which language was detected */}
                <AnimatePresence>
                  {autoDetected && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.9 }}
                      className="absolute -top-9 left-0 right-0 text-center pointer-events-none"
                    >
                      <span className="text-xs bg-primary-500 text-white px-2 py-1 rounded-full shadow-lg whitespace-nowrap">
                        ✨ Detected: {detectedLabel}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="border border-dark-700 rounded-lg overflow-hidden">
            <Editor
              height="500px"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={(editor) => {
                editor.addCommand(
                  window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
                  handleSubmit
                );
              }}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
                padding: { top: 10, bottom: 10 },
              }}
            />
          </div>

          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed text-lg py-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                '🔍 Analyze Code'
              )}
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              Press Ctrl+Enter to analyze • Language auto-detected
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-sm text-accent-rose"
              >
                ⚠️ {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right: Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4">AI Feedback</h2>

          {!result && !loading && (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-500">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-center">Submit your code to see AI-powered feedback</p>
              <p className="text-sm text-gray-600 mt-2">Auto-detects language • Instant analysis</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center h-[500px]">
              <div className="animate-spin w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-400">Analyzing your code...</p>
              <p className="text-sm text-gray-600 mt-2">This may take a few seconds</p>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 max-h-[700px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-dark-900"
            >
              {/* Overall Score */}
              <div className={`text-center p-6 rounded-xl border ${getScoreBgColor(result.scores?.overall_score || 0)}`}>
                <p className="text-gray-400 text-sm mb-2">Overall Score</p>
                <p className={`text-6xl font-bold ${getScoreColor(result.scores?.overall_score || 0)}`}>
                  {result.scores?.overall_score || 0}/10
                </p>
                <div className="mt-3">
                  {result.scores?.overall_score >= 8 && (
                    <span className="text-sm text-accent-emerald">🎉 Excellent Code!</span>
                  )}
                  {result.scores?.overall_score >= 6 && result.scores?.overall_score < 8 && (
                    <span className="text-sm text-accent-amber">👍 Good Job!</span>
                  )}
                  {result.scores?.overall_score < 6 && (
                    <span className="text-sm text-accent-rose">💪 Room for Improvement</span>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                {result.scores?.quality_score !== undefined && (
                  <div className="p-4 bg-dark-800/50 rounded-lg border border-dark-700 hover:border-primary-500/50 transition-colors">
                    <p className="text-gray-400 text-sm mb-1">Quality</p>
                    <p className={`text-2xl font-bold ${getScoreColor(result.scores.quality_score)}`}>
                      {result.scores.quality_score}/10
                    </p>
                  </div>
                )}
                {result.scores?.readability_score !== undefined && (
                  <div className="p-4 bg-dark-800/50 rounded-lg border border-dark-700 hover:border-primary-500/50 transition-colors">
                    <p className="text-gray-400 text-sm mb-1">Readability</p>
                    <p className={`text-2xl font-bold ${getScoreColor(result.scores.readability_score)}`}>
                      {result.scores.readability_score}/10
                    </p>
                  </div>
                )}
                {result.scores?.performance_score !== undefined && (
                  <div className="p-4 bg-dark-800/50 rounded-lg border border-dark-700 hover:border-primary-500/50 transition-colors">
                    <p className="text-gray-400 text-sm mb-1">Performance</p>
                    <p className={`text-2xl font-bold ${getScoreColor(result.scores.performance_score)}`}>
                      {result.scores.performance_score}/10
                    </p>
                  </div>
                )}
                {result.scores?.security_score !== undefined && (
                  <div className="p-4 bg-dark-800/50 rounded-lg border border-dark-700 hover:border-primary-500/50 transition-colors">
                    <p className="text-gray-400 text-sm mb-1">Security</p>
                    <p className={`text-2xl font-bold ${getScoreColor(result.scores.security_score)}`}>
                      {result.scores.security_score}/10
                    </p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {result.ai_feedback?.summary && (
                <div className="p-4 bg-dark-800/50 rounded-lg border-l-4 border-primary-500">
                  <p className="text-sm font-medium text-gray-400 mb-2">📝 Summary</p>
                  <p className="text-gray-200 leading-relaxed">{result.ai_feedback.summary}</p>
                </div>
              )}

              {/* Detailed Feedback */}
              <div className="space-y-4">
                {result.ai_feedback?.bugs?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-accent-rose mb-2 flex items-center gap-2">
                      🐛 Potential Bugs ({result.ai_feedback.bugs.length})
                    </h3>
                    <ul className="space-y-2">
                      {result.ai_feedback.bugs.map((bug, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-sm leading-relaxed"
                        >
                          {bug}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.ai_feedback?.performance?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-accent-amber mb-2 flex items-center gap-2">
                      ⚡ Performance ({result.ai_feedback.performance.length})
                    </h3>
                    <ul className="space-y-2">
                      {result.ai_feedback.performance.map((perf, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 bg-accent-amber/10 border border-accent-amber/30 rounded-lg text-sm leading-relaxed"
                        >
                          {perf}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.ai_feedback?.style?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-primary-400 mb-2 flex items-center gap-2">
                      ✨ Style & Best Practices ({result.ai_feedback.style.length})
                    </h3>
                    <ul className="space-y-2">
                      {result.ai_feedback.style.map((style, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg text-sm leading-relaxed"
                        >
                          {style}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.ai_feedback?.security?.length > 0 && (
                  <div>
                    <h3 className="font-bold text-accent-violet mb-2 flex items-center gap-2">
                      🔒 Security ({result.ai_feedback.security.length})
                    </h3>
                    <ul className="space-y-2">
                      {result.ai_feedback.security.map((sec, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="p-3 bg-accent-violet/10 border border-accent-violet/30 rounded-lg text-sm leading-relaxed"
                        >
                          {sec}
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleClearCode}
                  className="flex-1 px-4 py-3 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg transition-colors"
                >
                  🔄 Analyze Another
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-4 py-3 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/30 rounded-lg transition-colors"
                >
                  🖨️ Print Report
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReviewCode;