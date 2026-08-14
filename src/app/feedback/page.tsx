import type { Metadata } from "next";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import FeedbackForm from "../../components/feedback/FeedbackForm";
import { PageHeader } from "../../components/ui/CSBTUI";
export const metadata: Metadata = { title: "Send Feedback", description: "Report a wrong value, missing item, bug, or feature suggestion to CSBT HUB." };
export default function FeedbackPage(){return <main className="csbt-page"><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-workspace max-w-[1180px] pb-28 sm:pb-32"><PageHeader eyebrow="Help & Safety" title="Send Feedback" description="Report incorrect values or missing items, tell us about bugs, or suggest what CSBT HUB should improve next."/><FeedbackForm/></div><Footer/></div></main>}
