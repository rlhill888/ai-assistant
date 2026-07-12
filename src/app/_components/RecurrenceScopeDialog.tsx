"use client";

import { useEffect, useRef } from "react";
import styles from "./RecurrenceScopeDialog.module.css";

interface RecurrenceScopeDialogProps {
  onChooseOccurrence: () => void;
  onChooseSeries: () => void;
  onClose: () => void;
}

export default function RecurrenceScopeDialog({
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
        <p className={styles.description}>
          Apply your change to just this occurrence, or the entire series?
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              onChooseOccurrence();
            }}
          >
            This occurrence only
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              onChooseSeries();
            }}
          >
            Entire series
          </button>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={handleClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  );
}
