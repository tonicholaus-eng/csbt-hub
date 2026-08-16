import type { Metadata } from "next";
import type { ReactNode } from "react";
import Navbar from "../../components/Navbar";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How CSBT HUB handles account, trading, community, analytics, safety, and AI screenshot data.",
};

export default function PrivacyPage(){
  return <main className="csbt-page"><Navbar/><div className="lg:pl-[268px]"><article className="csbt-app-workspace max-w-4xl prose-csbt">
    <p className="text-xs font-black uppercase tracking-[.16em] text-[var(--brand-primary)]">Trust & Safety</p>
    <h1 className="mt-2 text-4xl font-black">Privacy Policy</h1>
    <p className="mt-3 text-sm text-[var(--foreground-muted)]">Last updated August 16, 2026. This page describes the data the current CSBT HUB implementation uses to run accounts, trading tools, community features, analytics, AI-assisted screenshot recognition, notifications, and abuse prevention.</p>

    <Policy title="Account and collection data">When you create an account, CSBT may store your account identifier and profile information you choose to provide, plus account-owned data such as inventory entries, wishlist items, alerts, saved trades, preferences, and notification state. Guest inventory is kept in your browser until you choose to merge or clear it.</Policy>
    <Policy title="Public trading and community data">Exchange listings, offers shared with another trader, completed-trade context, public reviews, and community posts/replies/reactions may be visible to the people or audiences the feature is designed for. CSBT uses a limited public-profile projection for other users instead of exposing the full private profile row. Inventory is not made public by default.</Policy>
    <Policy title="Safety and abuse prevention">Reports, blocks, moderation actions, Trade Room safety events, and related evidence may be retained longer when needed to investigate abuse or protect the community. For some public marketplace actions CSBT creates a pseudonymous rate-limit fingerprint from request information such as IP address and browser user-agent; the raw IP is not stored in that rate-limit identifier. Short-lived abuse telemetry can be pruned separately from completed-trade and safety records.</Policy>
    <Policy title="Analytics">CSBT uses Google Analytics on the site to understand usage and product performance. Analytics may receive technical and usage information according to that service&apos;s configuration. CSBT does not need to expose your private inventory contents merely to count a page view.</Policy>
    <Policy title="NICH screenshots and AI">Text trading calculations remain grounded in CSBT&apos;s deterministic value logic. If you voluntarily upload a screenshot for NICH recognition, the image is sent to the configured Gemini vision service for image understanding. Avoid uploading private chats, authentication information, or personal information you do not want processed by that provider.</Policy>
    <Policy title="Why CSBT uses data">Data is used to operate accounts, save your chosen trading information, personalize useful tools, deliver notifications, run Exchange and Community features, calculate defensible market signals, prevent abuse, investigate reports, control AI/API cost, and improve reliability.</Policy>
    <Policy title="Sensitive account information">CSBT HUB staff should never ask for your Roblox password, browser cookies, recovery codes, authentication codes, or full account access. Do not post those details in CSBT HUB, Lounge, Feedback, NICH screenshots, or Trade Rooms.</Policy>
    <Policy title="Retention">Different records have different purposes. Short-lived rate-limit and low-value telemetry can be expired through maintenance jobs; completed trades, moderation/safety records, and account-owned content may need longer retention. CSBT does not claim automatic deletion of every record until the relevant deletion workflow has actually completed.</Policy>
    <Policy title="Your controls">You can edit profile information, remove inventory or wishlist entries, block users, delete your own supported content, and report unsafe behavior. A complete self-service account deletion/export workflow is not yet available in this build; for account or data requests, contact CSBT through Feedback.</Policy>

    <p className="mt-8 text-sm"><Link className="font-black text-[var(--brand-primary)]" href="/feedback">Contact CSBT HUB through Feedback →</Link></p>
  </article></div></main>
}

function Policy({title,children}:{title:string;children:ReactNode}) {
  return <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><h2 className="text-xl font-black">{title}</h2><p className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground-muted)]">{children}</p></section>;
}
