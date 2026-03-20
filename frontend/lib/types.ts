export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "game_win"
  | "game_lost"
  | "game_fee"
  | "referral_reward"
  | "referral_commission"
  | "welcome_bonus"
  | "bonus";

export type TransactionStatus =
  | "pending"
  | "completed"
  | "approved"
  | "failed"
  | "rejected";

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: string | number;
  status: TransactionStatus;
  description: string | null;
  createdAt: string;
  user?: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

export type WithdrawalStatus = "pending" | "approved" | "rejected";

export type Withdrawal = {
  id: string;
  amount: string | number;
  phone: string;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  createdAt: string;
};

export type WalletData = {
  balance: number;
  bonus: number;
  currency: string;
};

export type WithdrawalEligibility = {
  eligible: boolean;
  balance: number;
  minWithdrawalAmount: number;
  minAccountLeft: number;
  minDepositRequired: number;
  gamesRequired: number;
  gamesPlayed: number;
  totalDeposit: number;
  hasPending: boolean;
};

export type AdminUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: "USER" | "ADMIN" | "AGENT";
  balance: string;
  createdAt: string;
};

export type AdminUserDetail = AdminUser & {
  invitees: {
    id: string;
    username: string | null;
    createdAt: string;
  }[];
  transactions: {
    id: string;
    type: string;
    amount: string;
    createdAt: string;
  }[];
};

export type Payment = {
  id: string;
  userId: string;
  username: string;
  firstName: string;
  amount: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  // compatibility with old UI fields
  transaction_number?: string;
  phonenumber?: string;
  source?: string;
  datetime?: string;
};

export type AdminWithdrawal = {
  id: string;
  userId: string;
  username: string;
  firstName: string;
  amount: string;
  phone: string;
  status: WithdrawalStatus;
  rejectionReason: string | null;
  createdAt: string;
  userBalance?: string;
};

export type Room = {
  id: string;
  name: string;
  description: string | null;
  boardPriceCents: number;
  price: string;
  color: string;
  icon: string | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  botAllowed: boolean | number;
  isLive: boolean;
};
