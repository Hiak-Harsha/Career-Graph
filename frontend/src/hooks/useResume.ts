"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "../config";
import type { ResumeData } from "../types";

export function useResume() {
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [savedResumes, setSavedResumes] = useState<ResumeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  const fetchSavedResumes = useCallback(async () => {
    try {
      const res = await apiFetch("/resumes");
      if (res.ok) {
        const data: ResumeData[] = await res.json();
        setSavedResumes(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveCurrentResume = useCallback(async (payload: Partial<ResumeData>) => {
    try {
      setSaving(true);
      setError("");
      if (payload.id) {
        const res = await apiFetch(`/resumes/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error (${res.status}) while updating resume.`);
        }
        const updated: ResumeData = await res.json();
        setResumeData(updated);
        fetchSavedResumes();
        return updated;
      } else {
        const res = await apiFetch("/resumes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error (${res.status}) while saving resume.`);
        }
        const created: ResumeData = await res.json();
        setResumeData(created);
        fetchSavedResumes();
        return created;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save resume.";
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [fetchSavedResumes]);

  const deleteSavedResume = useCallback(async (id: string) => {
    try {
      const res = await apiFetch(`/resumes/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSavedResumes();
      }
    } catch {
      // ignore
    }
  }, [fetchSavedResumes]);

  const aiImprove = useCallback(async (fieldType: "summary" | "bullet", text: string, targetRole: string) => {
    try {
      const res = await apiFetch("/resumes/ai-improve", {
        method: "POST",
        body: JSON.stringify({ field_type: fieldType, text, target_role: targetRole }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      return null;
    }
  }, []);

  return {
    resumeData,
    setResumeData,
    savedResumes,
    loading,
    saving,
    error,
    fetchResume,
    fetchSavedResumes,
    saveCurrentResume,
    deleteSavedResume,
    aiImprove,
  };
}
