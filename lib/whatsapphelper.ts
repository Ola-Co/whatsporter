//file: app/lib/whatsapphelper.ts
type Button = { id: string; title: string };

interface BaseSend {
  to: string; // recipient WA ID
  phoneNumberId?: string; // optional override
}

interface SendText extends BaseSend {
  body: string;
}

interface SendButtons extends BaseSend {
  body: string;
  buttons: Button[];
}

interface SendFlow extends BaseSend {
  headerText: string;
  bodyText: string;
  flowId: string;
}

function graphUrl(pnid: string, version: string): string {
  return `https://graph.facebook.com/${version}/${pnid}/messages`;
}
function getAccess() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN ?? "";
  const version = process.env.WHATSAPP_GRAPH_VERSION ?? "v21.0";
  const defaultPnId = process.env.WHATSAPP_PHONE_NUMBER_ID ?? "";
  if (!token) throw new Error("Missing WHATSAPP_ACCESS_TOKEN");
  return { token, version, defaultPnId };
}
async function postJson(
  url: string,
  token: string,
  payload: unknown
): Promise<void> {
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`WhatsApp send failed ${r.status}: ${t}`);
  }
}

export async function sendText(p: SendText): Promise<void> {
  const { token, version, defaultPnId } = getAccess();
  const url = graphUrl(p.phoneNumberId ?? defaultPnId, version);
  await postJson(url, token, {
    messaging_product: "whatsapp",
    to: p.to,
    type: "text",
    text: { body: p.body },
  });
}

export async function sendButtons(p: SendButtons): Promise<void> {
  const { token, version, defaultPnId } = getAccess();
  const url = graphUrl(p.phoneNumberId ?? defaultPnId, version);
  await postJson(url, token, {
    messaging_product: "whatsapp",
    to: p.to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: p.body },
      action: {
        buttons: p.buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

export async function sendFlow(p: SendFlow): Promise<void> {
  const { token, version, defaultPnId } = getAccess();
  const url = graphUrl(p.phoneNumberId ?? defaultPnId, version);
  await postJson(url, token, {
    messaging_product: "whatsapp",
    to: p.to,
    type: "interactive",
    interactive: {
      type: "flow",
      header: { type: "text", text: p.headerText },
      body: { text: p.bodyText },
      action: { name: p.flowId, parameters: {} },
    },
  });
}
