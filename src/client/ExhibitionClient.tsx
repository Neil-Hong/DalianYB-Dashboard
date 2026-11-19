"use client";
import { useEffect } from "react";
import { initExhibition } from "./exhibition";

/** Exhibition reveal, parallax and lightbox. Renders nothing; the markup comes from the server. */
export default function ExhibitionClient() {
  useEffect(() => { initExhibition(); }, []);
  return null;
}
