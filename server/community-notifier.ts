/**
 * Community Webhook & Notification Dispatcher for Nimiq Arena
 *
 * Broadcasts match creation and victory events to Discord and Telegram
 * when environment variables (DISCORD_WEBHOOK_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID) are set.
 * Designed to be non-blocking and fault-tolerant.
 */

export interface MatchCreatedPayload {
  matchId: string;
  joinCode: string;
  gameTitle: string;
  stakeNim: number;
  creatorName?: string;
}

export interface MatchVictoryPayload {
  matchId: string;
  gameTitle: string;
  totalPotNim: number;
  winnerName: string;
  winnerNim: number;
  payoutTxHash?: string;
}

/**
 * Dispatch match created event to Discord and Telegram communities
 */
export async function broadcastMatchCreated(payload: MatchCreatedPayload): Promise<void> {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL?.trim();
  const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const tgChatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!discordWebhook && (!tgToken || !tgChatId)) {
    return; // No webhook configured
  }

  // 1. Dispatch to Discord
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: `⚔️ New Match Open: ${payload.gameTitle}`,
              description: `A new wagered challenge has been created on Nimiq Arena! Join now to battle for the 90% prize pool.`,
              color: 0xf59e0b, // Gold/Orange
              fields: [
                { name: "Game", value: payload.gameTitle, inline: true },
                { name: "Stake", value: `${payload.stakeNim} NIM`, inline: true },
                { name: "Join Code", value: `\`${payload.joinCode}\``, inline: true },
              ],
              footer: { text: "Nimiq Arena • Micro-stakes Web3 Gaming" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch(err => console.warn("[CommunityNotifier] Discord webhook error:", err));
    } catch (err) {
      console.warn("[CommunityNotifier] Failed to broadcast match creation to Discord:", err);
    }
  }

  // 2. Dispatch to Telegram
  if (tgToken && tgChatId) {
    try {
      const text = `⚔️ *New Match Open on Nimiq Arena!*\n\n🎮 *Game:* ${payload.gameTitle}\n💰 *Stake:* ${payload.stakeNim} NIM\n🔑 *Join Code:* \`${payload.joinCode}\`\n\n_Enter the arena to battle and win!_`;
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId,
          text,
          parse_mode: "Markdown",
        }),
      }).catch(err => console.warn("[CommunityNotifier] Telegram bot error:", err));
    } catch (err) {
      console.warn("[CommunityNotifier] Failed to broadcast match creation to Telegram:", err);
    }
  }
}

/**
 * Dispatch match victory event to Discord and Telegram communities
 */
export async function broadcastMatchVictory(payload: MatchVictoryPayload): Promise<void> {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL?.trim();
  const tgToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const tgChatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!discordWebhook && (!tgToken || !tgChatId)) {
    return;
  }

  // 1. Dispatch to Discord
  if (discordWebhook) {
    try {
      await fetch(discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: `🏆 Arena Victory Settled!`,
              description: `**${payload.winnerName}** claimed the victory prize in **${payload.gameTitle}**!`,
              color: 0x22c55e, // Emerald Green
              fields: [
                { name: "Winner", value: payload.winnerName, inline: true },
                { name: "Payout (90%)", value: `${payload.winnerNim} NIM`, inline: true },
                { name: "Total Pot", value: `${payload.totalPotNim} NIM`, inline: true },
                ...(payload.payoutTxHash
                  ? [{ name: "Blockchain Tx", value: `\`${payload.payoutTxHash.slice(0, 16)}...\`` }]
                  : []),
              ],
              footer: { text: "Nimiq Arena • Instant On-Chain Settlement" },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      }).catch(err => console.warn("[CommunityNotifier] Discord webhook error:", err));
    } catch (err) {
      console.warn("[CommunityNotifier] Failed to broadcast victory to Discord:", err);
    }
  }

  // 2. Dispatch to Telegram
  if (tgToken && tgChatId) {
    try {
      const text = `🏆 *Arena Victory Settled!*\n\n🎮 *Game:* ${payload.gameTitle}\n👑 *Winner:* ${payload.winnerName}\n💰 *Payout:* ${payload.winnerNim} NIM (90% of ${payload.totalPotNim} NIM pot)\n${
        payload.payoutTxHash ? `🔗 *Tx:* \`${payload.payoutTxHash}\`` : ""
      }`;
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: tgChatId,
          text,
          parse_mode: "Markdown",
        }),
      }).catch(err => console.warn("[CommunityNotifier] Telegram bot error:", err));
    } catch (err) {
      console.warn("[CommunityNotifier] Failed to broadcast victory to Telegram:", err);
    }
  }
}
