notes on v2:

- Core Harness Opportunities                                                                                                                                       
                                                                                                                                                                  
 1. Prompt Templates (prompt-templates.md)                                                                                                                        
     - Not used at all. Create domain/project prompt templates for common tasks: /status, /review, /client-update, /plan.                                         
     - Place in domain/prompts/ and base/.pi/prompts/ for consistent, reusable command patterns.                                                                  
 2. Custom Commands via Extensions                                                                                                                                
     - memory-db.ts could register /memory-search, /scratchpad-add, /goal-set commands via pi.registerCommand().                                                  
     - More integrated than skill-based invocation, appears in / autocomplete.                                                                                    
 3. Skill Commands Enablement                                                                                                                                     
     - Set "enableSkillCommands": true in settings to allow /skill:name syntax.                                                                                   
     - Direct skill invocation without routing table dependency.                                                                                                  
 4. Tree Navigation & Branching (tree.md)                                                                                                                         
     - Leverage /tree for managing multiple conversation threads within a project.                                                                                
     - Add guidance on using labels (Shift+L) for different workstreams (research, drafting, client comms).                                                       
 5. JSON Mode for Structured Output (json.md)                                                                                                                     
     - Use --json flag in watches to parse outputs programmatically.                                                                                              
     - Enables structured data flow between scheduled tasks and domain memory.                                                                                    
                                                                                                                                                                  
 Extension & SDK Opportunities                                                                                                                                    
                                                                                                                                                                  
 6. Custom Tools Registration                                                                                                                                     
     - Register domain-specific tools: domain_memory_query, client_communication, project_status_update.                                                          
     - Native tool calls are more reliable than skill instructions for repetitive operations.                                                                     
 7. Custom UI Components (extensions.md → Custom UI)                                                                                                              
     - Build domain‑specific TUI dashboards (project status, goal deltas, memory stats).                                                                          
     - Use ctx.ui.custom() for interactive domain management interfaces.                                                                                          
 8. SDK for Domain Dashboard (sdk.md)                                                                                                                             
     - Embed pi's AgentSession in a custom app to show cross‑project status, active goals, memory health.                                                         
     - Enables external monitoring/control beyond the terminal.                                                                                                   
 9. State Management via pi.appendEntry()                                                                                                                         
     - Store transient domain state in session entries (complements SQLite for cross‑session ephemeral data).                                                     
     - Useful for "in‑flight" work that shouldn't go to the memory DB.                                                                                            
 10. Provider/Model Switching Hooks                                                                                                                               
     - Dynamically switch models based on task complexity (e.g., Opus for architecture, Haiku for edits).                                                         
     - Use before_agent_start to inspect prompt and adjust ctx.model.                                                                                             
                                                                                                                                                                  
 Configuration & Safety Opportunities                                                                                                                             
                                                                                                                                                                  
 11. Granular Tool Permissions (pi-permission-system)                                                                                                             
     - Move beyond global "ask" to path‑based rules in permissions-config.json.                                                                                   
     - Block writes to .env, memory.db, node_modules/; allow specific workspaces.                                                                                 
 12. Package Distribution (packages.md)                                                                                                                           
     - Bundle domain extensions/skills as pi packages (npm: or git:).                                                                                             
     - One‑command install for teams: pi install git:github.com/org/domain-pi-package.                                                                            
 13. Environment Variable Expansion                                                                                                                               
     - Use env vars more dynamically (e.g., PI_WORKSPACE, PI_PHASE) to adjust behavior per workspace.                                                             
     - Could drive different memory‑injection strategies.                                                                                                         
 14. Compaction Customization (compaction.md)                                                                                                                     
     - Domain‑specific summarization via session_compact hook.                                                                                                    
     - Preserve key decisions, client constraints, and project milestones in compacted context.                                                                   
                                                                                                                                                                  
 Integration & Proactivity Opportunities                                                                                                                          
                                                                                                                                                                  
 15. RPC Mode for Watches (rpc.md)                                                                                                                                
     - Run watches with --mode rpc for structured two‑way communication.                                                                                          
     - Watches could receive previous results and emit structured JSON for parsing.                                                                               
 16. Message Queue for Deferred Tasks                                                                                                                             
     - Use pi's built‑in message queue (steer/followUp) for background tasks.                                                                                     
     - Example: schedule a notification after a long‑running analysis completes.                                                                                  
 17. Git Integration Extension                                                                                                                                    
     - Auto‑stash, commit, or branch per task via tool_call hooks.                                                                                                
     - Ensures clean version history aligned with agent turns.                                                                                                    
 18. Session Sharing Integration (pi-share-hf)                                                                                                                    
     - Option to publish anonymized OSS sessions to Hugging Face.                                                                                                 
     - Contributes to public dataset of domain‑specific development workflows.                                                                                    
                                                                                                                                                                  
 Advanced Features                                                                                                                                                
                                                                                                                                                                  
 19. Image Support in Memory                                                                                                                                      
     - Capture screenshots/diagrams as ImageContent in observations.                                                                                              
     - Enable visual reference recall (requires embedding model that handles images).                                                                             
 20. Custom Rendering of Tool Calls                                                                                                                               
     - Override how domain tools appear in TUI (e.g., pretty‑print memory queries).                                                                               
     - Improve readability of frequent domain operations.                                                                                                         
 21. Multi‑Domain Switching Commands                                                                                                                              
     - Extend pi domain use <name> with extension‑registered commands for quick context swaps.                                                                    
     - Could also pre‑load domain memory on switch.                                                                                                               
 22. Theme Customization (themes.md)                                                                                                                              
     - Domain‑specific TUI themes (colors, icons) for visual branding.                                                                                            
     - Minor but improves worker immersion.                                                                                                                       
 23. Error Handling Customization                                                                                                                                 
     - Domain‑specific error recovery hooks (e.g., retry with different model, log to client channel).                                                            
     - Use tool_call error events to trigger recovery flows.                                                                                                      
                                                                                                                                                                  
 Immediate High‑Value Adds                                                                                                                                        
                                                                                                                                                                  
 Priority 1 (low effort, high impact):                                                                                                                            
 - Prompt templates for common domain tasks                                                                                                                       
 - Enable skill commands in settings                                                                                                                              
 - Add /tree and labeling guidance to CONTEXT.md templates                                                                                                        
                                                                                                                                                                  
 Priority 2 (moderate effort, structural improvement):                                                                                                            
 - Custom commands in memory-db.ts (/memory-search, /scratchpad)                                                                                                  
 - Granular permission config for path protection                                                                                                                 
 - Package distribution setup for domain assets                                                                                                                   
                                                                                                                                                                  
 Priority 3 (higher effort, advanced capabilities):                                                                                                               
 - Custom tools for domain operations                                                                                                                             
 - RPC mode for watches (structured JSON output)                                                                                                                  
 - SDK‑based domain dashboard                                                                                                                                     
                                                                                                                                                                  
 These opportunities align with the template's core goals: portable domain context, embedded memory, proactivity, and hierarchical configuration. They leverage   
 pi's native extensibility to make the knowledge worker more effective, standardized, and integrated. 