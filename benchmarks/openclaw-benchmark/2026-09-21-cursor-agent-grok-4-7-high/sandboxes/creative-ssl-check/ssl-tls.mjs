
import tls from "node:tls";
import { writeFileSync } from "fs";

const socket = tls.connect({ host: "github.com", port: 443, servername: "github.com" }, () => {
  const cert = socket.getPeerCertificate();
  const validFrom = new Date(cert.valid_from);
  const validUntil = new Date(cert.valid_to);
  const daysRemaining = Math.floor((validUntil.getTime() - Date.now()) / 86400000);
  const report = {
    issuer: cert.issuer,
    subject: cert.subject,
    valid_from: validFrom.toISOString(),
    valid_until: validUntil.toISOString(),
    days_remaining: daysRemaining,
    protocol: socket.getProtocol(),
  };
  writeFileSync("ssl-report.json", JSON.stringify(report, null, 2) + "\n");
  socket.end();
});
socket.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
