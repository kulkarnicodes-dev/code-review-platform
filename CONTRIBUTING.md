# 🤝 Contributing to AI-Powered Code Review Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone <your-fork-url>`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes
6. Commit: `git commit -m "Add: your feature description"`
7. Push: `git push origin feature/your-feature-name`
8. Create a Pull Request

## 📁 Project Structure

```
code-review-platform/
├── backend/           # FastAPI backend
│   ├── app/
│   │   ├── api/      # API routes
│   │   ├── core/     # Configuration
│   │   ├── models/   # Data models
│   │   └── services/ # Business logic
├── frontend/          # React frontend
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── utils/
└── docs/             # Documentation
```

## 💻 Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 📝 Coding Standards

### Python (Backend)
- Follow PEP 8
- Use type hints
- Write docstrings for functions
- Keep functions small and focused
- Use async/await for I/O operations

Example:
```python
async def get_user(user_id: str) -> Optional[User]:
    """
    Get user by ID from database.
    
    Args:
        user_id: User's unique identifier
        
    Returns:
        User object if found, None otherwise
    """
    return await db.users.find_one({"_id": user_id})
```

### JavaScript/React (Frontend)
- Use functional components
- Follow React hooks best practices
- Use meaningful variable names
- Keep components small and reusable
- Use Tailwind utility classes

Example:
```jsx
const UserCard = ({ user }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="card">
      <h3 className="text-xl font-bold">{user.name}</h3>
      {/* ... */}
    </div>
  );
};
```

## 🎨 UI/UX Guidelines

- Follow existing design patterns
- Ensure responsive design (mobile, tablet, desktop)
- Use consistent spacing and colors
- Add loading states for async operations
- Provide user feedback for actions
- Maintain accessibility standards

## 📦 Commit Message Format

Use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example:
```
feat: add user profile page
fix: resolve login authentication bug
docs: update API documentation
```

## 🔍 Code Review Process

1. Ensure all tests pass
2. Update documentation if needed
3. Request review from maintainers
4. Address review comments
5. Wait for approval
6. Merge after approval

## 🐛 Reporting Bugs

When reporting bugs, include:
- Clear description
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details

## 💡 Feature Requests

For feature requests, provide:
- Use case description
- Proposed solution
- Alternative solutions considered
- Additional context

## 📄 Documentation

- Update README.md for major changes
- Add code comments for complex logic
- Update API documentation
- Include examples where helpful

## 🌟 Areas for Contribution

### High Priority
- [ ] Add more programming languages support
- [ ] Implement GitHub integration
- [ ] Add team collaboration features
- [ ] Improve test coverage
- [ ] Performance optimization

### Medium Priority
- [ ] Add code refactoring feature
- [ ] Test case generation
- [ ] Custom style guide configuration
- [ ] Export reports as PDF
- [ ] Dark/light theme toggle

### Good First Issues
- [ ] Improve error messages
- [ ] Add more UI animations
- [ ] Enhance mobile responsiveness
- [ ] Add tooltips and help text
- [ ] Improve loading states

## ❓ Questions?

- Open an issue for questions
- Join discussions
- Reach out to maintainers

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
