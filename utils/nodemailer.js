require("dotenv").config();
const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const ejs = require("ejs");
const path = require("path");

const {
  GOOGLE_SENDER_EMAIL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
} = process.env;

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });

module.exports = {
  sendMail: async (to, subject, html) => {
    try {
      const accessToken = await oauth2Client.getAccessToken();

      const transport = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: GOOGLE_SENDER_EMAIL,
          clientId: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          refreshToken: GOOGLE_REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });

      await transport.sendMail({
        from: `"Your App Name" <${GOOGLE_SENDER_EMAIL}>`,
        to,
        subject,
        html,
      });

      console.log(`Email berhasil dikirim ke ${to}`);
    } catch (error) {
      console.error("Gagal mengirim email:", error);
    }
  },

  getHTML: (filename, data) => {
    return new Promise((resolve, reject) => {
      const filePath = path.join(__dirname, "../views/templates", filename);

      ejs.renderFile(filePath, data, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  },
};
