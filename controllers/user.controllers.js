const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("../utils/nodemailer");
// const { formattedDate } = require("../utils/formattedDate");

const { JWT_SECRET_KEY } = process.env;

module.exports = {
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          status: false,
          message: "All fields (name, email, password) are required!",
          data: null,
        });
      }

      const exist = await prisma.user.findUnique({ where: { email } });
      if (exist) {
        return res.status(401).json({
          status: false,
          message: "Email is already used!",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword },
      });

      delete user.password;

      res.status(201).json({
        status: true,
        message: "User Created Successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({
          status: false,
          message: "Invalid email or password",
          data: null,
        });
      }

      // Jika user dari Google OAuth, arahkan untuk set password
      if (!user.password) {
        return res.status(403).json({
          status: false,
          message:
            "This account was registered using Google OAuth. Please set your password first.",
          data: null,
        });
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: "Invalid email or password",
          data: null,
        });
      }

      delete user.password;
      const token = jwt.sign(user, JWT_SECRET_KEY);

      res.status(200).json({
        status: true,
        message: "Login successful",
        data: { ...user, token },
      });
    } catch (error) {
      next(error);
    }
  },

  auth: async (req, res, next) => {
    try {
      return res.status(200).json({
        status: true,
        message: "Success",
        data: req.user,
      });
    } catch (error) {
      next(error);
    }
  },

  index: async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          bio: true,
          address: true,
          occupation: true,
          avatar_url: true,
          googleid: true,
          // notification: {
          //   select: {
          //     id: true,
          //     title: true,
          //     message: true,
          //     createdDate: true,
          //   },
          // },
        },
      });
  
      res.status(200).json({
        status: true,
        message: "Success",
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },
  

  forgetPass: async (req, res, next) => {
    try {
      const { email } = req.body;
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found",
          data: null,
        });
      }

      const token = jwt.sign({ email: user.email }, JWT_SECRET_KEY);
      const html = await nodemailer.getHTML("url-resetPass.ejs", {
        name: user.name,
        url: `${req.protocol}://${req.get("host")}/api/v1/reset-pass?token=${token}`,
      });

      await nodemailer.sendMail(email, "Email Forget Password", html);

      return res.status(200).json({
        status: true,
        message: "Success Send Email Forget Password",
      });
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (req, res, next) => {
    try {
      const { token } = req.query;
      const { password, newPassword } = req.body;

      if (!token) {
        return res.status(400).json({
          status: false,
          message: "Token is required!",
          data: null,
        });
      }

      if (!password || !newPassword) {
        return res.status(400).json({
          status: false,
          message: "Both password and password confirmation are required!",
          data: null,
        });
      }

      if (password !== newPassword) {
        return res.status(401).json({
          status: false,
          message:
            "Please ensure that the password and password confirmation match!",
          data: null,
        });
      }

      let encryptedNewPassword = await bcrypt.hash(password, 10);

      jwt.verify(token, JWT_SECRET_KEY, async (err, decoded) => {
        if (err) {
          return res.status(403).json({
            status: false,
            message: "Invalid or expired token!",
            data: null,
          });
        }

        const updateUser = await prisma.user.update({
          where: { email: decoded.email },
          data: { password: encryptedNewPassword },
          select: { id: true, name: true, email: true },
        });

        res.status(200).json({
          status: true,
          message: "Your password has been updated successfully!",
          data: updateUser,
        });
      });
    } catch (error) {
      next(error);
    }
  },

  getProfile: async (req, res, next) => {
    try {
      const { id } = req.user;
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, bio: true },
      });

      if (!user) {
        return res.status(404).json({
          status: false,
          message: "User not found!",
          data: null,
        });
      }

      res.status(200).json({
        status: true,
        message: "Success",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  updateProfile: async (req, res, next) => {
    try {
      const { id } = req.user;
      const { name, email, bio } = req.body;

      if (!name && !email && !bio) {
        return res.status(400).json({
          status: false,
          message: "At least one field (name, email, or bio) must be provided.",
        });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { name, email, bio },
        select: { id: true, name: true, email: true, bio: true },
      });

      res.status(200).json({
        status: true,
        message: "Profile updated successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  setPassword: async (req, res, next) => {
    try {
      const { password } = req.body;
      const { id } = req.user;

      if (!password) {
        return res.status(400).json({
          status: false,
          message: "Password is required",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({ where: { id }, data: { password: hashedPassword } });

      res.status(200).json({ status: true, message: "Password set successfully." });
    } catch (error) {
      next(error);
    }
  },

  pageLogin: async (req, res, next) => {
    try {
      res.render("login-email.ejs");
    } catch (error) {
      next(error);
    }
  },

  forgetPass: async (req, res, next) => {
    try {
      const { email } = req.body;
      const findUser = await prisma.user.findUnique({ where: { email } });

      if (!findUser) {
        return res.status(404).json({
          status: false,
          message: "user not found",
          data: null,
        });
      }
      const token = jwt.sign({ email: findUser.email }, JWT_SECRET_KEY);
      const html = await nodemailer.getHTML("reset-confirmation.ejs", {
        name: findUser.name,
        url: `${req.protocol}://${req.get(
          "host"
        )}/api/v1/reset-password?token=${token}`,
      });
      await nodemailer.sendMail(email, "Reset your password here!", html);
      return res.status(200).json({
        status: true,
        message: "Success Send Email Forget Password",
      });
    } catch (error) {
      next(error);
    }
  },

  pageForgetPass: async (req, res, next) => {
    try {
      res.render("forget-pass.ejs");
    } catch (error) {
      next(error);
    }
  },

  pageResetPass: async (req, res, next) => {
    try {
      let { token } = req.query;
      res.render("reset-pass.ejs", { token });
    } catch (error) {
      next(error);
    }
  },

  pageNotification: async (req, res, next) => {
    try {
      const userId = Number(req.params.id);
      const notifications = await prisma.notification.findMany({
        where: { user_id: userId },
      });
      res.render("notification-page.ejs", {
        user_id: userId,
        notifications: notifications,
      });
    } catch (error) {
      next(error);
    }
  },
};
