import jsPDF from "jspdf";

type DiagramNode = { id: string; label: string; type: string; description: string };
type DiagramEdge = { from: string; to: string; label: string };
type Diagram = { title?: string; description?: string; nodes?: DiagramNode[]; edges?: DiagramEdge[] };

type Project = {
  title: string;
  specialty: string;
  idea: string;
  problematique: string;
  objectifs: string[];
  solution: string;
  technologies: string[];
  plan: { phase: string; description: string; duree: string }[];
  chapters: { title: string; content: string }[];
  diagram?: Diagram;
  created_at?: string;
};

type Profile = {
  full_name?: string | null;
  matricule?: string | null;
};

type GroupMember = {
  full_name: string;
  matricule?: string | null;
};

const SPECIALTY_LABELS: Record<string, string> = {
  BA: "Banque & Assurance",
  FC: "Finance & Comptabilité",
  IG: "Informatique de Gestion",
  GRH: "Gestion des Ressources Humaines",
  TCM: "Techniques de Commercialisation & Marketing",
  SAE: "Statistiques Appliquées à l'Économie",
  DI: "Développement Informatique",
  RT: "Réseaux & Télécommunications",
};

const TYPE_COLORS: Record<string, [number, number, number]> = {
  acteur: [99, 102, 241],
  interface: [139, 92, 246],
  module: [16, 185, 129],
  service: [245, 158, 11],
  donnees: [239, 68, 68],
  externe: [100, 116, 139],
};

export function generatePFEPdf(project: Project, profile: Profile, groupMembers: GroupMember[] = []) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 20;
  const usableW = pageW - margin * 2;
  let y = margin;
  let pageNum = 1;

  const addFooter = () => {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text(`Mon PFE — ${project.title.slice(0, 60)}`, margin, pageH - 10);
    doc.text(`Page ${pageNum}`, pageW - margin, pageH - 10, { align: "right" });
    doc.setTextColor(0);
  };

  const newPage = () => {
    addFooter();
    doc.addPage();
    pageNum++;
    y = margin;
  };

  const ensureSpace = (h: number) => {
    if (y + h > pageH - 20) newPage();
  };

  const writeText = (text: string, opts: { size?: number; bold?: boolean; color?: number[]; spacing?: number } = {}) => {
    const { size = 11, bold = false, color = [40, 40, 40], spacing = 5 } = opts;
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, usableW);
    for (const line of lines) {
      ensureSpace(spacing);
      doc.text(line, margin, y);
      y += spacing;
    }
    doc.setTextColor(0);
  };

  const sectionTitle = (text: string) => {
    ensureSpace(15);
    y += 4;
    doc.setFillColor(99, 102, 241);
    doc.rect(margin, y - 4, 4, 8, "F");
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 40, 60);
    doc.text(text, margin + 7, y + 2);
    y += 12;
    doc.setTextColor(0);
  };

  // ===== COVER PAGE =====
  doc.setFillColor(243, 244, 250);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageW, 8, "F");
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 8, pageW, 4, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(99, 102, 241);
  doc.text("RÉPUBLIQUE ISLAMIQUE DE MAURITANIE", pageW / 2, 35, { align: "center" });
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Honneur — Fraternité — Justice", pageW / 2, 42, { align: "center" });
  doc.text("Ministère de l'Enseignement Supérieur et de la Recherche Scientifique", pageW / 2, 50, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(40);
  doc.text("PROJET DE FIN D'ÉTUDES", pageW / 2, 90, { align: "center" });

  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(50, 100, pageW - 50, 100);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 27, 75);
  const titleLines = doc.splitTextToSize(project.title, usableW - 10);
  let titleY = 125;
  titleLines.forEach((line: string) => {
    doc.text(line, pageW / 2, titleY, { align: "center" });
    titleY += 9;
  });

  doc.line(50, titleY + 8, pageW - 50, titleY + 8);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  const specLabel = SPECIALTY_LABELS[project.specialty] ?? project.specialty;
  doc.text(`Spécialité : ${specLabel}`, pageW / 2, titleY + 22, { align: "center" });

  doc.setFontSize(11);
  doc.text("Présenté par :", margin + 10, 200);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(profile.full_name || "—", margin + 10, 207);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Matricule : ${profile.matricule || "—"}`, margin + 10, 213);

  // Group members
  let memberY = 220;
  if (groupMembers && groupMembers.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(99, 102, 241);
    doc.text("Membres du groupe :", margin + 10, memberY);
    doc.setTextColor(60);
    memberY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    groupMembers.slice(0, 8).forEach((m) => {
      const line = m.matricule ? `• ${m.full_name} — ${m.matricule}` : `• ${m.full_name}`;
      doc.text(line, margin + 10, memberY);
      memberY += 5;
    });
  }

  doc.setTextColor(60);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Année universitaire :", pageW - margin - 60, 200);
  doc.setFont("helvetica", "bold");
  const year = new Date().getFullYear();
  doc.text(`${year - 1} / ${year}`, pageW - margin - 60, 207);

  doc.setFillColor(99, 102, 241);
  doc.rect(0, pageH - 12, pageW, 12, "F");
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.text("Mon PFE — Plateforme intelligente de génération de projets", pageW / 2, pageH - 5, { align: "center" });

  // ===== PAGE 2: TOC =====
  doc.addPage();
  pageNum++;
  y = margin;
  doc.setTextColor(0);

  sectionTitle("Sommaire");
  const hasDiagram = project.diagram && project.diagram.nodes && project.diagram.nodes.length > 0;
  const toc = [
    "1. Idée et concept",
    "2. Problématique",
    "3. Objectifs",
    "4. Solution proposée",
    "5. Technologies recommandées",
    "6. Plan de réalisation",
    ...(hasDiagram ? ["7. Schéma fonctionnel de l'application"] : []),
    ...project.chapters.map((c, i) => `${(hasDiagram ? 8 : 7) + i}. ${c.title}`),
    `${(hasDiagram ? 8 : 7) + project.chapters.length}. Bibliographie`,
  ];
  toc.forEach((entry) => {
    writeText(entry, { size: 11, spacing: 7 });
  });

  // ===== SECTIONS =====
  newPage();
  sectionTitle("1. Idée et concept");
  writeText(project.idea, { spacing: 5.5 });

  sectionTitle("2. Problématique");
  writeText(project.problematique, { spacing: 5.5 });

  sectionTitle("3. Objectifs");
  project.objectifs.forEach((o, i) => writeText(`${i + 1}. ${o}`, { spacing: 6 }));

  sectionTitle("4. Solution proposée");
  writeText(project.solution, { spacing: 5.5 });

  sectionTitle("5. Technologies recommandées");
  project.technologies.forEach((t) => writeText(`• ${t}`, { spacing: 6 }));

  sectionTitle("6. Plan de réalisation");
  project.plan.forEach((p, i) => {
    writeText(`Phase ${i + 1} — ${p.phase} (${p.duree})`, { bold: true, size: 12, spacing: 6 });
    writeText(p.description, { spacing: 5.5 });
    y += 2;
  });

  // ===== DIAGRAM =====
  if (hasDiagram) {
    newPage();
    sectionTitle("7. Schéma fonctionnel de l'application");
    if (project.diagram!.description) {
      writeText(project.diagram!.description, { spacing: 5.5 });
      y += 3;
    }
    drawDiagram(doc, project.diagram!, margin, y, usableW, () => {
      addFooter();
      doc.addPage();
      pageNum++;
      y = margin;
    });
    y = Math.min(y + 110, pageH - 30);

    // Légende textuelle
    ensureSpace(20);
    y += 5;
    writeText("Légende des composants :", { bold: true, size: 12, spacing: 6 });
    project.diagram!.nodes!.forEach((n) => {
      writeText(`• ${n.label} (${n.type}) — ${n.description}`, { spacing: 5.5 });
    });

    if (project.diagram!.edges && project.diagram!.edges.length) {
      y += 3;
      writeText("Flux principaux :", { bold: true, size: 12, spacing: 6 });
      project.diagram!.edges.forEach((e) => {
        const from = project.diagram!.nodes!.find((n) => n.id === e.from)?.label ?? e.from;
        const to = project.diagram!.nodes!.find((n) => n.id === e.to)?.label ?? e.to;
        writeText(`• ${from} → ${to} : ${e.label}`, { spacing: 5.5 });
      });
    }
  }

  // ===== CHAPITRES =====
  const chapStart = hasDiagram ? 8 : 7;
  project.chapters.forEach((chap, i) => {
    newPage();
    sectionTitle(`${chapStart + i}. ${chap.title}`);
    writeText(chap.content, { spacing: 5.5 });
  });

  // ===== BIBLIO =====
  newPage();
  sectionTitle(`${chapStart + project.chapters.length}. Bibliographie`);
  const refs = [
    "Banque Mondiale (2023). Rapport sur le développement en Afrique subsaharienne.",
    "Ministère de l'Économie de Mauritanie (2024). Stratégie nationale de croissance.",
    "UNESCO (2023). Rapport sur l'éducation supérieure en Afrique.",
    "Article académique pertinent — Revue scientifique africaine, Vol. 12.",
    "Documentation technique officielle des outils mentionnés.",
    "Études de cas régionales — Nouakchott, 2024.",
  ];
  refs.forEach((r, i) => writeText(`[${i + 1}] ${r}`, { spacing: 6 }));

  addFooter();
  doc.save(`PFE-${project.title.replace(/[^a-z0-9]/gi, "_").slice(0, 50)}.pdf`);
}

function drawDiagram(
  doc: jsPDF,
  diagram: Diagram,
  startX: number,
  startY: number,
  width: number,
  _newPageFn: () => void
) {
  const nodes = diagram.nodes ?? [];
  const edges = diagram.edges ?? [];
  if (!nodes.length) return;

  const areaH = 100;
  const cx = startX + width / 2;
  const cy = startY + areaH / 2;
  const radius = Math.min(width / 2 - 25, areaH / 2 - 5);

  // Compute node positions (circular layout)
  const positions: Record<string, { x: number; y: number }> = {};
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    positions[n.id] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  // Draw edges
  doc.setDrawColor(150, 150, 170);
  doc.setLineWidth(0.3);
  edges.forEach((e) => {
    const a = positions[e.from];
    const b = positions[e.to];
    if (!a || !b) return;
    doc.line(a.x, a.y, b.x, b.y);
    // arrow tip
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const tipX = b.x - Math.cos(angle) * 10;
    const tipY = b.y - Math.sin(angle) * 10;
    doc.setFillColor(120, 120, 140);
    doc.circle(tipX, tipY, 0.8, "F");
  });

  // Draw nodes
  nodes.forEach((n) => {
    const p = positions[n.id];
    const color = TYPE_COLORS[n.type] ?? [99, 102, 241];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(255);
    doc.setLineWidth(0.5);
    doc.circle(p.x, p.y, 9, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255);
    const lbl = n.label.length > 14 ? n.label.slice(0, 13) + "…" : n.label;
    doc.text(lbl, p.x, p.y + 1, { align: "center" });
  });

  doc.setTextColor(0);
}
