<!-- @standalone -->
# Chrome MCP Troubleshooting

## CRITICAL RULES

### Connection Management
- FORBIDDEN: pkill -f chrome-studio-mcp during active session
- FORBIDDEN: pkill -f chrome-mcp during active session
- FORBIDDEN: Restarting MCP processes manually
- REQUIRED: Ask user to restart MCP via Claude Code interface
- REQUIRED: Start new conversation if connection cannot be restored

### Testing Requirements
- REQUIRED: Test all UI changes immediately after code changes
- REQUIRED: Take screenshot to verify behavior before next change
- FORBIDDEN: Skipping tests due to connection errors
- FORBIDDEN: Making multiple changes without incremental testing
- STOP: If connection drops before testing current change

### Prevention Rules
- FORBIDDEN: Using chrome_reload command (breaks WebSocket)
- REQUIRED: Check connection before critical operations
- REQUIRED: Test changes incrementally, one at a time
- DETECT: WebSocket is not open: readyState 3 (CLOSED)
- DETECT: No such tool available (server removed from session)

### What Breaks Connections
- Vite hot module reload can disrupt connection
- chrome_reload command breaks WebSocket
- Chrome tab or window closing
- Chrome browser crash
- Long inactivity periods

### Recovery Procedure
- STOP: If error shows "WebSocket is not open"
- STOP: If error shows "No such tool available"
- REQUIRED: Document all changes made before connection drop
- REQUIRED: Note what was tested vs what needs verification
- REQUIRED: Run npm run arch:check to validate code
- REQUIRED: Ask user: continue without testing or start new session

### Active MCP Server
- Server name: chrome-studio-mcp
- DETECT: ps aux | grep chrome-studio-mcp | grep -v grep

### Error States
- "WebSocket is not open: readyState 3 (CLOSED)" -> Connection dropped
- "No such tool available" -> Server removed from session
- "Not connected" -> Server not running

### Testing Workflow
- REQUIRED: Make code change
- REQUIRED: Run npm run arch:check
- REQUIRED: Test via MCP immediately
- REQUIRED: Take screenshot
- REQUIRED: Document verified behavior
- REQUIRED: Only then make next change

### When Connection Lost
- BAD: pkill -f chrome-studio-mcp -> breaks permanently
- GOOD: Ask user to restart MCP or start new conversation
- BAD: Continue without testing
- GOOD: Document completion status and ask user preference

### Session Scope
- MCP tools load when conversation starts
- MCP tools communicate via stdin/stdout with Claude Code
- MCP tools cannot reload mid-session
- Killing processes removes tools from session permanently

## Screenshot Safety

### Rules
- REQUIRED: Use take_snapshot for page inspection (text-based, always safe)
- REQUIRED: Use take_screenshot with filePath parameter to save to disk
- REQUIRED: Use Read tool to view saved screenshot files
- FORBIDDEN: Inline take_screenshot without filePath (causes 400 MIME error)

### Error Recovery
- DETECT: 400 error after take_screenshot (MIME type mismatch)
- STOP: Session corrupted beyond recovery
- REQUIRED: Start new conversation immediately

## STOP CONDITIONS
Stop and ask user before:
- Attempting to restart MCP processes manually
- Skipping visual verification of UI changes
- Making additional changes after connection drops
- Proposing code as complete without MCP testing
