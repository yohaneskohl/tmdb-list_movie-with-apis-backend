const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { sendMail, getHTML } = require("../utils/nodemailer");

const prisma = new PrismaClient();
const { JWT_SECRET_KEY, FRONTEND_BASE_URL } = process.env;

module.exports = {
  googleCallback: async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect(`${FRONTEND_BASE_URL}/login?error=User not found`);
      }

      let existingUser = await prisma.user.findUnique({
        where: { email: user.email },
      });

      let randomPassword = null;
      let hashedPassword = null;

      if (!existingUser) {
        // ✅ User benar-benar baru: buat password dan kirim email
        randomPassword = Math.random().toString(36).slice(-8);
        hashedPassword = await bcrypt.hash(randomPassword, 10);

        existingUser = await prisma.user.create({
          data: {
            name: user.name,
            email: user.email,
            googleid: String(user.googleid),
            password: hashedPassword,
          },
        });

        console.log("User baru berhasil dibuat:", existingUser);

        const emailHTML = await getHTML("password-template.ejs", {
          name: user.name,
          password: randomPassword,
        });

        try {
          await sendMail(user.email, "Your Temporary Password", emailHTML);
          console.log("Email berhasil dikirim ke:", user.email);
        } catch (error) {
          console.error("Gagal mengirim email:", error.message);
        }

      } else if (!existingUser.password) {
        // ✅ User sudah ada tapi belum punya password (misalnya akun Google lama)
        randomPassword = Math.random().toString(36).slice(-8);
        hashedPassword = await bcrypt.hash(randomPassword, 10);

        existingUser = await prisma.user.update({
          where: { email: user.email },
          data: {
            password: hashedPassword,
            googleid: String(user.googleid),
            updatedAt: new Date(),
          },
        });

        console.log("User diperbarui dengan password baru:", existingUser);

        const emailHTML = await getHTML("password-template.ejs", {
          name: user.name,
          password: randomPassword,
        });

        try {
          await sendMail(user.email, "Your Temporary Password", emailHTML);
          console.log("Email berhasil dikirim ke:", user.email);
        } catch (error) {
          console.error("Gagal mengirim email:", error.message);
        }

      } else if (!existingUser.googleid) {
        // ✅ User sudah pernah daftar biasa tapi login pakai Google untuk pertama kali
        existingUser = await prisma.user.update({
          where: { email: user.email },
          data: {
            googleid: String(user.googleid),
            updatedAt: new Date(),
          },
        });

        console.log("GoogleID diperbarui:", existingUser);
      }

      // ✅ Buat JWT token
      const token = jwt.sign(
        { id: existingUser.id, email: existingUser.email, name: existingUser.name },
        JWT_SECRET_KEY,
        { expiresIn: "7d" }
      );

      console.log("Redirecting to Frontend with Token:", token);
      return res.redirect(`${FRONTEND_BASE_URL}/google-callback?token=${token}`);
    } catch (error) {
      console.error("Error in Google OAuth2 callback:", error);
      return res.redirect(`${FRONTEND_BASE_URL}/login?error=Authentication failed`);
    }
  },
};
