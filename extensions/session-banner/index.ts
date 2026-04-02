import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

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

function summarizeTitle(text: string, maxWords = 7, maxLen = 64): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[-*#>\s]+/, "")
    .trim();

  if (!cleaned) return "untitled session";

  let candidate = cleaned
    .split(/[\n.!?]+/)
    .map((s) => s.trim())
    .find(Boolean) ?? cleaned;

  candidate = candidate
    .replace(/^(please\s+)?(can|could|would|will)\s+you\s+/i, "")
    .replace(/^(help\s+me\s+)?(to\s+)?/i, "")
    .replace(/^(i\s+(need|want|am trying)\s+(you\s+)?to\s+)/i, "")
    .replace(/\b(instead of|so that|because|thanks|thank you)\b[\s\S]*$/i, "")
    .replace(/^to\s+/i, "")
    .trim();

  const rawTokens = candidate.match(/[A-Za-z0-9][A-Za-z0-9._/-]*/g) ?? [];
  const stopwords = new Set([
    "a", "an", "and", "the", "this", "that", "these", "those", "for", "from", "with", "without", "into", "onto",
    "in", "on", "at", "by", "of", "to", "is", "are", "be", "been", "being", "it", "its", "as", "or", "if", "then",
    "just", "exactly", "main", "idea", "few", "words", "show", "use", "using", "make", "please", "can", "could", "would",
    "will", "you", "me", "my", "your", "our", "we", "i",
  ]);

  const actionVerbs = new Set([
    "add", "update", "fix", "refactor", "create", "remove", "rename", "improve", "optimize", "document", "test", "implement",
    "build", "generate", "summarize", "capture", "support", "enable", "disable", "show", "hide",
  ]);

  const tokens: string[] = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i];
    const lower = token.toLowerCase();
    const keep = i === 0 || actionVerbs.has(lower) || !stopwords.has(lower) || /[./_-]/.test(token);
    if (!keep) continue;
    tokens.push(token);
    if (tokens.length >= maxWords) break;
  }

  let title = tokens.join(" ").trim();
  if (!title) title = candidate;
  if (!title) title = "untitled session";

  if (title.length <= maxLen) return title;
  return `${title.slice(0, maxLen - 1).trimEnd()}…`;
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

  pi.setSessionName(summarizeTitle(userText));
}

function getSessionTitle(pi: ExtensionAPI, ctx: ExtensionContext): string | undefined {
  const explicitName = pi.getSessionName()?.trim();
  if (explicitName) return explicitName;

  const userText = extractUserText(ctx);
  if (userText) return summarizeTitle(userText);

  return undefined;
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
  const title = getSessionTitle(pi, ctx);
  if (!title) {
    ctx.ui.setWidget("session-banner", undefined);
    return;
  }

  ctx.ui.setWidget("session-banner", (_tui, theme) => ({
    render(width: number): string[] {
      if (width <= 0) return [];

      const plainLine = "─".repeat(width);
      const line = theme.fg(BANNER_CONFIG.frameColor, plainLine);

      const emojiRaw = pickEmojiFromTitle(title);
      const prefixRaw = ` ${emojiRaw} │ `;
      const availableTitleWidth = Math.max(0, width - visibleWidth(prefixRaw));
      const safeTitle = truncateToWidth(title, availableTitleWidth);

      const emoji = theme.fg(BANNER_CONFIG.frameColor, emojiRaw);
      const divider = theme.fg(BANNER_CONFIG.frameColor, "│");
      const titleText = theme.fg(BANNER_CONFIG.titleColor, safeTitle);
      const middle = truncateToWidth(` ${emoji} ${divider} ${titleText}`, width);

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

  pi.on("message_start", async (event, ctx) => {
    if (event.message.role !== "user") return;
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
