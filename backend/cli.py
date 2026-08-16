#!/usr/bin/env python3
"""
Career Graph CLI Tool
Allows command-line interaction with the Career Identity System & Graph Engine.
"""

import sys
import os
import argparse

# Ensure project root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.database import SessionLocal, init_db
from backend.app.models import User, Project, Claim, DomainProgress, SkillProgress, Idea
from backend.app.analyzer import sync_github_project, update_domain_progress_scores, update_skill_progress_scores
from backend.app.main import compute_candidate_professional_identity, build_dynamic_resume_payload


def get_default_user(db):
    user = db.query(User).first()
    if not user:
        user = User(
            name="Career Explorer",
            email="explorer@example.com",
            headline="Full Stack & AI Engineer",
            bio="Building high-impact systems.",
            location="Remote",
            github_username="demo-user"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def cmd_profile(args):
    db = SessionLocal()
    try:
        user = get_default_user(db)
        identity = compute_candidate_professional_identity(user, db)
        projects = db.query(Project).filter(Project.user_id == user.id).all()
        claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.status == "user_confirmed").all()
        
        print("\n=======================================================")
        print(f"  CAREER GRAPH IDENTITY: {user.name}")
        print("=======================================================")
        print(f"Headline:       {user.headline}")
        print(f"Style / Archetype: {identity.project_style}")
        print(f"Primary Domains:{', '.join(identity.primary_domains) or 'None'}")
        print(f"Emerging:       {', '.join(identity.emerging_domains) or 'None'}")
        print(f"Verified Claims:{len(claims)}")
        print(f"Repositories:   {len(projects)}")
        print(f"Trajectory:     {identity.current_trajectory}")
        print("=======================================================\n")
    finally:
        db.close()


def cmd_ideas(args):
    db = SessionLocal()
    try:
        user = get_default_user(db)
        if args.action == "list":
            ideas = db.query(Idea).filter(Idea.user_id == user.id).all()
            print(f"\nFound {len(ideas)} ideas for {user.name}:")
            for idx, idea in enumerate(ideas, 1):
                print(f"  {idx}. [{idea.maturity}] {idea.title} (Status: {idea.status}, Impact: {idea.potential_impact})")
                if idea.description:
                    print(f"     Note: {idea.description}")
            print()
        elif args.action == "create":
            if not args.title:
                print("Error: --title required for creating an idea.")
                return
            new_idea = Idea(
                user_id=user.id,
                title=args.title,
                description=args.desc or "",
                maturity=args.maturity or "SPARK",
                status="EXPLORING",
                potential_impact="MEDIUM"
            )
            db.add(new_idea)
            db.commit()
            print(f"Successfully created idea: '{new_idea.title}' [{new_idea.maturity}]")
    finally:
        db.close()


def cmd_resume(args):
    db = SessionLocal()
    try:
        user = get_default_user(db)
        role = args.role or "AI / ML Engineer"
        personality = args.personality or "featured"
        payload = build_dynamic_resume_payload(user, role, db, personality)
        
        print(f"\n=== GENERATED RESUME REPRESENTATION [{personality.upper()}] ===")
        print(f"Target Role: {payload.get('target_role', role)}")
        print(f"Positioning: {payload.get('summary', '')}")
        print(f"Verified Claims ({len(payload.get('claims', []))}):")
        for c in payload.get('claims', [])[:4]:
            print(f"  [v] {c}")
        print("===============================================================\n")
    finally:
        db.close()


def cmd_navigate(args):
    """Launches the animated interactive TUI portfolio navigator."""
    from backend.app.tui.app import run_tui
    run_tui(reduced_motion=getattr(args, "reduced_motion", False))


def main():
    parser = argparse.ArgumentParser(description="Career Graph CLI & Portfolio Navigator")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # navigate (TUI)
    nav_parser = subparsers.add_parser("navigate", help="Launch interactive animated TUI portfolio navigator")
    nav_parser.add_argument("--reduced-motion", action="store_true", help="Disable typewriter and stagger animations")

    # profile
    subparsers.add_parser("profile", help="Show current Career Graph profile & archetype")

    # ideas
    ideas_parser = subparsers.add_parser("ideas", help="Manage living ideas entity")
    ideas_parser.add_argument("action", choices=["list", "create"], default="list", nargs="?")
    ideas_parser.add_argument("--title", help="Title of new idea")
    ideas_parser.add_argument("--desc", help="Description of new idea")
    ideas_parser.add_argument("--maturity", choices=["SPARK", "EARLY", "DEVELOPING", "MATURE"], default="SPARK")

    # resume
    resume_parser = subparsers.add_parser("resume", help="Generate targeted resume representation")
    resume_parser.add_argument("--role", default="AI / ML Engineer", help="Target job role")
    resume_parser.add_argument("--personality", default="featured", choices=["featured", "modern_professional", "technical", "editorial", "research", "executive"])

    args = parser.parse_args()

    init_db()

    if args.command == "navigate":
        cmd_navigate(args)
    elif args.command == "profile":
        cmd_profile(args)
    elif args.command == "ideas":
        cmd_ideas(args)
    elif args.command == "resume":
        cmd_resume(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

