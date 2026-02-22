"use client";
import { useState } from "react";
import QuickAddModal from "@/components/production/QuickAddModal";

export default function AddProductionButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="button button-primary"
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "14px" }}
      >
        + Add Production
      </button>
      {open && <QuickAddModal onClose={() => setOpen(false)} />}
    </>
  );
}
