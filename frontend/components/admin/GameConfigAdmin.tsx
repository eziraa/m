// "use client";
// import { useState } from "react";
// import { useGetGameConfigQuery, useUpdateGameConfigMutation } from "@/lib/api";
// import type { GameConfig } from "@/lib/api";
// import { PencilIcon, Save, X, CheckCircle2, AlertCircle } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";

// interface SettingCardProps {
//   config: GameConfig;
//   editing: boolean;
//   editValue: string;
//   onEdit: () => void;
//   onChange: (v: string) => void;
//   onSave: () => void;
//   onCancel: () => void;
//   loading: boolean;
//   error: string;
//   success: boolean;
// }

// function SettingCard({
//   config,
//   editing,
//   editValue,
//   onEdit,
//   onChange,
//   onSave,
//   onCancel,
//   loading,
//   error,
//   success,
// }: SettingCardProps) {
//   return (
//     <Card className="border-border bg-card hover:border-primary/20">
//       <CardHeader className="pb-3">
//         <div className="flex items-start justify-between gap-4">
//           <div className="flex-1">
//             <CardTitle className="text-lg text-foreground">
//               {config.label}
//             </CardTitle>
//             {config.description && (
//               <CardDescription className="mt-1 text-muted-foreground">
//                 {config.description}
//               </CardDescription>
//             )}
//           </div>

//           {editing ? (
//             <Input
//               type="number"
//               min="0"
//               value={editValue}
//               onChange={(e) => onChange(e.target.value)}
//               className="w-24 text-right font-mono text-base"
//               autoFocus
//             />
//           ) : (
//             <div className="flex items-center gap-2">
//               <div className="text-3xl font-mono font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg">
//                 {config.value}
//               </div>
//             </div>
//           )}
//         </div>
//       </CardHeader>

//       <CardContent className="space-y-3">
//         <div className="flex flex-wrap items-center gap-2">
//           {editing ? (
//             <>
//               <Button
//                 size="sm"
//                 onClick={onSave}
//                 disabled={loading}
//                 variant="default"
//                 className="gap-2"
//               >
//                 <Save size={16} />
//                 Save
//               </Button>
//               <Button
//                 size="sm"
//                 onClick={onCancel}
//                 variant="outline"
//                 className="gap-2"
//               >
//                 <X size={16} />
//                 Cancel
//               </Button>
//             </>
//           ) : (
//             <Button
//               size="sm"
//               onClick={onEdit}
//               variant="outline"
//               className="gap-2"
//             >
//               <PencilIcon size={16} />
//               Edit
//             </Button>
//           )}
//         </div>

//         {error && (
//           <div className="flex items-center gap-2 text-destructive text-sm font-medium">
//             <AlertCircle size={16} className="flex-shrink-0" />
//             {error}
//           </div>
//         )}
//         {success && (
//           <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
//             <CheckCircle2 size={16} className="flex-shrink-0" />
//             Saved successfully
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   );
// }

// export default function GameConfigAdmin() {
//   const { data, isLoading, refetch } = useGetGameConfigQuery();
//   const [updateGameConfig, { isLoading: updateLoading }] =
//     useUpdateGameConfigMutation();
//   const [editing, setEditing] = useState<string | null>(null);
//   const [editValue, setEditValue] = useState<string>("");
//   const [error, setError] = useState("");
//   const [successKey, setSuccessKey] = useState<string | null>(null);

//   const handleEdit = (key: string, value: string) => {
//     setEditing(key);
//     setEditValue(value);
//     setError("");
//     setSuccessKey(null);
//   };

//   const handleSave = async (key: string) => {
//     if (Number(editValue) < 0) {
//       setError("Value must be non-negative");
//       return;
//     }
//     try {
//       await updateGameConfig({ key, data: { value: editValue } }).unwrap();
//       setEditing(null);
//       setSuccessKey(key);
//       refetch();
//       setTimeout(() => setSuccessKey(null), 2500);
//     } catch (e) {
//       setError("Failed to save");
//     }
//   };

//   const handleCancel = () => {
//     setEditing(null);
//     setError("");
//     setSuccessKey(null);
//   };

//   if (isLoading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-background">
//         <div className="text-center">
//           <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full border-2 border-muted border-t-primary">
//             <div className="w-6 h-6"></div>
//           </div>
//           <p className="text-muted-foreground font-medium">
//             Loading settings...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const configs = data?.configs || [];

//   return (
//     <div className="min-h-screen bg-background">
//       <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
//         {/* Header */}
//         <div className="mb-10">
//           <h1 className="text-4xl font-bold text-foreground mb-2">
//             Game Settings
//           </h1>
//           <p className="text-muted-foreground text-lg">
//             Configure and manage your bingo game parameters
//           </p>
//           <div className="mt-4 h-1 w-20 bg-primary rounded-full"></div>
//         </div>

//         {/* Settings Grid */}
//         <div className="space-y-4">
//           {configs.map((config) => (
//             <SettingCard
//               key={config.key}
//               config={config}
//               editing={editing === config.key}
//               editValue={editing === config.key ? editValue : config.value}
//               onEdit={() => handleEdit(config.key, config.value)}
//               onChange={setEditValue}
//               onSave={() => handleSave(config.key)}
//               onCancel={handleCancel}
//               loading={updateLoading}
//               error={editing === config.key ? error : ""}
//               success={successKey === config.key}
//             />
//           ))}
//         </div>

//         {/* Empty State */}
//         {configs.length === 0 && (
//           <Card className="border-border">
//             <CardContent className="pt-12 pb-12">
//               <div className="text-center">
//                 <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
//                 <p className="text-muted-foreground text-lg font-medium">
//                   No game settings available
//                 </p>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Footer Info */}
//         <Card className="mt-10 border-primary/20 bg-primary/5">
//           <CardContent className="pt-4">
//             <p className="text-sm text-muted-foreground">
//               <strong className="text-foreground">Note:</strong> All changes are
//               saved immediately and affect active game sessions in real-time.
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }
