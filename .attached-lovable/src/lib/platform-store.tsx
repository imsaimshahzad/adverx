import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Mock, front-end-only platform store.
 * Mirrors the ledger-based model from the PRD: balances are never set directly,
 * they are always derived from ledger entries.
 */

export type Plan = {
  id: string;
  name: string;
  price: number;
  description: string;
  durationDays: number;
  dailyAdLimit: number;
  minWithdrawal: number;
  networkEligible: boolean;
  highlight?: boolean;
};

export type DepositStatus = "pending" | "approved" | "rejected";
export type Deposit = {
  id: string;
  planId: string;
  amount: number;
  method: string;
  transactionId: string;
  proofName: string;
  status: DepositStatus;
  createdAt: number;
};

export type LedgerType =
  | "deposit"
  | "ad_reward"
  | "referral_reward"
  | "withdrawal"
  | "adjustment";
export type LedgerEntry = {
  id: string;
  type: LedgerType;
  label: string;
  credit: number;
  debit: number;
  status: string;
  createdAt: number;
  reference?: string;
};

export type WithdrawalStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "paid"
  | "rejected";
export type Withdrawal = {
  id: string;
  amount: number;
  fee: number;
  method: string;
  account: string;
  status: WithdrawalStatus;
  createdAt: number;
};

export type Ad = {
  id: string;
  title: string;
  advertiser: string;
  description: string;
  category: string;
  watchSeconds: number;
};

export type AdView = { adId: string; completedAt: number; reward: number };

export type NetworkMember = {
  id: string;
  name: string;
  joinedAt: number;
  active: boolean;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
};

export type User = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  referralCode: string;
  referredBy?: string | undefined;
  verified: boolean;
  planId: string | null;
  planActivatedAt: number | null;
  status: "active" | "pending_verification" | "restricted";
  createdAt: number;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 1500,
    description: "Entry access to daily ad tasks and basic network rewards.",
    durationDays: 90,
    dailyAdLimit: 3,
    minWithdrawal: 500,
    networkEligible: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: 5000,
    description: "More daily tasks, higher reward eligibility and full network access.",
    durationDays: 180,
    dailyAdLimit: 5,
    minWithdrawal: 800,
    networkEligible: true,
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: 12000,
    description: "Maximum daily task allowance and priority withdrawal processing.",
    durationDays: 365,
    dailyAdLimit: 8,
    minWithdrawal: 1000,
    networkEligible: true,
  },
];

export const PAYMENT_METHODS = [
  {
    id: "jazzcash",
    name: "JazzCash",
    accountTitle: "AdNet Rewards (Pvt) Ltd",
    accountNumber: "0300-1234567",
    instructions: "Send the exact plan amount and keep the SMS confirmation.",
  },
  {
    id: "easypaisa",
    name: "Easypaisa",
    accountTitle: "AdNet Rewards (Pvt) Ltd",
    accountNumber: "0345-7654321",
    instructions: "Use the mobile account transfer option, not bill payment.",
  },
  {
    id: "bank",
    name: "Bank Transfer",
    accountTitle: "AdNet Rewards (Pvt) Ltd",
    accountNumber: "PK36 MEZN 0001 2345 6789 0000",
    instructions: "IBFT or branch transfer. Upload the stamped receipt.",
  },
];

export const ADS: Ad[] = [
  {
    id: "ad-1",
    title: "Nova Mobile Data Bundles",
    advertiser: "Nova Telecom",
    description: "Watch a short promo about monthly data bundles.",
    category: "Telecom",
    watchSeconds: 15,
  },
  {
    id: "ad-2",
    title: "Meezan Digital Savings",
    advertiser: "Meezan Digital",
    description: "Learn how digital savings accounts are opened in minutes.",
    category: "Finance",
    watchSeconds: 20,
  },
  {
    id: "ad-3",
    title: "Kiraana Grocery App",
    advertiser: "Kiraana",
    description: "Same-day grocery delivery walkthrough.",
    category: "Retail",
    watchSeconds: 12,
  },
  {
    id: "ad-4",
    title: "SkillHub Online Courses",
    advertiser: "SkillHub",
    description: "Short overview of freelancing skill tracks.",
    category: "Education",
    watchSeconds: 18,
  },
  {
    id: "ad-5",
    title: "RideOn Bike Service",
    advertiser: "RideOn",
    description: "Doorstep bike servicing explained.",
    category: "Services",
    watchSeconds: 14,
  },
  {
    id: "ad-6",
    title: "GreenLeaf Solar",
    advertiser: "GreenLeaf",
    description: "Rooftop solar installation showcase.",
    category: "Energy",
    watchSeconds: 22,
  },
  {
    id: "ad-7",
    title: "Zaiqa Food Delivery",
    advertiser: "Zaiqa",
    description: "Restaurant partner promotions of the week.",
    category: "Food",
    watchSeconds: 16,
  },
  {
    id: "ad-8",
    title: "SafeGuard Insurance",
    advertiser: "SafeGuard",
    description: "Family health cover in plain language.",
    category: "Insurance",
    watchSeconds: 20,
  },
];

export type ActivityLevel =
  | "New"
  | "Basic"
  | "Active"
  | "Growing"
  | "Strong"
  | "Restricted";

type State = {
  user: User | null;
  deposits: Deposit[];
  ledger: LedgerEntry[];
  withdrawals: Withdrawal[];
  adViews: AdView[];
  network: NetworkMember[];
  notifications: Notification[];
};

const EMPTY: State = {
  user: null,
  deposits: [],
  ledger: [],
  withdrawals: [],
  adViews: [],
  network: [],
  notifications: [],
};

const STORAGE_KEY = "adnet.mock.state.v1";
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const DAY = 24 * 60 * 60 * 1000;

export const money = (n: number) =>
  `Rs. ${n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isToday = (ts: number) => {
  const d = new Date(ts);
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
};

function seedNetwork(): NetworkMember[] {
  const names = [
    "Ayesha K.",
    "Bilal R.",
    "Hamza S.",
    "Sana M.",
    "Usman T.",
    "Fatima N.",
    "Zeeshan A.",
  ];
  return names.map((name, i) => ({
    id: uid("mem"),
    name,
    joinedAt: Date.now() - (i + 1) * 6 * DAY,
    active: i % 3 !== 2,
  }));
}

type Ctx = {
  ready: boolean;
  state: State;
  plan: Plan | null;
  availableBalance: number;
  pendingEarnings: number;
  totalWithdrawn: number;
  todaysEarnings: number;
  adsCompletedToday: number;
  dailyAdLimit: number;
  activityLevel: ActivityLevel;
  activityScore: number;
  unreadCount: number;
  register: (input: {
    fullName: string;
    username: string;
    email: string;
    referredBy?: string | undefined;
  }) => void;
  login: (username: string) => void;
  logout: () => void;
  submitDeposit: (input: {
    planId: string;
    method: string;
    transactionId: string;
    proofName: string;
  }) => void;
  completeAd: (adId: string) => number;
  requestWithdrawal: (input: {
    amount: number;
    method: string;
    account: string;
  }) => void;
  markNotificationsRead: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...EMPTY, ...(JSON.parse(raw) as State) });
    } catch {
      /* ignore corrupt storage */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  const notify = useCallback((title: string, body: string) => {
    setState((s) => ({
      ...s,
      notifications: [
        { id: uid("ntf"), title, body, createdAt: Date.now(), read: false },
        ...s.notifications,
      ],
    }));
  }, []);

  // Simulated back-office review of pending deposits (admin panel comes later).
  useEffect(() => {
    if (!ready) return;
    const pending = state.deposits.find((d) => d.status === "pending");
    if (!pending) return;
    const wait = Math.max(6000, pending.createdAt + 8000 - Date.now());
    const t = setTimeout(() => {
      setState((s) => {
        const dep = s.deposits.find((d) => d.id === pending.id);
        if (!dep || dep.status !== "pending") return s;
        const plan = PLANS.find((p) => p.id === dep.planId)!;
        return {
          ...s,
          deposits: s.deposits.map((d) =>
            d.id === dep.id ? { ...d, status: "approved" as DepositStatus } : d,
          ),
          user: s.user
            ? {
                ...s.user,
                planId: plan.id,
                planActivatedAt: Date.now(),
                status: "active",
              }
            : s.user,
          network: s.network.length ? s.network : seedNetwork(),
          ledger: [
            {
              id: uid("lgr"),
              type: "deposit",
              label: `${plan.name} plan deposit`,
              credit: dep.amount,
              debit: 0,
              status: "Approved",
              createdAt: Date.now(),
              reference: dep.transactionId,
            },
            ...s.ledger,
          ],
          notifications: [
            {
              id: uid("ntf"),
              title: "Deposit approved",
              body: `Your ${plan.name} plan is now active. Daily ad tasks unlocked.`,
              createdAt: Date.now(),
              read: false,
            },
            ...s.notifications,
          ],
        };
      });
    }, wait);
    return () => clearTimeout(t);
  }, [ready, state.deposits]);

  const plan = useMemo(
    () => PLANS.find((p) => p.id === state.user?.planId) ?? null,
    [state.user?.planId],
  );

  const derived = useMemo(() => {
    const credits = state.ledger
      .filter((e) => e.status !== "Pending" && e.type !== "withdrawal")
      .reduce((a, e) => a + e.credit, 0);
    const depositCredits = state.ledger
      .filter((e) => e.type === "deposit")
      .reduce((a, e) => a + e.credit, 0);
    const debits = state.ledger.reduce((a, e) => a + e.debit, 0);
    // Deposits fund plan activation, they are not withdrawable earnings.
    const availableBalance = Math.max(0, credits - depositCredits - debits);
    const totalWithdrawn = state.withdrawals
      .filter((w) => w.status === "paid")
      .reduce((a, w) => a + w.amount, 0);
    const pendingEarnings = state.withdrawals
      .filter((w) => w.status !== "paid" && w.status !== "rejected")
      .reduce((a, w) => a + w.amount, 0);
    const todaysEarnings = state.ledger
      .filter((e) => e.type !== "deposit" && isToday(e.createdAt))
      .reduce((a, e) => a + e.credit, 0);
    const adsCompletedToday = state.adViews.filter((v) => isToday(v.completedAt)).length;
    const activeMembers = state.network.filter((m) => m.active).length;

    const ageDays = state.user ? (Date.now() - state.user.createdAt) / DAY : 0;
    const score = Math.min(
      100,
      Math.round(
        adsCompletedToday * 9 +
          Math.min(state.adViews.length, 30) * 1.2 +
          activeMembers * 4 +
          Math.min(ageDays, 30) * 0.6 +
          (plan ? 15 : 0),
      ),
    );
    let activityLevel: ActivityLevel = "New";
    if (state.user?.status === "restricted") activityLevel = "Restricted";
    else if (score >= 80) activityLevel = "Strong";
    else if (score >= 60) activityLevel = "Growing";
    else if (score >= 35) activityLevel = "Active";
    else if (score >= 15) activityLevel = "Basic";

    return {
      availableBalance,
      totalWithdrawn,
      pendingEarnings,
      todaysEarnings,
      adsCompletedToday,
      activityScore: score,
      activityLevel,
    };
  }, [state.ledger, state.withdrawals, state.adViews, state.network, state.user, plan]);

  const register: Ctx["register"] = useCallback(
    (input) => {
      const user: User = {
        id: uid("usr"),
        fullName: input.fullName,
        username: input.username,
        email: input.email,
        referralCode: input.username.toUpperCase().slice(0, 6) + "24",
        referredBy: input.referredBy,
        verified: false,
        planId: null,
        planActivatedAt: null,
        status: "pending_verification",
        createdAt: Date.now(),
      };
      setState({ ...EMPTY, user });
      notify("Welcome aboard", "Choose a plan and submit your deposit to get started.");
    },
    [notify],
  );

  const login: Ctx["login"] = useCallback((username) => {
    setState((s) =>
      s.user
        ? s
        : {
            ...EMPTY,
            user: {
              id: uid("usr"),
              fullName: username,
              username,
              email: `${username}@example.com`,
              referralCode: username.toUpperCase().slice(0, 6) + "24",
              verified: false,
              planId: null,
              planActivatedAt: null,
              status: "pending_verification",
              createdAt: Date.now(),
            },
          },
    );
  }, []);

  const logout = useCallback(() => {
    setState(EMPTY);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const submitDeposit: Ctx["submitDeposit"] = useCallback(
    (input) => {
      const p = PLANS.find((x) => x.id === input.planId)!;
      setState((s) => ({
        ...s,
        deposits: [
          {
            id: uid("dep"),
            planId: p.id,
            amount: p.price,
            method: input.method,
            transactionId: input.transactionId,
            proofName: input.proofName,
            status: "pending",
            createdAt: Date.now(),
          },
          ...s.deposits,
        ],
        notifications: [
          {
            id: uid("ntf"),
            title: "Deposit submitted",
            body: "Your payment is under review. You will be notified once verified.",
            createdAt: Date.now(),
            read: false,
          },
          ...s.notifications,
        ],
      }));
    },
    [],
  );

  const completeAd: Ctx["completeAd"] = useCallback(
    (adId) => {
      const ad = ADS.find((a) => a.id === adId)!;
      const activeMembers = state.network.filter((m) => m.active).length;
      // Dynamic reward engine (internal): base x activity x network x budget factor.
      const base = ad.watchSeconds * 0.55;
      const activityFactor = 0.85 + derived.activityScore / 200;
      const networkFactor = 1 + Math.min(activeMembers, 10) * 0.035;
      const budgetFactor = 0.9 + Math.random() * 0.2;
      const reward = Math.round(base * activityFactor * networkFactor * budgetFactor * 100) / 100;

      setState((s) => ({
        ...s,
        adViews: [{ adId, completedAt: Date.now(), reward }, ...s.adViews],
        ledger: [
          {
            id: uid("lgr"),
            type: "ad_reward",
            label: `Ad reward — ${ad.title}`,
            credit: reward,
            debit: 0,
            status: "Credited",
            createdAt: Date.now(),
            reference: ad.id,
          },
          ...s.ledger,
        ],
      }));
      return reward;
    },
    [state.network, derived.activityScore],
  );

  const requestWithdrawal: Ctx["requestWithdrawal"] = useCallback((input) => {
    const fee = Math.round(input.amount * 0.02 * 100) / 100;
    setState((s) => ({
      ...s,
      withdrawals: [
        {
          id: uid("wdr"),
          amount: input.amount,
          fee,
          method: input.method,
          account: input.account,
          status: "pending",
          createdAt: Date.now(),
        },
        ...s.withdrawals,
      ],
      ledger: [
        {
          id: uid("lgr"),
          type: "withdrawal",
          label: `Withdrawal request — ${input.method}`,
          credit: 0,
          debit: input.amount,
          status: "Pending",
          createdAt: Date.now(),
          reference: input.account,
        },
        ...s.ledger,
      ],
      notifications: [
        {
          id: uid("ntf"),
          title: "Withdrawal submitted",
          body: `${money(input.amount)} is queued for manual approval.`,
          createdAt: Date.now(),
          read: false,
        },
        ...s.notifications,
      ],
    }));
  }, []);

  const markNotificationsRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, []);

  const value: Ctx = {
    ready,
    state,
    plan,
    dailyAdLimit: plan?.dailyAdLimit ?? 0,
    unreadCount: state.notifications.filter((n) => !n.read).length,
    ...derived,
    register,
    login,
    logout,
    submitDeposit,
    completeAd,
    requestWithdrawal,
    markNotificationsRead,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function usePlatform() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
