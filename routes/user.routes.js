const router = require("express").Router();
const {
  register,
  login,
  auth,
  index,
  
  resetPassword,
  getProfile,
  updateProfile,
  setPassword,
} = require("../controllers/user.controllers");

const passport = require("../utils/passport");
const restrict = require("../middlewares/auth.middlewares");
const { googleCallback } = require("../controllers/oauth.controllers");

// // 🔹 Google OAuth 
// router.get(
//   "/auth/google/json",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );
// router.get(
//   "/auth/google/json/callback",
//   passport.authenticate("google", { failureRedirect: "/auth/google/json", session: false }),
//   googleCallback
// );

// 🔹 Google OAuth 
router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  googleCallback
);

// 🔹 API Users
router.get("/users", index);

// 🔹 API Auth
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/authenticate", restrict, auth);

// 🔹 API Forget Password
router.post("/reset-password", resetPassword);
router.post("/set-password", restrict, setPassword);

// 🔹 API Profile
router.get("/profile", restrict, getProfile);
router.put("/profile", restrict, updateProfile);

module.exports = router;
