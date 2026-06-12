# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.0.0] - 2026-06-12

### Changed
- Complete rewrite in ESM (ES modules)
- SSH connections are now properly managed with `withSSH()` (no resource leaks)
- Deployment failures now set exit code to 1 (was 0)
- Undefined variables now throw `VariableError` instead of silently resolving to empty string
- Remote shell commands are executed individually and stop on first failure
- `uploadAndExtract` now properly propagates errors instead of swallowing them
- `excludeList` no longer mutates the caller's array
- Version is read dynamically from `package.json` instead of hardcoded
- `init` now prompts before overwriting existing files
- `.gitignore` handling improved with proper trimming

### Added
- SSH key authentication support (`privateKeyPath`, `passphrase`)
- `--dry-run` flag to preview deployment without executing
- `--server` flag to deploy to a specific server only
- Config validation with zod (helpful error messages for invalid configs)
- Custom error class hierarchy (`SimployError`, `ConfigError`, `SSHError`, `DeployError`, `VariableError`)
- Deployment summary output (per-server success/failure)
- `llms.txt` for LLM code assistant integration
- Unit tests (vitest)
- ESLint + Prettier
- GitHub Actions CI/CD workflows

### Removed
- `migrate` command (config format redesigned)
- `cli-progress` dependency (unused)
- `tsc-alias` dependency (no longer needed with ESM)
- CommonJS module output

## [1.0.4] - 2025-07-11

### Added
- Initial release with basic SSH deployment
- `simploy init` and `simploy deploy` commands
- Environment and server configuration
- Variable substitution with `${VAR}` syntax
- `simploy.private.json` for secrets