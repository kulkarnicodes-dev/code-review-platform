from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GitHubUser(BaseModel):
    github_id: int
    username: str
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0
    profile_url: str

class GitHubRepository(BaseModel):
    id: int
    name: str
    full_name: str
    description: Optional[str] = None
    html_url: str
    language: Optional[str] = None
    stargazers_count: int = 0
    forks_count: int = 0
    open_issues_count: int = 0
    default_branch: str = "main"
    private: bool = False
    updated_at: datetime

class GitHubCommit(BaseModel):
    sha: str
    message: str
    author_name: str
    author_email: str
    date: datetime
    url: str
    additions: int = 0
    deletions: int = 0
    total_changes: int = 0

class GitHubFile(BaseModel):
    filename: str
    status: str  # added, modified, removed
    additions: int
    deletions: int
    changes: int
    patch: Optional[str] = None

class CommitAnalysis(BaseModel):
    commit_sha: str
    repository: str
    overall_score: float
    feedback: str
    suggestions: List[str]
    file_reviews: List[dict]
    security_issues: List[str] = []
    best_practices: List[str] = []

class GitHubConnectionStatus(BaseModel):
    connected: bool
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    connected_at: Optional[datetime] = None
    repos_count: int = 0