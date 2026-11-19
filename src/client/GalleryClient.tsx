"use client";
import { useEffect } from "react";
import { initGalleryStage } from "./gallery";

/** Gallery landing WebGL stage. Renders nothing; the markup comes from the server. */
export default function GalleryClient() {
  useEffect(() => { initGalleryStage(); }, []);
  return null;
}
