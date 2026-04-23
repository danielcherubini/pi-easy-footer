/**
 * Custom Footer Extension — single line
 * model | dir | branch [+status] | ↑k ↓k Rk Wk $0.000 18% | ◐[stretch bar]%
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { getGitStatus, getWorktreeBranch } from "./utils/git.js";
import { getContextWindowInfo, getTokenUsageStats } from "./utils/stats.js";
import { formatContextBar, formatGitStatusIndicators, formatThinkingIndicator, footerIcons, formatTokenCount } from "./utils/formatting.js";

export default function (pi: ExtensionAPI) {
  pi.on("session_start", (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsubscribe,
        invalidate() {},
        render(width: number): string[] {
          try {
            // Theme color helper
            const colorize = (token: string, s: string) => theme.fg(token, s);

            // Data
            const activeModel = ctx.model?.id || "no-model";
            const currentBranch = footerData.getGitBranch();
            const currentDirectory = process.cwd().split("/").pop() || process.cwd();

            // Git
            const gitStatus = getGitStatus();
            const worktreeBranch = getWorktreeBranch();

            // Thinking level
            const sessionContext = ctx.sessionManager.buildSessionContext();
            const thinkingLevel = sessionContext.thinkingLevel;

            // Stats
            const { totalInput, totalOutput, totalCacheRead, totalCacheWrite, totalCost } = getTokenUsageStats(ctx);
            const { percent: contextPercent, percentValue: contextPercentValue, windowSize: contextWindowSize } = getContextWindowInfo(ctx);

            // ── Single-line footer ─────────────────────────────────────────────

            // Thinking display
            const thinkingIndicatorStr = formatThinkingIndicator(thinkingLevel, colorize);

            // Git status indicators
            const gitStatusStr = formatGitStatusIndicators(gitStatus, colorize);

            // Left section: dir | branch [+status] | model | thinking
            const leftSections = [
              colorize("syntaxFunction", " " + footerIcons.directory + currentDirectory),
              currentBranch ? colorize("success", footerIcons.branch + " " + currentBranch + (gitStatusStr ? " " + gitStatusStr : "")) : "",
              colorize("syntaxType", footerIcons.model + " " + activeModel),
              thinkingIndicatorStr,
              worktreeBranch ? colorize("syntaxNumber", footerIcons.worktree + " " + worktreeBranch) : "",
            ].filter(Boolean);

            const separator = theme.fg("dim", " | ");
            const leftSectionStr = leftSections.join(separator);

            // Token stats with context percentage
            const statsParts: string[] = [];
            if (totalInput) statsParts.push("↑" + formatTokenCount(totalInput));
            if (totalOutput) statsParts.push("↓" + formatTokenCount(totalOutput));
            if (totalCacheRead) statsParts.push("R" + formatTokenCount(totalCacheRead));
            if (totalCacheWrite) statsParts.push("W" + formatTokenCount(totalCacheWrite));
            if (totalCost) statsParts.push("$" + totalCost.toFixed(2));

            const contextUsed = totalInput + totalOutput;
            const contextDisplay =
              contextPercent === "?"
                ? "?"
                : formatTokenCount(contextUsed) + "/" + formatTokenCount(contextWindowSize);
            const contextColored =
              contextPercentValue > 90
                ? theme.fg("error", contextDisplay)
                : contextPercentValue > 70
                  ? theme.fg("warning", contextDisplay)
                  : contextDisplay;
            statsParts.push(contextColored);

            const rawStatsSectionStr = statsParts.join(" ");
            const statsSectionStr = theme.fg("dim", rawStatsSectionStr);

            // Separator between left and right sections
            const sectionSeparator = theme.fg("dim", " | ");

            // Calculate available space for the context progress bar (after stats)
            const availableBarSpace = Math.max(
              2,
              width - visibleWidth(leftSectionStr) - 1 - visibleWidth(sectionSeparator) - visibleWidth(statsSectionStr) - 9,
            );

            // Context progress bar (expands to fill remaining space)
            const contextBarStr = formatContextBar(colorize, contextPercentValue, availableBarSpace);

            // Assemble: left | stats | bar
            const rightSections: string[] = [];
            if (statsSectionStr) rightSections.push(statsSectionStr);
            if (contextBarStr) rightSections.push(contextBarStr);
            const rightSectionStr = rightSections.join(theme.fg("dim", " | "));

            return [truncateToWidth(leftSectionStr + sectionSeparator + rightSectionStr, width)];
          } catch {
            // Context is stale (session replaced/reloaded) — render nothing
            return [];
          }
        },
      };
    });
  });
}
