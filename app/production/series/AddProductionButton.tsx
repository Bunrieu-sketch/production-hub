"use client";
import { useState } from "react";
import QuickAddModal from "@/components/production/QuickAddModal";
import SeriesSlideOver from "@/components/production/SeriesSlideOver";

export default function AddProductionButton() {
  const [open, setOpen] = useState(false);
  const [slideOverId, setSlideOverId] = useState<number | null>(null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="button button-primary"
        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", fontSize: "14px" }}
      >
        + Add Production
      </button>
      {open && (
        <QuickAddModal
          onClose={() => setOpen(false)}
          onCreated={(id) => setSlideOverId(id)}
        />
      )}
      {slideOverId && (
        <SeriesSlideOver
          seriesId={slideOverId}
          onClose={() => { setSlideOverId(null); window.location.reload(); }}
        />
      )}
    </>
  );
}
