"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "../config";
import type {
  PortfolioData,
  UserProfile,
  Project,
  Idea,
  DomainProgress,
  SkillProgress,
  ProblemSolvingProfile,
  TimelineEntry,
} from "../types";

interface UseCareerGraphReturn {
  profile: UserProfile | null;
  projects: Project[];
  ideas: Idea[];
  domainProgress: DomainProgress[];
  skillsProgress: SkillProgress[];
  problemSolving: ProblemSolvingProfile | null;
  timeline: TimelineEntry[];
  pendingReviewCount: number;
  loading: boolean;
  syncing: boolean;
  error: string;
  success: string;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  syncGitHub: () => Promise<void>;
  runDemo: () => Promise<void>;
  clearMessages: () => void;
}

export function useCareerGraph(): UseCareerGraphReturn {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [domainProgress, setDomainProgress] = useState<DomainProgress[]>([]);
  const [skillsProgress, setSkillsProgress] = useState<SkillProgress[]>([]);
  const [problemSolving, setProblemSolving] = useState<ProblemSolvingProfile | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/portfolio");
      const data: PortfolioData = await res.json();
      setProfile(data.profile);
      setProjects(data.projects);
      setIdeas(data.ideas);
      setDomainProgress(data.domain_progress);
      setSkillsProgress(data.skills);
      setProblemSolving(data.problem_solving_profile);
      setTimeline(data.timeline);
      setLastUpdated(new Date());
      setError("");

      // Fetch pending review count
      try {
        const reviewRes = await apiFetch("/review");
        if (reviewRes.ok) {
          const reviewData = await reviewRes.json();
          const count =
            (reviewData.claims?.length ?? 0) +
            (reviewData.domains?.length ?? 0) +
            (reviewData.skills?.length ?? 0);
          setPendingReviewCount(count);
        }
      } catch {
        // ignore review count fetch failure
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect to backend.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncGitHub = useCallback(async () => {
    try {
      setSyncing(true);
      setSuccess("");
      setError("");
      await apiFetch("/sync", { method: "POST" });
      setSuccess("GitHub repositories synchronized.");
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connect GitHub credentials to enable sync.";
      setError(msg);
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const runDemo = useCallback(async () => {
    try {
      setSyncing(true);
      setSuccess("");
      setError("");
      await apiFetch("/sync/demo", { method: "POST" });
      setSuccess("Demo data loaded — 3 demonstration projects initialized.");
      await refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load demo data.";
      setError(msg);
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    profile,
    projects,
    ideas,
    domainProgress,
    skillsProgress,
    problemSolving,
    timeline,
    pendingReviewCount,
    loading,
    syncing,
    error,
    success,
    lastUpdated,
    refresh,
    syncGitHub,
    runDemo,
    clearMessages,
  };
}
