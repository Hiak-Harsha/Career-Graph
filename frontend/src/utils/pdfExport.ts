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
      y += 14;

      if (exp.description) {
        const descLines = doc.splitTextToSize(exp.description, contentWidth);
        checkPageBreak(descLines.length * 13);
        doc.text(descLines, margin, y);
        y += descLines.length * 13 + 4;
      }

      if (exp.bullets && exp.bullets.length > 0) {
        for (const b of exp.bullets) {
          const bulletText = `• ${b.trim()}`;
          const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 10);
          checkPageBreak(bulletLines.length * 13 + 4);
          doc.text(bulletLines, margin + 8, y);
          y += bulletLines.length * 13 + 3;
        }
      }
      y += 6;
    }
  }

  // 5. Selected Projects & Engineering Systems
  if (resumeData.projects && resumeData.projects.length > 0) {
    renderSectionHeader("Technical Projects & Systems");

    for (const project of resumeData.projects) {
      if (project.included === false) continue;

      checkPageBreak(40);
      doc.setFont("helvetica", "bold");
      doc.text(project.title, margin, y);

      if (project.skills && project.skills.length > 0) {
        doc.setFont("helvetica", "normal");
        const titleWidth = doc.getTextWidth(project.title);
        doc.text(` | ${project.skills.slice(0, 5).join(", ")}`, margin + titleWidth + 4, y);
      }
      y += 14;

      if (project.description) {
        const descLines = doc.splitTextToSize(project.description, contentWidth);
        checkPageBreak(descLines.length * 13);
        doc.text(descLines, margin, y);
        y += descLines.length * 13 + 4;
      }

      const bullets = project.custom_bullets?.length 
        ? project.custom_bullets 
        : (project.narrative || "").split(" • ").filter(Boolean);

      for (const b of bullets) {
        const bulletText = `• ${b.trim()}`;
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
      const dateText = `${edu.start_year || ""} – ${edu.end_year || ""}`;
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, y);
      y += 14;

      doc.text(`${edu.institution}${edu.field_of_study ? ` — ${edu.field_of_study}` : ""}`, margin, y);
      y += 16;
    }
  }

  // 7. Certifications
  if (resumeData.certifications && resumeData.certifications.length > 0) {
    renderSectionHeader("Certifications & Credentials");
    for (const cert of resumeData.certifications) {
      checkPageBreak(25);
      doc.setFont("helvetica", "bold");
      doc.text(cert.name, margin, y);

      doc.setFont("helvetica", "normal");
      doc.text(` — ${cert.issuer} (${cert.issue_date || "Verified"})`, margin + doc.getTextWidth(cert.name) + 4, y);
      y += 14;
    }
  }

  // Save document
  const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_ATS.pdf`;
  doc.save(fileName);
}

/**
 * Generates an authentically styled visual PDF reflecting the 5 design personalities:
 * - Modern: Clean navy banner with teal accents and structured card geometry
 * - Technical: Monospace terminal aesthetic with bracketed headers and ASCII badges
 * - Editorial: High-contrast serif typography, classic publication rules, and formal elegance
 * - Research: Academic preprint hierarchy with formal numbered sections and verification notes
 * - Executive: Bold charcoal header with golden amber accents and strategic thesis callouts
 */
export function exportVisualPdf(resumeData: ResumeData, personality: string = "modern_professional"): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const p = personality.toLowerCase();
  const isTechnical = p.includes("technical");
  const isEditorial = p.includes("editorial");
  const isResearch = p.includes("research");
  const isExecutive = p.includes("executive");
  const isModern = !isTechnical && !isEditorial && !isResearch && !isExecutive;

  const font = isEditorial || isResearch ? "times" : isTechnical ? "courier" : "helvetica";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 46;
  const contentWidth = pageWidth - margin * 2;
  let y = 46;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── 1. Header Rendering by Personality ──────────────────────────────────────────
  if (isTechnical) {
    // Technical Terminal Header
    doc.setFillColor(10, 15, 29); // dark slate
    doc.roundedRect(margin, y, contentWidth, 76, 4, 4, "F");
    doc.setDrawColor(16, 185, 129); // emerald
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, 76, 4, 4, "S");

    doc.setTextColor(56, 189, 248); // cyan
    doc.setFont("courier", "bold");
    doc.setFontSize(16);
    const name = resumeData.profile?.name || "Professional";
    doc.text(`$ whoami: ${name}`, margin + 14, y + 26);

    doc.setFont("courier", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 185, 129); // green prompt
    const roleText = resumeData.target_role || "SYSTEMS ARCHITECT";
    doc.text(`> TARGET_ROLE: ${roleText.toUpperCase()} [TECHNICAL_CORE]`, margin + 14, y + 44);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8.5);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.github_username) contactParts.push(`gh:${resumeData.profile.github_username}`);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    doc.text(contactParts.join(" | "), margin + 14, y + 62);
    y += 94;

  } else if (isEditorial) {
    // Editorial Publication Header (Centred, classic serif double-rule)
    doc.setTextColor(15, 23, 42);
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    const name = resumeData.profile?.name || "Professional";
    doc.text(name, pageWidth / 2, y + 15, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    const roleText = resumeData.target_role || "Software Specialist";
    doc.text(roleText, pageWidth / 2, y + 32, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);
    doc.text(contactParts.join("   •   "), pageWidth / 2, y + 46, { align: "center" });

    y += 54;
    // Classic double rule
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.2);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 18;

  } else if (isResearch) {
    // Research Preprint Header
    doc.setTextColor(15, 23, 42);
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    const name = resumeData.profile?.name || "Candidate Dossier";
    doc.text(name, margin, y + 14);

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235); // Blue
    const roleText = resumeData.target_role || "Research & Systems Engineering";
    doc.text(`Focus: ${roleText} · [Verified Artifact Dataset]`, margin, y + 28);

    doc.setFont("times", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.github_username) contactParts.push(`GitHub: @${resumeData.profile.github_username}`);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    doc.text(contactParts.join(" · "), margin, y + 42);

    y += 48;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

  } else if (isExecutive) {
    // Executive Leadership Header
    doc.setFillColor(30, 41, 59); // dark slate
    doc.roundedRect(margin, y, contentWidth, 74, 5, 5, "F");

    // Gold accent bar
    doc.setFillColor(245, 158, 11);
    doc.rect(margin, y, 6, 74, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    const name = resumeData.profile?.name || "Executive Candidate";
    doc.text(name, margin + 20, y + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(253, 230, 138); // warm amber
    const roleText = resumeData.target_role || "Principal Architect";
    doc.text(roleText.toUpperCase(), margin + 20, y + 42);

    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);
    doc.text(contactParts.join("  |  "), margin + 20, y + 58);
    y += 92;

  } else if (isModern || true) {
    // Modern Professional Header (Clean navy banner with teal accents)
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 76, 6, 6, "F");

    // Teal bottom accent stripe
    doc.setFillColor(56, 189, 248);
    doc.rect(margin, y + 72, contentWidth, 4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const name = resumeData.profile?.name || "Professional";
    doc.text(name, margin + 18, y + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(56, 189, 248); // teal
    const roleText = resumeData.target_role || "Software Specialist";
    doc.text(roleText.toUpperCase(), margin + 18, y + 44);

    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8.5);
    doc.text(contactParts.join("  •  "), margin + 18, y + 58);
    y += 94;
  }

  // Section Header Renderer
  const renderVisualHeader = (title: string, sectionIndex?: number) => {
    checkPageBreak(35);
    y += 4;

    if (isTechnical) {
      doc.setTextColor(16, 185, 129); // green
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.text(`[ 0${sectionIndex || 1} // ${title.toUpperCase()} ]`, margin, y);
      y += 4;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.75);
      doc.line(margin, y, pageWidth - margin, y);
      y += 13;
      doc.setTextColor(203, 213, 225);
      doc.setFont("courier", "normal");
      doc.setFontSize(9);

    } else if (isEditorial) {
      doc.setTextColor(15, 23, 42);
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.text(title.toUpperCase(), margin, y);
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.75);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
      doc.setTextColor(30, 41, 59);
      doc.setFont("times", "normal");
      doc.setFontSize(9.5);

    } else if (isResearch) {
      doc.setTextColor(37, 99, 235);
      doc.setFont("times", "bold");
      doc.setFontSize(10.5);
      doc.text(`${sectionIndex || 1}.0 ${title.toUpperCase()}`, margin, y);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
      doc.setTextColor(30, 41, 59);
      doc.setFont("times", "normal");
      doc.setFontSize(9.5);

    } else if (isExecutive) {
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title.toUpperCase(), margin + 8, y);
      doc.setFillColor(245, 158, 11);
      doc.rect(margin, y - 9, 3, 11, "F");
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);

    } else {
      // Modern
      doc.setTextColor(37, 99, 235);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text(title.toUpperCase(), margin, y);
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 14;
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
    }
  };

  let sectionIdx = 1;

  // 2. Summary / Positioning
  if (resumeData.summary) {
    renderVisualHeader("Professional Summary & Positioning", sectionIdx++);
    const summaryLines = doc.splitTextToSize(resumeData.summary, contentWidth);
    checkPageBreak(summaryLines.length * 13);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13 + 8;
  }

  // 3. Technical Depth & Skills
  if (resumeData.skills && resumeData.skills.length > 0) {
    renderVisualHeader("Core Capabilities & Technical Depth", sectionIdx++);
    const skillsText = isTechnical 
      ? resumeData.skills.map((s) => `[${s}]`).join(" ")
      : resumeData.skills.join("   •   ");
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 13);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 13 + 8;
  }

  // 4. Experience
  if (resumeData.experience && resumeData.experience.length > 0) {
    renderVisualHeader("Professional Experience", sectionIdx++);
    for (const exp of resumeData.experience) {
      checkPageBreak(40);
      doc.setFont(font, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(exp.role, margin, y);
      
      doc.setFont(font, "normal");
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
          const bulletSymbol = isTechnical ? "> " : isEditorial ? "– " : "• ";
          const bulletText = `${bulletSymbol} ${b.trim()}`;
          const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 12);
          checkPageBreak(bulletLines.length * 13 + 4);
          doc.text(bulletLines, margin + 8, y);
          y += bulletLines.length * 13 + 3;
        }
      }
      y += 4;
    }
  }

  // 5. Selected Projects & Engineering Systems
  if (resumeData.projects && resumeData.projects.length > 0) {
    renderVisualHeader("Verified Engineering Projects & Systems", sectionIdx++);

    for (const project of resumeData.projects) {
      if (project.included === false) continue;

      checkPageBreak(45);
      doc.setFont(font, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(project.title, margin, y);

      if (project.skills?.length) {
        doc.setFont(font, "normal");
        doc.setTextColor(100, 116, 139);
        const titleWidth = doc.getTextWidth(project.title);
        const skillStr = isTechnical ? `[${project.skills.slice(0, 4).join(", ")}]` : `—  ${project.skills.slice(0, 4).join(", ")}`;
        doc.text(skillStr, margin + titleWidth + 6, y);
      }
      y += 14;

      doc.setFont(font, "normal");
      doc.setTextColor(51, 65, 85);
      const bullets = project.custom_bullets?.length 
        ? project.custom_bullets 
        : (project.narrative || "").split(" • ").filter(Boolean);

      for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i].trim();
        const bulletSymbol = isTechnical ? "> " : isEditorial ? "– " : "• ";
        const bulletText = `${bulletSymbol} ${b}`;
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 12);
        checkPageBreak(bulletLines.length * 13 + 4);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 13 + 3;
      }
      y += 6;
    }
  }

  // 6. Education & Credentials
  if ((resumeData.education && resumeData.education.length > 0) || (resumeData.certifications && resumeData.certifications.length > 0)) {
    renderVisualHeader("Education & Verified Credentials", sectionIdx++);
    if (resumeData.education) {
      for (const edu of resumeData.education) {
        checkPageBreak(30);
        doc.setFont(font, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(edu.degree, margin, y);
        doc.setFont(font, "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(` — ${edu.institution} (${edu.start_year || ""} - ${edu.end_year || ""})`, margin + doc.getTextWidth(edu.degree), y);
        y += 14;
      }
    }
    if (resumeData.certifications) {
      for (const cert of resumeData.certifications) {
        checkPageBreak(30);
        doc.setFont(font, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(cert.name, margin, y);
        doc.setFont(font, "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(` — ${cert.issuer}`, margin + doc.getTextWidth(cert.name), y);
        y += 14;
      }
    }
    y += 6;
  }

  // 7. Verified Claims / Empirical Evidence Badges
  if (resumeData.claims && resumeData.claims.length > 0) {
    renderVisualHeader("Evidence-Backed Technical Impact", sectionIdx++);
    for (const claim of resumeData.claims) {
      const claimText = `✓  ${claim.trim()} [Verified GitHub Evidence]`;
      const claimLines = doc.splitTextToSize(claimText, contentWidth - 12);
      checkPageBreak(claimLines.length * 13 + 4);
      doc.text(claimLines, margin + 8, y);
      y += claimLines.length * 13 + 3;
    }
  }

  const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_${personality}.pdf`;
  doc.save(fileName);
}
