/**
 * Custom Footer Extension
 * Line 1:  model |  dir |  branch |  worktree    [bar] pct%  ◐ thinking
 * Line 2: token stats (like default footer)
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "child_process";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return (count / 1000).toFixed(1) + "k";
  if (count < 1000000) return Math.round(count / 1000) + "k";
  if (count < 10000000) return (count / 1000000).toFixed(1) + "M";
  return Math.round(count / 1000000) + "M";
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          // ANSI helpers
          const reset = "\x1b[0m";
          const mint = (s: string) => "\x1b[38;2;110;180;165m" + s + reset;
          const green = (s: string) => "\x1b[38;2;120;165;110m" + s + reset;
          const pink = (s: string) => "\x1b[38;2;190;120;145m" + s + reset;
          const purple = (s: string) => "\x1b[38;2;200;165;90m" + s + reset;
          const slate = (s: string) => "\x1b[38;2;120;135;160m" + s + reset;

          // Nerd Font icons
          const iconModel = "\uee0d ";
          const iconDir = "\uf4d3 ";
          const iconBranch = "\uf126";
          const iconWorktree = "\uf0405";
          const iconContext = "\uf2db";

          // Data
          const model = ctx.model?.id || "no-model";
          const branch = footerData.getGitBranch();
          const cwd = process.cwd().split("/").pop() || process.cwd();

          // Git worktree
          let worktree: string | null = null;
          try {
            const result = execSync("git worktree list --porcelain", {
              cwd: process.cwd(),
              encoding: "utf8",
              stdio: ["pipe", "pipe", "pipe"],
            });
            const worktrees = result.trim().split("\n\n").filter(Boolean);
            if (worktrees.length > 1) {
              const currentPath = process.cwd();
              for (const wt of worktrees) {
                const lines = wt.split("\n");
                const pathLine = lines.find((l) => l.startsWith("worktree "));
                const branchLine = lines.find((l) => l.startsWith("branch "));
                if (
                  pathLine &&
                  pathLine.replace("worktree ", "") === currentPath
                ) {
                  if (branchLine)
                    worktree = branchLine.replace("branch refs/heads/", "");
                  break;
                }
              }
            }
          } catch {
            /* not a git repo */
          }

          // Thinking level
          const sessionContext = ctx.sessionManager.buildSessionContext();
          const thinkingLevel = sessionContext.thinkingLevel;

          // Token usage (all entries for cumulative stats)
          let totalInput = 0,
            totalOutput = 0,
            totalCacheRead = 0,
            totalCacheWrite = 0,
            totalCost = 0;
          for (const e of ctx.sessionManager.getEntries()) {
            if (e.type === "message" && e.message.role === "assistant") {
              const m = e.message as AssistantMessage;
              totalInput += m.usage.input;
              totalOutput += m.usage.output;
              totalCacheRead += m.usage.cacheRead;
              totalCacheWrite += m.usage.cacheWrite;
              totalCost += m.usage.cost.total;
            }
          }

          // Context usage
          const contextUsage = ctx.getContextUsage();
          const contextWindow =
            contextUsage?.contextWindow ?? ctx.model?.contextWindow ?? 0;
          const contextPctVal =
            contextUsage?.percent ??
            (contextWindow > 0
              ? ((totalInput + totalOutput) / contextWindow) * 100
              : 0);
          const contextPct =
            contextUsage?.percent != null ? contextPctVal.toFixed(1) : "?";

          // ── LINE 1 ──────────────────────────────────────────────────────────

          // Context progress bar
          let contextBar = "";
          if (contextWindow > 0) {
            const pct = Math.min(1, contextPctVal / 100);
            const barWidth = 12;
            const filled = Math.round(pct * barWidth);
            const bar = "━".repeat(filled) + "─".repeat(barWidth - filled);
            const barColor =
              pct >= 0.9
                ? (s: string) => "\x1b[38;2;190;120;145m" + s + reset
                : pct >= 0.7
                  ? (s: string) => "\x1b[38;2;155;120;190m" + s + reset
                  : (s: string) => "\x1b[38;2;100;175;175m" + s + reset;
            contextBar =
              slate(iconContext + " [") +
              barColor(bar) +
              slate("] " + Math.round(contextPctVal) + "%");
          }

          // Thinking display
          const thinkingColors: Record<string, string> = {
            off: "dim",
            minimal: "thinkingMinimal",
            low: "thinkingLow",
            medium: "thinkingMedium",
            high: "thinkingHigh",
            xhigh: "thinkingXhigh",
          };
          const thinkingStr =
            thinkingLevel !== "off"
              ? theme.fg(
                  thinkingColors[thinkingLevel] || "dim",
                  "◐ " + thinkingLevel,
                )
              : "";

          const leftParts = [
            mint(" " + iconModel + " " + model),
            green(iconDir + " " + cwd),
            branch ? pink(iconBranch + " " + branch) : "",
            worktree ? purple(iconWorktree + " " + worktree) : "",
          ].filter(Boolean);

          const sep = theme.fg("dim", " | ");
          const line1Left = leftParts.join(sep);
          const line1Right = [contextBar, thinkingStr]
            .filter(Boolean)
            .join(theme.fg("dim", "  "));
          const pad1 = " ".repeat(
            Math.max(
              1,
              width - visibleWidth(line1Left) - visibleWidth(line1Right),
            ),
          );
          const line1 = truncateToWidth(line1Left + pad1 + line1Right, width);

          // ── LINE 2: token stats (like default footer) ───────────────────────
          const statsParts: string[] = [];
          if (totalInput) statsParts.push("↑" + formatTokens(totalInput));
          if (totalOutput) statsParts.push("↓" + formatTokens(totalOutput));
          if (totalCacheRead)
            statsParts.push("R" + formatTokens(totalCacheRead));
          if (totalCacheWrite)
            statsParts.push("W" + formatTokens(totalCacheWrite));
          if (totalCost) statsParts.push("$" + totalCost.toFixed(3));

          // Context % with color
          const contextDisplay =
            contextPct === "?"
              ? "?/" + formatTokens(contextWindow)
              : contextPct + "%/" + formatTokens(contextWindow);
          const contextColored =
            contextPctVal > 90
              ? theme.fg("error", contextDisplay)
              : contextPctVal > 70
                ? theme.fg("warning", contextDisplay)
                : contextDisplay;
          statsParts.push(contextColored);

          const statsStr = statsParts.join(" ");
          const pad2 = " ".repeat(Math.max(0, width - visibleWidth(statsStr)));
          // dim the whole line (apply dim per segment so color codes inside still work)
          const line2 = theme.fg("dim", pad2 + statsStr);

          return [line1, truncateToWidth(line2, width)];
        },
      };
    });
  });
}
