"use client";
import FeatureError from "../components/system/FeatureError";
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeatureError title="CSBT could not load this page." reset={reset} />;
}
