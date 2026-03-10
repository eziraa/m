type LogLevel = "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, message: string, meta?: LogMeta) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.log(JSON.stringify(payload));
}

export const logger = {
  info(message: string, meta?: LogMeta) {
    emit("info", message, meta);
  },
  warn(message: string, meta?: LogMeta) {
    emit("warn", message, meta);
  },
  error(message: string, meta?: LogMeta) {
    emit("error", message, meta);
  },
};
