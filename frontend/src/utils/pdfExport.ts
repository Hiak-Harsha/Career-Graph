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
    const skillsText = `Core Technologies: ${resumeData.skills.join(", ")}`;
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 13);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 13 + 6;
  }

  // 4. Verifiable Projects & Technical Experience
  if (resumeData.projects && resumeData.projects.length > 0) {
    renderSectionHeader("Technical Projects & Verified Experience");

    for (const project of resumeData.projects) {
      if (project.included === false) continue;

      checkPageBreak(40);
      // Project Title and Skills
      doc.setFont("helvetica", "bold");
      doc.text(project.title, margin, y);

      const skillTag = project.skills?.length ? ` (${project.skills.slice(0, 4).join(", ")})` : "";
      if (skillTag) {
        doc.setFont("helvetica", "italic");
        const titleWidth = doc.getTextWidth(project.title);
        doc.text(skillTag, margin + titleWidth + 4, y);
      }
      y += 13;

      doc.setFont("helvetica", "normal");
      
      // Bullets (either custom_bullets or narrative split)
      const bullets = project.custom_bullets?.length 
        ? project.custom_bullets 
        : project.narrative.split(" • ");

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

  // 5. Evidence-Backed Claims & Achievements
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
 * proof badge indicators, and clean margins.
 */
export function exportVisualPdf(resumeData: ResumeData): void {
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

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Header Banner Background Accent
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 76, 6, 6, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const name = resumeData.profile?.name || "Professional";
  doc.text(name, margin + 18, y + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  const roleText = resumeData.target_role || "Software Specialist";
  doc.text(roleText.toUpperCase(), margin + 18, y + 44);

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

  // Skills Pills
  if (resumeData.skills && resumeData.skills.length > 0) {
    renderVisualHeader("Verified Competencies & Skills");
    const skillsText = resumeData.skills.join("   •   ");
    const skillLines = doc.splitTextToSize(skillsText, contentWidth);
    checkPageBreak(skillLines.length * 13);
    doc.text(skillLines, margin, y);
    y += skillLines.length * 13 + 8;
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
        : project.narrative.split(" • ");

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
