from typing import List
from backend.app.schemas.capabilities import Capability


SYSTEM_CAPABILITIES: List[Capability] = [
    Capability(
        id="core_task_lifecycle",
        name="Task Intake & Persistence",
        category="core",
        description="Accepts natural language user requests, validates payloads, and persists task documents to local MongoDB.",
        status="implemented",
        phase="Phase 1",
        icon="Layers",
        details="Operational in Phase 1 with REST API and SSE event foundation.",
    ),
    Capability(
        id="command_center_ui",
        name="Sci-Fi Command Center UI",
        category="ui",
        description="Immersive dark command center interface built with Next.js App Router, Tailwind CSS, Motion, and 3D Hologram.",
        status="implemented",
        phase="Phase 1 & 2",
        icon="LayoutDashboard",
        details="Interactive command center with live diagnostic indicators and real-time 3D holographic core.",
    ),
    Capability(
        id="langgraph_orchestration",
        name="LangGraph Planning & Recovery",
        category="orchestration",
        description="Stateful task planning, bounded execution, failure recovery loops, and dynamic branching.",
        status="implemented",
        phase="Phase 2",
        icon="GitBranch",
        details="Operational in Phase 2 with explicit planning, running, and validation nodes.",
    ),
    Capability(
        id="omniroute_free_models",
        name="Free-Only Model Routing",
        category="model_router",
        description="OmniRoute provider adapter strictly constrained to eligible free-tier model routes with automatic fallback.",
        status="implemented",
        phase="Phase 2",
        icon="Cpu",
        details="Strictly enforced in Phase 2 across Groq, Gemini, and OpenRouter free routes. Paid fallback disabled.",
    ),
    Capability(
        id="web_research",
        name="Autonomous Web Research",
        category="research",
        description="Structured multi-source web searches, page parsing, citation verification, and synthesized research briefs.",
        status="planned",
        phase="Phase 3",
        icon="Globe",
        details="Scheduled for Phase 3 practical capabilities rollout.",
    ),
    Capability(
        id="document_analysis",
        name="File & Document Analysis",
        category="documents",
        description="Local parsing, semantic extraction, and question-answering across PDFs, spreadsheets, and markdown docs.",
        status="planned",
        phase="Phase 3",
        icon="FileText",
        details="Scheduled for Phase 3 practical capabilities rollout.",
    ),
    Capability(
        id="user_memory",
        name="User-Controlled Persistent Memory",
        category="memory",
        description="Durable preferences, project context, and user-inspectable memory entries with full editing and deletion.",
        status="planned",
        phase="Phase 4",
        icon="Database",
        details="Scheduled for Phase 4 personalization and safety rollout.",
    ),
    Capability(
        id="action_approvals",
        name="Action Approvals & Security Sandbox",
        category="security",
        description="Interactive user approvals for side effects, disk modifications, command executions, and destructive actions.",
        status="planned",
        phase="Phase 4",
        icon="ShieldCheck",
        details="Interactive approval modals scheduled for Phase 4.",
    ),
    Capability(
        id="coding_mcp",
        name="Coding Review & Patch MCP",
        category="coding",
        description="Specialized coding review MCP client with side-by-side visual diffs and manual patch acceptance.",
        status="planned",
        phase="Phase 5",
        icon="Code2",
        details="Benchmarked separately and integrated strictly in Phase 5 release.",
    ),
]


def get_all_capabilities() -> List[Capability]:
    """Returns the full catalog of JARVIS capabilities and their implementation phase."""
    return SYSTEM_CAPABILITIES
