export type SeminarTheme =
  | "violet"
  | "cyan"
  | "emerald"
  | "amber"
  | "rose"
  | "blue";

export type SeminarOption = {
  id: string;
  label: string;
};

export type SeminarQuestion = {
  id: string;
  prompt: string;
  options: SeminarOption[];
  answerId: string;
  explanation: string;
};

export type MultiSelectActivity = {
  type: "multi-select";
  title: string;
  prompt: string;
  scenario?: string;
  options: Array<
    SeminarOption & {
      correct: boolean;
      feedback: string;
    }
  >;
  successMessage: string;
};

export type SequenceActivity = {
  type: "sequence";
  title: string;
  prompt: string;
  steps: SeminarOption[];
  correctOrder: string[];
  successMessage: string;
};

export type ClassifyActivity = {
  type: "classify";
  title: string;
  prompt: string;
  groups: SeminarOption[];
  cards: Array<
    SeminarOption & {
      targetId: string;
      feedback: string;
    }
  >;
  successMessage: string;
};

export type SeminarActivity =
  | MultiSelectActivity
  | SequenceActivity
  | ClassifyActivity;

export type SeminarMission = {
  id: string;
  number: number;
  title: string;
  shortTitle: string;
  emoji: string;
  theme: SeminarTheme;
  minutes: number;
  xp: number;
  description: string;
  objective: string;
  keyPoints: string[];
  activity: SeminarActivity;
  quiz: SeminarQuestion[];
  policySensitive?: boolean;
};

export const seminarMissions: SeminarMission[] = [
  {
    id: "welcome-to-csbt",
    number: 1,
    title: "Welcome to CSBT",
    shortTitle: "CSBT Basics",
    emoji: "🏰",
    theme: "violet",
    minutes: 5,
    xp: 80,
    description:
      "Meet the community, learn what CSBT stands for, and discover the values that keep transactions safe and fair.",
    objective:
      "Explain why CSBT exists and identify the values every member should practice.",
    keyPoints: [
      "CSBT is a marketplace and a support system built around safer transactions.",
      "Members should be treated fairly, respectfully, and without intimidation.",
      "Trust is built through honesty, clear systems, active moderation, and shared responsibility.",
      "Every member affects the safety and reputation of the whole community.",
    ],
    activity: {
      type: "multi-select",
      title: "Core Values Power-Up",
      prompt: "Select every value that belongs in a safe CSBT community.",
      options: [
        {
          id: "integrity",
          label: "Integrity",
          correct: true,
          feedback: "Correct. Honest information and kept agreements build trust.",
        },
        {
          id: "fairness",
          label: "Fairness",
          correct: true,
          feedback: "Correct. Rules should be applied without favoritism.",
        },
        {
          id: "respect",
          label: "Respect",
          correct: true,
          feedback: "Correct. Respect matters even during delays or disputes.",
        },
        {
          id: "accountability",
          label: "Accountability",
          correct: true,
          feedback: "Correct. Members must own their decisions and commitments.",
        },
        {
          id: "pressure",
          label: "Pressure people to decide fast",
          correct: false,
          feedback: "Not safe. Rushing people creates risk and confusion.",
        },
        {
          id: "favoritism",
          label: "Favor friends when applying rules",
          correct: false,
          feedback: "Not safe. Fair treatment means avoiding favoritism.",
        },
      ],
      successMessage: "You found the values that make CSBT stronger.",
    },
    quiz: [
      {
        id: "csbt-purpose",
        prompt: "Which statement best describes CSBT?",
        options: [
          {
            id: "market-only",
            label: "Only a place where members post prices",
          },
          {
            id: "safe-community",
            label:
              "A community for safer, fairer, and better-organized transactions",
          },
          {
            id: "staff-only",
            label: "A private space only for staff members",
          },
        ],
        answerId: "safe-community",
        explanation:
          "CSBT is both a marketplace and a support system where members can trade, ask for help, build credibility, and learn.",
      },
    ],
  },
  {
    id: "bns-basics",
    number: 2,
    title: "BNS Basics",
    shortTitle: "BNS Basics",
    emoji: "🛍️",
    theme: "cyan",
    minutes: 6,
    xp: 90,
    description:
      "Learn what Buy and Sell means inside CSBT and what responsible participation looks like.",
    objective:
      "Recognize proper BNS conduct and avoid behavior that creates confusion, conflict, or wasted time.",
    keyPoints: [
      "BNS includes buying, selling, trading, discussing prices, and building reliable connections.",
      "Listings should be accurate about the item, value, condition, and price.",
      "Members may accept, decline, or reconsider before a deal is finalized.",
      "Confirmed commitments should be honored or cancelled with an honest explanation.",
    ],
    activity: {
      type: "multi-select",
      title: "Safe or Sketchy?",
      prompt: "Select the actions that show proper BNS behavior.",
      options: [
        {
          id: "accurate-listing",
          label: "Describe the item and price accurately",
          correct: true,
          feedback: "Correct. Accurate listings prevent misleading deals.",
        },
        {
          id: "respect-decision",
          label: "Respect another member's decision to decline",
          correct: true,
          feedback: "Correct. No one should be harassed for saying no.",
        },
        {
          id: "document-details",
          label: "Keep important details documented",
          correct: true,
          feedback: "Correct. Written details help everyone verify the agreement.",
        },
        {
          id: "fake-reservation",
          label: "Reserve an item with no intention to buy",
          correct: false,
          feedback: "Not safe. Fake reservations waste time and damage trust.",
        },
        {
          id: "misleading-proof",
          label: "Use edited proof to make the deal look safer",
          correct: false,
          feedback: "Not safe. Proof must remain accurate and authentic.",
        },
      ],
      successMessage: "You can now separate responsible BNS behavior from risky behavior.",
    },
    quiz: [
      {
        id: "bns-responsibility",
        prompt: "What should a member do when a legitimate delay happens?",
        options: [
          {
            id: "disappear",
            label: "Stop replying and return later",
          },
          {
            id: "communicate",
            label: "Communicate clearly and explain the delay",
          },
          {
            id: "blame",
            label: "Immediately blame the other party",
          },
        ],
        answerId: "communicate",
        explanation:
          "Clear and prompt communication reduces misunderstandings and gives the other party a fair chance to respond.",
      },
    ],
  },
  {
    id: "community-roles",
    number: 3,
    title: "Know Your Community",
    shortTitle: "Roles & GCs",
    emoji: "🧩",
    theme: "emerald",
    minutes: 7,
    xp: 100,
    description:
      "Learn how members, staff, and official Group Chats work together to keep transactions organized.",
    objective:
      "Identify member and staff responsibilities and understand why important deal details stay in the official GC.",
    keyPoints: [
      "Members must follow rules, keep agreements, and report concerns with relevant proof.",
      "Staff should enforce rules consistently, review evidence, and protect member privacy.",
      "Official GCs are used for agreements, coordination, verification, and support.",
      "Important agreements should not be moved to private messages or unauthorized third parties.",
    ],
    activity: {
      type: "classify",
      title: "Who Handles It?",
      prompt: "Assign each responsibility to Member, Staff, or Both.",
      groups: [
        {
          id: "member",
          label: "Member",
        },
        {
          id: "staff",
          label: "Staff",
        },
        {
          id: "both",
          label: "Both",
        },
      ],
      cards: [
        {
          id: "follow-rules",
          label: "Follow community rules and procedures",
          targetId: "member",
          feedback: "Members are responsible for following the approved process.",
        },
        {
          id: "review-reports",
          label: "Review reports and verify evidence",
          targetId: "staff",
          feedback: "Evidence review is a staff responsibility.",
        },
        {
          id: "respectful-communication",
          label: "Communicate respectfully",
          targetId: "both",
          feedback: "Respectful communication is expected from everyone.",
        },
        {
          id: "protect-privacy",
          label: "Avoid exposing sensitive personal information",
          targetId: "both",
          feedback: "Both members and staff should protect private information.",
        },
      ],
      successMessage: "You matched the community roles correctly.",
    },
    quiz: [
      {
        id: "why-gc",
        prompt: "Why should important transaction details remain in the official GC?",
        options: [
          {
            id: "for-style",
            label: "So the chat looks active",
          },
          {
            id: "for-verification",
            label: "So all parties and the MM/MW can verify the agreement",
          },
          {
            id: "for-private-info",
            label: "So everyone can post private account details publicly",
          },
        ],
        answerId: "for-verification",
        explanation:
          "The official GC preserves the written agreement and gives the buyer, seller, and MM/MW one shared record.",
      },
    ],
  },
  {
    id: "transaction-process",
    number: 4,
    title: "Build a Safe Transaction",
    shortTitle: "Transaction Flow",
    emoji: "🧭",
    theme: "amber",
    minutes: 9,
    xp: 120,
    description:
      "Put the complete CSBT transaction process in the correct order from background check to saved proof.",
    objective:
      "Follow the standard transaction process without skipping verification, documentation, or confirmation.",
    keyPoints: [
      "Verify the other party before committing to the deal.",
      "Agree on the item, price, payment method, deadline, usernames, and conditions in writing.",
      "Use an official MM/MW when additional security is needed.",
      "Save proof and leave an honest vouch after a successful transaction.",
    ],
    activity: {
      type: "sequence",
      title: "Transaction Route",
      prompt: "Tap the steps in the correct order.",
      steps: [
        {
          id: "verify",
          label: "Find and verify a potential trader",
        },
        {
          id: "negotiate",
          label: "Negotiate and document the agreement",
        },
        {
          id: "request-mm",
          label: "Request an official MM/MW when needed",
        },
        {
          id: "reserve",
          label: "Reserve or hold the item responsibly",
        },
        {
          id: "transfer",
          label: "Complete payment and item transfer through the approved process",
        },
        {
          id: "confirm",
          label: "Confirm completion",
        },
        {
          id: "save-proof",
          label: "Save proof and leave a vouch",
        },
      ],
      correctOrder: [
        "verify",
        "negotiate",
        "request-mm",
        "reserve",
        "transfer",
        "confirm",
        "save-proof",
      ],
      successMessage: "Perfect route. You completed the transaction flow safely.",
    },
    quiz: [
      {
        id: "before-send",
        prompt: "What must happen before money or an item is sent?",
        options: [
          {
            id: "understand-details",
            label: "Both parties understand and document the full agreement",
          },
          {
            id: "guess",
            label: "The parties guess the remaining details later",
          },
          {
            id: "private-only",
            label: "The agreement is moved entirely to private messages",
          },
        ],
        answerId: "understand-details",
        explanation:
          "Both parties should understand exactly what is exchanged, how payment works, who the MM/MW is, and when the transaction must be completed.",
      },
    ],
  },
  {
    id: "buyer-seller",
    number: 5,
    title: "Buyer vs. Seller",
    shortTitle: "Responsibilities",
    emoji: "⚔️",
    theme: "rose",
    minutes: 8,
    xp: 110,
    description:
      "Sort responsibilities between the buyer, seller, and both parties.",
    objective:
      "Understand what each party must do to keep a transaction safe, efficient, and professional.",
    keyPoints: [
      "Sellers provide accurate item information and deliver the exact agreed item.",
      "Buyers verify payment details, send the correct amount, and confirm receipt.",
      "Both parties check usernames, keep communication in the official GC, and report mismatches.",
      "Reserved items and confirmed agreements should be respected.",
    ],
    activity: {
      type: "classify",
      title: "Responsibility Battle",
      prompt: "Assign each action to Buyer, Seller, or Both.",
      groups: [
        {
          id: "buyer",
          label: "Buyer",
        },
        {
          id: "seller",
          label: "Seller",
        },
        {
          id: "both",
          label: "Both",
        },
      ],
      cards: [
        {
          id: "accurate-item",
          label: "Provide complete and accurate item information",
          targetId: "seller",
          feedback: "The seller must describe the item, price, value, condition, and proof accurately.",
        },
        {
          id: "verify-payment",
          label: "Verify payment details before sending money",
          targetId: "buyer",
          feedback: "The buyer must confirm the recipient and amount before payment.",
        },
        {
          id: "keep-gc",
          label: "Keep communication in the official GC",
          targetId: "both",
          feedback: "Both parties need one shared and verifiable record.",
        },
        {
          id: "report-mismatch",
          label: "Report mismatched details before proceeding",
          targetId: "both",
          feedback: "Either party should stop and report a mismatch immediately.",
        },
      ],
      successMessage: "You assigned every responsibility correctly.",
    },
    quiz: [
      {
        id: "reserved-item",
        prompt: "What should happen after an item is formally reserved and the agreement is finalized?",
        options: [
          {
            id: "offer-others",
            label: "The seller should keep offering it to other buyers",
          },
          {
            id: "honor-or-communicate",
            label: "Both parties should honor the deal or communicate a legitimate change immediately",
          },
          {
            id: "ignore",
            label: "Both parties may stop replying without explanation",
          },
        ],
        answerId: "honor-or-communicate",
        explanation:
          "Reservations depend on trust. Changes should be explained clearly instead of silently abandoning the agreement.",
      },
    ],
  },
  {
    id: "middleman-services",
    number: 6,
    title: "Meet the Middle(wo)man",
    shortTitle: "MM/MW Safety",
    emoji: "🛡️",
    theme: "blue",
    minutes: 9,
    xp: 130,
    description:
      "Learn how an official Middleman or Middlewoman protects both parties and arrange the correct MM/MW procedure.",
    objective:
      "Use only verified official MM/MW services and follow the approved five-step process.",
    keyPoints: [
      "An official MM/MW temporarily holds payment and releases it only after completion is confirmed.",
      "The MM/MW account must be checked against the current official staff list.",
      "Unexpected private offers from unknown MM/MWs should be ignored.",
      "No one should be forced to go first when trust is limited.",
    ],
    activity: {
      type: "sequence",
      title: "MM/MW Relay",
      prompt: "Tap the MM/MW steps in the correct order.",
      steps: [
        {
          id: "details",
          label: "Send full transaction details in the official GC",
        },
        {
          id: "buyer-pays",
          label: "Buyer sends payment and the complete receipt to the MM/MW",
        },
        {
          id: "mm-verifies",
          label: "MM/MW verifies payment and says Received or Proceed",
        },
        {
          id: "seller-transfers",
          label: "Seller transfers the item and buyer confirms receipt",
        },
        {
          id: "release",
          label: "MM/MW releases payment after both parties confirm",
        },
      ],
      correctOrder: [
        "details",
        "buyer-pays",
        "mm-verifies",
        "seller-transfers",
        "release",
      ],
      successMessage: "The MM/MW protected both sides and released payment at the correct time.",
    },
    quiz: [
      {
        id: "verify-mm",
        prompt: "What is the safest way to verify an MM/MW?",
        options: [
          {
            id: "profile-picture",
            label: "Trust the profile picture and display name",
          },
          {
            id: "official-list",
            label: "Open the profile and compare it with the current official staff list",
          },
          {
            id: "private-message",
            label: "Accept the first person who privately offers to help",
          },
        ],
        answerId: "official-list",
        explanation:
          "Impersonators can copy names and profile pictures. Verify the actual account, handle, history, and official listing.",
      },
    ],
    policySensitive: true,
  },
  {
    id: "receipt-detective",
    number: 7,
    title: "Receipt Detective",
    shortTitle: "Payment Proof",
    emoji: "🕵️",
    theme: "violet",
    minutes: 8,
    xp: 120,
    description:
      "Inspect payment proof, catch missing information, and learn when a transaction must stop.",
    objective:
      "Verify payment details and identify the information a complete receipt should display.",
    keyPoints: [
      "The recipient name and account details must match the written GC instructions.",
      "A complete receipt should show the amount, reference number, date, and time.",
      "Fake, edited, cropped, altered, or misleading receipts are prohibited.",
      "The seller should wait for the verified MM/MW's official go-ahead before transferring the item.",
    ],
    activity: {
      type: "multi-select",
      title: "Build a Complete Receipt",
      prompt: "Select every detail that should be visible on valid payment proof.",
      options: [
        {
          id: "recipient",
          label: "Recipient or account name",
          correct: true,
          feedback: "Correct. The recipient must match the verified account.",
        },
        {
          id: "amount",
          label: "Amount paid",
          correct: true,
          feedback: "Correct. The amount should match the agreement.",
        },
        {
          id: "reference",
          label: "Reference number",
          correct: true,
          feedback: "Correct. A reference number helps verify the payment record.",
        },
        {
          id: "date-time",
          label: "Date and time",
          correct: true,
          feedback: "Correct. Date and time help connect the receipt to the transaction.",
        },
        {
          id: "emoji",
          label: "Decorative stickers and emojis",
          correct: false,
          feedback: "Not required. Decoration does not verify payment.",
        },
        {
          id: "cropped-name",
          label: "A cropped image that hides the account name",
          correct: false,
          feedback: "Unsafe. Hidden or cropped details prevent proper verification.",
        },
      ],
      successMessage: "Case solved. You know what complete payment proof must show.",
    },
    quiz: [
      {
        id: "mismatch-response",
        prompt: "What should happen when the account name or payment detail does not match?",
        options: [
          {
            id: "continue",
            label: "Continue because the difference may be small",
          },
          {
            id: "stop",
            label: "Stop immediately and ask staff to verify the details",
          },
          {
            id: "delete-proof",
            label: "Delete the receipt and restart privately",
          },
        ],
        answerId: "stop",
        explanation:
          "A mismatch is a stop signal. Do not send money or transfer an item until the issue is resolved.",
      },
    ],
    policySensitive: true,
  },
  {
    id: "value-hunter",
    number: 8,
    title: "Value Hunter",
    shortTitle: "Values & Profit",
    emoji: "📈",
    theme: "cyan",
    minutes: 8,
    xp: 110,
    description:
      "Use supply, demand, research, and patience to make more responsible value decisions.",
    objective:
      "Recognize common market conditions and avoid relying on only one source or emotional decisions.",
    keyPoints: [
      "High demand and low supply often support a higher trading value.",
      "Low demand and high supply often support a lower trading value.",
      "Updates and trends may cause values to change quickly.",
      "Profit is never guaranteed; compare several sources and actual offers.",
    ],
    activity: {
      type: "classify",
      title: "Market Signals",
      prompt: "Classify each situation by its most likely response.",
      groups: [
        {
          id: "higher",
          label: "Likely higher value",
        },
        {
          id: "lower",
          label: "Likely lower value",
        },
        {
          id: "research",
          label: "Research first",
        },
      ],
      cards: [
        {
          id: "high-demand",
          label: "High demand and low supply",
          targetId: "higher",
          feedback: "This condition often supports stronger trading value.",
        },
        {
          id: "low-demand",
          label: "Low demand and high supply",
          targetId: "lower",
          feedback: "This condition often weakens trading value.",
        },
        {
          id: "new-update",
          label: "A new update suddenly changes demand",
          targetId: "research",
          feedback: "Fast-changing markets need fresh comparisons before a decision.",
        },
        {
          id: "limited-info",
          label: "Only one value source is available",
          targetId: "research",
          feedback: "Limited information means more research and comparison are needed.",
        },
      ],
      successMessage: "You read the market signals responsibly.",
    },
    quiz: [
      {
        id: "profit-guarantee",
        prompt: "Which statement about profit is correct?",
        options: [
          {
            id: "guaranteed",
            label: "Profit is guaranteed when a pet is rare",
          },
          {
            id: "not-guaranteed",
            label: "Profit depends on demand, timing, negotiation, and accurate information",
          },
          {
            id: "one-list",
            label: "One value list is always enough",
          },
        ],
        answerId: "not-guaranteed",
        explanation:
          "Rarity alone does not guarantee profit. Demand, timing, available offers, and current market information all matter.",
      },
    ],
  },
  {
    id: "community-rules",
    number: 9,
    title: "Community Rules",
    shortTitle: "Rules & Conduct",
    emoji: "📜",
    theme: "emerald",
    minutes: 7,
    xp: 100,
    description:
      "Protect trust by spotting prohibited behavior and practicing professional member conduct.",
    objective:
      "Recognize rule-breaking actions and respond respectfully when problems arise.",
    keyPoints: [
      "Transactions should be clear, honest, respectful, and professional.",
      "Scams, fake listings, hacking, harassment, doxing, and misleading proof are prohibited.",
      "Unapproved promotions, spam, mass mentions, and unrelated links should be avoided.",
      "Accept no without pressure and ask staff for help instead of starting emotional arguments.",
    ],
    activity: {
      type: "multi-select",
      title: "Rule Breaker Radar",
      prompt: "Select every action that violates safe community conduct.",
      options: [
        {
          id: "fake-listing",
          label: "Posting a fake listing as a joke",
          correct: true,
          feedback: "A fake listing is misleading and damages trust.",
        },
        {
          id: "mass-mentions",
          label: "Repeated mass mentions and spam",
          correct: true,
          feedback: "Spam disrupts the community and official GCs.",
        },
        {
          id: "doxing",
          label: "Publishing another person's private information",
          correct: true,
          feedback: "Private information must be protected.",
        },
        {
          id: "respect-no",
          label: "Respecting another member's no",
          correct: false,
          feedback: "This is professional and expected behavior.",
        },
        {
          id: "report-proof",
          label: "Reporting a serious violation with original proof",
          correct: false,
          feedback: "This is the proper way to raise a concern.",
        },
      ],
      successMessage: "Your rule radar is working.",
    },
    quiz: [
      {
        id: "disagreement",
        prompt: "What is the best response to a serious disagreement in the GC?",
        options: [
          {
            id: "public-fight",
            label: "Start a public argument until someone gives in",
          },
          {
            id: "staff-help",
            label: "Use calm language and request appropriate staff assistance",
          },
          {
            id: "leak-chat",
            label: "Leak private messages immediately",
          },
        ],
        answerId: "staff-help",
        explanation:
          "Members should clarify the issue calmly and involve authorized staff when the problem cannot be resolved respectfully.",
      },
    ],
  },
  {
    id: "consequence-challenge",
    number: 10,
    title: "Consequence Challenge",
    shortTitle: "Fair Enforcement",
    emoji: "⚖️",
    theme: "amber",
    minutes: 7,
    xp: 100,
    description:
      "Learn the principles behind fair enforcement without treating punishment as entertainment.",
    objective:
      "Understand that consequences should protect the community, follow evidence, and be applied consistently.",
    keyPoints: [
      "Evidence should be reviewed before a penalty is issued.",
      "Seriousness, intent, harm, history, and cooperation should be considered.",
      "Staff should explain violations and keep records of major decisions.",
      "Penalties should protect the community rather than humiliate members.",
    ],
    activity: {
      type: "classify",
      title: "Response Level",
      prompt:
        "Classify each situation by the safest immediate response. Final penalties still require current policy and evidence review.",
      groups: [
        {
          id: "remind",
          label: "Correct and remind",
        },
        {
          id: "review",
          label: "Staff review needed",
        },
        {
          id: "protect",
          label: "Immediate protective action",
        },
      ],
      cards: [
        {
          id: "first-spam",
          label: "A member sends repeated spam after being told to stop",
          targetId: "remind",
          feedback: "Minor conduct issues may begin with correction and documented warning under current policy.",
        },
        {
          id: "fake-offer",
          label: "A suspicious fake offer causes a transaction dispute",
          targetId: "review",
          feedback: "Staff should review proof, intent, and harm before deciding the consequence.",
        },
        {
          id: "active-scam",
          label: "Evidence suggests an active scam or compromised account",
          targetId: "protect",
          feedback: "Safety may require immediate protective action while evidence is formally reviewed.",
        },
      ],
      successMessage: "You focused on safety, evidence, and fairness.",
    },
    quiz: [
      {
        id: "fairness-penalty",
        prompt: "What is the purpose of a fair penalty system?",
        options: [
          {
            id: "humiliate",
            label: "To publicly humiliate members",
          },
          {
            id: "protect",
            label: "To protect the community and apply rules consistently",
          },
          {
            id: "favor-friends",
            label: "To protect friends from consequences",
          },
        ],
        answerId: "protect",
        explanation:
          "Enforcement should protect the community, use evidence, avoid favoritism, and communicate decisions professionally.",
      },
    ],
    policySensitive: true,
  },
  {
    id: "scam-defense",
    number: 11,
    title: "Scam Defense",
    shortTitle: "Spot the Scam",
    emoji: "🚨",
    theme: "rose",
    minutes: 10,
    xp: 150,
    description:
      "Investigate a suspicious transaction, identify every warning sign, and choose the correct stop-and-check response.",
    objective:
      "Recognize scam warning signs, preserve evidence, protect private information, and report concerns properly.",
    keyPoints: [
      "Rushing, inconsistent details, edited proof, dummy accounts, and secrecy are major warning signs.",
      "Copied profile pictures and display names do not prove identity.",
      "Use strong passwords, available two-factor verification, and protected recovery information.",
      "When something feels mismatched or unusual, stop, verify, and ask staff.",
    ],
    activity: {
      type: "multi-select",
      title: "Spot the Scam",
      prompt: "Select every red flag in the scenario.",
      scenario:
        "A newly created account offers an unusually high price. The buyer refuses an official MM/MW, asks to move to private messages, pressures the seller to hurry, and sends a cropped receipt with no reference number.",
      options: [
        {
          id: "new-account",
          label: "Newly created account",
          correct: true,
          feedback: "A new account is not automatically a scam, but it requires extra verification.",
        },
        {
          id: "high-price",
          label: "Unusually high offer",
          correct: true,
          feedback: "An unrealistic offer may be used to make someone ignore warning signs.",
        },
        {
          id: "refuse-mm",
          label: "Refuses an official MM/MW",
          correct: true,
          feedback: "Refusing the approved safety process is a serious red flag.",
        },
        {
          id: "private-messages",
          label: "Wants the deal moved to private messages",
          correct: true,
          feedback: "Moving key details away from the official GC removes the shared record.",
        },
        {
          id: "rush",
          label: "Pressures the seller to hurry",
          correct: true,
          feedback: "Rushing is a common tactic used to prevent careful checking.",
        },
        {
          id: "cropped-receipt",
          label: "Cropped receipt with no reference number",
          correct: true,
          feedback: "Incomplete proof cannot be properly verified.",
        },
        {
          id: "uses-gc",
          label: "Keeps all details in the official GC",
          correct: false,
          feedback: "That would be a safe action, not a warning sign.",
        },
      ],
      successMessage: "You found every red flag. The correct move is to stop, save proof, and report.",
    },
    quiz: [
      {
        id: "impersonation",
        prompt: "Why is a matching display name and profile picture not enough to verify staff?",
        options: [
          {
            id: "copyable",
            label: "They can be copied by impersonators",
          },
          {
            id: "too-colorful",
            label: "They may use the wrong colors",
          },
          {
            id: "always-private",
            label: "Staff accounts are always private",
          },
        ],
        answerId: "copyable",
        explanation:
          "Verify the actual account handle, profile history, account information, and current official staff listing.",
      },
    ],
  },
  {
    id: "graduation",
    number: 12,
    title: "Safe Trader Graduation",
    shortTitle: "Final Mission",
    emoji: "🎓",
    theme: "blue",
    minutes: 10,
    xp: 180,
    description:
      "Review the biggest lessons, complete the final checkpoint, and accept the CSBT Safe Trading Commitment.",
    objective:
      "Show that you can verify identities, document agreements, use official processes, protect proof, and stop when details do not match.",
    keyPoints: [
      "Safe trading depends on preparation, proof, patience, and respect.",
      "Important transaction details belong in the official GC.",
      "Only verified and officially listed MM/MWs should be used.",
      "No guide removes every risk, so stop immediately when something does not match.",
    ],
    activity: {
      type: "multi-select",
      title: "Safe Trading Commitment",
      prompt: "Select every promise that belongs in the CSBT Safe Trading Commitment.",
      options: [
        {
          id: "honest",
          label: "Communicate honestly",
          correct: true,
          feedback: "Honest communication is the foundation of trust.",
        },
        {
          id: "verify",
          label: "Verify every important detail",
          correct: true,
          feedback: "Verification prevents many avoidable losses.",
        },
        {
          id: "official-process",
          label: "Use official processes and staff",
          correct: true,
          feedback: "Approved processes create a shared safety system.",
        },
        {
          id: "protect-private",
          label: "Protect private information",
          correct: true,
          feedback: "Privacy should remain protected during reports and disputes.",
        },
        {
          id: "keep-proof",
          label: "Keep proper proof",
          correct: true,
          feedback: "Original proof helps staff verify what happened.",
        },
        {
          id: "ignore-red-flags",
          label: "Ignore red flags when the offer is profitable",
          correct: false,
          feedback: "Profit never justifies ignoring safety warnings.",
        },
      ],
      successMessage: "You are ready for the final knowledge check.",
    },
    quiz: [
      {
        id: "final-gc",
        prompt: "Where should the item, price, usernames, payment method, and conditions be written?",
        options: [
          {
            id: "official-gc",
            label: "In the official GC",
          },
          {
            id: "temporary-note",
            label: "Only in one person's private notes",
          },
          {
            id: "voice-only",
            label: "Only in a voice call",
          },
        ],
        answerId: "official-gc",
        explanation:
          "The official GC gives all parties and the MM/MW one written agreement to verify.",
      },
      {
        id: "final-receipt",
        prompt: "Which receipt is safest to accept for verification?",
        options: [
          {
            id: "complete",
            label: "A complete receipt showing recipient, amount, reference number, date, and time",
          },
          {
            id: "cropped",
            label: "A cropped receipt that hides the recipient",
          },
          {
            id: "edited",
            label: "An edited image with handwritten changes",
          },
        ],
        answerId: "complete",
        explanation:
          "Complete, original proof gives the MM/MW the information needed to verify the payment.",
      },
      {
        id: "final-stop",
        prompt: "What is the correct response to a mismatched username or account detail?",
        options: [
          {
            id: "stop-verify",
            label: "Stop, save proof, and verify with staff",
          },
          {
            id: "continue-small",
            label: "Continue if the mismatch looks small",
          },
          {
            id: "delete-gc",
            label: "Delete the GC and continue privately",
          },
        ],
        answerId: "stop-verify",
        explanation:
          "The stop-and-check rule applies whenever a detail is rushed, mismatched, secretive, or unusual.",
      },
    ],
    policySensitive: true,
  },
];

export const totalSeminarXp = seminarMissions.reduce(
  (total, mission) => total + mission.xp,
  0,
);

export const safeTradingCommitment =
  "I will communicate honestly, verify every important detail, use official processes, protect private information, respect other members, keep proper proof, and report suspicious activity responsibly. I understand that my behavior contributes to the safety and reputation of the entire CSBT community.";