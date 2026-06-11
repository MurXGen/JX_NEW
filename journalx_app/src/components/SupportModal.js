/* Support & feedback modal (mobile).
   Mirrors the web SupportModal: submissions are POSTed to the same Google Form
   `formResponse` endpoint, which writes a row into the linked Google Sheet.
   We send an application/x-www-form-urlencoded body (the format Google Forms
   expects) — the response is opaque/blocked cross-origin, so this is
   fire-and-forget; the row still lands in the sheet. */
import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { LifeBuoy, Send, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";

// Same form + entry IDs as the web version (frontend/components/revampV2/SupportModal.jsx)
const GOOGLE_FORM = {
  actionUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSeosaJAbSxvkpXbhiiw-Dm9QOYS0BfYN5hygLiH2IMq1cApKw/formResponse",
  entries: {
    category: "entry.328676108",
    message: "entry.1405331720",
    email: "entry.1963206462",
    name: "entry.191488008",
    plan: "entry.1950424137",
  },
};

const CATEGORIES = ["Support", "Feedback", "Bug report", "Feature request", "Other"];

export default function SupportModal({ visible, onClose, user, plan = "free" }) {
  const { theme } = useTheme();
  const [category, setCategory] = useState("Support");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error

  const reset = () => { setCategory("Support"); setMessage(""); setStatus("idle"); };
  const close = () => {
    if (status === "sending") return;
    onClose?.();
    setTimeout(reset, 250);
  };

  const submit = async () => {
    if (!message.trim()) return;
    setStatus("sending");
    try {
      const { entries } = GOOGLE_FORM;
      const fields = {
        [entries.category]: category,
        [entries.message]: message.trim(),
        [entries.email]: user?.email || "",
        [entries.name]: user?.name || "",
        [entries.plan]: plan,
      };
      const body = Object.entries(fields)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      await fetch(GOOGLE_FORM.actionUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      setStatus("done");
    } catch {
      // Google Forms returns an opaque/cross-origin response; a thrown error
      // here usually still means the row was written, but surface a retry path.
      setStatus("error");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable onPress={close} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: theme.bg.elevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: theme.space[8], maxHeight: "88%" }}>
          {/* header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space[3], padding: theme.space[5], paddingBottom: theme.space[3] }}>
            <View style={{ width: 38, height: 38, borderRadius: theme.radius.md, backgroundColor: theme.primarySubtle, alignItems: "center", justifyContent: "center" }}>
              <LifeBuoy size={18} color={theme.yellow[500]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font(700), fontSize: theme.font.title, color: theme.text.primary }}>Support & feedback</Text>
              <Text style={{ fontFamily: font(400), fontSize: theme.font.small, color: theme.text.muted }}>We read every message.</Text>
            </View>
            <Pressable onPress={close} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: theme.bg.muted, alignItems: "center", justifyContent: "center" }}>
              <X size={18} color={theme.text.muted} />
            </Pressable>
          </View>

          {status === "done" ? (
            <View style={{ padding: theme.space[6], alignItems: "center", gap: theme.space[3] }}>
              <Text style={{ fontSize: 40 }}>🎉</Text>
              <Text style={{ fontFamily: font(700), fontSize: theme.font.title, color: theme.text.primary }}>Thanks for reaching out!</Text>
              <Text style={{ fontFamily: font(400), fontSize: theme.font.body, color: theme.text.muted, textAlign: "center" }}>
                Your {category.toLowerCase()} has been received. We'll get back to you at {user?.email || "your email"} if a reply is needed.
              </Text>
              <Pressable onPress={close} style={{ marginTop: 6, backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 13, paddingHorizontal: 40 }}>
                <Text style={{ color: theme.primaryText, fontFamily: font(700), fontSize: theme.font.bodyMd }}>Done</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: theme.space[5], paddingTop: 0, gap: theme.space[4] }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: theme.space[2] }}>
                <Text style={{ fontFamily: font(600), fontSize: theme.font.bodyMd, color: theme.text.primary }}>What's this about?</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIES.map((c) => {
                    const active = category === c;
                    return (
                      <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: active ? theme.primary : theme.bg.muted, borderColor: active ? theme.primary : theme.border }}>
                        <Text style={{ fontFamily: font(600), fontSize: theme.font.small, color: active ? theme.primaryText : theme.text.secondary }}>{c}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: theme.space[2] }}>
                <Text style={{ fontFamily: font(600), fontSize: theme.font.bodyMd, color: theme.text.primary }}>Message</Text>
                <View style={{ backgroundColor: theme.bg.surface, borderColor: theme.border, borderWidth: 1, borderRadius: theme.radius.md }}>
                  <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Tell us what's on your mind…"
                    placeholderTextColor={theme.text.muted}
                    multiline
                    style={{ color: theme.text.primary, fontFamily: font(400), padding: 14, minHeight: 120, textAlignVertical: "top" }}
                  />
                </View>
              </View>

              {!!user?.email && (
                <Text style={{ fontFamily: font(400), fontSize: theme.font.caption, color: theme.text.muted }}>
                  Sending as {user.name ? `${user.name} · ` : ""}{user.email}
                </Text>
              )}

              {status === "error" && (
                <View style={{ backgroundColor: theme.dangerSubtle, borderRadius: theme.radius.md, padding: 10 }}>
                  <Text style={{ color: theme.dangerStrong, fontFamily: font(500), fontSize: theme.font.small }}>
                    Something went wrong. Please try again or email officialjournalx@gmail.com.
                  </Text>
                </View>
              )}

              <Pressable
                onPress={submit}
                disabled={!message.trim() || status === "sending"}
                style={{ backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: !message.trim() || status === "sending" ? 0.6 : 1 }}
              >
                {status === "sending" ? <ActivityIndicator size="small" color={theme.primaryText} /> : <Send size={16} color={theme.primaryText} />}
                <Text style={{ color: theme.primaryText, fontFamily: font(700), fontSize: theme.font.bodyMd }}>{status === "sending" ? "Sending…" : "Send message"}</Text>
              </Pressable>
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
