"use client";
import { useEffect } from "react";
import { initMotion } from "./motion";

/** Site-wide scroll reveals, count-ups and header shadow. Renders nothing; the markup comes from the server. */
export default function MotionClient() {
  useEffect(() => { initMotion(); }, []);
  return null;
}
