"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGetGameConfigQuery, useUpdateGameConfigMutation } from "@/lib/api";
import type { GameConfig } from "@/lib/api";

// ─── Reusable Header Component ───
function AdminHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="w-full text-center mb-6">
      <motion.h1
        className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text drop-shadow-lg pop-in"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        {children}
      </motion.h1>
    </header>
  );
}

// ─── Reusable Button Component ───
import type { HTMLMotionProps } from "framer-motion";
import { Info, PencilIcon, Save } from "lucide-react";

function ActionButton({
  children,
  className,
  ...props
}: HTMLMotionProps<"button"> & { className?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.04 }}
      className={`px-4 py-1 rounded-lg font-semibold bg-linear-to-r from-primary to-accent text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all duration-200 ${className || ""}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ─── Confetti Animation ───
function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {[...Array(24)].map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${1.8 + Math.random()}s`,
            background: `linear-gradient(135deg, var(--primary), var(--accent))`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Setting Card ───
function SettingCard({
  config,
  editing,
  editValue,
  onEdit,
  onChange,
  onSave,
  onCancel,
  loading,
  error,
  success,
}: {
  config: GameConfig;
  editing: boolean;
  editValue: string;
  onEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  error: string;
  success: boolean;
}) {
  return (
    <motion.div
      className="relative mb-6 p-4 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-xl flex flex-col pop-in"
      whileHover={{ scale: 1.02, boxShadow: "0 4px 32px 0 var(--accent)" }}
      transition={{ duration: 0.2 }}
    >
      {/* Animated glow for success */}
      <AnimatePresence>
        {success && (
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-success/30 to-accent/20 pointer-events-none animate-pulse-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          />
        )}
      </AnimatePresence>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-lg md:text-xl text-card-foreground flex items-center">
          {config.label}
          {config.description && (
            <span
              className="ml-2 text-sm text-info cursor-pointer"
              title={config.description}
              tabIndex={0}
              aria-label={config.description}
            >
              <motion.span
                whileHover={{ scale: 1.2, rotate: 10 }}
                className="inline-block"
              >
                <Info size={16} />
              </motion.span>
            </span>
          )}
        </span>
        {editing ? (
          <motion.input
            type="number"
            min="0"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            className="border border-input rounded-[8px] px-2 py-1 w-24 text-right bg-background text-primary font-mono focus:ring-2 focus:ring-accent focus:outline-none transition-all duration-200"
            autoFocus
            whileFocus={{ scale: 1.05 }}
          />
        ) : (
          <span className="text-xl md:text-2xl font-mono text-primary float-anim">
            {config.value}
          </span>
        )}
      </div>
      {/* Action Buttons */}
      <div className="flex mt-3 gap-2">
        {editing ? (
          <>
            <ActionButton
              disabled={loading}
              onClick={onSave}
              className="flex items-center"
            >
              <Save className="w-4 h-4 mr-1" /> Save
            </ActionButton>
            <ActionButton
              onClick={onCancel}
              className=" bg-linear-to-tl from-muted! to-muted! p-2 rounded-sm text-muted-foreground"
            >
              <span> ↩</span> Cancel
            </ActionButton>
            {error && <span className="text-destructive ml-2">{error}</span>}
          </>
        ) : (
          <ActionButton onClick={onEdit}>
            <span className="ribbon-wave flex items-center">
              {" "}
              <PencilIcon className="w-4 h-4 mr-1" /> Edit
            </span>
          </ActionButton>
        )}
      </div>
    </motion.div>
  );
}

export default function GameConfigAdmin() {
  const { data, isLoading, refetch } = useGetGameConfigQuery();
  const [updateGameConfig, { isLoading: updateLoading }] =
    useUpdateGameConfigMutation();
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [error, setError] = useState("");
  const [successKey, setSuccessKey] = useState<string | null>(null);

  // Handle edit start
  const handleEdit = (key: string, value: string) => {
    setEditing(key);
    setEditValue(value);
    setError("");
    setSuccessKey(null);
  };

  // Handle save
  const handleSave = async (key: string) => {
    if (Number(editValue) < 0) {
      setError("Value must be non-negative");
      return;
    }
    try {
      await updateGameConfig({ key, data: { value: editValue } }).unwrap();
      setEditing(null);
      setSuccessKey(key);
      refetch();
      setTimeout(() => setSuccessKey(null), 1200); // Confetti duration
    } catch (e) {
      setError("Failed to save");
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditing(null);
    setError("");
    setSuccessKey(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <span className="animate-spin text-2xl">⏳</span>
      </div>
    );
  }
  const configs = data?.configs || [];
  return (
    <div className="min-h-screen bg-background bg-number-pattern flex flex-col items-center justify-center px-2 py-4">
      {/* Animated Confetti for Success */}
      <Confetti show={!!successKey} />
      <div className="w-full max-w-md bg-card/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-border pop-in">
        <AdminHeader>Game Settings</AdminHeader>
        <div className="space-y-4">
          {configs.map((config: GameConfig) => (
            <SettingCard
              key={config.key}
              config={config}
              editing={editing === config.key}
              editValue={editing === config.key ? editValue : config.value}
              onEdit={() => handleEdit(config.key, config.value)}
              onChange={setEditValue}
              onSave={() => handleSave(config.key)}
              onCancel={handleCancel}
              loading={updateLoading}
              error={editing === config.key ? error : ""}
              success={successKey === config.key}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
