export type NavIconName =
  | "home" | "values" | "demand" | "calculator" | "community" | "servers"
  | "seminar" | "nich" | "about" | "profile" | "notifications" | "inventory"
  | "wishlist" | "tradefeed" | "feedback" | "exchange" | "more";

export type NavBadge = "SMART" | "LIVE";
export type CSBTNavLink = { id:string; label:string; href:string; description:string; icon:NavIconName; badge?:NavBadge; tour?:string; mobileLabel?:string };
export type CSBTNavGroup = { id:"start"|"trade"|"market"|"lounge"|"help"|"account"; title:string; description:string; tour:string; links:CSBTNavLink[]; defaultOpen:boolean };

export const navLinks = {
  home:{id:"home",label:"Home",href:"/",description:"Overview of CSBT HUB",icon:"home"},
  values:{id:"values",label:"Values",href:"/values",description:"Check GCash & Elve values",icon:"values",tour:"nav-values"},
  inventory:{id:"inventory",label:"Inventory",href:"/inventory",description:"Track and value your items",icon:"inventory",tour:"nav-inventory"},
  exchange:{id:"exchange",label:"Trade Finder",href:"/exchange",description:"Listings, offers & Smart Matches",icon:"exchange",badge:"SMART",tour:"nav-exchange",mobileLabel:"Trade"},
  calculator:{id:"calculator",label:"Trade Calculator",href:"/calculator",description:"Compare both offers",icon:"calculator",tour:"nav-calculator",mobileLabel:"Calculate"},
  opinions:{id:"opinions",label:"Trade Opinions",href:"/trade-feed",description:"Community Win / Fair / Lose",icon:"tradefeed",tour:"nav-trade-feed"},
  history:{id:"history",label:"Trade History",href:"/trades",description:"Saved & completed trades",icon:"calculator"},
  demand:{id:"demand",label:"Demand",href:"/demand",description:"See recent market movement",icon:"demand",badge:"LIVE"},
  wishlist:{id:"wishlist",label:"Wishlist & Alerts",href:"/wishlist",description:"Wanted items & value alerts",icon:"wishlist"},
  lounge:{id:"lounge",label:"CSBT Lounge",href:"/community",description:"Live chat, posts & screenshots",icon:"community",badge:"LIVE"},
  servers:{id:"servers",label:"Trading Servers",href:"/trading-servers",description:"Discord, Facebook & Roblox",icon:"servers"},
  academy:{id:"academy",label:"Safe Trader Academy",href:"/seminar",description:"Learn safer trading",icon:"seminar"},
  nich:{id:"nich",label:"Ask Nich",href:"/nich",description:"AI trading assistant",icon:"nich",tour:"nav-nich"},
  feedback:{id:"feedback",label:"Feedback",href:"/feedback",description:"Report bugs, values or ideas",icon:"feedback"},
  about:{id:"about",label:"About",href:"/about",description:"About CSBT HUB",icon:"about"},
  profile:{id:"profile",label:"Profile",href:"/profile",description:"Account & trading identity",icon:"profile"},
  notifications:{id:"notifications",label:"Notifications",href:"/notifications",description:"Offers, alerts & activity",icon:"notifications"},
} satisfies Record<string,CSBTNavLink>;

export const navGroups:CSBTNavGroup[]=[
  {id:"start",title:"Start Here",description:"Home, values and inventory",tour:"group-start",defaultOpen:true,links:[navLinks.home,navLinks.values,navLinks.inventory]},
  {id:"trade",title:"Trade",description:"Find, calculate and review trades",tour:"group-trade",defaultOpen:true,links:[navLinks.exchange,navLinks.calculator,navLinks.opinions,navLinks.history]},
  {id:"market",title:"Market",description:"Demand, wishlist and alerts",tour:"group-market",defaultOpen:false,links:[navLinks.demand,navLinks.wishlist]},
  {id:"lounge",title:"Lounge",description:"Community and trading servers",tour:"group-lounge",defaultOpen:true,links:[navLinks.lounge,navLinks.servers]},
  {id:"help",title:"Help & Safety",description:"Learn, ask Nich and get support",tour:"group-help",defaultOpen:false,links:[navLinks.academy,navLinks.nich,navLinks.feedback,navLinks.about]},
  {id:"account",title:"My CSBT",description:"Profile and notifications",tour:"group-account",defaultOpen:false,links:[navLinks.profile,navLinks.notifications]},
];
export const mobilePrimaryLinks:CSBTNavLink[]=[navLinks.values,navLinks.exchange,navLinks.calculator,navLinks.inventory];
export const SIDEBAR_GROUP_STORAGE_KEY="csbt-sidebar-groups-v2";
