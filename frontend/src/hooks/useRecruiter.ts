"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "../config";
import type { RecruiterData } from "../types";

export function useRecruiter() {
  const [recruiterData, setRecruiterData] = useState<RecruiterData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMatch = useCallback(async (roleName: string) => {
    try {
      setLoading(true);
      setError("");
      const res = await apiFetch(`/recruiter/match?role_name=${encodeURIComponent(roleName)}`);
      const data: RecruiterData = await res.json();
      setRecruiterData(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch recruiter match.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { recruiterData, loading, error, fetchMatch };
}
