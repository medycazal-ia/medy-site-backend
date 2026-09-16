import { useEffect, useState } from "react";
import { crmApi, emailApi, twilioApi } from "../api";
import { RESOURCES } from "./schema";

type Contact = { id: string; fullName: string; phone: string; email: string };

/** Panneau d'envoi SMS/WhatsApp/email et de clic-pour-appeler, au-dessus du journal des messages. */
export function MessageComposer({ onSent }: { onSent: () => void }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [mode, setMode] = useState<"message" | "email" | "call">("message");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("whatsapp");
  const [contactId, setContactId] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
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
    if (!contact) return;
    if (mode === "email" && contact.email) setTo(contact.email);
    if (mode !== "email" && contact.phone) setTo(contact.phone);
  }

  function switchMode(next: "message" | "email" | "call") {
    setMode(next);
    setTo("");
    setContactId("");
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
      } else if (mode === "email") {
        if (!subject.trim() || !body.trim()) {
          setError("Sujet et message requis");
          setSending(false);
          return;
        }
        await emailApi.send({ to: to.trim(), subject: subject.trim(), body: body.trim(), contactId: contactId || undefined });
        setStatus("Email envoyé.");
        setSubject("");
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
      <div className="section-title">Envoyer un message / email / appeler</div>
      {error && <div className="error-banner">{error}</div>}
      {status && <div className="status-banner">{status}</div>}
      <form onSubmit={handleSend}>
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button type="button" className={`tab-button ${mode === "message" ? "active" : ""}`} onClick={() => switchMode("message")}>
            Message
          </button>
          <button type="button" className={`tab-button ${mode === "email" ? "active" : ""}`} onClick={() => switchMode("email")}>
            Email
          </button>
          <button type="button" className={`tab-button ${mode === "call" ? "active" : ""}`} onClick={() => switchMode("call")}>
            Clic-pour-appeler
          </button>
        </div>

        <div className="field">
          <label htmlFor="composer-contact">Contact (optionnel)</label>
          <select id="composer-contact" value={contactId} onChange={(e) => pickContact(e.target.value)}>
            <option value="">— Saisir {mode === "email" ? "un email" : "un numéro"} manuellement —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} {mode === "email" ? (c.email ? `(${c.email})` : "") : c.phone ? `(${c.phone})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="composer-to">{mode === "email" ? "Adresse email" : "Numéro / destinataire"}</label>
          <input
            id="composer-to"
            type={mode === "email" ? "email" : "text"}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={mode === "email" ? "client@example.com" : "+687..."}
            required
          />
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

        {mode === "email" && (
          <>
            <div className="field">
              <label htmlFor="composer-subject">Sujet</label>
              <input id="composer-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="composer-email-body">Message</label>
              <textarea id="composer-email-body" value={body} onChange={(e) => setBody(e.target.value)} required />
            </div>
          </>
        )}

        <button className="btn btn-primary" type="submit" disabled={sending}>
          {sending ? "Envoi..." : mode === "call" ? "Appeler" : "Envoyer"}
        </button>
      </form>
    </div>
  );
}
