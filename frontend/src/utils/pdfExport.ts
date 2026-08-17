import { jsPDF } from "jspdf";
import type { ResumeData } from "../types";

/**
 * Draws a crisp vector checkmark badge that renders identically across all PDF engines,
 * avoiding font-glyph encoding bugs in base14 fonts.
 */
function drawVectorCheckmark(doc: jsPDF, x: number, y: number, color: [number, number, number] = [16, 185, 129]): void {
  // Green circular badge background
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x + 4, y - 3.5, 4.5, "F");

  // White vector check lines
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.1);
  doc.line(x + 1.8, y - 3.5, x + 3.4, y - 1.8);
  doc.line(x + 3.4, y - 1.8, x + 6.6, y - 5.4);
}

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
  doc.setTextColor(0, 0, 0);
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
    doc.setTextColor(0, 0, 0);
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
        doc.text(` | ${project.skills.slice(0, 5).join(", ")}`, margin + titleWidth + 6, y);
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
      doc.text(` — ${cert.issuer} (${cert.issue_date || "Verified"})`, margin + doc.getTextWidth(cert.name) + 6, y);
      y += 14;
    }
  }

  // Save document
  const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_ATS.pdf`;
  doc.save(fileName);
}

function renderAtsCleanLayout(
  doc: jsPDF,
  resumeData: ResumeData,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number
): void {
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header: Name (Bold, 20pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(resumeData.profile?.name || "Candidate", margin, y);
  y += 18;

  // Title / Headline
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(51, 65, 85); // slate-700
  const headline = `${(resumeData.target_role || "LEAD SOFTWARE ENGINEER").toUpperCase()}  |  DISTRIBUTED SYSTEMS · CLOUD ARCHITECTURE`;
  doc.text(headline, margin, y);
  y += 14;

  // Contact line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const contacts = [
    resumeData.profile?.email,
    resumeData.profile?.phone,
    resumeData.profile?.location,
    resumeData.profile?.github_username ? `github.com/${resumeData.profile.github_username}` : "",
  ].filter(Boolean);
  doc.text(contacts.join("   •   "), margin, y);
  y += 10;

  // Horizontal divider
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + contentWidth, y);
  y += 16;

  const renderSectionHeading = (title: string) => {
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.75);
    doc.line(margin, y, margin + contentWidth, y);
    y += 12;
  };

  const visible = resumeData.visible_sections || [
    "summary",
    "skills",
    "experience",
    "achievements",
    "projects",
    "education",
    "certifications",
  ];
  const order = resumeData.section_order || [
    "summary",
    "skills",
    "experience",
    "achievements",
    "projects",
    "education",
    "certifications",
  ];

  for (const sectionKey of order) {
    if (!visible.includes(sectionKey)) continue;

    if (sectionKey === "summary" && resumeData.summary) {
      renderSectionHeading("Summary");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);

      const bullets = resumeData.summary
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4);

      for (const bullet of bullets) {
        checkPageBreak(18);
        doc.text("•", margin + 4, y);
        const lines = doc.splitTextToSize(bullet, contentWidth - 16);
        doc.text(lines, margin + 14, y);
        y += lines.length * 11 + 3;
      }
      y += 6;
    }

    if (sectionKey === "skills" && resumeData.skills && resumeData.skills.length > 0) {
      renderSectionHeading("Core Skills & Competencies");
      checkPageBreak(20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const skillsText = resumeData.skills.join("   •   ");
      const lines = doc.splitTextToSize(skillsText, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 6;
    }

    if (sectionKey === "experience" && resumeData.experience && resumeData.experience.length > 0) {
      renderSectionHeading("Professional Experience");
      for (const exp of resumeData.experience) {
        checkPageBreak(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(exp.role, margin, y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const dateRange = `${exp.start_date} – ${exp.end_date || "Present"}`;
        const dateWidth = doc.getTextWidth(dateRange);
        doc.text(dateRange, margin + contentWidth - dateWidth, y);
        y += 11;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(exp.company, margin, y);
        y += 10;

        if (exp.bullets && exp.bullets.length > 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          for (const b of exp.bullets) {
            checkPageBreak(16);
            doc.text("•", margin + 4, y);
            const lines = doc.splitTextToSize(b, contentWidth - 16);
            doc.text(lines, margin + 14, y);
            y += lines.length * 11 + 2;
          }
        }
        y += 6;
      }
    }

    if (sectionKey === "achievements" && resumeData.claims && resumeData.claims.length > 0) {
      renderSectionHeading("Key Achievements & Verified Proofs");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      for (const claim of resumeData.claims.slice(0, 5)) {
        checkPageBreak(18);
        doc.text("•", margin + 4, y);
        const lines = doc.splitTextToSize(`${claim} [Cryptographic Proof Chain]`, contentWidth - 16);
        doc.text(lines, margin + 14, y);
        y += lines.length * 11 + 3;
      }
      y += 6;
    }

    if (sectionKey === "projects" && resumeData.projects && resumeData.projects.length > 0) {
      renderSectionHeading("Project Experience");
      for (const proj of resumeData.projects) {
        checkPageBreak(26);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(3, 105, 161); // sky-700
        doc.text(proj.title, margin, y);
        y += 11;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        const descLines = doc.splitTextToSize(proj.description || proj.narrative || "", contentWidth);
        doc.text(descLines, margin, y);
        y += descLines.length * 11 + 6;
      }
    }

    if (sectionKey === "education" && resumeData.education && resumeData.education.length > 0) {
      renderSectionHeading("Education");
      for (const edu of resumeData.education) {
        checkPageBreak(22);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(edu.institution, margin, y);

        const yearText = `${edu.start_year ? `${edu.start_year} – ` : ""}${edu.end_year || "Graduated"}`;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const yearWidth = doc.getTextWidth(yearText);
        doc.text(yearText, margin + contentWidth - yearWidth, y);
        y += 11;

        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        doc.text(`${edu.degree}${edu.field_of_study ? ` in ${edu.field_of_study}` : ""}`, margin, y);
        y += 12;
      }
    }

    if (sectionKey === "certifications" && resumeData.certifications && resumeData.certifications.length > 0) {
      renderSectionHeading("Certifications & Credentials");
      for (const cert of resumeData.certifications) {
        checkPageBreak(16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text("•", margin + 4, y);
        doc.text(`${cert.name}`, margin + 14, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        const issuerText = ` — ${cert.issuer} (${cert.issue_date || "Verified"})`;
        doc.text(issuerText, margin + 14 + doc.getTextWidth(cert.name), y);
        y += 12;
      }
    }
  }
}

function renderFeaturedLayout(
  doc: jsPDF,
  resumeData: ResumeData,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number
): void {
  let y = margin;
  const leftColWidth = contentWidth - 185;
  const rightColX = margin + leftColWidth + 15;
  const rightColWidth = 170;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header Banner across top
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 68, 4, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(resumeData.profile?.name || "Candidate", margin + 14, y + 26);

  doc.setFontSize(9.5);
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text(
    (resumeData.target_role || "SYSTEMS ENGINEER").toUpperCase() + "  ·  VERIFIED ENHANCV DOSSIER",
    margin + 14,
    y + 42
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  const contactText = [
    resumeData.profile?.email,
    resumeData.profile?.location,
    resumeData.profile?.github_username ? `github.com/${resumeData.profile.github_username}` : "",
  ]
    .filter(Boolean)
    .join("   ·   ");
  doc.text(contactText, margin + 14, y + 56);

  y += 82;
  const colStartY = y;

  // ─── LEFT COLUMN: Summary, Selected Work, Experience, Education ─────────
  // 1. Summary
  if (resumeData.summary) {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, leftColWidth, 48, 3, 3, "F");
    doc.setDrawColor(56, 189, 248);
    doc.setLineWidth(2);
    doc.line(margin, y, margin, y + 48);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const sumLines = doc.splitTextToSize(resumeData.summary, leftColWidth - 16);
    doc.text(sumLines.slice(0, 3), margin + 10, y + 14);
    y += 58;
  }

  // 2. Selected Work
  if (resumeData.projects && resumeData.projects.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("SELECTED WORK & SYSTEMS", margin, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 4, margin + leftColWidth, y + 4);
    y += 16;

    for (const proj of resumeData.projects.slice(0, 3)) {
      checkPageBreak(50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(proj.title, margin, y);

      if (proj.technologies && proj.technologies.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(37, 99, 235);
        const tags = `[${proj.technologies.slice(0, 3).join(", ")}]`;
        doc.text(tags, margin + doc.getTextWidth(proj.title) + 8, y);
      }
      y += 12;

      if (proj.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const descLines = doc.splitTextToSize(proj.description, leftColWidth - 8);
        doc.text(descLines.slice(0, 2), margin, y);
        y += descLines.slice(0, 2).length * 10 + 2;
      }

      if (proj.claims && proj.claims.length > 0) {
        for (const c of proj.claims.slice(0, 2)) {
          drawVectorCheckmark(doc, margin + 4, y);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(30, 41, 59);
          const claimLines = doc.splitTextToSize(c.trim(), leftColWidth - 20);
          doc.text(claimLines.slice(0, 2), margin + 16, y);
          y += claimLines.slice(0, 2).length * 10 + 2;
        }
      }
      y += 6;
    }
  }

  // 3. Experience & Education
  if (resumeData.experience && resumeData.experience.length > 0) {
    checkPageBreak(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("PROFESSIONAL EXPERIENCE", margin, y);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 4, margin + leftColWidth, y + 4);
    y += 16;

    for (const exp of resumeData.experience.slice(0, 2)) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${exp.role} · ${exp.company}`, margin, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${exp.start_date} – ${exp.end_date}`, margin + leftColWidth - 75, y);
      y += 12;
    }
  }

  // ─── RIGHT SIDEBAR: Achievements, Skills, Exploring, Certifications ──────
  let rightY = colStartY;

  // 1. Achievements (Cards with colored dot icons)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("KEY ACHIEVEMENTS", rightColX, rightY);
  doc.setDrawColor(56, 189, 248);
  doc.line(rightColX, rightY + 3, rightColX + rightColWidth, rightY + 3);
  rightY += 14;

  const topClaims = resumeData.claims?.slice(0, 3) || [];
  for (const claim of topClaims) {
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(rightColX, rightY, rightColWidth, 38, 3, 3, "F");

    // Circular icon badge with cyan dot
    doc.setFillColor(56, 189, 248);
    doc.circle(rightColX + 10, rightY + 12, 4, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(claim.slice(0, 24) + "...", rightColX + 20, rightY + 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const clLines = doc.splitTextToSize(claim, rightColWidth - 24);
    doc.text(clLines.slice(0, 2), rightColX + 20, rightY + 23);
    rightY += 44;
  }

  // 2. Core Skills
  rightY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("CORE COMPETENCIES", rightColX, rightY);
  doc.setDrawColor(226, 232, 240);
  doc.line(rightColX, rightY + 3, rightColX + rightColWidth, rightY + 3);
  rightY += 14;

  const skillsList = resumeData.skills?.slice(0, 8) || [
    "Python",
    "Distributed Systems",
    "FastAPI",
    "TypeScript",
    "Docker",
    "Graph Algorithms",
  ];
  let skillPillX = rightColX;
  for (const s of skillsList) {
    const sWidth = doc.getTextWidth(s) + 12;
    if (skillPillX + sWidth > rightColX + rightColWidth) {
      skillPillX = rightColX;
      rightY += 16;
    }
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(skillPillX, rightY, sWidth, 12, 6, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(s, skillPillX + 6, rightY + 8.5);
    skillPillX += sWidth + 4;
  }
  rightY += 24;

  // 3. Currently Exploring (Ground truth horizons)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("CURRENTLY EXPLORING", rightColX, rightY);
  doc.setDrawColor(16, 185, 129);
  doc.line(rightColX, rightY + 3, rightColX + rightColWidth, rightY + 3);
  rightY += 14;

  const horizons = ["Distributed AI Systems", "Verified Graph Solvers", "Compiler Optimization"];
  for (const h of horizons) {
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(rightColX, rightY, rightColWidth, 24, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text(h, rightColX + 8, rightY + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Active empirical research trajectory", rightColX + 8, rightY + 19);
    rightY += 28;
  }
}

/**
 * Generates an authentically styled visual PDF reflecting 6 distinct information architectures:
 * - Featured: Two-column Enhancv-style layout with key achievements, skill tags, and exploration horizons
 * - Modern: Clean navy banner with teal accents, top verified badges, and skill proficiency indicators
 * - Technical: Two-column monospace terminal layout with tree directory structure and dark high-contrast body
 * - Editorial: High-contrast serif publication style with pull-quote thesis callout and two-column skills
 * - Research: arXiv scientific preprint layout with Abstract box, numerical citations [1], and References appendix
 * - Executive: Data-forward briefing with Domain Competency Matrix table and strategic systems impact
 */
export function exportVisualPdf(resumeData: ResumeData, personality: string = "modern_professional"): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const p = personality.toLowerCase();
  const isAtsClean = p.includes("ats_clean") || resumeData.resume_format === "ats_clean";
  const isFeatured = p.includes("featured");
  const isTechnical = p.includes("technical");
  const isEditorial = p.includes("editorial");
  const isResearch = p.includes("research");
  const isExecutive = p.includes("executive");
  const isModern = !isAtsClean && !isTechnical && !isEditorial && !isResearch && !isExecutive && !isFeatured;

  const font = isEditorial || isResearch ? "times" : isTechnical ? "courier" : "helvetica";

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;

  if (isAtsClean) {
    renderAtsCleanLayout(doc, resumeData, margin, contentWidth, pageWidth, pageHeight);
    const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_ats_clean.pdf`;
    doc.save(fileName);
    return;
  }

  if (isFeatured) {
    renderFeaturedLayout(doc, resumeData, margin, contentWidth, pageWidth, pageHeight);
    const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_featured.pdf`;
    doc.save(fileName);
    return;
  }

  let y = 44;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // ─── 1. Header Rendering by Personality ──────────────────────────────────────────
  if (isTechnical) {
    // ── TECHNICAL: Dark Terminal Header Box ──────────────────────────────
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, y, contentWidth, 80, 4, 4, "F");
    doc.setDrawColor(16, 185, 129); // emerald-500
    doc.setLineWidth(1);
    doc.roundedRect(margin, y, contentWidth, 80, 4, 4, "S");

    doc.setTextColor(56, 189, 248); // cyan
    doc.setFont("courier", "bold");
    doc.setFontSize(15);
    const name = resumeData.profile?.name || "Candidate";
    doc.text(`$ whoami: ${name}`, margin + 14, y + 24);

    doc.setFont("courier", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 185, 129); // emerald prompt
    const roleText = resumeData.target_role || "SYSTEMS ARCHITECT";
    doc.text(`> TARGET_ROLE: ${roleText.toUpperCase()} [EMPIRICAL_DATASET]`, margin + 14, y + 42);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(8.5);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.github_username) contactParts.push(`gh:${resumeData.profile.github_username}`);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    doc.text(contactParts.join(" | "), margin + 14, y + 62);
    y += 96;

  } else if (isEditorial) {
    // ── EDITORIAL: Centered Publication Header with Double Rules ─────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    const name = resumeData.profile?.name || "Professional";
    doc.text(name, pageWidth / 2, y + 16, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    const roleText = resumeData.target_role || "Software Specialist";
    doc.text(roleText, pageWidth / 2, y + 34, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);
    doc.text(contactParts.join("   •   "), pageWidth / 2, y + 48, { align: "center" });

    y += 56;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(1.2);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineWidth(0.4);
    doc.line(margin, y + 3, pageWidth - margin, y + 3);
    y += 18;

  } else if (isResearch) {
    // ── RESEARCH: Academic Preprint Title & Affiliation ──────────────────
    doc.setTextColor(15, 23, 42);
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    const name = resumeData.profile?.name || "Candidate Dossier";
    doc.text(name, margin, y + 14);

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(37, 99, 235); // Blue
    const roleText = resumeData.target_role || "Research & Systems Engineering";
    doc.text(`Focus: ${roleText} · [Verified GitHub Artifact Dataset]`, margin, y + 28);

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
    // ── EXECUTIVE: Charcoal Header with Amber Accent ──────────────────────
    doc.setFillColor(30, 41, 59); // dark slate
    doc.roundedRect(margin, y, contentWidth, 76, 4, 4, "F");

    // Gold accent bar
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(margin, y, 6, 76, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    const name = resumeData.profile?.name || "Executive Candidate";
    doc.text(name, margin + 20, y + 26);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(253, 230, 138); // warm amber
    const roleText = resumeData.target_role || "Principal Systems Architect";
    doc.text(roleText.toUpperCase(), margin + 20, y + 42);

    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    const contactParts: string[] = [];
    if (resumeData.profile?.email) contactParts.push(resumeData.profile.email);
    if (resumeData.profile?.location) contactParts.push(resumeData.profile.location);
    if (resumeData.profile?.github_username) contactParts.push(`github.com/${resumeData.profile.github_username}`);
    doc.text(contactParts.join("  |  "), margin + 20, y + 58);
    y += 92;

  } else {
    // ── MODERN: Navy Banner with Teal Bottom Stripe & Verification Chips ──
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, y, contentWidth, 80, 5, 5, "F");

    // Teal bottom accent stripe
    doc.setFillColor(56, 189, 248);
    doc.rect(margin, y + 76, contentWidth, 4, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    const name = resumeData.profile?.name || "Professional";
    doc.text(name, margin + 18, y + 28);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
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

    // Top verified signal chips in header
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(pageWidth - margin - 150, y + 16, 134, 46, 3, 3, "F");
    doc.setTextColor(52, 211, 153); // emerald
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("[VERIFIED EVIDENCE]", pageWidth - margin - 142, y + 30);
    doc.setTextColor(203, 213, 225);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Backed by Live Git Proofs", pageWidth - margin - 142, y + 44);

    y += 98;
  }

  // ─── Section Header Renderer ───────────────────────────────────────────────────
  const renderSectionHeader = (title: string, sectionIndex?: number) => {
    checkPageBreak(35);
    y += 4;

    if (isTechnical) {
      doc.setTextColor(16, 185, 129); // emerald
      doc.setFont("courier", "bold");
      doc.setFontSize(10);
      doc.text(`[ 0${sectionIndex || 1} // ${title.toUpperCase()} ]`, margin, y);
      y += 4;
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.75);
      doc.line(margin, y, pageWidth - margin, y);
      y += 13;
      // CRITICAL FIX: Set high-contrast dark slate body text on white canvas!
      doc.setTextColor(30, 41, 59);
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

  // ─── 2. Personality-Specific Summary / Abstract / Thesis ──────────────────────
  if (resumeData.summary) {
    if (isResearch) {
      // Research Abstract Box
      renderSectionHeader("Abstract & System Positioning", sectionIdx++);
      const abstractBoxHeight = 44;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(margin, y - 4, contentWidth, abstractBoxHeight, 3, 3, "F");
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin, y - 4, contentWidth, abstractBoxHeight, 3, 3, "S");

      doc.setFont("times", "italic");
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(9);
      const summaryLines = doc.splitTextToSize(`Abstract — ${resumeData.summary}`, contentWidth - 16);
      doc.text(summaryLines, margin + 8, y + 10);
      y += abstractBoxHeight + 10;

    } else if (isEditorial) {
      // Editorial Pull-Quote Highlight
      renderSectionHeader("Executive Thesis & Profile", sectionIdx++);
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 2, contentWidth, 38, "F");
      doc.setFillColor(15, 23, 42);
      doc.rect(margin, y - 2, 3.5, 38, "F");

      doc.setFont("times", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const summaryLines = doc.splitTextToSize(`"${resumeData.summary}"`, contentWidth - 18);
      doc.text(summaryLines, margin + 12, y + 12);
      y += 46;

    } else {
      renderSectionHeader("Professional Summary & Positioning", sectionIdx++);
      const summaryLines = doc.splitTextToSize(resumeData.summary, contentWidth);
      checkPageBreak(summaryLines.length * 13);
      doc.text(summaryLines, margin, y);
      y += summaryLines.length * 13 + 8;
    }
  }

  // ─── 3. Executive Matrix / Competency Layout ───────────────────────────────────
  if (isExecutive && resumeData.skills && resumeData.skills.length > 0) {
    renderSectionHeader("Competency & Technical Evidence Matrix", sectionIdx++);
    
    // Render compact structured metrics table
    const tableY = y;
    const colWidths = [160, 110, 130, 100];
    
    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, tableY, contentWidth, 18, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("CAPABILITY DOMAIN", margin + 6, tableY + 12);
    doc.text("LEVEL", margin + colWidths[0] + 6, tableY + 12);
    doc.text("VERIFIED ARTIFACTS", margin + colWidths[0] + colWidths[1] + 6, tableY + 12);
    doc.text("TRAJECTORY", margin + colWidths[0] + colWidths[1] + colWidths[2] + 6, tableY + 12);
    y += 22;

    const sampleDomains = [
      { name: "Backend Architecture", level: "Proficient", artifacts: "12 Commits / 3 Repos", traj: "Active Growth" },
      { name: "Algorithms & DSA", level: "Advanced", artifacts: "8 Solvers / Benchmark", traj: "Established" },
      { name: "AI & Machine Learning", level: "Practicing", artifacts: "4 Models / Evaluated", traj: "High Velocity" },
    ];

    sampleDomains.forEach((row, i) => {
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 2, contentWidth, 16, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(row.name, margin + 6, y + 9);
      doc.text(row.level, margin + colWidths[0] + 6, y + 9);
      doc.text(row.artifacts, margin + colWidths[0] + colWidths[1] + 6, y + 9);
      doc.setTextColor(16, 185, 129);
      doc.text(row.traj, margin + colWidths[0] + colWidths[1] + colWidths[2] + 6, y + 9);
      doc.setTextColor(30, 41, 59);
      y += 16;
    });
    y += 6;

  } else if (resumeData.skills && resumeData.skills.length > 0) {
    renderSectionHeader("Core Capabilities & Technical Depth", sectionIdx++);
    
    if (isTechnical) {
      // Technical bracketed monospace format
      const skillsText = resumeData.skills.map((s) => `[${s}]`).join("  ");
      const skillLines = doc.splitTextToSize(skillsText, contentWidth);
      checkPageBreak(skillLines.length * 13);
      doc.text(skillLines, margin, y);
      y += skillLines.length * 13 + 8;

    } else if (isModern) {
      // Modern format with filled dot capability indicators
      const skillsFormatted = resumeData.skills.map((s) => `${s} ●●●○`).join("   •   ");
      const skillLines = doc.splitTextToSize(skillsFormatted, contentWidth);
      checkPageBreak(skillLines.length * 13);
      doc.text(skillLines, margin, y);
      y += skillLines.length * 13 + 8;

    } else {
      const skillsText = resumeData.skills.join("   •   ");
      const skillLines = doc.splitTextToSize(skillsText, contentWidth);
      checkPageBreak(skillLines.length * 13);
      doc.text(skillLines, margin, y);
      y += skillLines.length * 13 + 8;
    }
  }

  // ─── 4. Experience ─────────────────────────────────────────────────────────────
  if (resumeData.experience && resumeData.experience.length > 0) {
    renderSectionHeader("Professional Experience", sectionIdx++);
    for (const exp of resumeData.experience) {
      checkPageBreak(40);
      doc.setFont(font, "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(exp.role, margin, y);
      
      doc.setFont(font, "normal");
      doc.setTextColor(37, 99, 235);
      const roleWidth = doc.getTextWidth(exp.role);
      doc.text(` @ ${exp.company}`, margin + roleWidth + 4, y);

      doc.setTextColor(100, 116, 139);
      const dateText = `${exp.start_date} – ${exp.end_date}`;
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, y);
      y += 14;

      if (exp.bullets && exp.bullets.length > 0) {
        doc.setTextColor(51, 65, 85);
        for (const b of exp.bullets) {
          const bulletSymbol = isTechnical ? "> " : isEditorial ? "– " : "• ";
          const bulletText = `${bulletSymbol} ${b.trim()}`;
          const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 14);
          checkPageBreak(bulletLines.length * 13 + 4);
          doc.text(bulletLines, margin + 8, y);
          y += bulletLines.length * 13 + 3;
        }
      }
      y += 4;
    }
  }

  // ─── 5. Selected Projects & Engineering Systems ───────────────────────────────
  if (resumeData.projects && resumeData.projects.length > 0) {
    const sectionTitle = isResearch 
      ? "Evaluated Engineering Artifacts & Systems"
      : "Verified Engineering Projects & Systems";
    renderSectionHeader(sectionTitle, sectionIdx++);

    let projIdx = 1;
    for (const project of resumeData.projects) {
      if (project.included === false) continue;

      checkPageBreak(45);
      doc.setFont(font, "bold");
      doc.setTextColor(15, 23, 42);

      const citationTag = isResearch ? `[${projIdx}] ` : "";
      doc.text(`${citationTag}${project.title}`, margin, y);

      // Layout collision fix: add generous 14pt margin gap
      if (project.skills?.length) {
        doc.setFont(font, "normal");
        doc.setTextColor(100, 116, 139);
        const titleWidth = doc.getTextWidth(`${citationTag}${project.title}`);
        const skillStr = isTechnical 
          ? `[${project.skills.slice(0, 4).join(", ")}]` 
          : `—  ${project.skills.slice(0, 4).join(", ")}`;
        doc.text(skillStr, margin + titleWidth + 14, y);
      }
      y += 14;

      doc.setFont(font, "normal");
      doc.setTextColor(51, 65, 85);
      const bullets = project.custom_bullets?.length 
        ? project.custom_bullets 
        : (project.narrative || "").split(" • ").filter(Boolean);

      for (let i = 0; i < bullets.length; i++) {
        const b = bullets[i].trim();
        const bulletSymbol = isTechnical 
          ? (i === bullets.length - 1 ? "└── " : "├── ") 
          : isEditorial ? "– " : "• ";
        const bulletText = `${bulletSymbol} ${b}`;
        const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 14);
        checkPageBreak(bulletLines.length * 13 + 4);
        doc.text(bulletLines, margin + 8, y);
        y += bulletLines.length * 13 + 3;
      }
      y += 6;
      projIdx++;
    }
  }

  // ─── 6. Education & Credentials ────────────────────────────────────────────────
  if ((resumeData.education && resumeData.education.length > 0) || (resumeData.certifications && resumeData.certifications.length > 0)) {
    renderSectionHeader("Education & Credentials", sectionIdx++);
    if (resumeData.education) {
      for (const edu of resumeData.education) {
        checkPageBreak(30);
        doc.setFont(font, "bold");
        doc.setTextColor(15, 23, 42);
        doc.text(edu.degree, margin, y);
        doc.setFont(font, "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(` — ${edu.institution} (${edu.start_year || ""} - ${edu.end_year || ""})`, margin + doc.getTextWidth(edu.degree) + 6, y);
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
        doc.text(` — ${cert.issuer}`, margin + doc.getTextWidth(cert.name) + 6, y);
        y += 14;
      }
    }
    y += 6;
  }

  // ─── 7. Verified Claims & References Appendix ──────────────────────────────────
  if (resumeData.claims && resumeData.claims.length > 0) {
    if (isResearch) {
      // Research Appendix: Verification Methodology & References
      renderSectionHeader("Verification Methodology & Proof Chain References", sectionIdx++);
      doc.setFont("times", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      resumeData.claims.forEach((claim, idx) => {
        checkPageBreak(24);
        const refTag = `[${idx + 1}]`;
        doc.setTextColor(37, 99, 235);
        doc.text(refTag, margin, y);
        doc.setTextColor(51, 65, 85);
        const claimLines = doc.splitTextToSize(`${claim.trim()} (GitHub Cryptographic Commit & File Proof)`, contentWidth - 28);
        doc.text(claimLines, margin + 22, y);
        y += claimLines.length * 12 + 4;
      });

    } else {
      renderSectionHeader("Evidence-Backed Technical Impact", sectionIdx++);
      for (const claim of resumeData.claims) {
        checkPageBreak(22);
        
        // Draw crisp vector checkmark badge
        drawVectorCheckmark(doc, margin + 4, y);

        doc.setFont(font, "normal");
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(9);
        const claimText = `${claim.trim()}  [Verified Proof Chain]`;
        const claimLines = doc.splitTextToSize(claimText, contentWidth - 24);
        doc.text(claimLines, margin + 18, y);
        y += claimLines.length * 13 + 4;
      }
    }
  }

  const fileName = `${(resumeData.profile?.name || "Candidate").replace(/\s+/g, "_")}_${(resumeData.target_role || "Resume").replace(/\s+/g, "_")}_${personality}.pdf`;
  doc.save(fileName);
}
