"use client";

import { BirthdayBalloon, BirthdayGift, BirthdayHeart, BirthdaySparkle } from "./BirthdayIcons";

const decorations = [
  { type: "sparkle", left: "7%", top: "18%", size: 27, rotate: -8, mobile: true },
  { type: "heart", left: "91%", top: "23%", size: 34, rotate: 9, mobile: true },
  { type: "gift", left: "84%", top: "68%", size: 45, rotate: -7, mobile: false },
  { type: "balloon", left: "13%", top: "76%", size: 48, rotate: -8, mobile: false },
  { type: "sparkle", left: "68%", top: "10%", size: 22, rotate: 12, mobile: false },
  { type: "heart", left: "29%", top: "91%", size: 25, rotate: -10, mobile: false },
  { type: "gift", left: "94%", top: "88%", size: 32, rotate: 7, mobile: false },
] as const;

function Icon({ type }: { type: (typeof decorations)[number]["type"] }) {
  if (type === "heart") return <BirthdayHeart />;
  if (type === "gift") return <BirthdayGift />;
  if (type === "balloon") return <BirthdayBalloon />;
  return <BirthdaySparkle />;
}

export default function BirthdayDecorations() {
  return <div className="birthday-decorations" aria-hidden="true">
    {decorations.map((item, index) => <span key={`${item.type}-${index}`} className={`birthday-decoration ${item.mobile ? "birthday-decoration--mobile" : ""}`} style={{ left:item.left, top:item.top, width:item.size, height:item.size, transform:`translate(-50%,-50%) rotate(${item.rotate}deg)` }}><Icon type={item.type}/></span>)}
    <span className="birthday-confetti birthday-confetti--1" />
    <span className="birthday-confetti birthday-confetti--2" />
    <span className="birthday-confetti birthday-confetti--3" />
    <span className="birthday-confetti birthday-confetti--4" />
  </div>;
}
