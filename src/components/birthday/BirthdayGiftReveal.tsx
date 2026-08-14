"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { birthdayEvent } from "../../config/birthdayEvent";
import { BirthdayGift, BirthdayHeart, BirthdaySparkle } from "./BirthdayIcons";

export default function BirthdayGiftReveal() {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), reduce ? 40 : 720);
    return () => window.clearTimeout(timer);
  }, [reduce]);

  return <div className="birthday-gift-reveal">
    <div className="birthday-burst" aria-hidden="true">{Array.from({ length:12 },(_,i)=><span key={i} style={{ "--i": i } as CSSProperties}>{i % 3 === 0 ? <BirthdayHeart/> : <BirthdaySparkle/>}</span>)}</div>
    <AnimatePresence mode="wait">
      {!revealed ? <motion.div key="claim" initial={reduce?false:{opacity:0,scale:.82}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.08}} className="py-16 text-center">
        <motion.div animate={reduce?undefined:{scale:[1,1.08,1],rotate:[0,-3,3,0]}} transition={{duration:.65}} className="birthday-item-icon"><BirthdayGift className="h-12 w-12"/></motion.div>
        <p className="birthday-eyebrow mt-5">Opening birthday gift...</p>
      </motion.div> : <motion.div key="item" initial={reduce?false:{opacity:0,scale:.92,y:14}} animate={{opacity:1,scale:1,y:0}} transition={{type:"spring",stiffness:180,damping:18}}>
        <div className="birthday-item-icon"><BirthdayHeart className="h-12 w-12"/></div>
        <p className="birthday-eyebrow mt-5">ITEM OBTAINED</p>
        <h3 className="mt-2 text-3xl font-black tracking-[-.04em] text-[var(--foreground)] sm:text-4xl">💗 My Favorite Person</h3>
        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-left">
          <div className="birthday-mini-stat"><span>Quantity</span><strong>1/1</strong></div>
          <div className="birthday-mini-stat"><span>Rarity</span><strong>One of One</strong></div>
          <div className="birthday-mini-stat"><span>Value</span><strong>Priceless</strong></div>
        </div>
        <h2 className="mt-8 text-3xl font-black tracking-[-.04em] text-[var(--foreground)] sm:text-5xl">Happy Birthday, {birthdayEvent.person.name}! 🎂💗</h2>
        <p className="birthday-personal-message mx-auto mt-5 max-w-2xl">{birthdayEvent.message}</p>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
