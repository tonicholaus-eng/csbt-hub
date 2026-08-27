"use client";

import { useState } from "react";
import { mm2RarityTone, mm2WeaponMark } from "../../lib/mm2/rarity";

/**
 * A weapon display plate.
 *
 * MM2's catalog art is hosted on supremevalues.com, which sits behind bot
 * protection and answers image requests with a ~212-byte HTML challenge stub
 * under a 200 status. In a browser that decodes as a failed image, so in
 * practice *every* MM2 weapon image is broken: 60 of the 62 `<img>` elements on
 * /mm2/values, 7 of 9 on a weapon profile. Until the art has a first-party
 * source, the failure is at least designed rather than an empty box next to the
 * browser's broken-image glyph.
 *
 * The plate is a lit display case: rarity-tinted light from below, the weapon's
 * initials, and a lit lower rail. If the art does load it covers the plate
 * completely and none of this is seen — no behaviour depends on the failure.
 *
 * This invents nothing. It shows the weapon's own name and its own category.
 */
export default function MM2WeaponPlate({
  name,
  category,
  src,
  size = 76,
  radius = 15,
  className = "",
  markScale = 0.34,
}: {
  name: string;
  category?: string | null;
  src?: string | null;
  /** Rendered box size in px. Also drives the fallback mark's size. */
  size?: number;
  radius?: number;
  className?: string;
  markScale?: number;
}) {
  // The art is only ever painted once it has actually decoded. Waiting for
  // `onError` is not enough: a failing <img> paints the browser's broken-image
  // glyph over the plate in the window before the error fires.
  const [status, setStatus] = useState<"idle" | "loaded" | "failed">("idle");
  const tone = mm2RarityTone(category);

  return (
    <span
      className={`mm2-plate ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        border: `1px solid ${tone.border}`,
        ["--mm2-plate-glow" as string]: tone.glow,
        ["--mm2-plate-edge" as string]: tone.edge,
        ["--mm2-plate-ink" as string]: tone.ink,
      }}
    >
      <span className="mm2-plate-mark" style={{ fontSize: Math.round(size * markScale) }}>
        {mm2WeaponMark(name)}
      </span>

      {src && status !== "failed" ? (
        // The source host rejects Next's optimiser (it answers with a bot-check
        // stub), so this stays a plain <img> that hands off to the plate beneath
        // it rather than going through next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="mm2-plate-img"
          style={{ opacity: status === "loaded" ? 1 : 0 }}
          onLoad={(event) => {
            // A bot-check stub can still "load" as a zero-dimension image.
            setStatus(event.currentTarget.naturalWidth > 1 ? "loaded" : "failed");
          }}
          onError={() => setStatus("failed")}
        />
      ) : null}
    </span>
  );
}
