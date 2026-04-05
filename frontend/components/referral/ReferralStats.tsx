"use client";

import { Users, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReferralStats() {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden hover:bg-white/10 transition-colors">
        <CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
          <div className="p-2 bg-green-500/20 rounded-full text-green-400">
            <Users size={20} />
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
              Invitees
            </p>
            <p className="text-2xl font-bold text-white tracking-tight">{2}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10 backdrop-blur-md rounded-2xl overflow-hidden hover:bg-white/10 transition-colors">
        <CardContent className="p-4 flex flex-col items-center justify-center space-y-2">
          <div className="p-2 bg-amber-500/20 rounded-full text-amber-400">
            <Award size={20} />
          </div>
          <div className="text-center">
            <p className="text-xs text-white/50 uppercase tracking-wider font-semibold">
              Earned
            </p>
            <p className="text-2xl font-bold text-amber-400 tracking-tight">
              {200}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
