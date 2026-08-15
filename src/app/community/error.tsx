"use client";
import FeatureError from "../../components/system/FeatureError";
export default function CommunityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <FeatureError title="Community could not load right now." reset={reset} />;
}
