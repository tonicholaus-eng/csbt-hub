"use client";

import dynamic from "next/dynamic";
import { useBirthdayEventActive } from "../../hooks/useBirthdayEventActive";

const BirthdayEventExperience = dynamic(() => import("./BirthdayEventExperience"), { ssr: false });

export default function BirthdayEventGateway() {
  const active = useBirthdayEventActive();
  if (!active) return null;
  return <BirthdayEventExperience/>;
}
