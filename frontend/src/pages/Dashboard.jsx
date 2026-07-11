import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { analyticsAPI, reviewAPI } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // ✅ FIX 1: Named import instead of side-effect import

// ─── PDF Generation Utilities ─────────────────────────────────────────────────
const PDFGenerator = {
  // Color palette
  colors: {
    primary:  [124, 108, 255],
    success:  [16,  185, 129],
    warning:  [245, 158, 11],
    danger:   [239, 68,  68],
    info:     [56,  189, 248],
    dark:     [15,  23,  42],
    light:    [248, 250, 252],
  },

  // ── Helpers ────────────────────────────────────────────────────────────────

  addHeader: (doc, title) => {
    const pageWidth = doc.internal.pageSize.width;

    doc.setFillColor(99, 86, 204);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setFillColor(124, 108, 255);
    doc.rect(0, 0, pageWidth, 30, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 28, { align: 'center' });
  },

  addFooter: (doc, pageNum) => {
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth  = doc.internal.pageSize.width;

    doc.setFillColor(248, 250, 252);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.text(
      `CodeReview AI – Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 7,
      { align: 'center' }
    );
  },

  addSection: (doc, title, yPos) => {
    const pageWidth = doc.internal.pageSize.width;

    doc.setFillColor(240, 240, 255);
    doc.rect(15, yPos - 5, pageWidth - 30, 12, 'F');

    doc.setTextColor(124, 108, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, yPos + 3);

    return yPos + 18;
  },

  addKeyValue: (doc, key, value, yPos, color = [0, 0, 0]) => {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(key + ':', 20, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...color);
    doc.text(String(value), 80, yPos);

    return yPos + 7;
  },

  addScoreBadge: (doc, score, xPos, yPos) => {
    const color =
      score >= 8
        ? PDFGenerator.colors.success
        : score >= 6
        ? PDFGenerator.colors.warning
        : PDFGenerator.colors.danger;

    doc.setFillColor(...color);           // ✅ FIX 2: No invalid 4th alpha arg
    doc.roundedRect(xPos, yPos - 8, 35, 12, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${score}/10`, xPos + 17.5, yPos, { align: 'center' });
  },

  // ── Guard helper: ensure we never write past the page bottom ──────────────
  checkPageBreak: (doc, yPos, threshold = 260) => {
    if (yPos > threshold) {
      doc.addPage();
      return 20;
    }
    return yPos;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Generate single review PDF
  // ─────────────────────────────────────────────────────────────────────────
  generateReviewPDF: (review) => {
    if (!review) throw new Error('No review data provided.');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 50;

    PDFGenerator.addHeader(doc, 'Code Review Report');

    // ── Review Info ──────────────────────────────────────────────────────
    yPos = PDFGenerator.addSection(doc, '📋 Review Information', yPos);
    yPos = PDFGenerator.addKeyValue(
      doc, 'Language',
      (review.language || 'Unknown').toUpperCase(),
      yPos,
      PDFGenerator.colors.primary
    );
    yPos = PDFGenerator.addKeyValue(
      doc, 'Date',
      review.created_at ? new Date(review.created_at).toLocaleDateString() : 'N/A',
      yPos
    );
    yPos += 5;

    // ── Overall Score ────────────────────────────────────────────────────
    yPos = PDFGenerator.addSection(doc, '⭐ Overall Score', yPos);
    const overallScore = review.scores?.overall_score ?? 0;
    PDFGenerator.addScoreBadge(doc, overallScore, 20, yPos + 5);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Overall Quality Rating', 60, yPos + 3);
    yPos += 20;

    // ── Detailed Scores ──────────────────────────────────────────────────
    yPos = PDFGenerator.addSection(doc, '📊 Detailed Metrics', yPos);

    const scores = [
      { label: 'Code Quality',  value: review.scores?.quality_score     ?? 0 },
      { label: 'Readability',   value: review.scores?.readability_score  ?? 0 },
      { label: 'Performance',   value: review.scores?.performance_score  ?? 0 },
      { label: 'Security',      value: review.scores?.security_score     ?? 0 },
    ];

    scores.forEach((score) => {
      const scoreColor =
        score.value >= 8
          ? PDFGenerator.colors.success
          : score.value >= 6
          ? PDFGenerator.colors.warning
          : PDFGenerator.colors.danger;

      yPos = PDFGenerator.addKeyValue(doc, score.label, `${score.value}/10`, yPos, scoreColor);

      // Progress bar
      const barWidth = (score.value / 10) * 100;
      doc.setFillColor(240, 240, 240);
      doc.rect(80, yPos - 10, 100, 5, 'F');
      doc.setFillColor(...scoreColor);   // ✅ FIX 2: clean 3-arg spread
      doc.rect(80, yPos - 10, barWidth, 5, 'F');
    });
    yPos += 10;

    // ── Summary ──────────────────────────────────────────────────────────
    if (review.ai_feedback?.summary) {
      yPos = PDFGenerator.checkPageBreak(doc, yPos, 220);
      yPos = PDFGenerator.addSection(doc, '💡 AI Summary', yPos);

      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');

      const summaryLines = doc.splitTextToSize(review.ai_feedback.summary, pageWidth - 40);
      doc.text(summaryLines, 20, yPos);
      yPos += summaryLines.length * 5 + 10;
    }

    // ── Issues ───────────────────────────────────────────────────────────
    const issues = [
      { title: '🐛 Bugs Found',          items: review.ai_feedback?.bugs        || [], color: PDFGenerator.colors.danger  },
      { title: '⚡ Performance Issues',  items: review.ai_feedback?.performance  || [], color: PDFGenerator.colors.warning },
      { title: '🔒 Security Concerns',   items: review.ai_feedback?.security     || [], color: PDFGenerator.colors.danger  },
      { title: '🎨 Style Suggestions',   items: review.ai_feedback?.style        || [], color: PDFGenerator.colors.info    },
    ];

    issues.forEach(({ title, items, color }) => {
      if (!items.length) return;

      yPos = PDFGenerator.checkPageBreak(doc, yPos, 240);
      yPos = PDFGenerator.addSection(doc, title, yPos);

      items.forEach((item) => {
        yPos = PDFGenerator.checkPageBreak(doc, yPos, 260);

        doc.setFillColor(...color);      // ✅ FIX 2: removed invalid alpha arg
        doc.rect(20, yPos - 5, 5, 5, 'F');

        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica', 'normal');

        const itemLines = doc.splitTextToSize(String(item), pageWidth - 55);
        doc.text(itemLines, 30, yPos);
        yPos += itemLines.length * 5 + 3;
      });
      yPos += 5;
    });

    PDFGenerator.addFooter(doc, 1);
    return doc;
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Generate dashboard summary PDF
  // ─────────────────────────────────────────────────────────────────────────
  generateDashboardPDF: (stats, recentReviews, insights) => {
    // ✅ FIX 3: Guard against null / undefined inputs early
    if (!stats)          throw new Error('Stats data is not available yet.');
    if (!recentReviews)  throw new Error('Reviews data is not available yet.');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let yPos = 50;

    PDFGenerator.addHeader(doc, 'Dashboard Analytics Report');

    // ── Overview Stats ───────────────────────────────────────────────────
    yPos = PDFGenerator.addSection(doc, '📊 Overview Statistics', yPos);

    const overviewStats = [
      { label: 'Total Reviews',   value: stats.total_reviews ?? 0,                                            color: PDFGenerator.colors.primary },
      { label: 'Average Score',   value: `${parseFloat(stats.avg_score ?? 0).toFixed(1)}/10`,                 color: PDFGenerator.colors.success },
      { label: 'Languages Used',  value: Object.keys(stats.languages ?? {}).length,                           color: PDFGenerator.colors.info    },
    ];

    overviewStats.forEach((stat) => {
      yPos = PDFGenerator.addKeyValue(doc, stat.label, stat.value, yPos, stat.color);
    });
    yPos += 10;

    // ── Recent Performance ───────────────────────────────────────────────
    if (insights) {
      yPos = PDFGenerator.addSection(doc, '📈 Recent Performance', yPos);
      yPos = PDFGenerator.addKeyValue(
        doc, 'Recent Average', `${insights.avgRecent}/10`, yPos, PDFGenerator.colors.success
      );

      const trendColor =
        insights.trendDirection === 'up'
          ? PDFGenerator.colors.success
          : insights.trendDirection === 'down'
          ? PDFGenerator.colors.danger
          : PDFGenerator.colors.info;

      yPos = PDFGenerator.addKeyValue(
        doc,
        'Score Trend',
        `${insights.trend > 0 ? '+' : ''}${insights.trend} (${insights.trendDirection.toUpperCase()})`,
        yPos,
        trendColor
      );
      yPos += 10;
    }

    // ── Issues Summary ───────────────────────────────────────────────────
    if (insights && insights.totalIssues > 0) {
      yPos = PDFGenerator.addSection(doc, '⚠️ Issues Summary', yPos);

      const issueStats = [
        { label: 'Total Issues', value: insights.totalIssues, color: PDFGenerator.colors.danger  },
        { label: 'Bugs',         value: insights.bugCount,    color: PDFGenerator.colors.danger  },
        { label: 'Performance',  value: insights.perfCount,   color: PDFGenerator.colors.warning },
        { label: 'Security',     value: insights.secCount,    color: PDFGenerator.colors.danger  },
      ];

      issueStats.forEach((stat) => {
        yPos = PDFGenerator.addKeyValue(doc, stat.label, stat.value, yPos, stat.color);
      });
      yPos += 10;
    }

    // ── Language Distribution ────────────────────────────────────────────
    const languages = stats.languages ?? {};
    if (Object.keys(languages).length > 0) {
      yPos = PDFGenerator.addSection(doc, '💻 Language Distribution', yPos);

      const total      = Object.values(languages).reduce((a, b) => a + b, 0);
      const sortedLangs = Object.entries(languages).sort(([, a], [, b]) => b - a);

      sortedLangs.forEach(([lang, count]) => {
        const percentage = ((count / total) * 100).toFixed(1);
        yPos = PDFGenerator.addKeyValue(
          doc,
          lang.toUpperCase(),
          `${count} reviews (${percentage}%)`,
          yPos,
          PDFGenerator.colors.primary
        );

        const barWidth = (count / total) * 120;
        doc.setFillColor(240, 240, 240);
        doc.rect(80, yPos - 10, 120, 4, 'F');
        doc.setFillColor(...PDFGenerator.colors.primary);
        doc.rect(80, yPos - 10, barWidth, 4, 'F');
      });
      yPos += 10;
    }

    // ── Recent Reviews Table ─────────────────────────────────────────────
    if (recentReviews.length > 0) {
      yPos = PDFGenerator.checkPageBreak(doc, yPos, 200);
      yPos = PDFGenerator.addSection(doc, '📝 Recent Reviews', yPos);

      const tableData = recentReviews.map((review) => [
        (review.language || 'N/A').toUpperCase(),
        review.created_at ? new Date(review.created_at).toLocaleDateString() : 'N/A',
        `${review.scores?.overall_score ?? 0}/10`,
        `${review.ai_feedback?.bugs?.length        ?? 0} bugs`,
        `${review.ai_feedback?.performance?.length ?? 0} perf issues`,
      ]);

      // ✅ FIX 1: Use the imported autoTable function instead of doc.autoTable()
      autoTable(doc, {
        startY: yPos,
        head: [['Language', 'Date', 'Score', 'Bugs', 'Performance']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor:  [124, 108, 255],
          textColor:  [255, 255, 255],
          fontStyle:  'bold',
          halign:     'center',
        },
        bodyStyles: {
          textColor: [60, 60, 60],
          fontSize:  9,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'left',   fontStyle: 'bold' },
          1: { halign: 'center' },
          2: { halign: 'center', fontStyle: 'bold' },
          3: { halign: 'center' },
          4: { halign: 'center' },
        },
        margin: { left: 20, right: 20 },
      });

      // ✅ FIX 1: Access finalY from the doc object after autoTable call
      yPos = (doc.lastAutoTable?.finalY ?? yPos) + 15;
    }

    // ── Average Score Breakdown ──────────────────────────────────────────
    const scoreCategories = [
      'quality_score',
      'readability_score',
      'performance_score',
      'security_score',
    ];

    const avgScores = {};
    scoreCategories.forEach((category) => {
      const vals = recentReviews
        .map((r) => r.scores?.[category])
        .filter((s) => s !== undefined && s !== null);
      if (vals.length > 0) {
        avgScores[category] = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
      }
    });

    if (Object.keys(avgScores).length > 0) {
      yPos = PDFGenerator.checkPageBreak(doc, yPos, 200);
      yPos = PDFGenerator.addSection(doc, '📊 Average Score Breakdown', yPos);

      Object.entries(avgScores).forEach(([category, avg]) => {
        const label = category.replace('_score', '').replace('_', ' ');
        const score = parseFloat(avg);
        const color =
          score >= 8
            ? PDFGenerator.colors.success
            : score >= 6
            ? PDFGenerator.colors.warning
            : PDFGenerator.colors.danger;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label.charAt(0).toUpperCase() + label.slice(1) + ':', 20, yPos);

        PDFGenerator.addScoreBadge(doc, score, 70, yPos);

        const barWidth = (score / 10) * 100;
        doc.setFillColor(240, 240, 240);
        doc.rect(110, yPos - 5, 100, 8, 'F');
        doc.setFillColor(...color);
        doc.rect(110, yPos - 5, barWidth, 8, 'F');

        yPos += 12;
      });
    }

    PDFGenerator.addFooter(doc, 1);
    return doc;
  },
};

// ─── Main Dashboard Component ─────────────────────────────────────────────────
const Dashboard = () => {
  const [stats,         setStats]         = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [exporting,     setExporting]     = useState(false);
  const [exportingId,   setExportingId]   = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, reviewsRes] = await Promise.all([
        analyticsAPI.getStats(),
        reviewAPI.getReviews(),
      ]);

      setStats(statsRes.data);
      setRecentReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data.slice(0, 5) : []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const insights = useMemo(() => {
    if (!stats || !recentReviews.length) return null;

    const scores    = recentReviews.map((r) => r.scores?.overall_score || 0);
    const avgRecent = scores.reduce((a, b) => a + b, 0) / scores.length;

    const mid        = Math.floor(scores.length / 2) || 1;
    const firstHalf  = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid || 1);
    const trend      = secondHalf - firstHalf;

    const allBugs        = recentReviews.flatMap((r) => r.ai_feedback?.bugs        || []);
    const allPerformance = recentReviews.flatMap((r) => r.ai_feedback?.performance || []);
    const allSecurity    = recentReviews.flatMap((r) => r.ai_feedback?.security    || []);

    return {
      avgRecent:      avgRecent.toFixed(1),
      trend:          trend.toFixed(1),
      trendDirection: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable',
      totalIssues:    allBugs.length + allPerformance.length + allSecurity.length,
      bugCount:       allBugs.length,
      perfCount:      allPerformance.length,
      secCount:       allSecurity.length,
    };
  }, [stats, recentReviews]);

  const scoreDistributionData = useMemo(() => {
    if (!stats?.recent_trend) return [];

    const distribution = { excellent: 0, good: 0, needsWork: 0 };
    stats.recent_trend.forEach((item) => {
      if      (item.score >= 8) distribution.excellent++;
      else if (item.score >= 6) distribution.good++;
      else                       distribution.needsWork++;
    });

    return [
      { name: 'Excellent (8–10)', value: distribution.excellent, color: '#10b981' },
      { name: 'Good (6–7)',        value: distribution.good,      color: '#f59e0b' },
      { name: 'Needs Work (<6)',   value: distribution.needsWork, color: '#ef4444' },
    ];
  }, [stats]);

  // ── PDF download handlers ──────────────────────────────────────────────────
  const downloadPDF = async (review) => {
    setExportingId(review.id);
    try {
      const pdf = PDFGenerator.generateReviewPDF(review);
      pdf.save(`review_${review.language}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setExportingId(null);
    }
  };

  const exportAllReviews = async () => {
    setExporting(true);
    try {
      const pdf = PDFGenerator.generateDashboardPDF(stats, recentReviews, insights);
      pdf.save(`dashboard_summary_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Dashboard PDF generation error:', err);
      alert(`Failed to generate PDF: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-accent-emerald';
    if (score >= 6) return 'text-accent-amber';
    return 'text-accent-rose';
  };

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full mb-4" />
        <p className="text-gray-400">Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-2 text-accent-rose">Error Loading Dashboard</h2>
        <p className="text-gray-400 mb-6">{error}</p>
        <button onClick={fetchData} className="btn-primary">
          🔄 Try Again
        </button>
      </div>
    );
  }

  // ── Stat cards ─────────────────────────────────────────────────────────────
  const statCards = [
    {
      title:   'Total Reviews',
      value:   stats?.total_reviews || 0,
      icon:    '📊',
      color:   'from-primary-500 to-primary-600',
      subtext: 'All time',
    },
    {
      title:   'Average Score',
      value:   stats?.avg_score ? `${parseFloat(stats.avg_score).toFixed(1)}/10` : '0/10',
      icon:    '⭐',
      color:   'from-accent-emerald to-green-600',
      subtext: insights ? `Recent: ${insights.avgRecent}/10` : '',
    },
    {
      title:   'Languages Used',
      value:   Object.keys(stats?.languages || {}).length,
      icon:    '💻',
      color:   'from-accent-violet to-purple-600',
      subtext: 'Unique languages',
    },
    {
      title:   'Score Trend',
      value:   insights ? `${insights.trend > 0 ? '+' : ''}${insights.trend}` : '0',
      icon:    insights?.trendDirection === 'up' ? '📈' : insights?.trendDirection === 'down' ? '📉' : '➡️',
      color:   'from-accent-amber to-orange-600',
      subtext: insights
        ? insights.trendDirection === 'up'
          ? 'Improving!'
          : insights.trendDirection === 'down'
          ? 'Review more'
          : 'Steady'
        : '',
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-20">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:justify-between md:items-center gap-4"
      >
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient mb-2">Dashboard</h1>
          <p className="text-gray-400">Track your code review performance</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-600 rounded-lg transition-colors flex items-center gap-2"
            title="Refresh data"
          >
            🔄 Refresh
          </button>
          <button
            onClick={exportAllReviews}
            disabled={exporting || !recentReviews.length}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>📄</span>
                <span>Export Summary</span>
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card group hover:scale-105 transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-gray-400 text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                {stat.subtext && <p className="text-xs text-gray-500">{stat.subtext}</p>}
              </div>
              <div className={`w-14 h-14 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-2xl transform group-hover:rotate-12 transition-transform flex-shrink-0`}>
                {stat.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Insights Banner */}
      {insights && insights.totalIssues > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="card bg-gradient-to-r from-primary-500/10 to-accent-violet/10 border-primary-500/30"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-lg font-bold mb-2">💡 Quick Insights</h3>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-accent-rose">🐛 {insights.bugCount} bugs found</span>
                <span className="text-accent-amber">⚡ {insights.perfCount} performance tips</span>
                <span className="text-accent-violet">🔒 {insights.secCount} security issues</span>
              </div>
            </div>
            <Link to="/history" className="btn-secondary whitespace-nowrap">
              View Details →
            </Link>
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Score Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4">Score Trend Over Time</h2>
          {stats?.recent_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[...stats.recent_trend].reverse()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#64748b"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const d = new Date(value);
                    return `${d.getMonth() + 1}/${d.getDate()}`;
                  }}
                />
                <YAxis stroke="#64748b" domain={[0, 10]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border:          '1px solid #334155',
                    borderRadius:    '8px',
                    fontSize:        '14px',
                  }}
                  formatter={(value)  => [`${value}/10`, 'Score']}
                  labelFormatter={(v) => new Date(v).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ fill: '#38bdf8', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No trend data available yet</p>
              <p className="text-sm text-gray-600 mt-1">Complete more reviews to see trends</p>
            </div>
          )}
        </motion.div>

        {/* Score Distribution Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4">Score Distribution</h2>
          {scoreDistributionData.some((d) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={scoreDistributionData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {scoreDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border:          '1px solid #334155',
                    borderRadius:    '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
              <div className="text-4xl mb-2">📈</div>
              <p>No distribution data yet</p>
            </div>
          )}
        </motion.div>

        {/* Language Distribution */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4">Language Distribution</h2>
          {stats?.languages && Object.keys(stats.languages).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(stats.languages)
                .sort(([, a], [, b]) => b - a)
                .map(([lang, count], index) => {
                  const total      = Object.values(stats.languages).reduce((a, b) => a + b, 0);
                  const percentage = (count / total) * 100;

                  return (
                    <div key={lang}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300 font-medium capitalize">{lang}</span>
                        <span className="text-gray-400">
                          {count} {count === 1 ? 'review' : 'reviews'} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.8 + index * 0.1, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-primary-500 to-accent-violet"
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <div className="text-4xl mb-2">💻</div>
              <p>No language data yet</p>
            </div>
          )}
        </motion.div>

        {/* Score Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="card"
        >
          <h2 className="text-xl font-bold mb-4">Average Score Breakdown</h2>
          {recentReviews.length > 0 ? (
            <div className="space-y-4">
              {['quality_score', 'readability_score', 'performance_score', 'security_score'].map(
                (scoreType, index) => {
                  const scores = recentReviews
                    .map((r) => r.scores?.[scoreType])
                    .filter((s) => s !== undefined && s !== null);

                  if (!scores.length) return null;

                  const avg   = scores.reduce((a, b) => a + b, 0) / scores.length;
                  const label = scoreType.replace('_score', '').replace('_', ' ');

                  return (
                    <div key={scoreType}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-300 font-medium capitalize">{label}</span>
                        <span className={`font-bold ${getScoreColor(avg)}`}>
                          {avg.toFixed(1)}/10
                        </span>
                      </div>
                      <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${avg * 10}%` }}
                          transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                          className={`h-full ${
                            avg >= 8 ? 'bg-accent-emerald' : avg >= 6 ? 'bg-accent-amber' : 'bg-accent-rose'
                          }`}
                        />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>No score data yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Recent Reviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="card"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Recent Reviews</h2>
          <Link
            to="/history"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium flex items-center gap-1"
          >
            View All <span>→</span>
          </Link>
        </div>

        {recentReviews.length > 0 ? (
          <div className="space-y-4">
            <AnimatePresence>
              {recentReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.0 + index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-dark-800/50 rounded-lg border border-dark-700/50 hover:border-primary-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500/20 to-accent-violet/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <span className="text-xl">💻</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white capitalize truncate">
                        {review.language} Review
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                        {review.ai_feedback && (
                          <div className="flex gap-2">
                            {review.ai_feedback.bugs?.length > 0 && (
                              <span className="text-accent-rose text-xs">
                                🐛 {review.ai_feedback.bugs.length}
                              </span>
                            )}
                            {review.ai_feedback.performance?.length > 0 && (
                              <span className="text-accent-amber text-xs">
                                ⚡ {review.ai_feedback.performance.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getScoreColor(review.scores?.overall_score || 0)}`}>
                        {review.scores?.overall_score || 0}/10
                      </p>
                      <p className="text-xs text-gray-500">Overall</p>
                    </div>
                    <button
                      onClick={() => downloadPDF(review)}
                      disabled={exportingId === review.id}
                      className="px-4 py-2 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      title="Export this review as PDF"
                    >
                      {exportingId === review.id ? (
                        <div className="animate-spin w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full" />
                      ) : (
                        <>
                          <span>📄</span>
                          <span className="text-sm hidden sm:inline">PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-bold mb-2">No Reviews Yet</h3>
            <p className="text-gray-400 mb-6">Start your coding journey with your first review</p>
            <Link to="/review" className="btn-primary inline-block">
              🔍 Start Your First Review
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;