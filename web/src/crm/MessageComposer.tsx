import { useEffect, useState } from "react";
import { crmApi, twilioApi } from "../api";
import { RESOURCES } from "./schema";

type Contact = { id: string; fullName: string; phone: string };

/** Panneau d'envoi SMS/WhatsApp et de clic-pour-appeler, au-dessus du journal des messages. */
export function MessageComposer({ onSent }: { onSent: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mode, setMode] = useState<"message" | "call">("message");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("whatsapp");
  const [contactId, setContactId] = useState("");
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    crmApi
      .list("contacts")
      .then((res) => setContacts((res[RESOURCES.contacts.listKey] as Contact[]) ?? []))
      .catch(() => setContacts([]));
  }, []);

  function pickContact(id: string) {
    setContactId(id);
    const contact = contacts.find((c) => c.id === id);
    if (contact?.phone) setTo(contact.phone);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    if (!to.trim()) {
      setError("Destinataire requis");
      return;
    }
    setSending(true);
    try {
      if (mode === "message") {
        if (!body.trim()) {
          setError("Message requis");
          setSending(false);
          return;
        }
        await twilioApi.sendMessage({ channel, to: to.trim(), body: body.trim(), contactId: contactId || undefined });
        setStatus("Message envoyé.");
        setBody("");
      } else {
        await twilioApi.call({ to: to.trim(), contactId: contactId || undefined });
        setStatus("Appel lancé — votre téléphone va sonner.");
      }
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l'envoi");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="glass-card">
      <div className="section-title">Envoyer un message / appeler</div>
      {error && <div className="error-banner">{error}</div>}
      {status && <div className="status-banner">{status}</div>}
      <form onSubmit={handleSend}>
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button type="button" className={`tab-button ${mode === "message" ? "active" : ""}`} onClick={() => setMode("message")}>
            Message
          </button>
          <button type="button" className={`tab-button ${mode === "call" ? "active" : ""}`} onClick={() => setMode("call")}>
            Clic-pour-appeler
          </button>
        </div>

        <div className="field">
          <label htmlFor="composer-contact">Contact (optionnel)</label>
          <select id="composer-contact" value={contactId} onChange={(e) => pickContact(e.target.value)}>
            <option value="">— Saisir un numéro manuellement —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} {c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="composer-to">Numéro / destinataire</label>
          <input id="composer-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="+687..." required />
        </div>

        {mode === "message" && (
          <>
            <div className="field">
              <label htmlFor="composer-channel">Canal</label>
              <select id="composer-channel" value={channel} onChange={(e) => setChannel(e.target.value as "sms" | "whatsapp")}>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="composer-body">Message</label>
              <textarea id="composer-body" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
          </>
        )}

        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? "Envoi..." : mode === "message" ? "Envoyer" : "Appeler"}
        </button>
      </form>
    </div>
  );
}
