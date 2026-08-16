"use client";

import React from "react";
import styles from "./ProfessionalSignature.module.css";
import type { DomainSignatureNode, DomainSignatureEdge } from "../../types";
import { Sparkles, ArrowRight } from "lucide-react";

interface ProfessionalSignatureProps {
  nodes: DomainSignatureNode[];
  edges?: DomainSignatureEdge[];
  projectStyle?: string;
}

export function ProfessionalSignature({
  nodes,
  edges = [],
  projectStyle,
}: ProfessionalSignatureProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <div className={styles.container} aria-label="Professional Graph Signature">
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Sparkles size={14} color="#60a5fa" />
          <h4 className={styles.title}>Professional Graph Signature</h4>
        </div>
        {projectStyle && (
          <span className={styles.styleBadge}>{projectStyle}</span>
        )}
      </div>

      <div className={styles.graphCanvas}>
        {nodes.map((node, idx) => {
          const edge = edges.find(
            (e) =>
              (e.source === node.id && edges[idx]?.target) ||
              (idx < nodes.length - 1 && e.target === nodes[idx + 1].id)
          );

          return (
            <React.Fragment key={node.id || node.name}>
              <div className={styles.nodeCard}>
                <span className={styles.nodeDot} />
                <span className={styles.nodeName}>{node.name}</span>
                <span className={styles.nodeLevel}>{node.level}</span>
              </div>
              {idx < nodes.length - 1 && (
                <span className={styles.connector} aria-hidden="true" title={edge?.relationship}>
                  <ArrowRight size={13} />
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

