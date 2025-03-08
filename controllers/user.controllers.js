const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { JWT_SECRET_KEY } = process.env;
const nodemailer = require("../utils/nodemailer");
const { formattedDate } = require("../utils/formattedDate");

module.exports = {
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      const exist = await prisma.user.findUnique({
        where: { email },
      });

      if (!name || !email || !password) {
        return res.status(400).json({
          status: false,
          message: "Input must be required",
          data: null,
        });
      } else if (exist) {
        return res.status(401).json({
          status: false,
          message: "Email already used!",
        });
      }

      let encryptedPassword = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: encryptedPassword,
        },
      });
      delete user.password;

       const notification = await prisma.notification.create({
        data: {
          title: "Welcome!",
          message: "Your account has been created successfully.",
          createdDate: formattedDate(new Date()),
          user: { connect: { id: user.id } },
        },
      });

      global.io.emit(`user-${user.id}`, notification)

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
      let { email, password } = req.body;
      let user = await prisma.user.findFirst({ where: { email } });
      if (!user) {
        return res.status(400).json({
          status: false,
          message: "invalid email or password",
          data: null,
        });
      }

      let isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(400).json({
          status: false,
          message: "invalid email or password",
          data: null,
        });
      }

      delete user.password;
      let token = jwt.sign(user, JWT_SECRET_KEY);

      const notification = await prisma.notification.create({
        data: {
          title: "Successfully Login",
          message: "Enjoy your access Web.",
          createdDate: formattedDate(new Date()),
          user: { connect: { id: user.id } },
        },
      });

      global.io.emit(`user-${user.id}`, notification)

      return res.status(201).json({
        status: true,
        message: "success",
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
      const { search } = req.query;

      const users = await prisma.user.findMany({
        where: { name: { contains: search, mode: "insensitive" } },
      });
      users.forEach((user) => {
        delete user.password;
      });
      res.status(200).json({
        status: true,
        message: "success",
        data: users,
      });
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
      const html = await nodemailer.getHTML("url-resetPass.ejs", {
        name: findUser.name,
        url: `${req.protocol}://${req.get('host')}/api/v1/reset-pass?token=${token}`,
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
  resetPass: async (req, res, next) => {
    try {
      const { token } = req.query;
      const { password, passwordConfirmation } = req.body;
  
      if (!password || !passwordConfirmation) {
        return res.status(400).json({
          status: false,
          message: "Both password and password confirmation are required!",
          data: null,
        });
      }
  
      if (password !== passwordConfirmation) {
        return res.status(401).json({
          status: false,
          message: "Please ensure that the password and password confirmation match!",
          data: null,
        });
      }
  
      let encryptedPassword = await bcrypt.hash(password, 10);
  
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
          data: { password: encryptedPassword },
          select: { id: true, name: true, email: true } 
        });

        const notification = await prisma.notification.create({
          data: {
            title: "Password Changed",
            message: "Your password has been updated successfully.",
            createdDate: formattedDate(new Date()),
            user: { connect: { id: updateUser.id } },
          },
        });

        global.io.emit(`user-${updateUser.id}`, notification)
  
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
  
  // GET Profile
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


  // UPDATE Profile
updateProfile: async (req, res, next) => {
  try {
    const { id } = req.user;
    const { name, email, bio } = req.body;

    console.log("User ID dari token:", id);
    console.log("Data yang dikirim untuk update:", { name, email, bio });

    if (!name && !email && !bio) {
      return res.status(400).json({
        status: false,
        message: "At least one field (name, email, or bio) must be provided.",
      });
    }

    if (email) {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({
          status: false,
          message: "Email is already in use by another user.",
        });
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, bio },
      select: { id: true, name: true, email: true, bio: true },
    });

    console.log("User berhasil diupdate:", user);

    const notification = await prisma.notification.create({
      data: {
        title: "Profile Updated",
        message: "Your profile information has been updated successfully.",
        createdDate: new Date().toISOString(),
        user: { connect: { id: user.id } },
      },
    });

    console.log("Notifikasi dibuat:", notification);

    global.io.emit(`user-${user.id}`, notification);

    res.status(200).json({
      status: true,
      message: "Profile updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error saat update profile:", error);
    next(error);
  }
},


};
