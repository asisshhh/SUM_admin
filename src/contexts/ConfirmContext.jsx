import React, { createContext, useContext, useRef, useState, useCallback } from "react";
import ConfirmModal from "../components/ConfirmModal";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [options, setOptions] = useState(null);
  const resolverRef = useRef(null);

  const showConfirm = useCallback(({ title = "Confirm", message = "Are you sure?" } = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setOptions({ title, message, open: true });
    });
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) resolverRef.current(false);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) resolverRef.current(true);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  return (
    <ConfirmContext.Provider value={showConfirm}>
      {children}
      <ConfirmModal
        open={Boolean(options)}
        title={options?.title}
        message={options?.message}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
