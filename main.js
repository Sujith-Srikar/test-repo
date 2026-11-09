const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
} = require("baileys");

async function connectToWhatsApp() {
  // Initialize multi‑file auth state stored in the "auth_info_baileys" folder
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update || {};
    if (qr) {
      // Display the QR code in the terminal
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log("Opened connection.");
    }
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error instanceof Boom &&
        lastDisconnect.error.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "Connection closed due to",
        lastDisconnect?.error,
        ", reconnecting:",
        shouldReconnect
      );
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    }
  });

  // Save credentials when they update.
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (messageInfoUpsert) => {
    const message = messageInfoUpsert.messages[0];
    console.log("Received message:", message);
  });
}
// Start the connection process.
connectToWhatsApp();