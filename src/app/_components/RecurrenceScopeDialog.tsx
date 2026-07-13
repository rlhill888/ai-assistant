"use client";

import { useEffect, useRef } from "react";
import styles from "./RecurrenceScopeDialog.module.css";

interface RecurrenceScopeDialogProps {
  description?: string;
  error?: string | null;
  isSubmitting?: boolean;
  onChooseOccurrence: () => void;
  onChooseSeries: () => void;
  onClose: () => void;
}

export default function RecurrenceScopeDialog({
  description = "Apply your change to just this occurrence, or the entire series?",
  error = null,
  isSubmitting = false,
  onChooseOccurrence,
  onChooseSeries,
  onClose,
}: RecurrenceScopeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function handleClose() {
    dialogRef.current?.close();
    onClose();
  }

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className={styles.content}>
        <h2>This is a recurring item</h2>
        <p className={styles.description}>{description}</p>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onChooseOccurrence}
            disabled={isSubmitting}
          >
            This occurrence only
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={onChooseSeries}
            disabled={isSubmitting}
          >
            Entire series
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
