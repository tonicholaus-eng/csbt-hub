import type { Metadata } from "next";
import { notFound } from "next/navigation";

import Navbar from "../../../components/Navbar";
import PetDetails from "../../../components/PetDetails";
import { getItemById } from "../../../lib/search";

export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
  const{id}=await params; const item=getItemById(decodeURIComponent(id)); if(!item)return{title:"Item not found"};
  const canonical=`https://csbthub.com/values/${encodeURIComponent(item.ID)}`;
  const description=`Check ${item.NAME} GCash and Elve Shark values, value health, history, rarity, demand, wishlist and trading tools on CSBT HUB.`;
  return{title:`${item.NAME} Values`,description,alternates:{canonical},openGraph:{title:`${item.NAME} Values | CSBT HUB`,description,url:canonical,type:"article",images:item.IMAGE?[{url:item.IMAGE,alt:item.NAME}]:[{url:"/logo.png",alt:"CSBT HUB"}]},twitter:{card:"summary_large_image",title:`${item.NAME} Values | CSBT HUB`,description,images:[item.IMAGE||"/logo.png"]}};
}

export default async function ItemValuePage({params}:{params:Promise<{id:string}>}){
  const{id}=await params; const item=getItemById(decodeURIComponent(id)); if(!item)notFound();
  const canonical=`https://csbthub.com/values/${encodeURIComponent(item.ID)}`;
  const structured={"@context":"https://schema.org","@type":"WebPage",name:`${item.NAME} Values`,url:canonical,description:`Adopt Me ${item.NAME} values and market context on CSBT HUB.`,breadcrumb:{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"CSBT HUB",item:"https://csbthub.com"},{"@type":"ListItem",position:2,name:"Values",item:"https://csbthub.com/values"},{"@type":"ListItem",position:3,name:item.NAME,item:canonical}]}};
  return <main className="csbt-page overflow-x-hidden"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured)}}/><Navbar/><div className="relative z-10 min-w-0 lg:pl-[268px]"><div className="csbt-app-workspace max-w-[1480px]"><PetDetails pet={item}/></div></div></main>;
}
