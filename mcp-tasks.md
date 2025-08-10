# Task 4: Cursor MCP Configuration

## Description
Configure Cursor to recognize and use the Awesome Ionic MCP server by creating the appropriate MCP configuration files.

## Acceptance Criteria
- [ ] MCP configuration file is created in the correct location
- [ ] Configuration uses proper JSON format
- [ ] Server command and arguments are correctly specified
- [ ] Cursor recognizes the MCP server configuration
- [ ] No JSON syntax errors in configuration

## Steps
1. Choose configuration location:
   - **Project-specific**: Create `.cursor/mcp.json` in project root
   - **Global**: Create `~/.cursor/mcp.json` in home directory
2. Create the configuration file with proper JSON structure
3. Add the server configuration
4. Save the file
5. Restart Cursor or reload MCP servers

## Configuration File Content
```json
{
  "mcpServers": {
    "awesome-ionic-mcp": {
      "command": "npx",
      "args": ["-y", "awesome-ionic-mcp@latest"]
    }
  }
}
```

## File Locations
- **Project-specific**: `./cursor/mcp.json` (relative to project root)
- **Global**: `~/.cursor/mcp.json` (in user home directory)

## Verification
- [ ] File exists in chosen location
- [ ] JSON syntax is valid (no syntax errors)
- [ ] Cursor shows the server in MCP configuration
- [ ] No error messages when Cursor loads

## Notes
- Project-specific config makes server available only in that project
- Global config makes server available in all Cursor projects
- Use camelCase for server names (no spaces)
- Restart Cursor after configuration changes
- Cursor may prompt for trust confirmation when server starts
