export type HomeRoom = {
  roomId: string;
  sessionId: string | null;
  sessionStatus: string;
  codeName: string;
  title: string;
  description: string | null;
  priceCents: number;
  priceLabel: string;
  ctaLabel: string;
  emoji: string;
  style: {
    gradientFrom: string;
    gradientTo: string;
    accent: string;
  };
};

export type HomeSnapshot = {
  version: string;
  generatedAt: string;
  home: {
    ui: {
      appName: string;
      topActions: Array<{
        key: string;
        label: string;
        icon: string;
        variant: string;
      }>;
      balanceCard: {
        title: string;
        bonusTitle: string;
        brandWatermark: string;
      };
      inviteCta: { icon: string; label: string };
      section: { roomsTitle: string };
      tabs: Array<{
        key: string;
        label: string;
        icon: string;
        active: boolean;
      }>;
    };
    user: {
      displayName: string;
      greetingTitle: string;
      greetingSubtitle: string;
    };
    wallet: {
      currency: string;
      balanceCents: number;
      balanceLabel: string;
      bonusCents: number;
      bonusLabel: string;
    };
    actions: {
      showDeposit: boolean;
      showInvite: boolean;
      inviteLabel: string;
      inviteEnabled: boolean;
    };
    rooms: HomeRoom[];
  };
};
