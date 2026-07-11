import apiClient from './api';

export const githubAPI = {
  // OAuth & Connection
  getLoginUrl: () => apiClient.get('/github/login'),
  getStatus: () => apiClient.get('/github/status'),
  disconnect: () => apiClient.delete('/github/disconnect'),
  getProfile: () => apiClient.get('/github/profile'),

  // Repositories
  getRepositories: (params = {}) => 
    apiClient.get('/github/repositories', { params }),
  
  getCommits: (owner, repo, params = {}) => 
    apiClient.get(`/github/repositories/${owner}/${repo}/commits`, { params }),
  
  analyzeCommit: (owner, repo, sha) => 
    apiClient.post(`/github/repositories/${owner}/${repo}/commits/${sha}/analyze`),
};

export default githubAPI;