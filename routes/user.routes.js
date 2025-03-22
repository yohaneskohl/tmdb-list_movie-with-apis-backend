const router = require("express").Router();
const {
  register,
  login,
  auth,
  index,
  forgetPass,
  resetPass,
  getProfile,
  updateProfile,
  googleOauth2,
} = require("../controllers/user.controllers");
const passport = require("../utils/passport");

const restrict = require("../middlewares/auth.middlewares");

//  Google OAuth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/auth/google", session: false }), 
  googleOauth2
);


// API Users
router.get("/users", index);

// API Auth
router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/authenticate", restrict, auth);

// API Forget Password Email
router.post("/forget-pass", forgetPass);
router.post("/reset-pass", resetPass);

router.get("/profile", restrict, getProfile);
router.put("/profile", restrict, updateProfile);

module.exports = router;
