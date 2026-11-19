"use client";
import { useEffect } from "react";
import { initModals } from "./modal";

/** Dialog open/close behaviour. Renders nothing; the markup comes from the server. */
export default function ModalClient() {
  useEffect(() => { initModals(); }, []);
  return null;
}
