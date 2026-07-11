import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { reviewAPI } from '../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const LANG_META = {
  javascript: { emoji: '📜', color: '#f7df1e', name: 'JavaScript' },
  typescript: { emoji: '📘', color: '#3178c6', name: 'TypeScript' },
  python:     { emoji: '🐍', color: '#3776ab', name: 'Python' },
  java:       { emoji: '☕', color: '#ed8b00', name: 'Java' },
  cpp:        { emoji: '⚙️', color: '#00599c', name: 'C++' },
  go:         { emoji: '🔷', color: '#00acd7', name: 'Go' },
  rust:       { emoji: '🦀', color: '#ce422b', name: 'Rust' },
  ruby:       { emoji: '💎', color: '#cc342d', name: 'Ruby' },
  swift:      { emoji: '🍎', color: '#f05138', name: 'Swift' },
  kotlin:     { emoji: '🎯', color: '#7f52ff', name: 'Kotlin' },
};

const getLangMeta = (lang) =>
  LANG_META[lang?.toLowerCase()] || { emoji: '💻', color: '#7c6cff', name: lang };

const getRelativeTime = (date) => {
  const now  = Date.now();
  const diff = now - new Date(date).getTime();
  const s    = Math.floor(diff / 1000);
  const m    = Math.floor(s / 60);
  const h    = Math.floor(m / 60);
  const d    = Math.floor(h / 24);
  const w    = Math.floor(d / 7);
  const mo   = Math.floor(d / 30);
  const y    = Math.floor(d / 365);

  if (s < 5)   return { label: 'just now',             nextIn: (5  - s) * 1000 };
  if (s < 60)  return { label: `${s}s ago`,            nextIn: 1000 };
  if (m < 60)  return { label: `${m}m ago`,            nextIn: 60_000 };
  if (h < 24)  return { label: `${h}h ${m % 60}m ago`, nextIn: 60_000 };
  if (d < 7)   return { label: `${d}d ago`,            nextIn: 3_600_000 };
  if (w < 5)   return { label: `${w}w ago`,            nextIn: 86_400_000 };
  if (mo < 12) return { label: `${mo}mo ago`,          nextIn: 86_400_000 };
  return       { label: `${y}y ago`,                   nextIn: 86_400_000 };
};

const useRelativeTime = (date) => {
  const [label, setLabel] = useState(() => getRelativeTime(date).label);
  const timerRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const { label: next, nextIn } = getRelativeTime(date);
      setLabel(next);
      timerRef.current = setTimeout(tick, Math.max(nextIn, 1000));
    };
    tick();
    return () => clearTimeout(timerRef.current);
  }, [date]);

  return label;
};

const RelativeTime = ({ date, showAbsolute = false }) => {
  const relative = useRelativeTime(date);
  const absolute = new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <span title={absolute} className="cursor-default">
      {showAbsolute ? (
        <span className="flex flex-col leading-tight">
          <span>{relative}</span>
          <span className="text-xs text-gray-600">{absolute}</span>
        </span>
      ) : relative}
    </span>
  );
};

const exportReviewPDF = (review) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 50;

  doc.setFillColor(124, 108, 255);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setFillColor(99, 86, 204);
  doc.rect(0, 0, pageWidth, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Code Review Report', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(review.created_at).toLocaleString(), pageWidth / 2, 28, { align: 'center' });

  yPos = 55;
  doc.setFillColor(240, 240, 255);
  doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
  doc.setTextColor(124, 108, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('📋 Review Information', 20, yPos + 3);
  yPos += 18;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Language:', 20, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(124, 108, 255);
  doc.text(getLangMeta(review.language).name, 80, yPos);
  yPos += 10;

  const overallScore = review.scores?.overall_score || 0;

  doc.setFillColor(240, 240, 255);
  doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
  doc.setTextColor(124, 108, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('⭐ Scores', 20, yPos + 3);
  yPos += 18;

  [
    ['Overall', overallScore],
    ['Quality', review.scores?.quality_score || 0],
    ['Readability', review.scores?.readability_score || 0],
    ['Performance', review.scores?.performance_score || 0],
    ['Security', review.scores?.security_score || 0],
  ].forEach(([label, score]) => {
    const color = score >= 8 ? [16, 185, 129] : score >= 6 ? [251, 191, 36] : [248, 113, 113];
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label + ':', 20, yPos);
    doc.setFillColor(...color);
    doc.roundedRect(70, yPos - 8, 30, 11, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text(`${score}/10`, 85, yPos, { align: 'center' });
    const barWidth = (score / 10) * 90;
    doc.setFillColor(240, 240, 240);
    doc.rect(110, yPos - 5, 90, 7, 'F');
    doc.setFillColor(...color);
    doc.rect(110, yPos - 5, barWidth, 7, 'F');
    yPos += 11;
  });
  yPos += 10;

  if (review.ai_feedback?.summary) {
    if (yPos > 220) { doc.addPage(); yPos = 20; }
    doc.setFillColor(240, 240, 255);
    doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
    doc.setTextColor(124, 108, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('💡 Summary', 20, yPos + 3);
    yPos += 18;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(review.ai_feedback.summary, pageWidth - 40);
    doc.text(lines, 20, yPos);
    yPos += lines.length * 5 + 10;
  }

  [
    { title: '🐛 Bugs', items: review.ai_feedback?.bugs || [], color: [248, 113, 113] },
    { title: '⚡ Performance', items: review.ai_feedback?.performance || [], color: [251, 191, 36] },
    { title: '🔒 Security', items: review.ai_feedback?.security || [], color: [124, 108, 255] },
    { title: '✨ Style', items: review.ai_feedback?.style || [], color: [56, 189, 248] },
  ].forEach(({ title, items, color }) => {
    if (items.length > 0) {
      if (yPos > 240) { doc.addPage(); yPos = 20; }
      doc.setFillColor(240, 240, 255);
      doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');
      doc.setTextColor(124, 108, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 20, yPos + 3);
      yPos += 18;
      items.forEach((item) => {
        if (yPos > 260) { doc.addPage(); yPos = 20; }
        doc.setFillColor(...color, 20);
        doc.rect(20, yPos - 5, 5, 5, 'F');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');
        const itemLines = doc.splitTextToSize(item, pageWidth - 55);
        doc.text(itemLines, 30, yPos);
        yPos += itemLines.length * 5 + 3;
      });
      yPos += 5;
    }
  });

  const pageHeight = doc.internal.pageSize.height;
  doc.setFillColor(248, 250, 252);
  doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(9);
  doc.text('CodeLens AI', pageWidth / 2, pageHeight - 7, { align: 'center' });

  return doc;
};

const exportToCSV = (reviews) => {
  const headers = ['Date', 'Relative Time', 'Language', 'Overall Score', 'Quality', 'Readability', 'Performance', 'Security', 'Bugs', 'Perf Issues', 'Security Issues', 'Style Issues'];
  const rows = reviews.map(r => [
    new Date(r.created_at).toISOString(),
    getRelativeTime(r.created_at).label,
    r.language,
    r.scores?.overall_score || 0,
    r.scores?.quality_score || 0,
    r.scores?.readability_score || 0,
    r.scores?.performance_score || 0,
    r.scores?.security_score || 0,
    r.ai_feedback?.bugs?.length || 0,
    r.ai_feedback?.performance?.length || 0,
    r.ai_feedback?.security?.length || 0,
    r.ai_feedback?.style?.length || 0,
  ]);
  const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reviews_export_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportToJSON = (reviews) => {
  const data = JSON.stringify(reviews, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reviews_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

const MiniScoreChart = ({ reviews }) => {
  if (reviews.length < 2) return null;
  const scores = reviews.slice(-10).map(r => r.scores?.overall_score || 0);
  const width = 100, height = 30, pad = 2;
  const points = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (width - pad * 2);
    const y = pad + (1 - s / 10) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="opacity-40">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const ComparisonView = ({ reviewA, reviewB, onClose }) => {
  const scoreCategories = ['quality_score', 'readability_score', 'performance_score', 'security_score'];
  const getScoreColor = (score) =>
    score >= 8 ? 'text-accent-emerald' : score >= 6 ? 'text-accent-amber' : 'text-accent-rose';

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 overflow-y-auto p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-6xl mx-auto my-8"
      >
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Compare Reviews</h2>
            <button onClick={onClose} className="btn-secondary">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[reviewA, reviewB].map((review, idx) => (
              <div key={idx} className="space-y-4">
                <div className={`p-4 rounded-xl border ${idx === 0 ? 'bg-primary-500/10 border-primary-500/30' : 'bg-accent-emerald/10 border-accent-emerald/30'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">{getLangMeta(review.language).emoji}</span>
                    <div>
                      <h3 className="font-bold text-lg capitalize">{getLangMeta(review.language).name}</h3>
                      <p className="text-sm text-gray-400">
                        <RelativeTime date={review.created_at} showAbsolute />
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-dark-900/50 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">Overall Score</p>
                    <p className={`text-5xl font-bold ${getScoreColor(review.scores?.overall_score || 0)}`}>
                      {review.scores?.overall_score || 0}/10
                    </p>
                  </div>
                </div>

                {scoreCategories.map(cat => (
                  <div key={cat} className="p-3 bg-dark-800/50 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-400 capitalize">{cat.replace('_score', '').replace('_', ' ')}</span>
                      <span className={`font-bold ${getScoreColor(review.scores?.[cat] || 0)}`}>{review.scores?.[cat] || 0}/10</span>
                    </div>
                    <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${(review.scores?.[cat] || 0) >= 8 ? 'bg-accent-emerald' : (review.scores?.[cat] || 0) >= 6 ? 'bg-accent-amber' : 'bg-accent-rose'}`}
                        style={{ width: `${((review.scores?.[cat] || 0) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-accent-rose/10 rounded-lg border border-accent-rose/30 text-center">
                    <p className="text-xs text-gray-400">🐛 Bugs</p>
                    <p className="text-2xl font-bold text-accent-rose">{review.ai_feedback?.bugs?.length || 0}</p>
                  </div>
                  <div className="p-3 bg-accent-amber/10 rounded-lg border border-accent-amber/30 text-center">
                    <p className="text-xs text-gray-400">⚡ Performance</p>
                    <p className="text-2xl font-bold text-accent-amber">{review.ai_feedback?.performance?.length || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-primary-500/10 to-accent-emerald/10 rounded-xl border border-primary-500/20">
            <h3 className="font-bold mb-3">📊 Score Differences</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              {['overall_score', ...scoreCategories].map(cat => {
                const diff = (reviewB.scores?.[cat] || 0) - (reviewA.scores?.[cat] || 0);
                return (
                  <div key={cat} className="p-2 bg-dark-900/50 rounded-lg">
                    <p className="text-xs text-gray-400 capitalize mb-1">{cat.replace('_score', '').replace('_', ' ')}</p>
                    <p className={`text-xl font-bold ${diff > 0 ? 'text-accent-emerald' : diff < 0 ? 'text-accent-rose' : 'text-gray-500'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ReviewTimestamp = ({ date }) => {
  const relative = useRelativeTime(date);
  const absolute = new Date(date).toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const isVeryRecent = Date.now() - new Date(date).getTime() < 5 * 60 * 1000;

  return (
    <span title={absolute} className="inline-flex items-center gap-1.5 text-sm text-gray-400 cursor-default select-none group">
      {isVeryRecent && (
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-emerald opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-emerald" />
        </span>
      )}
      <span className="group-hover:hidden transition-all">{relative}</span>
      <span className="hidden group-hover:inline text-xs text-gray-500 transition-all">{absolute}</span>
    </span>
  );
};

// ─── Normalize a raw review from the API ─────────────────────────────────────
// MongoDB returns _id; Pydantic may expose it as id or _id depending on alias
// config. We normalise here so all downstream code can safely use r.id.
const normalizeReview = (r) => ({
  ...r,
  id: r.id || r._id || String(r._id),
});

// ─── Main Component ───────────────────────────────────────────────────────────
const History = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedReviews, setSelectedReviews] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [scoreFilter, setScoreFilter] = useState('all');
  const [exportingId, setExportingId] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareReviews, setCompareReviews] = useState([]);
  const [favorites, setFavorites] = useState(new Set());

  useEffect(() => { fetchReviews(); }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            document.querySelector('input[type="text"]')?.focus();
            break;
          case 'b':
            e.preventDefault();
            setBulkMode(prev => !prev);
            break;
          case 'c':
            e.preventDefault();
            if (selectedReviews.size === 2) {
              const [a, b] = [...selectedReviews].map(id => reviews.find(r => r.id === id));
              setCompareReviews([a, b]);
              setCompareMode(true);
            }
            break;
        }
      }
      if (e.key === 'Escape') {
        setSelectedReview(null);
        setCompareMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedReviews, reviews]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await reviewAPI.getReviews();

      // ── FIX: handle both response shapes ────────────────────────────────
      // Shape A: data is a plain array      → [{ ... }, ...]
      // Shape B: data is wrapped in object  → { reviews: [...] }
      const raw = Array.isArray(data)
        ? data
        : Array.isArray(data?.reviews)
          ? data.reviews
          : [];

      // ── FIX: normalise _id → id so all selection/delete logic works ─────
      setReviews(raw.map(normalizeReview));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    try {
      await reviewAPI.deleteReview(reviewId);
      setReviews(reviews.filter(r => r.id !== reviewId));
      if (selectedReview?.id === reviewId) setSelectedReview(null);
      setShowDeleteConfirm(null);
    } catch (err) {
      alert('Failed to delete review');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedReviews.size} reviews?`)) return;
    try {
      await Promise.all([...selectedReviews].map(id => reviewAPI.deleteReview(id)));
      setReviews(reviews.filter(r => !selectedReviews.has(r.id)));
      setSelectedReviews(new Set());
      setBulkMode(false);
    } catch (err) {
      alert('Failed to delete reviews');
    }
  };

  const handleExportReview = (review) => {
    setExportingId(review.id);
    try {
      const pdf = exportReviewPDF(review);
      pdf.save(`review_${review.language}_${Date.now()}.pdf`);
    } catch (err) {
      alert('Failed to export PDF');
    } finally {
      setExportingId(null);
    }
  };

  const toggleReviewSelection = (reviewId) => {
    const s = new Set(selectedReviews);
    s.has(reviewId) ? s.delete(reviewId) : s.add(reviewId);
    setSelectedReviews(s);
  };

  const toggleFavorite = (reviewId) => {
    const f = new Set(favorites);
    f.has(reviewId) ? f.delete(reviewId) : f.add(reviewId);
    setFavorites(f);
    localStorage.setItem('favorite-reviews', JSON.stringify([...f]));
  };

  useEffect(() => {
    const stored = localStorage.getItem('favorite-reviews');
    if (stored) setFavorites(new Set(JSON.parse(stored)));
  }, []);

  const languages = useMemo(() => [...new Set(reviews.map(r => r.language))].sort(), [reviews]);

  const filteredAndSortedReviews = useMemo(() => {
    let filtered = reviews;
    if (filterLanguage !== 'all') filtered = filtered.filter(r => r.language === filterLanguage);
    if (scoreFilter !== 'all') {
      filtered = filtered.filter(r => {
        const s = r.scores?.overall_score || 0;
        if (scoreFilter === 'high')   return s >= 8;
        if (scoreFilter === 'medium') return s >= 6 && s < 8;
        if (scoreFilter === 'low')    return s < 6;
        return true;
      });
    }
    if (dateRange !== 'all') {
      const cutoff = new Date();
      if (dateRange === 'week')  cutoff.setDate(cutoff.getDate() - 7);
      if (dateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      if (dateRange === 'year')  cutoff.setFullYear(cutoff.getFullYear() - 1);
      filtered = filtered.filter(r => new Date(r.created_at) >= cutoff);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.language.toLowerCase().includes(q) ||
        r.ai_feedback?.summary?.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'score':    return (b.scores?.overall_score || 0) - (a.scores?.overall_score || 0);
        case 'language': return a.language.localeCompare(b.language);
        case 'favorites': return (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
        default:         return new Date(b.created_at) - new Date(a.created_at);
      }
    });
  }, [reviews, filterLanguage, searchQuery, sortBy, scoreFilter, dateRange, favorites]);

  const stats = useMemo(() => {
    if (!reviews.length) return null;
    const avg = reviews.reduce((s, r) => s + (r.scores?.overall_score || 0), 0) / reviews.length;
    return {
      totalReviews: reviews.length,
      avgScore: avg.toFixed(1),
      highestScore: Math.max(...reviews.map(r => r.scores?.overall_score || 0)),
      lowestScore:  Math.min(...reviews.map(r => r.scores?.overall_score || 0)),
    };
  }, [reviews]);

  const getScoreColor = (score) =>
    score >= 8 ? 'text-accent-emerald' : score >= 6 ? 'text-accent-amber' : 'text-accent-rose';

  const getScoreBg = (score) =>
    score >= 8 ? 'from-accent-emerald/20 to-green-600/20'
    : score >= 6 ? 'from-accent-amber/20 to-orange-600/20'
    : 'from-accent-rose/20 to-red-600/20';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-400">Loading your review history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2 text-accent-rose">Error Loading Reviews</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={fetchReviews} className="btn-primary">🔄 Try Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient mb-2">Review History</h1>
          <p className="text-gray-400">View, compare, and export your code reviews</p>
          <div className="flex gap-2 mt-2 text-xs text-gray-600">
            <span>⌘K Search</span><span>•</span>
            <span>⌘B Bulk</span><span>•</span>
            <span>⌘C Compare</span>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {bulkMode && selectedReviews.size > 0 && (
            <>
              <button onClick={handleBulkDelete} className="btn-secondary bg-accent-rose/20 text-accent-rose border-accent-rose/30 hover:bg-accent-rose/30">
                🗑️ Delete {selectedReviews.size}
              </button>
              {selectedReviews.size === 2 && (
                <button
                  onClick={() => {
                    const [a, b] = [...selectedReviews].map(id => reviews.find(r => r.id === id));
                    setCompareReviews([a, b]);
                    setCompareMode(true);
                  }}
                  className="btn-primary"
                >
                  ⚖️ Compare
                </button>
              )}
            </>
          )}

          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn-secondary">📥 Export</button>
            {showExportMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-full mt-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl p-2 z-10 min-w-[150px]"
              >
                <button onClick={() => { exportToCSV(filteredAndSortedReviews); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-dark-700 rounded text-sm">📊 Export CSV</button>
                <button onClick={() => { exportToJSON(filteredAndSortedReviews); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 hover:bg-dark-700 rounded text-sm">📋 Export JSON</button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="card bg-gradient-to-br from-primary-500/10 to-primary-600/5 border-primary-500/20 relative overflow-hidden">
            <div className="absolute top-2 right-2"><MiniScoreChart reviews={reviews} /></div>
            <p className="text-gray-400 text-sm mb-1">Total Reviews</p>
            <p className="text-3xl font-bold text-primary-400">{stats.totalReviews}</p>
          </div>
          <div className="card bg-gradient-to-br from-accent-emerald/10 to-green-600/5 border-accent-emerald/20">
            <p className="text-gray-400 text-sm mb-1">Average Score</p>
            <p className="text-3xl font-bold text-accent-emerald">{stats.avgScore}/10</p>
          </div>
          <div className="card bg-gradient-to-br from-accent-amber/10 to-orange-600/5 border-accent-amber/20">
            <p className="text-gray-400 text-sm mb-1">Highest Score</p>
            <p className="text-3xl font-bold text-accent-amber">{stats.highestScore}/10</p>
          </div>
          <div className="card bg-gradient-to-br from-accent-rose/10 to-red-600/5 border-accent-rose/20">
            <p className="text-gray-400 text-sm mb-1">Lowest Score</p>
            <p className="text-3xl font-bold text-accent-rose">{stats.lowestScore}/10</p>
          </div>
        </motion.div>
      )}

      {reviews.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card text-center py-20">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-2xl font-bold mb-2">No Reviews Yet</h2>
          <p className="text-gray-400 mb-6">Start by reviewing your first piece of code</p>
          <a href="/review" className="btn-primary inline-block">🔍 Review Code</a>
        </motion.div>
      ) : (
        <>
          {/* Filters */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3">
                <input
                  type="text"
                  placeholder="🔍 Search reviews... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button onClick={() => setBulkMode(!bulkMode)} className={`btn-secondary whitespace-nowrap ${bulkMode ? 'bg-primary-500/20 border-primary-500/30' : ''}`}>
                  {bulkMode ? '✓ Bulk' : '☐ Bulk'}
                </button>
                <button onClick={() => setViewMode(viewMode === 'grid' ? 'timeline' : 'grid')} className="btn-secondary whitespace-nowrap">
                  {viewMode === 'grid' ? '📅 Timeline' : '▦ Grid'}
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="all">All Languages</option>
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{getLangMeta(lang).emoji} {getLangMeta(lang).name}</option>
                  ))}
                </select>
                <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)} className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="all">All Scores</option>
                  <option value="high">⭐ High (8-10)</option>
                  <option value="medium">📊 Medium (6-7)</option>
                  <option value="low">⚠️ Low (&lt;6)</option>
                </select>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="all">All Time</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">Last Year</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="date">📅 Latest First</option>
                  <option value="score">⭐ Highest Score</option>
                  <option value="language">🔤 Language</option>
                  <option value="favorites">❤️ Favorites</option>
                </select>
              </div>

              <p className="text-sm text-gray-500">
                Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Reviews List */}
            <div className={`${viewMode === 'timeline' ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-4`}>
              <AnimatePresence mode="popLayout">
                {filteredAndSortedReviews.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card text-center py-12">
                    <div className="text-4xl mb-2">🔍</div>
                    <p className="text-gray-400">No reviews match your filters</p>
                  </motion.div>

                ) : viewMode === 'timeline' ? (
                  <div className="space-y-8">
                    {filteredAndSortedReviews.map((review, index) => {
                      const isEven = index % 2 === 0;
                      return (
                        <motion.div
                          key={review.id} layout
                          initial={{ opacity: 0, x: isEven ? -40 : 40 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative"
                        >
                          {index < filteredAndSortedReviews.length - 1 && (
                            <div className="absolute left-1/2 top-20 bottom-0 w-0.5 bg-gradient-to-b from-primary-500/50 to-transparent -ml-px hidden lg:block" />
                          )}
                          <div className={`grid lg:grid-cols-2 gap-6 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                            <div className={`${isEven ? 'lg:pr-12 lg:text-right' : 'lg:pl-12 lg:col-start-2'}`}>
                              <div className={`mb-2 ${isEven ? 'lg:justify-end flex' : ''}`}>
                                <ReviewTimestamp date={review.created_at} />
                              </div>
                              <div
                                className={`card cursor-pointer hover:scale-[1.02] transition-all group ${selectedReview?.id === review.id ? 'ring-2 ring-primary-500' : ''}`}
                                onClick={() => setSelectedReview(review)}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-16 h-16 bg-gradient-to-br ${getScoreBg(review.scores?.overall_score || 0)} rounded-xl flex items-center justify-center text-3xl flex-shrink-0`}>
                                    {getLangMeta(review.language).emoji}
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-bold text-lg capitalize">{getLangMeta(review.language).name} Review</h3>
                                    <div className="flex gap-2 mt-2 text-xs">
                                      {review.ai_feedback?.bugs?.length > 0 && <span className="text-accent-rose">🐛 {review.ai_feedback.bugs.length}</span>}
                                      {review.ai_feedback?.performance?.length > 0 && <span className="text-accent-amber">⚡ {review.ai_feedback.performance.length}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-3xl font-bold ${getScoreColor(review.scores?.overall_score || 0)}`}>{review.scores?.overall_score || 0}</p>
                                    <p className="text-xs text-gray-500">/10</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="hidden lg:flex absolute left-1/2 top-0 w-4 h-4 bg-primary-500 rounded-full -ml-2 border-4 border-dark-900 z-10" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                ) : (
                  filteredAndSortedReviews.map((review, index) => (
                    <motion.div
                      key={review.id} layout
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => !bulkMode && setSelectedReview(review)}
                      className={`card cursor-pointer hover:scale-[1.01] transition-all relative group ${selectedReview?.id === review.id ? 'ring-2 ring-primary-500' : ''} ${selectedReviews.has(review.id) ? 'ring-2 ring-accent-emerald' : ''}`}
                    >
                      {bulkMode && (
                        <div className="absolute top-4 right-4 z-10">
                          <input
                            type="checkbox"
                            checked={selectedReviews.has(review.id)}
                            onChange={() => toggleReviewSelection(review.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 rounded border-2 border-primary-500 bg-dark-800 checked:bg-accent-emerald checked:border-accent-emerald cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`w-16 h-16 bg-gradient-to-br ${getScoreBg(review.scores?.overall_score || 0)} rounded-xl flex items-center justify-center flex-shrink-0 relative`}>
                            <span className="text-2xl">{getLangMeta(review.language).emoji}</span>
                            {favorites.has(review.id) && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-rose rounded-full flex items-center justify-center text-xs">❤️</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-white mb-1 capitalize">
                              {getLangMeta(review.language).name} Code Review
                            </h3>
                            <ReviewTimestamp date={review.created_at} />
                            <div className="flex gap-3 mt-2 text-xs">
                              {review.ai_feedback?.bugs?.length > 0 && <span className="text-accent-rose">🐛 {review.ai_feedback.bugs.length}</span>}
                              {review.ai_feedback?.performance?.length > 0 && <span className="text-accent-amber">⚡ {review.ai_feedback.performance.length}</span>}
                              {review.ai_feedback?.security?.length > 0 && <span className="text-accent-violet">🔒 {review.ai_feedback.security.length}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className={`text-3xl font-bold ${getScoreColor(review.scores?.overall_score || 0)}`}>{review.scores?.overall_score || 0}</p>
                            <p className="text-xs text-gray-500">/ 10</p>
                          </div>
                          {!bulkMode && (
                            <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); toggleFavorite(review.id); }} className={`p-2 hover:bg-accent-rose/20 rounded-lg transition-all ${favorites.has(review.id) ? 'text-accent-rose' : 'text-gray-500'}`} title="Favorite">
                                {favorites.has(review.id) ? '❤️' : '🤍'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleExportReview(review); }} disabled={exportingId === review.id} className="p-2 hover:bg-primary-500/20 rounded-lg transition-all text-primary-400" title="Export PDF">
                                {exportingId === review.id ? '⏳' : '📄'}
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(review.id); }} className="p-2 hover:bg-accent-rose/20 rounded-lg transition-all text-accent-rose" title="Delete">
                                🗑️
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Detail Panel */}
            {viewMode === 'grid' && (
              <div className="lg:col-span-1">
                <AnimatePresence mode="wait">
                  {selectedReview ? (
                    <motion.div
                      key={selectedReview.id}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="card sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-dark-900"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold">Review Details</h3>
                        <button onClick={() => setSelectedReview(null)} className="text-gray-500 hover:text-gray-300 lg:hidden">✕</button>
                      </div>

                      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                        <span>🕐</span>
                        <ReviewTimestamp date={selectedReview.created_at} />
                      </div>

                      <div className={`text-center p-6 rounded-xl border mb-6 bg-gradient-to-br ${getScoreBg(selectedReview.scores?.overall_score || 0)}`}>
                        <p className="text-gray-400 text-sm mb-2">Overall Score</p>
                        <p className={`text-5xl font-bold ${getScoreColor(selectedReview.scores?.overall_score || 0)}`}>
                          {selectedReview.scores?.overall_score || 0}/10
                        </p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Score Breakdown</h4>
                        {[
                          ['Quality', selectedReview.scores?.quality_score],
                          ['Readability', selectedReview.scores?.readability_score],
                          ['Performance', selectedReview.scores?.performance_score],
                          ['Security', selectedReview.scores?.security_score],
                        ].map(([label, score]) => score !== undefined && (
                          <div key={label} className="flex justify-between items-center p-2 bg-dark-800/50 rounded">
                            <span className="text-gray-400 text-sm">{label}</span>
                            <span className={`font-bold ${getScoreColor(score)}`}>{score}/10</span>
                          </div>
                        ))}
                      </div>

                      {selectedReview.ai_feedback?.summary && (
                        <div className="p-4 bg-dark-800/50 rounded-lg border-l-4 border-primary-500 mb-4">
                          <p className="text-sm font-medium text-gray-400 mb-2">📝 Summary</p>
                          <p className="text-sm text-gray-200 leading-relaxed">{selectedReview.ai_feedback.summary}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          ['🐛 Bugs', selectedReview.ai_feedback?.bugs?.length || 0, 'accent-rose'],
                          ['⚡ Performance', selectedReview.ai_feedback?.performance?.length || 0, 'accent-amber'],
                          ['✨ Style', selectedReview.ai_feedback?.style?.length || 0, 'primary-400'],
                          ['🔒 Security', selectedReview.ai_feedback?.security?.length || 0, 'accent-violet'],
                        ].map(([label, count, color]) => (
                          <div key={label} className={`p-3 bg-${color}/10 rounded-lg border border-${color}/30`}>
                            <p className="text-xs text-gray-400 mb-1">{label}</p>
                            <p className={`text-2xl font-bold text-${color}`}>{count}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <button onClick={() => toggleFavorite(selectedReview.id)} className={`flex-1 px-4 py-2 border rounded-lg transition-colors text-sm ${favorites.has(selectedReview.id) ? 'bg-accent-rose/20 border-accent-rose/30 text-accent-rose' : 'bg-dark-800 border-dark-600 hover:bg-dark-700'}`}>
                          {favorites.has(selectedReview.id) ? '❤️ Favorited' : '🤍 Favorite'}
                        </button>
                        <button onClick={() => handleExportReview(selectedReview)} disabled={exportingId === selectedReview.id} className="flex-1 px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 border border-primary-500/30 rounded-lg transition-colors text-sm text-primary-400 disabled:opacity-50">
                          {exportingId === selectedReview.id ? '⏳' : '📄 Export'}
                        </button>
                        <button onClick={() => setShowDeleteConfirm(selectedReview.id)} className="flex-1 px-4 py-2 bg-accent-rose/10 hover:bg-accent-rose/20 border border-accent-rose/30 rounded-lg transition-colors text-sm text-accent-rose">
                          🗑️ Delete
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex flex-col items-center justify-center h-64 text-gray-500 sticky top-24">
                      <div className="text-4xl mb-2">👈</div>
                      <p className="text-center">Select a review to see details</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="card max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-4">Delete Review?</h3>
              <p className="text-gray-400 mb-6">Are you sure you want to delete this review? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg transition-colors">Cancel</button>
                <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 px-4 py-2 bg-accent-rose hover:bg-accent-rose/80 rounded-lg transition-colors text-white font-medium">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison View */}
      <AnimatePresence>
        {compareMode && compareReviews.length === 2 && (
          <ComparisonView
            reviewA={compareReviews[0]}
            reviewB={compareReviews[1]}
            onClose={() => { setCompareMode(false); setCompareReviews([]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default History;