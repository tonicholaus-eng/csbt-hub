"use client";

import { useState } from "react";
import { mm2RarityTone } from "../../lib/mm2/rarity";

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
 * The plate is an empty lit display mount: brushed graphite, rarity-tinted
 * light from below, a lit lower rail, and MM2's own knife mark etched into the
 * backing. It carried the weapon's initials until 2026-08-28 — at 60 cards per
 * page that read as a contact list, not a showroom, so the mark is now fixed
 * furniture of the mount rather than a stand-in for the item.
 *
 * If the art does load it covers the plate completely and none of this is seen
 * — no behaviour depends on the failure.
 *
 * This invents nothing: it shows an empty mount, tinted by the weapon's own
 * category. The knife is the same glyph the control rail already uses for
 * Weapon Values, so it reads as CSBT's MM2 mark, not as a claim that this
 * particular weapon is a knife.
 */
function MountMark() {
  return (
    <svg className="mm2-plate-mark" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      {/* blade, guard, grip, pommel — drawn upright, hung at the rail angle */}
      <g transform="rotate(-38 32 32)">
        <path d="M32 7.4 35.4 19.6v14.3h-6.8V19.6Z" />
        <path d="M25.8 34.4h12.4v2.6H25.8z" />
        <path d="M29.6 37.4h4.8l-.6 13.2h-3.6z" />
        <path d="M29.2 50.8h5.6v3h-5.6z" />
      </g>
    </svg>
  );
}

export default function MM2WeaponPlate({
  category,
  src,
  size = 76,
  radius = 15,
  className = "",
}: {
  /**
   * Kept on the signature so every call site still names the weapon it is
   * mounting, and so real art can take an alt text here if it ever resolves.
   * The mount itself is decorative: the weapon's name is always adjacent.
   */
  name: string;
  category?: string | null;
  src?: string | null;
  /** Rendered box size in px. */
  size?: number;
  radius?: number;
  className?: string;
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
      <MountMark />

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
