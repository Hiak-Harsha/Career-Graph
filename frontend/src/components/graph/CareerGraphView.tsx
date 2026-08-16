"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as d3 from "d3";
import styles from "./CareerGraphView.module.css";
import type { Project, DomainProgress, SkillProgress } from "../../types";
import { Plus, Minus, RotateCcw, Network, Play, Pause, SkipBack, SkipForward, History, X } from "lucide-react";

export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "domain" | "skill" | "project";
  radius: number;
  color: string;
  data: Project | DomainProgress | SkillProgress;
  evidenceCount?: number;
  level?: string;
  depthScore?: number;
  isCrossDomain?: boolean;
  dateCreated?: Date;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  kind: "domain-skill" | "project-skill" | "project-domain";
  isCrossDomain?: boolean;
}

interface CareerGraphViewProps {
  projects: Project[];
  domainProgress: DomainProgress[];
  skillsProgress: SkillProgress[];
  onSelectProject?: (project: Project) => void;
  onSelectDomain?: (domainProgress: DomainProgress) => void;
}

type FilterType = "all" | "domains" | "skills" | "projects";

interface TimelineMilestone {
  step: number;
  label: string;
  dateStr: string;
  nodeIds: Set<string>;
}

export function CareerGraphView({
  projects,
  domainProgress,
  skillsProgress,
  onSelectProject,
  onSelectDomain,
}: CareerGraphViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<GraphNode | null>(null);

  // Timeline Replay States
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayStep, setReplayStep] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState<1 | 2>(1);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: GraphNode | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });

  // Construct raw graph data with depth weights & cross-domain detection
  const rawGraphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeSet = new Set<string>();

    // 1. Add Domain nodes (weighted by depth & exposure)
    domainProgress.forEach((dp) => {
      const id = `domain-${dp.domain.id ?? dp.domain.name}`;
      if (!nodeSet.has(id)) {
        nodeSet.add(id);
        const depthVal = dp.depth_score ?? 0.5;
        const exposureVal = dp.exposure_score ?? 0.5;
        // Visual radius scaling
        const radius = Math.round(28 + exposureVal * 8);

        nodes.push({
          id,
          name: dp.domain.name,
          type: "domain",
          radius,
          color: "#3B82F6",
          data: dp,
          evidenceCount: Math.round((dp.evidence_score ?? 0.5) * 10),
          level: dp.current_level,
          depthScore: depthVal,
          dateCreated: new Date("2023-01-01"),
        });
      }
    });

    // 2. Add Skill nodes (weighted by evidence & depth)
    skillsProgress.forEach((sp) => {
      const id = `skill-${sp.skill.id ?? sp.skill.name}`;
      if (!nodeSet.has(id)) {
        nodeSet.add(id);
        const evCount = sp.evidence_count ?? 1;
        const depthVal = sp.depth_score ?? 0.4;
        // Radius scaled by verified evidence
        const radius = Math.min(Math.max(16 + evCount * 2, 16), 26);

        nodes.push({
          id,
          name: sp.skill.name,
          type: "skill",
          radius,
          color: "#10B981",
          data: sp,
          evidenceCount: evCount,
          level: sp.current_level,
          depthScore: depthVal,
          dateCreated: sp.first_seen ? new Date(sp.first_seen) : new Date("2023-06-01"),
        });
      }
    });

    // 3. Add Project nodes & links
    projects.forEach((proj) => {
      const projId = `project-${proj.id}`;
      const projectDomains = proj.domains ?? [];
      const isCrossDomain = projectDomains.length >= 2;
      const complexity = proj.complexity_score ?? 5;
      const radius = Math.min(Math.max(20 + Math.round(complexity * 0.8), 20), 30);

      const projDate = proj.started_at
        ? new Date(proj.started_at)
        : proj.completed_at
        ? new Date(proj.completed_at)
        : proj.updated_at
        ? new Date(proj.updated_at)
        : proj.created_at
        ? new Date(proj.created_at)
        : new Date("2024-01-01");

      if (!nodeSet.has(projId)) {
        nodeSet.add(projId);
        nodes.push({
          id: projId,
          name: proj.title,
          type: "project",
          radius,
          color: proj.status === "COMPLETED" ? "#10B981" : "#F59E0B",
          data: proj,
          evidenceCount: proj.claims?.length ?? 0,
          level: proj.status,
          depthScore: complexity / 10,
          isCrossDomain,
          dateCreated: projDate,
        });
      }

      // Project -> Skill links
      (proj.skills ?? []).forEach((sk) => {
        const skillId = `skill-${sk.id ?? sk.name}`;
        if (nodeSet.has(skillId)) {
          links.push({
            source: projId,
            target: skillId,
            kind: "project-skill",
          });
        }
      });

      // Project -> Domain links
      projectDomains.forEach((dm) => {
        const domainId = `domain-${dm.id ?? dm.name}`;
        if (nodeSet.has(domainId)) {
          links.push({
            source: projId,
            target: domainId,
            kind: "project-domain",
            isCrossDomain,
          });
        }
      });
    });

    return { nodes, links };
  }, [projects, domainProgress, skillsProgress]);

  // Compute chronological timeline milestones for Replay Mode
  const milestones: TimelineMilestone[] = useMemo(() => {
    if (rawGraphData.nodes.length === 0) return [];

    const domainNodes = rawGraphData.nodes.filter((n) => n.type === "domain");
    const otherNodes = rawGraphData.nodes
      .filter((n) => n.type !== "domain")
      .sort((a, b) => (a.dateCreated?.getTime() ?? 0) - (b.dateCreated?.getTime() ?? 0));

    const steps: TimelineMilestone[] = [];
    const cumulativeNodeIds = new Set<string>(domainNodes.map((d) => d.id));

    // Step 1: Core Domain Foundations
    steps.push({
      step: 1,
      label: `Core Architecture & Domain Foundations (${domainNodes.length} domains)`,
      dateStr: "Foundations",
      nodeIds: new Set(cumulativeNodeIds),
    });

    // Subsequent steps: Each project and its associated skills
    const projectNodes = otherNodes.filter((n) => n.type === "project");
    projectNodes.forEach((proj, idx) => {
      cumulativeNodeIds.add(proj.id);

      // Add linked skills for this project
      const projObj = proj.data as Project;
      (projObj.skills ?? []).forEach((s) => {
        cumulativeNodeIds.add(`skill-${s.id ?? s.name}`);
      });

      const dateStr = proj.dateCreated
        ? proj.dateCreated.toLocaleDateString("en-US", { month: "short", year: "numeric" })
        : `Phase ${idx + 1}`;

      steps.push({
        step: idx + 2,
        label: `Built ${proj.name}${proj.isCrossDomain ? " (Cross-Domain Bridge)" : ""}`,
        dateStr,
        nodeIds: new Set(cumulativeNodeIds),
      });
    });

    return steps;
  }, [rawGraphData]);

  // Replay playback timer
  useEffect(() => {
    if (!isPlaying || !isReplaying) return;

    const intervalTime = playSpeed === 1 ? 1400 : 700;
    const timer = setInterval(() => {
      setReplayStep((prev) => {
        if (prev >= milestones.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, isReplaying, playSpeed, milestones.length]);

  // Active dataset considering activeFilter and Replay Step
  const activeDataset = useMemo(() => {
    let baseNodes = rawGraphData.nodes;
    let baseLinks = rawGraphData.links;

    // Apply Replay Filter if active
    if (isReplaying && milestones.length > 0) {
      const currentMilestone = milestones[Math.min(replayStep - 1, milestones.length - 1)];
      if (currentMilestone) {
        baseNodes = baseNodes.filter((n) => currentMilestone.nodeIds.has(n.id));
      }
    }

    // Apply Category Filter
    if (activeFilter !== "all") {
      const targetType =
        activeFilter === "domains"
          ? "domain"
          : activeFilter === "skills"
          ? "skill"
          : "project";
      baseNodes = baseNodes.filter((n) => n.type === targetType);
    }

    const validNodeIds = new Set(baseNodes.map((n) => n.id));
    const validLinks = baseLinks.filter((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      return validNodeIds.has(s) && validNodeIds.has(t);
    });

    return { nodes: baseNodes, links: validLinks };
  }, [rawGraphData, isReplaying, replayStep, milestones, activeFilter]);

  // Clear focus helper
  const handleClearFocus = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedNodeInfo(null);
  }, []);

  // Zoom control handlers
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
    }
  };

  // Render D3 Simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (activeDataset.nodes.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 640;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Add SVG defs for gradients and glow filters
    const defs = svg.append("defs");

    // Glow filter
    const filter = defs
      .append("filter")
      .attr("id", "glow")
      .attr("x", "-40%")
      .attr("y", "-40%")
      .attr("width", "180%")
      .attr("height", "180%");
    filter.append("feGaussianBlur").attr("stdDeviation", "5").attr("result", "blur");
    filter
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .enter()
      .append("feMergeNode")
      .attr("in", (d) => d);

    // Cross-domain gradient
    const crossGrad = defs
      .append("linearGradient")
      .attr("id", "crossDomainGrad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%");
    crossGrad.append("stop").attr("offset", "0%").attr("stop-color", "#EC4899");
    crossGrad.append("stop").attr("offset", "50%").attr("stop-color", "#8B5CF6");
    crossGrad.append("stop").attr("offset", "100%").attr("stop-color", "#38BDF8");

    // Root group for zoom/pan
    const g = svg.append("g").attr("class", "graph-root");

    // Canvas background click clears selection
    svg.on("click", (event) => {
      if (event.target === svgRef.current || event.target.tagName === "svg") {
        handleClearFocus();
      }
    });

    // Configure zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 3.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Deep clone nodes and links to prevent mutating state
    const simulationNodes: GraphNode[] = activeDataset.nodes.map((d) => ({ ...d }));
    const simulationLinks: GraphLink[] = activeDataset.links.map((d) => ({ ...d }));

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(simulationNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(simulationLinks)
          .id((d) => d.id)
          .distance((d) => (d.isCrossDomain ? 160 : d.kind === "project-domain" ? 130 : 85))
          .strength((d) => (d.isCrossDomain ? 0.25 : 0.45))
      )
      .force("charge", d3.forceManyBody().strength(-420))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide<GraphNode>().radius((d) => d.radius + 24)
      );

    // Render links with animated flowing dash patterns
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simulationLinks)
      .enter()
      .append("line")
      .attr("class", (d) => (d.isCrossDomain ? "cross-domain-flow" : "flow-link"))
      .attr("stroke", (d) => {
        if (d.isCrossDomain) return "url(#crossDomainGrad)";
        if (d.kind === "project-domain") return "rgba(59, 130, 246, 0.4)";
        return "rgba(16, 185, 129, 0.35)";
      })
      .attr("stroke-width", (d) => (d.isCrossDomain ? 2.5 : d.kind === "project-domain" ? 1.8 : 1.2));

    // Render node groups
    const nodeGroup = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(simulationNodes)
      .enter()
      .append("g")
      .attr("cursor", "pointer")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // 1. Orbital Mastery Ring (reflecting visual depth & mastery)
    nodeGroup
      .filter((d) => d.type === "domain" || (d.depthScore ?? 0) >= 0.7)
      .append("circle")
      .attr("class", "orbital-ring")
      .attr("r", (d) => d.radius + 8 + (d.depthScore ?? 0.5) * 8)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-opacity", (d) => 0.2 + (d.depthScore ?? 0.5) * 0.3)
      .attr("stroke-width", 1.2)
      .attr("stroke-dasharray", "4, 6");

    // 2. Cross-domain glowing pulse ring
    nodeGroup
      .filter((d) => !!d.isCrossDomain)
      .append("circle")
      .attr("r", (d) => d.radius + 6)
      .attr("fill", "none")
      .attr("stroke", "url(#crossDomainGrad)")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
      .attr("filter", "url(#glow)");

    // 3. Node outer glow ring
    nodeGroup
      .append("circle")
      .attr("class", "glow-ring")
      .attr("r", (d) => d.radius + 3)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)");

    // 4. Node main solid circle with dark center
    nodeGroup
      .append("circle")
      .attr("class", "main-circle")
      .attr("r", (d) => d.radius)
      .attr("fill", "#0B1120")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => (d.type === "domain" ? 3 : 2));

    // 5. Node inner core badge/dot
    nodeGroup
      .append("circle")
      .attr("r", (d) => (d.type === "domain" ? 7 : 4.5))
      .attr("fill", (d) => d.color);

    // 6. Node text labels with high-contrast outline
    nodeGroup
      .append("text")
      .text((d) => (d.name.length > 20 ? `${d.name.slice(0, 18)}…` : d.name))
      .attr("y", (d) => d.radius + 15)
      .attr("text-anchor", "middle")
      .attr("fill", "#F1F5F9")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("font-family", "var(--font-display, sans-serif)")
      .attr("pointer-events", "none")
      .attr("paint-order", "stroke")
      .attr("stroke", "#060A12")
      .attr("stroke-width", "3.5px")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    // Dynamic Focus Highlighting Function
    const updateFocusHighlighting = (focusedId: string | null) => {
      if (!focusedId) {
        // Reset full visibility
        nodeGroup.transition().duration(250).attr("opacity", 1);
        link
          .transition()
          .duration(250)
          .attr("opacity", 1)
          .attr("stroke-width", (d) => (d.isCrossDomain ? 2.5 : d.kind === "project-domain" ? 1.8 : 1.2));
        return;
      }

      // Calculate connected neighborhood
      const connectedNodeIds = new Set<string>([focusedId]);
      const connectedLinkSet = new Set<GraphLink>();

      simulationLinks.forEach((l) => {
        const sId = (l.source as GraphNode).id;
        const tId = (l.target as GraphNode).id;
        if (sId === focusedId || tId === focusedId) {
          connectedNodeIds.add(sId);
          connectedNodeIds.add(tId);
          connectedLinkSet.add(l);
        }
      });

      // Dim unrelated nodes to 15% opacity
      nodeGroup
        .transition()
        .duration(250)
        .attr("opacity", (n) => (connectedNodeIds.has(n.id) ? 1 : 0.12));

      // Dim unrelated links and highlight connected
      link
        .transition()
        .duration(250)
        .attr("opacity", (l) => (connectedLinkSet.has(l) ? 1 : 0.04))
        .attr("stroke-width", (l) => (connectedLinkSet.has(l) ? 3.2 : 1));
    };

    // Apply focus on initial render or when selectedNodeId changes
    updateFocusHighlighting(selectedNodeId);

    // Hover & Selection interactions
    nodeGroup
      .on("mouseenter", (event, d) => {
        if (!selectedNodeId) {
          // Hover focus preview
          updateFocusHighlighting(d.id);
        }

        const bounds = containerRef.current?.getBoundingClientRect();
        if (bounds) {
          setTooltip({
            visible: true,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
            node: d,
          });
        }
      })
      .on("mousemove", (event) => {
        const bounds = containerRef.current?.getBoundingClientRect();
        if (bounds) {
          setTooltip((prev) => ({
            ...prev,
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          }));
        }
      })
      .on("mouseleave", () => {
        if (!selectedNodeId) {
          updateFocusHighlighting(null);
        }
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on("click", (event, d) => {
        event.stopPropagation();

        if (selectedNodeId === d.id) {
          // Toggle off focus
          handleClearFocus();
          updateFocusHighlighting(null);
        } else {
          // Select and focus
          setSelectedNodeId(d.id);
          setSelectedNodeInfo(d);
          updateFocusHighlighting(d.id);
        }

        if (d.type === "project" && onSelectProject) {
          onSelectProject(d.data as Project);
        } else if (d.type === "domain" && onSelectDomain) {
          onSelectDomain(d.data as DomainProgress);
        }
      });

    // Simulation tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);

      nodeGroup.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [activeDataset, selectedNodeId, onSelectProject, onSelectDomain, handleClearFocus]);

  const isEmpty = rawGraphData.nodes.length === 0;
  const currentMilestone = milestones[Math.min(replayStep - 1, milestones.length - 1)];

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Career Graph</h1>
          <p className={styles.subtitle}>
            Living multi-entity network mapping verified domains, skills, and projects with flow telemetry
          </p>
        </div>

        <div className={styles.topActions}>
          {/* Growth Replay Toggle */}
          <button
            type="button"
            className={`${styles.replayToggleBtn} ${isReplaying ? styles.replayToggleBtnActive : ""}`}
            onClick={() => {
              setIsReplaying(!isReplaying);
              setIsPlaying(false);
              setReplayStep(1);
            }}
            title="Replay chronological career growth journey"
          >
            <History size={15} />
            <span>{isReplaying ? "Exit Journey Replay" : "Replay Journey"}</span>
          </button>

          {/* Filter pills */}
          <div className={styles.filterBar} role="tablist" aria-label="Graph filter">
            {(["all", "domains", "skills", "projects"] as FilterType[]).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles.filterBtn} ${activeFilter === filter ? styles.filterBtnActive : ""}`}
                onClick={() => setActiveFilter(filter)}
                role="tab"
                aria-selected={activeFilter === filter}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <Network size={24} />
          </div>
          <h3 className={styles.emptyTitle}>No Career Graph Data</h3>
          <p className={styles.emptyDesc}>
            Connect your GitHub repositories or load demonstration data to generate your interactive career graph.
          </p>
        </div>
      ) : (
        <div className={styles.graphWrapper} ref={containerRef}>
          <svg ref={svgRef} className={styles.svg} />

          {/* Focus Banner (Direction 1) */}
          {selectedNodeInfo && (
            <div className={styles.focusBanner}>
              <span className={styles.focusDot} />
              <span>
                Focused on <strong className={styles.focusName}>{selectedNodeInfo.name}</strong> ({selectedNodeInfo.type})
              </span>
              <button
                type="button"
                className={styles.focusResetBtn}
                onClick={handleClearFocus}
                title="Clear focus"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className={styles.controls} aria-label="Graph navigation controls">
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleZoomIn}
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleZoomOut}
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={handleResetZoom}
              title="Reset view"
              aria-label="Reset view"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Legend */}
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDomain}`} />
              <span>Domains</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendSkill}`} />
              <span>Skills</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendProject}`} />
              <span>Projects</span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendCrossDomain}`} />
              <span>Cross-Domain</span>
            </div>
          </div>

          {/* Growth Journey Replay Player Bar (Direction 3) */}
          {isReplaying && currentMilestone && (
            <div className={styles.replayPlayerBar}>
              <div className={styles.replayHeaderRow}>
                <span className={styles.replayMilestoneText}>
                  <span className={styles.replayMilestoneDate}>{currentMilestone.dateStr}: </span>
                  {currentMilestone.label}
                </span>
                <span className="badge badge-neutral" style={{ fontSize: "0.7rem" }}>
                  Step {replayStep} of {milestones.length}
                </span>
              </div>

              <div className={styles.replayControlsRow}>
                <div className={styles.replayBtnGroup}>
                  <button
                    type="button"
                    className={styles.replayBtn}
                    onClick={() => setReplayStep((s) => Math.max(1, s - 1))}
                    disabled={replayStep <= 1}
                    title="Previous step"
                  >
                    <SkipBack size={14} />
                  </button>

                  <button
                    type="button"
                    className={styles.replayPlayBtn}
                    onClick={() => {
                      if (replayStep >= milestones.length) setReplayStep(1);
                      setIsPlaying(!isPlaying);
                    }}
                    title={isPlaying ? "Pause journey" : "Play journey"}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                  </button>

                  <button
                    type="button"
                    className={styles.replayBtn}
                    onClick={() => setReplayStep((s) => Math.min(milestones.length, s + 1))}
                    disabled={replayStep >= milestones.length}
                    title="Next step"
                  >
                    <SkipForward size={14} />
                  </button>
                </div>

                {/* Scrubber slider */}
                <input
                  type="range"
                  min={1}
                  max={milestones.length}
                  value={replayStep}
                  onChange={(e) => setReplayStep(Number(e.target.value))}
                  className={styles.replaySlider}
                />

                <button
                  type="button"
                  className={styles.replayCloseBtn}
                  onClick={() => setPlaySpeed(playSpeed === 1 ? 2 : 1)}
                  title="Toggle playback speed"
                >
                  {playSpeed}x
                </button>

                <button
                  type="button"
                  className={styles.replayCloseBtn}
                  onClick={() => setIsReplaying(false)}
                >
                  Exit
                </button>
              </div>
            </div>
          )}

          {/* Interactive hover tooltip */}
          {tooltip.visible && tooltip.node && (
            <div
              className={styles.tooltip}
              style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
            >
              <span className={styles.tooltipTitle}>{tooltip.node.name}</span>
              <div className={styles.tooltipMeta}>
                <span className="badge badge-neutral">
                  {tooltip.node.type.toUpperCase()}
                </span>
                {tooltip.node.level && (
                  <span>· {tooltip.node.level}</span>
                )}
                {tooltip.node.isCrossDomain && (
                  <span className="badge badge-warning">CROSS-DOMAIN</span>
                )}
              </div>
              {tooltip.node.evidenceCount !== undefined && (
                <span className={styles.tooltipMeta}>
                  {tooltip.node.evidenceCount} verified evidence item{tooltip.node.evidenceCount !== 1 ? "s" : ""}
                </span>
              )}
              {tooltip.node.depthScore !== undefined && (
                <span className={styles.tooltipMeta}>
                  Depth Mastery: {Math.round(tooltip.node.depthScore * 100)}%
                </span>
              )}
              {tooltip.node.type !== "skill" && (
                <span className={styles.tooltipHint}>Click to focus & inspect proof →</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
