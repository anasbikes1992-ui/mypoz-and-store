/** Extract customer text from WhatsApp Cloud API message objects. */
export function extractInboundText(msg: {
  type?: string;
  text?: { body?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}): string | null {
  if (msg.type === "text" && msg.text?.body?.trim()) {
    return msg.text.body.trim();
  }
  if (msg.type === "button") {
    const t = msg.button?.text?.trim() || msg.button?.payload?.trim();
    if (t) return t;
  }
  if (msg.type === "interactive" && msg.interactive) {
    const br = msg.interactive.button_reply;
    if (br?.id?.trim()) return br.id.trim();
    if (br?.title?.trim()) return br.title.trim();
    const lr = msg.interactive.list_reply;
    if (lr?.id?.trim()) return lr.id.trim();
    if (lr?.title?.trim()) return lr.title.trim();
  }
  return null;
}
