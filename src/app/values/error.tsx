"use client";
import FeatureError from "../../components/system/FeatureError";
export default function ValuesError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeatureError title="Values could not load right now." reset={reset} />;
}
