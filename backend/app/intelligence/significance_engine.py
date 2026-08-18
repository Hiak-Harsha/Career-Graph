"""
Career Graph — Event Significance Engine
Evaluates codebase events (commits, PRs, releases) to determine career significance,
preventing noisy rebuilds on minor typos while autonomously updating the Career Graph
when major engineering milestones occur.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import re

class EventSignificanceResult(BaseModel):
    level: str  # "LOW" | "MEDIUM" | "HIGH" | "CAREER_SIGNIFICANT"
    score: float  # 0.0 to 1.0
    rationale: str
    action_policy: str  # "RECORD_ONLY" | "UPDATE_STATS" | "UPDATE_GRAPH_AND_RESUME" | "FULL_SNAPSHOT_AND_PORTFOLIO"
    affected_competencies: List[str]

def classify_event_significance(
    commit_message: str,
    files_changed: Optional[List[str]] = None,
    diff_stats: Optional[Dict[str, Any]] = None
) -> EventSignificanceResult:
    """
    Classifies the engineering significance of a code update into 4 tiers:
    - LOW: Doc fixes, minor style changes, dependency updates.
    - MEDIUM: Incremental features, unit tests, refactors.
    - HIGH: New architectural modules, new algorithms, pipelines, core services.
    - CAREER_SIGNIFICANT: Validated benchmarks, production releases, complete system architectures.
    """
    msg_lower = (commit_message or "").lower()
    files = files_changed or []
    diff = diff_stats or {}
    
    insertions = diff.get("insertions", 0)
    deletions = diff.get("deletions", 0)
    total_lines = insertions + deletions

    affected_competencies = []

    # Detect technologies/domains in changed file paths
    for f in files:
        f_lower = f.lower()
        if any(k in f_lower for k in ["ml", "ai", "model", "train", "infer", "torch", "tensor"]):
            affected_competencies.append("Machine Learning")
        if any(k in f_lower for k in ["api", "service", "server", "backend", "grpc", "controller"]):
            affected_competencies.append("Backend Systems")
        if any(k in f_lower for k in ["frontend", "ui", "components", "pages", "app"]):
            affected_competencies.append("Frontend Architecture")
        if any(k in f_lower for k in ["algo", "graph", "solver", "tree", "engine"]):
            affected_competencies.append("Algorithms & Optimization")

    affected_competencies = list(set(affected_competencies))

    # 1. Check for CAREER_SIGNIFICANT triggers
    is_release = any(k in msg_lower for k in ["release", "v1.", "v2.", "initial launch", "production deploy", "launch v"])
    has_benchmark = any(k in msg_lower for k in ["benchmark", "accuracy", "latency reduction", "99.9%", "throughput", "optimiz"])
    
    if is_release or has_benchmark:
        return EventSignificanceResult(
            level="CAREER_SIGNIFICANT",
            score=0.95,
            rationale="Production release or verified empirical milestone detected.",
            action_policy="FULL_SNAPSHOT_AND_PORTFOLIO",
            affected_competencies=affected_competencies
        )

    # 2. Check for LOW triggers
    is_doc_only = all(f.lower().endswith((".md", ".txt", ".png", ".jpg", ".svg", ".gitignore", ".env.example")) for f in files) if files else False
    is_chore = any(msg_lower.startswith(p) for p in ["chore:", "docs:", "style:", "typo:", "formatting:", "fix typo", "update readme"])
    is_deps = any(k in msg_lower for k in ["bump", "dependabot", "dependency", "package-lock", "yarn.lock"])

    if is_doc_only or is_chore or is_deps or (total_lines < 15 and not any(k in msg_lower for k in ["feat:", "fix:"])):
        return EventSignificanceResult(
            level="LOW",
            score=0.15,
            rationale="Documentation, dependency bump, or formatting change without architectural impact.",
            action_policy="RECORD_ONLY",
            affected_competencies=affected_competencies
        )

    # 3. Check for HIGH triggers
    is_new_module = len(files) >= 4 or insertions > 200
    is_core_feature = any(msg_lower.startswith(p) for p in ["feat:", "feature:", "architect:", "implement:"])
    has_deep_tech = bool(affected_competencies)

    if (is_new_module or (is_core_feature and has_deep_tech)) and total_lines >= 50:
        return EventSignificanceResult(
            level="HIGH",
            score=0.75,
            rationale="Substantial architectural expansion or new domain feature added.",
            action_policy="UPDATE_GRAPH_AND_RESUME",
            affected_competencies=affected_competencies
        )

    # 4. Fallback to MEDIUM (Standard development increment)
    return EventSignificanceResult(
        level="MEDIUM",
        score=0.45,
        rationale="Standard iterative engineering progress and bugfixes.",
        action_policy="UPDATE_STATS",
        affected_competencies=affected_competencies
    )
