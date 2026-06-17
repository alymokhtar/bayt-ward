const TELEGRAM_API_BASE = "https://api.telegram.org";

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return null;
  }

  return { token, chatId };
}

export async function sendTelegramMessage(message: string): Promise<void> {
  try {
    const config = getTelegramConfig();
    if (!config || !message.trim()) return;

    const response = await fetch(
      `${TELEGRAM_API_BASE}/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Telegram notification failed", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
    }
  } catch (error) {
    console.error("Telegram notification error", error);
  }
}
