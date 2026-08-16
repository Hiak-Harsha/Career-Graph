import { jsPDF } from "jspdf";
import type { ResumeData } from "../types";

/**
 * Generates a 100% vector text ATS-compliant PDF with selectable text, standard margins,
 * and zero rasterized screenshot images. Compatible with standard ATS parsers.
 */
export function exportAtsPdf(resumeData: ResumeData): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;
  let y = 50;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // 1. Name & Contact Header (Centered, standard ATS format)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const name = (resumeData.profile?.name || "Professional").toUpperCase();
  doc.text(name, pageWidth / 2, y, { align: "center" });
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const contactParts: string[] = [];
  if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
  if (resumeData.profile?.phone) contactParts.push(resumeData.profile.phone);
  if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
  if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);

  if (contactParts.length > 0) {
    doc.text(contactParts.join(" | "), pageWidth / 2, y, { align: "center" });
    y += 15;
  }

  if (resumeData.target_role) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(resumeData.target_role.toUpperCase(), pageWidth / 2, y, { align: "center" });
    y += 20;
  }

  const renderSectionHeader = (title: string) => {
    checkPageBreak(30);
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
  };

  // 2. Professional Summary
  if (resumeData.summary) {
    renderSectionHeader("Professional Summary");
    const summaryLines = doc.splitTextToSize(resumeData.summary, contentWidth);
    checkPageBreak(summaryLines.length * 13);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13 + 6;
  }

  // 3. Technical Skills
  if (resumeData.skills && resumeData.skills.length > 0) {
    renderSectionHeader("Technical Skills");
    const skillsText = `Core Competencies: ${resumeData.skills.join(", ")}`;
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 13);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 13 + 6;
  }

  // 4. Professional Work Experience
  if (resumeData.experience && resumeData.experience.length > 0) {
    renderSectionHeader("Professional Experience");

    for (const exp of resumeData.experience) {
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.text(`${exp.role} — ${exp.company}`, margin, y);
      
      doc.setFont("helvetica", "normal");
      const dateText = `${exp.start_date} – ${exp.end_date}`;
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, y);
      y += 13;

      if (exp.description) {
        const descLines = doc.splitTextToSize(exp.description, contentWidth);
        checkPageBreak(descLines.length * 13);
        doc.text(descLines, margin, y);
        y += descLines.length * 13 + 3;
      }

      if (exp.bullets && exp.bullets.length > 0) {
        for (const b of exp.bullets) {
          const bulletText = `•  ${b.trim()}`;
          const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 10);
          checkPageBreak(bulletLines.length * 13 + 4);
          doc.text(bulletLines, margin + 8, y);
          y += bulletLines.length * 13 + 3;
        }
      }
      y += 4;
    }
  }

  // 5. Verifiable Projects & Technical Experience
  if (resumeData.projects && resumeData.projects.length > 0) {
    renderSectionHeader("Technical Projects & Verified Implementations");

    for (const project of resumeData.projects) {
      if (project.included === false) continue;

      checkPageBreak(40);
      // Project Title and Skills
      doc.setFont("helvetica", "bold");
      doc.text(project.title, margin, y);

      const skillTag = project.skills?.length ? ` (${project.skills.slice(0, 5).join(", ")})` : "";
      if (skillTag) {
        doc.setFont("helvetica", "italic");
        const titleWidth = doc.getTextWidth(project.title);
        doc.text(skillTag, margin + titleWidth + 4, y);
      }
      y += 13;

      doc.setFont("helvetica", "normal");
      
      const bullets = project.custom_bullets?.length 
        ? project.custom_bullets 
        : (project.narrative || "").split(" • ").filter(Boolean);

      for (const bullet of bullets) {
        const bulletText = `•  ${bullet.trim()}`;
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 10);
        checkPageBreak(bulletLines.length * 13 + 4);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 13 + 3;
      }
      y += 6;
    }
  }

  // 6. Education
  if (resumeData.education && resumeData.education.length > 0) {
    renderSectionHeader("Education");
    for (const edu of resumeData.education) {
      checkPageBreak(30);
      doc.setFont("helvetica", "bold");
      doc.text(edu.degree, margin, y);

      doc.setFont("helvetica", "normal");
      const yearText = `${edu.start_year || ""} – ${edu.end_year || ""}`;
      const yearWidth = doc.getTextWidth(yearText);
      doc.text(yearText, pageWidth - margin - yearWidth, y);
      y += 13;

      doc.text(`${edu.institution}${edu.field_of_study ? ` — ${edu.field_of_study}` : ""}`, margin, y);
      y += 16;
    }
  }

  // 7. Certifications
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    renderSectionHeader("Certifications");
    for (const cert of resumeData.certifications) {
      checkPageBreak(25);
      doc.setFont("helvetica", "bold");
      doc.text(cert.name, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(` — ${cert.issuer}${cert.issue_date ? ` (${cert.issue_date})` : ""}`, margin + doc.getTextWidth(cert.name), y);
      y += 14;
    }
  }

  // 8. Evidence-Backed Claims & Achievements
  if (resumeData.claims && resumeData.claims.length > 0) {
    renderSectionHeader("Key Technical Achievements");
    for (const claim of resumeData.claims) {
      const claimText = `•  ${claim.trim()}`;
      const claimLines = doc.splitTextToSize(claimText, contentWidth - 10);
      checkPageBreak(claimLines.length * 13 + 4);
      doc.text(claimLines, margin + 8, y);
      y += claimLines.length * 13 + 3;
    }
    y += 6;
  }

  // Save document
  const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_ATS.pdf`;
  doc.save(fileName);
}

/**
 * Generates a modern visual styled PDF with selectable text, typography hierarchy,
 * proof badge indicators, work experience, and education.
 */
export function exportVisualPdf(resumeData: ResumeData, personality: string = "modern_professional"): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;
  let y = 48;

  const fontFamily = personality === "editorial" ? "times" : "helvetica";

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header Banner Background Accent
  const bannerColor = personality === "editorial" ? [15, 23, 42] : personality === "technical" ? [5, 11, 20] : [15, 23, 42];
  doc.setFillColor(bannerColor[0], bannerColor[1], bannerColor[2]);
  doc.roundedRect(margin, y, contentWidth, 76, 6, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(18);
  const name = resumeData.profile?.name || "Professional";
  doc.text(name, margin + 18, y + 28);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  const roleText = resumeData.target_role || "Software Specialist";
  doc.text(`${roleText.toUpperCase()} [${personality.replace('_', ' ').toUpperCase()}]`, margin + 18, y + 44);

  const contactParts: string[] = [];
  if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
  if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
  if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);
  doc.setFontSize(9);
  doc.text(contactParts.join("  •  "), margin + 18, y + 60);

  y += 92;

  const renderVisualHeader = (title: string) => {
    checkPageBreak(30);
    doc.setTextColor(37, 99, 235); // Blue-600 accent
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title.toUpperCase(), margin, y);
    y += 5;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
  };

  // Summary
  if (resumeData.summary) {
    renderVisualHeader("Professional Summary");
    const summaryLines = doc.splitTextToSize(resumeData.summary, contentWidth);
    checkPageBreak(summaryLines.length * 13);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13 + 8;
  }

  // Skills
  if (resumeData.skills && resumeData.skills.length > 0) {
    renderVisualHeader("Verified Competencies & Skills");
    const skillsText = resumeData.skills.join("   •   ");
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 13);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 13 + 8;
  }

  // Experience
  if (resumeData.experience && resumeData.experience.length > 0) {
    renderVisualHeader("Professional Experience");
    for (const exp of resumeData.experience) {
      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(exp.role, margin, y);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(37, 99, 235);
      const roleWidth = doc.getTextWidth(exp.role);
      doc.text(` @ ${exp.company}`, margin + roleWidth + 2, y);

      doc.setTextColor(100, 116, 139);
      const dateText = `${exp.start_date} – ${exp.end_date}`;
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, y);
      y += 13;

      if (exp.bullets && exp.bullets.length > 0) {
        doc.setTextColor(51, 65, 85);
        for (const b of exp.bullets) {
          const bulletText = `•  ${b.trim()}`;
          const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 12);
          checkPageBreak(bulletLines.length * 13 + 4);
          doc.text(bulletLines, margin + 8, y);
          y += bulletLines.length * 13 + 3;
        }
      }
      y += 4;
    }
  }

  // Projects
  if (resumeData.projects && resumeData.projects.length > 0) {
    renderVisualHeader("Evidence-Verified Projects & Experience");

    for (const project of resumeData.projects) {
      if (project.included === false) continue;

      checkPageBreak(45);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(project.title, margin, y);

      if (project.skills?.length) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        const titleWidth = doc.getTextWidth(project.title);
        doc.text(`—  ${project.skills.slice(0, 5).join(", ")}`, margin + titleWidth + 6, y);
      }
      y += 14;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const bullets = project.custom_bullets?.length 
        ? project.custom_bullets 
        : (project.narrative || "").split(" • ").filter(Boolean);

      for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i].trim();
        const bulletText = `•  ${b}`;
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 12);
        checkPageBreak(bulletLines.length * 13 + 4);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 13 + 3;
      }
      y += 6;
    }
  }

  // Education & Certifications
  if ((resumeData.education && resumeData.education.length > 0) || (resumeData.certifications && resumeData.certifications.length > 0)) {
    renderVisualHeader("Education & Verified Credentials");
    if (resumeData.education) {
      for (const edu of resumeData.education) {
        checkPageBreak(30);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(edu.degree, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(` — ${edu.institution} (${edu.start_year || ""} - ${edu.end_year || ""})`, margin + doc.getTextWidth(edu.degree), y);
        y += 14;
      }
    }
    if (resumeData.certifications) {
      for (const cert of resumeData.certifications) {
        checkPageBreak(30);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(cert.name, margin, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(` — ${cert.issuer}`, margin + doc.getTextWidth(cert.name), y);
        y += 14;
      }
    }
    y += 6;
  }

  // Claims
  if (resumeData.claims && resumeData.claims.length > 0) {
    renderVisualHeader("Verified Technical Impact");
    for (const claim of resumeData.claims) {
      const claimText = `✓  ${claim.trim()}`;
      const claimLines = doc.splitTextToSize(claimText, contentWidth - 12);
      checkPageBreak(claimLines.length * 13 + 4);
      doc.text(claimLines, margin + 8, y);
      y += claimLines.length * 13 + 3;
    }
  }

  const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_Visual.pdf`;
  doc.save(fileName);
}
