import { Router } from "express";
import { z } from "zod";

import { env } from "../config/env.js";
import { loginLocalDev, signupLocalDev } from "../auth/localDevAuth.js";
import { loginWithTelegram } from "../auth/loginWithTelegram.js";
import { verifyTelegramInitData } from "../auth/telegramInitData.js";

const verifyInitDataSchema = z.object({
  initData: z.string().min(1),
  startParam: z.string().max(64).optional(),
});

const localSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  username: z.string().max(80).optional(),
  referralCode: z.string().max(64).optional(),
});

const localLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const router = Router();

router.post("/auth/telegram/verify-init-data", async (req, res) => {
  const parsed = verifyInitDataSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const verified = verifyTelegramInitData(parsed.data.initData);
    const result = await loginWithTelegram(verified, {
      startParam: parsed.data.startParam,
    });
    res.status(200).json({
      ok: true,
      token: result.token,
      profile: result.profile,
      role: result.role,
      agentId: result.agentId,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "auth_failed";
    const status =
      reason.includes("hash") ||
      reason.includes("init_data") ||
      reason.includes("auth_date") ||
      reason.includes("user")
        ? 401
        : 500;
    res.status(status).json({ error: reason });
  }
});

router.post("/auth/local/signup", async (req, res) => {
  if (!env.LOCAL_DEV_AUTH_ENABLED) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const parsed = localSignupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const result = await signupLocalDev(parsed.data);
    res.status(201).json({ ok: true, ...result });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "local_signup_failed";
    const status = reason.includes("already_registered") ? 409 : 500;
    res.status(status).json({ error: reason });
  }
});

router.post("/auth/local/login", async (req, res) => {
  if (!env.LOCAL_DEV_AUTH_ENABLED) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const parsed = localLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_request" });
    return;
  }

  try {
    const result = await loginLocalDev(parsed.data);
    res.status(200).json({ ok: true, ...result });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "local_login_failed";
    const status =
      reason.includes("not_found") || reason.includes("invalid_credentials")
        ? 401
        : reason.includes("inactive")
          ? 403
          : 500;
    res.status(status).json({ error: reason });
  }
});

export default router;
