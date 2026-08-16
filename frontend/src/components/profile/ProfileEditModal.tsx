"use client";

import React, { useState } from "react";
import styles from "./ProfileEditModal.module.css";
import type { WorkExperience, Education, Certification, SocialLink } from "../../types";
import { apiFetch } from "../../config";
import { X, Plus, Trash2, Briefcase, GraduationCap, Award, Link2, Loader2, Check } from "lucide-react";

interface ProfileEditModalProps {
  initialWorkExperiences?: WorkExperience[];
  initialEducations?: Education[];
  initialCertifications?: Certification[];
  initialSocialLinks?: SocialLink[];
  onClose: () => void;
  onRefresh?: () => void;
}

type TabType = "experience" | "education" | "certifications" | "links";

export function ProfileEditModal({
  initialWorkExperiences = [],
  initialEducations = [],
  initialCertifications = [],
  initialSocialLinks = [],
  onClose,
  onRefresh,
}: ProfileEditModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("experience");
  const [workExps, setWorkExps] = useState<WorkExperience[]>(initialWorkExperiences);
  const [educations, setEducations] = useState<Education[]>(initialEducations);
  const [certifications, setCertifications] = useState<Certification[]>(initialCertifications);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialSocialLinks);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  // 1. Work Exp Form
  const [expCompany, setExpCompany] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expLocation, setExpLocation] = useState("");
  const [expStartDate, setExpStartDate] = useState("");
  const [expEndDate, setExpEndDate] = useState("Present");
  const [expDescription, setExpDescription] = useState("");
  const [expBullets, setExpBullets] = useState("");

  // 2. Education Form
  const [eduInstitution, setEduInstitution] = useState("");
  const [eduDegree, setEduDegree] = useState("");
  const [eduField, setEduField] = useState("");
  const [eduStartYear, setEduStartYear] = useState("");
  const [eduEndYear, setEduEndYear] = useState("");

  // 3. Certification Form
  const [certName, setCertName] = useState("");
  const [certIssuer, setCertIssuer] = useState("");
  const [certDate, setCertDate] = useState("");
  const [certUrl, setCertUrl] = useState("");

  // 4. Social Link Form
  const [linkPlatform, setLinkPlatform] = useState("github");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");

  // --- Handlers ---
  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expCompany || !expRole || !expStartDate) return;
    try {
      setSubmitting(true);
      const bulletsList = expBullets
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);
      const res = await apiFetch("/profile/work-experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: expCompany,
          role: expRole,
          location: expLocation || undefined,
          start_date: expStartDate,
          end_date: expEndDate || "Present",
          description: expDescription || undefined,
          bullets: bulletsList,
          is_current: expEndDate.toLowerCase() === "present",
        }),
      });
      if (res.ok) {
        const newExp: WorkExperience = await res.json();
        setWorkExps([newExp, ...workExps]);
        setExpCompany("");
        setExpRole("");
        setExpLocation("");
        setExpStartDate("");
        setExpEndDate("Present");
        setExpDescription("");
        setExpBullets("");
        onRefresh?.();
      }
    } catch {
      // Handled silently
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      const res = await apiFetch(`/profile/experience/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorkExps(workExps.filter((w) => w.id !== id));
        onRefresh?.();
      }
    } catch {
      // Handled silently
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eduInstitution || !eduDegree) return;
    try {
      setSubmitting(true);
      const res = await apiFetch("/profile/education", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution: eduInstitution,
          degree: eduDegree,
          field_of_study: eduField || undefined,
          start_year: eduStartYear || undefined,
          end_year: eduEndYear || undefined,
        }),
      });
      if (res.ok) {
        const newEdu: Education = await res.json();
        setEducations([newEdu, ...educations]);
        setEduInstitution("");
        setEduDegree("");
        setEduField("");
        setEduStartYear("");
        setEduEndYear("");
        onRefresh?.();
      }
    } catch {
      // Handled silently
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      const res = await apiFetch(`/profile/education/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEducations(educations.filter((e) => e.id !== id));
        onRefresh?.();
      }
    } catch {
      // Handled silently
    }
  };

  const handleAddCertification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName || !certIssuer) return;
    try {
      setSubmitting(true);
      const res = await apiFetch("/profile/certifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: certName,
          issuer: certIssuer,
          issue_date: certDate || undefined,
          credential_url: certUrl || undefined,
        }),
      });
      if (res.ok) {
        const newCert: Certification = await res.json();
        setCertifications([newCert, ...certifications]);
        setCertName("");
        setCertIssuer("");
        setCertDate("");
        setCertUrl("");
        onRefresh?.();
      }
    } catch {
      // Handled silently
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCertification = async (id: string) => {
    try {
      const res = await apiFetch(`/profile/certification/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCertifications(certifications.filter((c) => c.id !== id));
        onRefresh?.();
      }
    } catch {
      // Handled silently
    }
  };

  const handleAddSocialLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkPlatform || !linkUrl) return;
    try {
      setSubmitting(true);
      const res = await apiFetch("/profile/social-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: linkPlatform,
          url: linkUrl,
          label: linkLabel || undefined,
        }),
      });
      if (res.ok) {
        const newLink: SocialLink = await res.json();
        setSocialLinks([...socialLinks, newLink]);
        setLinkUrl("");
        setLinkLabel("");
        onRefresh?.();
      }
    } catch {
      // Handled silently
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSocialLink = async (id: string) => {
    try {
      const res = await apiFetch(`/profile/link/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSocialLinks(socialLinks.filter((l) => l.id !== id));
        onRefresh?.();
      }
    } catch {
      // Handled silently
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 id="modal-title" className={styles.title}>
            Manage Career Credentials & History
          </h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "experience" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("experience")}
          >
            <Briefcase size={14} />
            <span>Work Experience ({workExps.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "education" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("education")}
          >
            <GraduationCap size={14} />
            <span>Education ({educations.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "certifications" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("certifications")}
          >
            <Award size={14} />
            <span>Certifications ({certifications.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "links" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("links")}
          >
            <Link2 size={14} />
            <span>Social & Portfolio Links ({socialLinks.length})</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className={styles.body}>
          {/* Tab 1: Work Experience */}
          {activeTab === "experience" && (
            <div>
              <div className={styles.itemList}>
                {workExps.length === 0 ? (
                  <p className={styles.emptyNote}>No work experience entries yet. Add your first role below.</p>
                ) : (
                  workExps.map((w) => (
                    <div key={w.id} className={styles.itemCard}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{w.role}</span>
                        <span className={styles.itemSubtitle}>{w.company} {w.location ? `· ${w.location}` : ""}</span>
                        <span className={styles.itemDates}>{w.start_date} – {w.end_date}</span>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteExperience(w.id)}
                          aria-label="Delete experience"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className={styles.formBox} onSubmit={handleAddExperience}>
                <span className={styles.formTitle}>+ Add Work Experience</span>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Company *</label>
                    <input
                      className={styles.input}
                      value={expCompany}
                      onChange={(e) => setExpCompany(e.target.value)}
                      placeholder="e.g. Google, Stripe, Startup"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Role Title *</label>
                    <input
                      className={styles.input}
                      value={expRole}
                      onChange={(e) => setExpRole(e.target.value)}
                      placeholder="e.g. Senior Backend Engineer"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Start Date *</label>
                    <input
                      className={styles.input}
                      value={expStartDate}
                      onChange={(e) => setExpStartDate(e.target.value)}
                      placeholder="e.g. Jan 2023"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>End Date *</label>
                    <input
                      className={styles.input}
                      value={expEndDate}
                      onChange={(e) => setExpEndDate(e.target.value)}
                      placeholder="e.g. Present or Dec 2024"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Location</label>
                  <input
                    className={styles.input}
                    value={expLocation}
                    onChange={(e) => setExpLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA / Remote"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Bullet Points (one per line)</label>
                  <textarea
                    className={styles.textarea}
                    value={expBullets}
                    onChange={(e) => setExpBullets(e.target.value)}
                    placeholder="• Architected high-throughput ingestion pipeline&#10;• Reduced p99 latency by 45ms across microservices"
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add Experience</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Education */}
          {activeTab === "education" && (
            <div>
              <div className={styles.itemList}>
                {educations.length === 0 ? (
                  <p className={styles.emptyNote}>No education entries yet. Add your degree or institution below.</p>
                ) : (
                  educations.map((e) => (
                    <div key={e.id} className={styles.itemCard}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{e.institution}</span>
                        <span className={styles.itemSubtitle}>{e.degree} {e.field_of_study ? `in ${e.field_of_study}` : ""}</span>
                        <span className={styles.itemDates}>{e.start_year || ""} – {e.end_year || ""}</span>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteEducation(e.id)}
                          aria-label="Delete education"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className={styles.formBox} onSubmit={handleAddEducation}>
                <span className={styles.formTitle}>+ Add Education</span>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Institution *</label>
                    <input
                      className={styles.input}
                      value={eduInstitution}
                      onChange={(e) => setEduInstitution(e.target.value)}
                      placeholder="e.g. Stanford University"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Degree *</label>
                    <input
                      className={styles.input}
                      value={eduDegree}
                      onChange={(e) => setEduDegree(e.target.value)}
                      placeholder="e.g. Bachelor of Science"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Field of Study</label>
                    <input
                      className={styles.input}
                      value={eduField}
                      onChange={(e) => setEduField(e.target.value)}
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Graduation Year</label>
                    <input
                      className={styles.input}
                      value={eduEndYear}
                      onChange={(e) => setEduEndYear(e.target.value)}
                      placeholder="e.g. 2024"
                    />
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add Education</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 3: Certifications */}
          {activeTab === "certifications" && (
            <div>
              <div className={styles.itemList}>
                {certifications.length === 0 ? (
                  <p className={styles.emptyNote}>No certifications yet. Add your verified credentials below.</p>
                ) : (
                  certifications.map((c) => (
                    <div key={c.id} className={styles.itemCard}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{c.name}</span>
                        <span className={styles.itemSubtitle}>{c.issuer} {c.issue_date ? `· ${c.issue_date}` : ""}</span>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteCertification(c.id)}
                          aria-label="Delete certification"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className={styles.formBox} onSubmit={handleAddCertification}>
                <span className={styles.formTitle}>+ Add Certification</span>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Certification Name *</label>
                    <input
                      className={styles.input}
                      value={certName}
                      onChange={(e) => setCertName(e.target.value)}
                      placeholder="e.g. AWS Solutions Architect Professional"
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Issuer *</label>
                    <input
                      className={styles.input}
                      value={certIssuer}
                      onChange={(e) => setCertIssuer(e.target.value)}
                      placeholder="e.g. Amazon Web Services, Google Cloud"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Issue Date</label>
                    <input
                      className={styles.input}
                      value={certDate}
                      onChange={(e) => setCertDate(e.target.value)}
                      placeholder="e.g. 2024"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Credential URL</label>
                    <input
                      className={styles.input}
                      value={certUrl}
                      onChange={(e) => setCertUrl(e.target.value)}
                      placeholder="https://credly.com/..."
                    />
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add Certification</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 4: Social Links */}
          {activeTab === "links" && (
            <div>
              <div className={styles.itemList}>
                {socialLinks.length === 0 ? (
                  <p className={styles.emptyNote}>No custom links added yet.</p>
                ) : (
                  socialLinks.map((l) => (
                    <div key={l.id} className={styles.itemCard}>
                      <div className={styles.itemMain}>
                        <span className={styles.itemTitle}>{l.platform.toUpperCase()}</span>
                        <span className={styles.itemSubtitle}>{l.url}</span>
                      </div>
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => handleDeleteSocialLink(l.id)}
                          aria-label="Delete link"
                        >
                          <Trash2 size={12} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className={styles.formBox} onSubmit={handleAddSocialLink}>
                <span className={styles.formTitle}>+ Add Social or Portfolio Link</span>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Platform</label>
                    <select
                      className={styles.input}
                      value={linkPlatform}
                      onChange={(e) => setLinkPlatform(e.target.value)}
                    >
                      <option value="github">GitHub</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="twitter">Twitter / X</option>
                      <option value="portfolio">Personal Website</option>
                      <option value="blog">Blog</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>URL *</label>
                    <input
                      className={styles.input}
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      required
                    />
                  </div>
                </div>

                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Add Link</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
