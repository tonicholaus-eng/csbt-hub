"use client";
import FeatureError from "../../components/system/FeatureError";
export default function ExchangeError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeatureError title="Exchange could not load right now." reset={reset} />;
}
