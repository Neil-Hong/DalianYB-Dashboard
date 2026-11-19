"use client";
import { useEffect } from "react";
import { initFixtureFilters } from "./fixtures";

/** Fixtures competition filter. Renders nothing; the markup comes from the server. */
export default function FixturesClient() {
  useEffect(() => { initFixtureFilters(); }, []);
  return null;
}
