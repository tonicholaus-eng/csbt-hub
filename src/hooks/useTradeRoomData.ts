"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { ExchangeItem, TrustStats } from "../lib/exchange/types";

export type TradeRoom = { id:string; listing_id:string|null; accepted_offer_id:string|null; user_a:string; user_b:string; status:string; lock_snapshot:{value_source?:string;sender_total?:number;recipient_total?:number;sender_items?:ExchangeItem[];recipient_items?:ExchangeItem[];locked_at?:string}; completed_by_a:boolean; completed_by_b:boolean; created_at:string; updated_at:string };
export type TradeRoomProfile = { user_id:string; display_name:string; roblox_username:string|null; avatar_path:string|null };
export type TradeRoomMessage = { id:string; sender_id:string; message_type:string; body:string; created_at:string };
export type TradeRoomEvent = { id:number; actor_id:string|null; event_type:string; body:string|null; created_at:string };
export type MiddlemanRequest = { id:string; status:string; assigned_middleman:string|null; note:string|null };
export type Middleman = { user_id:string; display_name:string; status:string; completed_cases:number };

function upsert<T extends {id:string|number}>(rows:T[], next:T) { return rows.some(r=>r.id===next.id) ? rows.map(r=>r.id===next.id?next:r) : [...rows,next]; }

export function useTradeRoomData({supabase,user,authLoading,roomId}:{supabase:SupabaseClient|null;user:User|null;authLoading:boolean;roomId:string}) {
  const [room,setRoom]=useState<TradeRoom|null>(null);
  const [profiles,setProfiles]=useState<Map<string,TradeRoomProfile>>(new Map());
  const [trust,setTrust]=useState<Map<string,TrustStats>>(new Map());
  const [messages,setMessages]=useState<TradeRoomMessage[]>([]);
  const [events,setEvents]=useState<TradeRoomEvent[]>([]);
  const [middlemen,setMiddlemen]=useState<Middleman[]>([]);
  const [mmRequest,setMmRequest]=useState<MiddlemanRequest|null>(null);
  const [staffRole,setStaffRole]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);

  const refreshRoom=useCallback(async()=>{ if(!supabase||!user)return; const {data,error:e}=await supabase.from("trade_rooms").select("*").eq("id",roomId).maybeSingle(); if(e||!data){setError(e?.message??"Trade room not found.");return;} setRoom(data as TradeRoom); },[roomId,supabase,user]);
  const refreshRequest=useCallback(async()=>{ if(!supabase||!user)return; const {data}=await supabase.from("middleman_requests").select("id,status,assigned_middleman,note").eq("room_id",roomId).maybeSingle(); setMmRequest((data as MiddlemanRequest|null)??null); },[roomId,supabase,user]);

  const loadInitial=useCallback(async()=>{
    if(!supabase||!user)return;
    const {data:roomData,error:roomError}=await supabase.from("trade_rooms").select("*").eq("id",roomId).maybeSingle();
    if(roomError||!roomData){setError(roomError?.message??"Trade room not found.");return;}
    const nextRoom=roomData as TradeRoom; setRoom(nextRoom); const userIds=[nextRoom.user_a,nextRoom.user_b];
    const [profileResult,trustResult,messageResult,eventResult,rosterResult,requestResult,staffResult]=await Promise.all([
      supabase.from("public_profiles").select("user_id,display_name,roblox_username,avatar_path").in("user_id",userIds),
      supabase.from("marketplace_user_stats").select("*").in("user_id",userIds),
      supabase.from("trade_messages").select("id,sender_id,message_type,body,created_at").eq("room_id",roomId).order("created_at",{ascending:true}).limit(300),
      supabase.from("trade_room_events").select("id,actor_id,event_type,body,created_at").eq("room_id",roomId).order("created_at",{ascending:true}).limit(200),
      supabase.from("middleman_roster").select("user_id,display_name,status,completed_cases").neq("status","OFFLINE").order("completed_cases",{ascending:false}).limit(20),
      supabase.from("middleman_requests").select("id,status,assigned_middleman,note").eq("room_id",roomId).maybeSingle(),
      supabase.from("exchange_staff").select("role").eq("user_id",user.id).maybeSingle(),
    ]);
    setProfiles(new Map(((profileResult.data??[]) as TradeRoomProfile[]).map(p=>[p.user_id,p])));
    setTrust(new Map(((trustResult.data??[]) as TrustStats[]).map(p=>[p.user_id,p])));
    setMessages((messageResult.data??[]) as TradeRoomMessage[]); setEvents((eventResult.data??[]) as TradeRoomEvent[]); setMiddlemen((rosterResult.data??[]) as Middleman[]); setMmRequest((requestResult.data as MiddlemanRequest|null)??null); setStaffRole(typeof staffResult.data?.role==="string"?staffResult.data.role:null);
  },[roomId,supabase,user]);

  useEffect(()=>{if(!authLoading)void queueMicrotask(() => loadInitial());},[authLoading,loadInitial]);
  useEffect(()=>{
    if(!supabase||!user)return;
    const channel=supabase.channel(`trade-room-incremental-${roomId}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"trade_messages",filter:`room_id=eq.${roomId}`},(payload:{eventType:string;old?:Record<string,unknown>|null;new?:Record<string,unknown>|null})=>{
        const id=String((payload.eventType==="DELETE"?payload.old:payload.new)?.id??""); if(!id)return;
        if(payload.eventType==="DELETE")setMessages(current=>current.filter(row=>row.id!==id)); else setMessages(current=>upsert(current,payload.new as unknown as TradeRoomMessage).sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-300));
      })
      .on("postgres_changes",{event:"*",schema:"public",table:"trade_rooms",filter:`id=eq.${roomId}`},payload=>{if(payload.eventType==="DELETE")setRoom(null);else setRoom(payload.new as unknown as TradeRoom);})
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"trade_room_events",filter:`room_id=eq.${roomId}`},payload=>setEvents(current=>upsert(current,payload.new as unknown as TradeRoomEvent).slice(-200)))
      .on("postgres_changes",{event:"*",schema:"public",table:"middleman_requests",filter:`room_id=eq.${roomId}`},()=>void refreshRequest())
      .subscribe();
    return()=>{void supabase.removeChannel(channel)};
  },[refreshRequest,roomId,supabase,user]);

  return {room,profiles,trust,messages,events,middlemen,mmRequest,staffRole,error,setError,refreshRoom,refreshRequest,loadInitial};
}
