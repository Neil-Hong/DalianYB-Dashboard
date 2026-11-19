"use client";
import { useEffect } from "react";
import { initAbility } from "./ability";

/** Rating radar animation. Renders nothing; the markup comes from the server. */
export default function AbilityClient() {
  useEffect(() => { initAbility(); }, []);
  return null;
}
