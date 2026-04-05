// "use client";

// import { MobileHeader } from "@/components/mobile-header";
// import { BalanceCard } from "@/components/balance-card";
// import { GameCard } from "@/components/game-card";
// import { Users, LayoutGrid, Zap } from "lucide-react";
// import InviteModal from "@/components/referral/InviteModal";
// import { useEffect, useState } from "react";

// export default function GameRooms() {
//   const [rooms, setRooms] = useState<any[]>([]);
//   const [isFetching, setIsFetching] = useState(true);
//   const [wallet, setWallet] = useState<{ balance: number } | null>(null);
//   const [isFetchingWallet, setIsFetchingWallet] = useState(true);
//   const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

//   const fetchRooms = async () => {
//     try {
//       setIsFetching(true);
//       await fetch("/rooms", {
//         headers: {},
//       });
//     } catch (error) {
//     } finally {
//       setIsFetching(true);
//     }
//   };

//   const fetchingWallet = async () => {
//     try {
//       setIsFetchingWallet(true);
//       await fetch("/rooms", {
//         headers: {},
//       });
//     } catch (error) {
//     } finally {
//       setIsFetchingWallet(true);
//     }
//   };

//   return (
//     <div className="bg-background min-h-svh h-screen max-h-screen overflow-y-auto custom-scrollbar transition-colors duration-500">
//       {/* Dynamic Patterned Background */}
//       <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none select-none">
//         <div
//           className="absolute inset-0"
//           style={{
//             backgroundImage: `radial-gradient(circle at 2px 2px, var(--foreground) 1px, transparent 0)`,
//             backgroundSize: "24px 24px",
//           }}
//         />
//         <div className="text-foreground text-[10vw] font-black break-all whitespace-pre-wrap leading-tight p-4 mix-blend-overlay">
//           {Array.from({ length: 120 }).map((_, idx) => (
//             <span key={idx} className="opacity-10 mr-4">
//               {t("backgroundWord")}
//             </span>
//           ))}
//         </div>
//       </div>

//       <div className="relative z-10 max-w-[430px] mx-auto flex flex-col pb-24">
//         <MobileHeader refetch={fetchRooms} />

//         <BalanceCard />
//         <div className="px-4 hidden mt-4">
//           <button className="w-full bg-primary/10 border-primary/20 hover:bg-primary/20 transition-all border py-2.5 rounded-2xl text-primary font-black tracking-widest  shadow-xl shadow-primary/5 active:scale-95 group">
//             <span className="flex items-center justify-center gap-2">
//               <span className="text-lg"></span> {t("instructions")}
//             </span>
//           </button>
//         </div>

//         <button
//           className="flex justify-center  border border-green-600 px-4 mx-4 py-2 rounded-[8px] items-center gap-3 mt-6 text-muted-foreground hover:text-primary transition-colors text-xs font-black uppercase tracking-widest active:scale-95"
//           onClick={() => setIsInviteModalOpen(true)}
//         >
//           <Users size={16} className="text-primary" />
//           <span>{t("invite")}</span>
//         </button>

//         {/* Game Grid Container */}
//         <div className="px-4 mt-8 flex items-center justify-between">
//           <h2 className="text-sm font-black capitalize tracking-[0.2em] text-foreground/40 flex items-center gap-2">
//             <Zap size={14} className="text-primary" /> {t("availableRooms")}
//           </h2>
//           <span className="h-px flex-1 bg-linear-to-r from-primary/20 to-transparent ml-4" />
//         </div>

//         <div className="grid grid-cols-2 gap-4 p-4 mt-2">
//           {isFetching ? (
//             Array.from({ length: 6 }).map((_, idx) => (
//               <div
//                 key={idx}
//                 className="h-40 bg-muted animate-pulse rounded-2xl border border-white/5"
//               />
//             ))
//           ) : rooms?.length === 0 ? (
//             <div className="col-span-2 py-20 text-center flex flex-col items-center gap-4">
//               <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
//                 <LayoutGrid className="text-primary/40" />
//               </div>
//               <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">
//                 {t("empty")}
//               </p>
//             </div>
//           ) : (
//             rooms?.map((room, idx) => (
//               <>
//                 <GameCard
//                   key={room.id}
//                   name={room.name}
//                   price={room.price}
//                   icon={room.icon || "🎉"}
//                   color={room.color || "bg-green-500"}
//                   id={room.id}
//                   canAfford={Number(room.price) <= Number(wallet?.balance)}
//                 />
//               </>
//             ))
//           )}
//         </div>

//         {/* Extra Bottom Padding for Nav */}
//         <div className="h-4" />
//       </div>

//       <InviteModal
//         isOpen={isInviteModalOpen}
//         onClose={() => setIsInviteModalOpen(false)}
//       />
//     </div>
//   );
// }
