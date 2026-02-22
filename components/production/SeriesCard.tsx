"use client";
import { useState } from "react";
import SeriesSlideOver from "./SeriesSlideOver";

interface Props {
  seriesId: number;
  children: React.ReactNode;
}

export default function SeriesCard({ seriesId, children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        style={{ cursor: "pointer" }}
      >
        {children}
      </div>
      {open && <SeriesSlideOver seriesId={seriesId} onClose={() => setOpen(false)} />}
    </>
  );
}
