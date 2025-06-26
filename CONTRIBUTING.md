# Contributing to Cisco MCP Server

Thank you for your interest in contributing to the Cisco MCP Server! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 14.0.0 or higher
- npm or yarn
- TypeScript knowledge
- Basic understanding of Cisco networking
- Familiarity with SSH/Telnet protocols

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/cisco-mcp.git
   cd cisco-mcp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```

4. **Build Project**
   ```bash
   npm run build
   ```

## 🛠 Development Guidelines

### Code Style
- Use TypeScript for all source code
- Follow existing code formatting and structure
- Use meaningful variable and function names
- Add JSDoc comments for public methods
- Maintain consistency with existing codebase

### Project Structure
```
src/
├── index.ts              # Main MCP server entry point
├── cisco-connection.ts   # Connection management logic
└── types/               # TypeScript type definitions
```

### Adding New Features

1. **New Tools**: Add new MCP tools in `src/index.ts`
2. **Connection Logic**: Extend `CiscoConnectionManager` in `src/cisco-connection.ts`
3. **Types**: Add new TypeScript interfaces in appropriate files

## 🧪 Testing

### Manual Testing
1. Build the project: `npm run build`
2. Test with a real Cisco device or simulator
3. Verify all connection types (SSH/Telnet)
4. Test different command modes (user/enable/config)

### Test Scenarios
- Connection establishment and teardown
- Command execution in different modes
- Error handling for invalid commands
- Multi-device connection management
- Network timeout scenarios

## 📝 Documentation

### README Updates
- Update feature lists for new capabilities
- Add usage examples for new tools
- Update installation instructions if needed

### Code Documentation
- Add JSDoc comments for new public methods
- Document complex logic with inline comments
- Update type definitions for new interfaces

## 🐛 Bug Reports

### Before Submitting
1. Check existing issues for duplicates
2. Test with the latest version
3. Gather relevant information:
   - Node.js version
   - Cisco device type and IOS version
   - Connection method (SSH/Telnet)
   - Error messages and logs

### Bug Report Template
```markdown
**Describe the Bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Connect to device with '...'
2. Execute command '...'
3. See error

**Expected Behavior**
What you expected to happen.

**Environment**
- Node.js version:
- Cisco device model:
- IOS version:
- Connection method:

**Additional Context**
Any other context about the problem.
```

## 🚀 Feature Requests

### Before Submitting
1. Check if the feature already exists
2. Consider if it fits the project scope
3. Think about implementation complexity

### Feature Request Template
```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Explain why this feature would be useful.

**Proposed Implementation**
If you have ideas about how to implement this feature.

**Additional Context**
Any other context or screenshots about the feature request.
```

## 🔄 Pull Request Process

### Before Submitting
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Update documentation
6. Commit with clear messages

### Pull Request Guidelines
1. **Title**: Use a clear, descriptive title
2. **Description**: Explain what changes you made and why
3. **Testing**: Describe how you tested your changes
4. **Documentation**: Update relevant documentation
5. **Breaking Changes**: Clearly mark any breaking changes

### Review Process
1. Maintainers will review your PR
2. Address any feedback or requested changes
3. Once approved, your PR will be merged

## 🏷 Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🤝 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professionalism

### Unacceptable Behavior
- Harassment or discrimination
- Trolling or insulting comments
- Publishing private information
- Other unprofessional conduct

## 📞 Getting Help

- **Issues**: Use GitHub issues for bugs and feature requests
- **Discussions**: Use GitHub discussions for questions and ideas
- **Email**: Contact maintainers for sensitive issues

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to Cisco MCP Server!