"use client";
import FeatureError from "../../components/system/FeatureError";
export default function NichError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeatureError title="Nich could not load right now." reset={reset} />;
}
