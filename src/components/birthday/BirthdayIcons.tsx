import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function BirthdaySparkle(props: IconProps) {
  return <svg {...base} {...props}><path d="M32 6c2.5 14 9 22.5 25 26-16 3.5-22.5 12-25 26-2.5-14-9-22.5-25-26C23 28.5 29.5 20 32 6Z"/><path d="M51 8v10M46 13h10"/></svg>;
}
export function BirthdayHeart(props: IconProps) {
  return <svg {...base} {...props}><path d="M32 53 10 33C-2 20 16 5 32 22 48 5 66 20 54 33L32 53Z"/></svg>;
}
export function BirthdayBalloon(props: IconProps) {
  return <svg {...base} {...props}><ellipse cx="32" cy="23" rx="15" ry="18"/><path d="m28 41 4 5 4-5M32 46c-8 5 7 7-3 13"/></svg>;
}
export function BirthdayGift(props: IconProps) {
  return <svg {...base} {...props}><path d="M10 28h44v28H10zM7 20h50v10H7zM32 20v36"/><path d="M32 20c-12 0-18-4-16-10 3-8 14 0 16 10ZM32 20c12 0 18-4 16-10-3-8-14 0-16 10Z"/></svg>;
}
export function BirthdayCake(props: IconProps) {
  return <svg {...base} {...props}><path d="M14 31h36v24H14zM11 31h42M19 31v-8h26v8M24 23v-6m8 6V12m8 11v-6"/><path d="M22 44c4 4 8-4 12 0s8-4 12 0"/></svg>;
}
export function PartyHat(props: IconProps) {
  return <svg {...base} {...props}><path d="m17 50 15-40 15 40H17Z"/><path d="M22 37c7-1 13 2 20 0M26 26c4 0 8 2 12 0"/><circle cx="32" cy="8" r="4" fill="currentColor" stroke="none"/></svg>;
}
