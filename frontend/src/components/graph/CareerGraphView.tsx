"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import styles from "./CareerGraphView.module.css";
import type { Project, DomainProgress, SkillProgress } from "../../types";
import { Plus, Minus, RotateCcw, Network } from "lucide-react";

// Node & Link types for D3
export interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: "domain" | "skill" | "project";
  radius: number;
  color: string;
  data: Project | DomainProgress | SkillProgress;
  evidenceCount?: number;
  level?: string;
}

export interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  kind: "domain-skill" | "project-skill" | "project-domain";
}

interface CareerGraphViewProps {
  projects: Project[];
  domainProgress: DomainProgress[];
  skillsProgress: SkillProgress[];
  onSelectProject?: (project: Project) => void;
  onSelectDomain?: (domainProgress: DomainProgress) => void;
}

type FilterType = "all" | "domains" | "skills" | "projects";

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

  // Construct raw graph data
  const rawGraphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeSet = new Set<string>();

    // 1. Add Domain nodes
    domainProgress.forEach((dp) => {
      const id = `domain-${dp.domain.id ?? dp.domain.name}`;
      if (!nodeSet.has(id)) {
        nodeSet.add(id);
        nodes.push({
          id,
          name: dp.domain.name,
          type: "domain",
          radius: 26,
          color: "#3B82F6",
          data: dp,
          evidenceCount: Math.round(dp.evidence_score * 10),
          level: dp.current_level,
        });
      }
    });

    // 2. Add Skill nodes
    skillsProgress.forEach((sp) => {
      const id = `skill-${sp.skill.id ?? sp.skill.name}`;
      if (!nodeSet.has(id)) {
        nodeSet.add(id);
        nodes.push({
          id,
          name: sp.skill.name,
          type: "skill",
          radius: 18,
          color: "#10B981",
          data: sp,
          evidenceCount: sp.evidence_count,
          level: sp.current_level,
        });
      }
    });

    // 3. Add Project nodes & links
    projects.forEach((proj) => {
      const projId = `project-${proj.id}`;
      if (!nodeSet.has(projId)) {
        nodeSet.add(projId);
        const totalClaims = proj.claims?.length ?? 0;
        nodes.push({
          id: projId,
          name: proj.title,
          type: "project",
          radius: 20,
          color: proj.status === "COMPLETED" ? "#10B981" : "#F59E0B",
          data: proj,
          evidenceCount: totalClaims,
          level: proj.status,
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
      (proj.domains ?? []).forEach((dm) => {
        const domainId = `domain-${dm.id ?? dm.name}`;
        if (nodeSet.has(domainId)) {
          links.push({
            source: projId,
            target: domainId,
            kind: "project-domain",
          });
        }
      });
    });

    return { nodes, links };
  }, [projects, domainProgress, skillsProgress]);

  // Filtered graph data
  const filteredData = useMemo(() => {
    if (activeFilter === "all") return rawGraphData;

    const targetType =
      activeFilter === "domains"
        ? "domain"
        : activeFilter === "skills"
        ? "skill"
        : "project";

    const filteredNodes = rawGraphData.nodes.filter((n) => n.type === targetType);
    const validNodeIds = new Set(filteredNodes.map((n) => n.id));

    const filteredLinks = rawGraphData.links.filter((l) => {
      const s = typeof l.source === "string" ? l.source : (l.source as GraphNode).id;
      const t = typeof l.target === "string" ? l.target : (l.target as GraphNode).id;
      return validNodeIds.has(s) && validNodeIds.has(t);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [rawGraphData, activeFilter]);

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
    if (filteredData.nodes.length === 0) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 640;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Add SVG defs for glows and markers
    const defs = svg.append("defs");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "140%");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    filter.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).enter().append("feMergeNode").attr("in", (d) => d);

    // Root group for zoom/pan
    const g = svg.append("g").attr("class", "graph-root");

    // Configure zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Deep clone nodes and links to prevent mutating state
    const simulationNodes: GraphNode[] = filteredData.nodes.map((d) => ({ ...d }));
    const simulationLinks: GraphLink[] = filteredData.links.map((d) => ({ ...d }));

    // Force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(simulationNodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(simulationLinks)
          .id((d) => d.id)
          .distance((d) => (d.kind === "project-domain" ? 140 : 90))
          .strength(0.4)
      )
      .force("charge", d3.forceManyBody().strength(-380))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide<GraphNode>().radius((d) => d.radius + 18)
      );

    // Render links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(simulationLinks)
      .enter()
      .append("line")
      .attr("stroke", (d) => (d.kind === "project-domain" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.12)"))
      .attr("stroke-width", (d) => (d.kind === "project-domain" ? 1.5 : 1))
      .attr("stroke-dasharray", (d) => (d.kind === "project-skill" ? "3,3" : "none"));

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

    // Node outer glow ring
    nodeGroup
      .append("circle")
      .attr("r", (d) => d.radius + 3)
      .attr("fill", "none")
      .attr("stroke", (d) => d.color)
      .attr("stroke-opacity", 0.35)
      .attr("stroke-width", 2)
      .attr("filter", "url(#glow)");

    // Node main circle
    nodeGroup
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", "#0F172A")
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", 2.5);

    // Node inner icon/symbol
    nodeGroup
      .append("circle")
      .attr("r", (d) => (d.type === "domain" ? 6 : 4))
      .attr("fill", (d) => d.color);

    // Node text labels
    nodeGroup
      .append("text")
      .text((d) => (d.name.length > 18 ? `${d.name.slice(0, 16)}…` : d.name))
      .attr("y", (d) => d.radius + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "#E2E8F0")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("font-family", "var(--font-display, sans-serif)")
      .attr("pointer-events", "none")
      .attr("paint-order", "stroke")
      .attr("stroke", "#0B0F19")
      .attr("stroke-width", "3px")
      .attr("stroke-linecap", "round")
      .attr("stroke-linejoin", "round");

    // Hover interactions
    nodeGroup
      .on("mouseenter", (event, d) => {
        // Highlight connected links
        const connectedNodeIds = new Set<string>([d.id]);

        link
          .attr("stroke", (l) => {
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            if (sId === d.id || tId === d.id) {
              connectedNodeIds.add(sId);
              connectedNodeIds.add(tId);
              return d.color;
            }
            return "rgba(255, 255, 255, 0.04)";
          })
          .attr("stroke-width", (l) => {
            const sId = (l.source as GraphNode).id;
            const tId = (l.target as GraphNode).id;
            return sId === d.id || tId === d.id ? 2.5 : 1;
          });

        // Dim non-connected nodes
        nodeGroup.attr("opacity", (n) => (connectedNodeIds.has(n.id) ? 1 : 0.25));

        // Tooltip position
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
        // Reset styles
        link
          .attr("stroke", (d) => (d.kind === "project-domain" ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.12)"))
          .attr("stroke-width", (d) => (d.kind === "project-domain" ? 1.5 : 1));

        nodeGroup.attr("opacity", 1);
        setTooltip((prev) => ({ ...prev, visible: false }));
      })
      .on("click", (_event, d) => {
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
  }, [filteredData, onSelectProject, onSelectDomain]);

  const isEmpty = rawGraphData.nodes.length === 0;

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>Career Graph</h1>
          <p className={styles.subtitle}>
            Interactive multi-entity network mapping verified domains, skills, and projects
          </p>
        </div>

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
          </div>

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
              </div>
              {tooltip.node.evidenceCount !== undefined && (
                <span className={styles.tooltipMeta}>
                  {tooltip.node.evidenceCount} verified item{tooltip.node.evidenceCount !== 1 ? "s" : ""}
                </span>
              )}
              {tooltip.node.type !== "skill" && (
                <span className={styles.tooltipHint}>Click to inspect proof & details →</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
