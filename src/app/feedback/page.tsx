import type { Metadata } from "next";

import Navbar from "../../components/Navbar";
import FeedbackForm from "../../components/feedback/FeedbackForm";
import { PageHeader } from "../../components/ui/CSBTUI";
export const metadata: Metadata = { title: "Send Feedback", description: "Report a wrong value, missing item, bug, or feature suggestion to CSBT HUB." };
export default function FeedbackPage(){return <main className="csbt-page"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-app-workspace max-w-[1500px]"><PageHeader eyebrow="Help & Safety" title="Send Feedback" description="Report incorrect values or missing items, tell us about bugs, or suggest what CSBT HUB should improve next."/><FeedbackForm/></div></div></main>}
