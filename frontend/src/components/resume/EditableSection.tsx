"use client";

import React from "react";
import styles from "./EditableSection.module.css";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

interface EditableSectionProps {
  title: string;
  items: string[];
  itemLabel: string;
  onChange: (items: string[]) => void;
  placeholder?: string;
}

export function EditableSection({
  title,
  items,
  itemLabel,
  onChange,
  placeholder = "Enter text...",
}: EditableSectionProps) {
  const handleItemChange = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = val;
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...items];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const updated = [...items];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleAdd = () => {
    onChange([...items, ""]);
  };

  return (
    <div className={styles.container} aria-label={`Edit ${title}`}>
      <div className={styles.header}>
        <h4 className={styles.title}>{title}</h4>
      </div>

      <div className={styles.itemList}>
        {items.map((item, idx) => (
          <div key={idx} className={styles.itemRow}>
            <input
              type="text"
              className={styles.inputField}
              value={item}
              placeholder={placeholder}
              onChange={(e) => handleItemChange(idx, e.target.value)}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => handleMoveUp(idx)}
                disabled={idx === 0}
                title="Move up"
                aria-label={`Move ${itemLabel} up`}
              >
                <ArrowUp size={13} />
              </button>
              <button
                type="button"
                className={styles.btnIcon}
                onClick={() => handleMoveDown(idx)}
                disabled={idx === items.length - 1}
                title="Move down"
                aria-label={`Move ${itemLabel} down`}
              >
                <ArrowDown size={13} />
              </button>
              <button
                type="button"
                className={`${styles.btnIcon} ${styles.btnDelete}`}
                onClick={() => handleDelete(idx)}
                title="Delete"
                aria-label={`Delete ${itemLabel}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className={styles.btnAdd}
        onClick={handleAdd}
      >
        <Plus size={13} />
        <span>Add {itemLabel}</span>
      </button>
    </div>
  );
}
