const router = require("express").Router();
const { pageLogin, pageForgetPass, pageResetPass, pageNotification, forgetPass } = require("../controllers/user.controllers");

// Render halaman login
router.get("/login", pageLogin);

// Render halaman lupa password
router.get("/forget-password", pageForgetPass);

// Render halaman reset password
router.get("/reset-password", pageResetPass);

router.get("/notification", pageNotification);

// router.get("/forget")
router.post("/forget-password", forgetPass);


module.exports = router;
