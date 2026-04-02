import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { basename } from "node:path";

type BannerColor = "text" | "accent" | "muted" | "dim" | "success" | "warning" | "error" | "mdLink" | "syntaxType";

const ALLOWED_COLORS: readonly BannerColor[] = [
  "text",
  "accent",
  "muted",
  "dim",
  "success",
  "warning",
  "error",
  "mdLink",
  "syntaxType",
] as const;

function parseColor(input: string | undefined, fallback: BannerColor): BannerColor {
  if (!input) return fallback;
  const normalized = input.trim().toLowerCase() as BannerColor;
  return ALLOWED_COLORS.includes(normalized) ? normalized : fallback;
}

const BANNER_CONFIG = {
  emojiOverride: process.env.PI_SESSION_BANNER_EMOJI?.trim(),
  frameColor: parseColor(process.env.PI_SESSION_BANNER_FRAME_COLOR, "accent"),
  titleColor: parseColor(process.env.PI_SESSION_BANNER_TITLE_COLOR, "mdLink"),
};

function normalizeTitle(text: string, maxLen = 64): string {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^[-*#>\s]+/, "")
    .trim();

  if (!cleaned) return "untitled session";
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trimEnd()}…`;
}

function extractUserText(ctx: ExtensionContext): string | undefined {
  const branch = ctx.sessionManager.getBranch();
  for (const entry of branch) {
    if (entry.type !== "message") continue;
    const msg = entry.message;
    if (msg.role !== "user") continue;

    for (const part of msg.content) {
      if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }
  return undefined;
}

function ensureSessionName(pi: ExtensionAPI, ctx: ExtensionContext): void {
  const existing = pi.getSessionName()?.trim();
  if (existing) return;

  const userText = extractUserText(ctx);
  if (!userText) return;

  pi.setSessionName(normalizeTitle(userText));
}

function getSessionTitle(pi: ExtensionAPI, ctx: ExtensionContext): string {
  const explicitName = pi.getSessionName()?.trim();
  if (explicitName) return explicitName;

  const userText = extractUserText(ctx);
  if (userText) return normalizeTitle(userText);

  const sessionFile = ctx.sessionManager.getSessionFile();
  if (sessionFile) return basename(sessionFile);

  return "ephemeral session";
}

function pickEmojiFromTitle(title: string): string {
  const override = BANNER_CONFIG.emojiOverride;
  if (override && override.toLowerCase() !== "auto") return override;

  const t = title.toLowerCase();

  if (/bug|fix|error|issue|debug|crash|fail|broken/.test(t)) return "🐞";
  if (/refactor|cleanup|clean up|restructure|improve/.test(t)) return "🧹";
  if (/test|spec|coverage|qa/.test(t)) return "🧪";
  if (/doc|docs|readme|guide|note|wiki/.test(t)) return "📝";
  if (/release|deploy|ship|publish|prod/.test(t)) return "🚀";
  if (/design|ui|ux|theme|style/.test(t)) return "🎨";
  if (/performance|optimi[sz]e|speed|latency/.test(t)) return "⚡";
  if (/security|auth|permission|token|oauth|encrypt/.test(t)) return "🔐";
  if (/database|db|sql|migration|schema/.test(t)) return "🗄️";
  if (/api|endpoint|server|backend/.test(t)) return "🛠️";
  if (/frontend|client|react|vue|svelte|component/.test(t)) return "🧩";

  return "🧭";
}

function setSessionBanner(pi: ExtensionAPI, ctx: ExtensionContext): void {
  ctx.ui.setWidget("session-banner", (_tui, theme) => ({
    render(width: number): string[] {
      const title = getSessionTitle(pi, ctx);
      const plainLine = "─".repeat(Math.max(0, width));
      const line = theme.fg(BANNER_CONFIG.frameColor, plainLine);
      const divider = theme.fg(BANNER_CONFIG.frameColor, "│");
      const emoji = theme.fg(BANNER_CONFIG.frameColor, pickEmojiFromTitle(title));
      const titleText = theme.fg(BANNER_CONFIG.titleColor, title);
      const middle = ` ${emoji} ${divider} ${titleText}`;
      return [line, middle, line];
    },
    invalidate(): void {},
  }));
}

export default function (pi: ExtensionAPI): void {
  pi.on("session_start", async (_event, ctx) => {
    ensureSessionName(pi, ctx);
    setSessionBanner(pi, ctx);
  });

  pi.on("session_switch", async (_event, ctx) => {
    ensureSessionName(pi, ctx);
    setSessionBanner(pi, ctx);
  });

  pi.on("session_fork", async (_event, ctx) => {
    ensureSessionName(pi, ctx);
    setSessionBanner(pi, ctx);
  });

  pi.on("message_end", async (event, ctx) => {
    if (event.message.role !== "user") return;
    ensureSessionName(pi, ctx);
    setSessionBanner(pi, ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setWidget("session-banner", undefined);
  });
}
