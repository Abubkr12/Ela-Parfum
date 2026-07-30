import WebhookLogsClient from "./WebhookLogsClient";

export const metadata = {
  title: "Mayar Debug | Admin Ela Parfum",
  description: "Pantau log webhook dari Mayar",
};

export default function MayarDebugPage() {
  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200, margin: "0 auto" }}>
      <WebhookLogsClient />
    </div>
  );
}
