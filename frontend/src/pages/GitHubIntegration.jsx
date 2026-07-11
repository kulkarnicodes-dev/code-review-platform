import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../utils/ThemeContext';
import githubAPI from '../services/github_api';
import { useSearchParams } from 'react-router-dom';

export default function GitHubIntegration() {
  const [searchParams] = useSearchParams();
  const { isDark } = useTheme();
  
  const [status, setStatus] = useState(null);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [analyzing, setAnalyzing] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('repos');

  useEffect(() => {
    loadStatus();
    
    // Check for callback parameters
    if (searchParams.get('connected') === 'true') {
      setTimeout(() => {
        loadStatus();
        window.history.replaceState({}, '', '/github');
      }, 1000);
    }
  }, []);

  const loadStatus = async () => {
    try {
      const { data } = await githubAPI.getStatus();
      setStatus(data);
      if (data.connected) {
        loadRepositories();
      }
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      const { data } = await githubAPI.getLoginUrl();
      window.location.href = data.authorization_url;
    } catch (error) {
      console.error('Error connecting GitHub:', error);
      alert('Failed to connect GitHub. Please try again.');
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect your GitHub account?')) return;
    
    try {
      await githubAPI.disconnect();
      setStatus({ connected: false });
      setRepos([]);
      setCommits([]);
      setSelectedRepo(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const loadRepositories = async () => {
    try {
      const { data } = await githubAPI.getRepositories({ sort: 'updated', per_page: 30 });
      setRepos(data.repositories);
    } catch (error) {
      console.error('Error loading repos:', error);
    }
  };

  const loadCommits = async (repo) => {
    setSelectedRepo(repo);
    setTab('commits');
    try {
      const [owner, repoName] = repo.full_name.split('/');
      const { data } = await githubAPI.getCommits(owner, repoName, { per_page: 10 });
      setCommits(data.commits);
    } catch (error) {
      console.error('Error loading commits:', error);
    }
  };

  const handleAnalyzeCommit = async (commit) => {
    const [owner, repoName] = selectedRepo.full_name.split('/');
    setAnalyzing(commit.sha);
    setAnalysis(null);
    
    try {
      const { data } = await githubAPI.analyzeCommit(owner, repoName, commit.sha);
      setAnalysis(data.analysis);
      setTab('analysis');
    } catch (error) {
      console.error('Error analyzing commit:', error);
      alert('Failed to analyze commit. Please try again.');
    } finally {
      setAnalyzing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not Connected View
  if (!status?.connected) {
    return (
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-display font-bold text-gradient mb-2">
            🔗 GitHub Integration
          </h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
            Connect your GitHub account to review commits and repositories
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center max-w-2xl mx-auto py-12"
        >
          <div className="text-8xl mb-6">🐙</div>
          <h2 className="text-2xl font-bold mb-4">Connect GitHub Account</h2>
          <p className={`mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Connect your GitHub to analyze commits, review code changes, and get AI-powered feedback on your repositories.
          </p>

          <button
            onClick={handleConnect}
            className="btn-primary text-lg py-4 px-8 inline-flex items-center gap-3"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Login with GitHub
          </button>

          <div className={`mt-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            <p className="mb-2">✅ Secure OAuth 2.0 authentication</p>
            <p className="mb-2">✅ We only request read access to your repositories</p>
            <p>✅ Disconnect anytime</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Connected View
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-display font-bold text-gradient mb-2">GitHub Integration</h1>
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Connected as @{status.username}</p>
        </div>
        <div className="flex items-center gap-3">
          <img src={status.avatar_url} alt={status.username} className="w-12 h-12 rounded-full border-2 border-primary-500" />
          <button onClick={handleDisconnect} className="btn-secondary text-sm">
            Disconnect
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {['repos', 'commits', 'analysis'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            disabled={t === 'commits' && !selectedRepo}
            className={`px-5 py-2 rounded-lg font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary-600 text-white' : 'btn-secondary'
            } ${t === 'commits' && !selectedRepo ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {t === 'repos' && '📚 '}
            {t === 'commits' && '💾 '}
            {t === 'analysis' && '🤖 '}
            {t}
            {t === 'repos' && ` (${repos.length})`}
            {t === 'commits' && ` (${commits.length})`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Repositories Tab */}
        {tab === 'repos' && (
          <motion.div
            key="repos"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {repos.map(repo => (
              <motion.div
                key={repo.id}
                whileHover={{ scale: 1.02 }}
                className={`card cursor-pointer border-2 transition-colors ${
                  selectedRepo?.id === repo.id
                    ? 'border-primary-500'
                    : isDark ? 'border-dark-700 hover:border-primary-500/50' : 'border-light-300 hover:border-primary-400/50'
                }`}
                onClick={() => loadCommits(repo)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg truncate flex-1">{repo.name}</h3>
                  {repo.private && <span className="badge badge-warning text-xs">Private</span>}
                </div>
                <p className={`text-sm mb-4 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {repo.description || 'No description'}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  {repo.language && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-primary-500"></span>
                      {repo.language}
                    </span>
                  )}
                  <span>⭐ {repo.stargazers_count}</span>
                  <span>🔀 {repo.forks_count}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Commits Tab */}
        {tab === 'commits' && selectedRepo && (
          <motion.div
            key="commits"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="card">
              <h3 className="text-xl font-bold mb-2">📦 {selectedRepo.name}</h3>
              <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{selectedRepo.description}</p>
            </div>

            {commits.map(commit => (
              <motion.div
                key={commit.sha}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold mb-2">{commit.message}</p>
                    <div className={`text-sm flex items-center gap-4 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      <span>{commit.author_name}</span>
                      <span>•</span>
                      <span>{new Date(commit.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <code className="text-xs">{commit.sha.substring(0, 7)}</code>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAnalyzeCommit(commit)}
                    disabled={analyzing === commit.sha}
                    className="btn-primary whitespace-nowrap disabled:opacity-50"
                  >
                    {analyzing === commit.sha ? '⏳ Analyzing...' : '🤖 Analyze'}
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Analysis Tab */}
        {tab === 'analysis' && analysis && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="card border-l-4 border-primary-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">AI Code Review</h3>
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-bold text-primary-400">
                    {analysis.overall_score}
                  </span>
                  <span className="text-gray-500">/10</span>
                </div>
              </div>
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {analysis.repository} • {analysis.commit_sha.substring(0, 7)}
              </p>
              <p className="font-semibold mb-4">{analysis.commit_message}</p>
              <div className={`p-4 rounded-lg ${isDark ? 'bg-dark-800/50' : 'bg-light-100'}`}>
                <p>{analysis.feedback}</p>
              </div>
            </div>

            {analysis.suggestions?.length > 0 && (
              <div className="card">
                <h4 className="font-bold mb-3">💡 Suggestions</h4>
                <ul className="space-y-2">
                  {analysis.suggestions.map((suggestion, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary-400">→</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.file_reviews?.length > 0 && (
              <div className="card">
                <h4 className="font-bold mb-3">📄 Files Changed ({analysis.files_changed})</h4>
                <div className="space-y-3">
                  {analysis.file_reviews.map((file, i) => (
                    <div key={i} className={`p-3 rounded-lg ${isDark ? 'bg-dark-800/50' : 'bg-light-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-sm font-semibold">{file.filename}</code>
                        <span className={`badge ${
                          file.status === 'added' ? 'badge-success' :
                          file.status === 'removed' ? 'badge-error' :
                          'badge-warning'
                        }`}>
                          {file.status}
                        </span>
                      </div>
                      <div className="text-sm flex gap-4">
                        <span className="text-accent-emerald">+{file.additions}</span>
                        <span className="text-accent-rose">-{file.deletions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}