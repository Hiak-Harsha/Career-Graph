"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "../config";
import type { ResumeData } from "../types";

export function useResume() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchResume = useCallback(async (roleName: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch(`/resume?role=${encodeURIComponent(roleName)}`);
      const data: ResumeData = await res.json();
      setResumeData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate resume.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { resumeData, loading, error, fetchResume };
}
