const express = require("express")
const authController = require("../controllers/authController")

const router = express.Router()

// Root route
router.get("/", (req, res) => {
  res.render("pages/landing")
})

// Signup routes
router.get("/signup", authController.getSignUp)
router.post("/signup", authController.postSignUp)

// Email verification route
router.get("/verify-email", authController.verifyEmail)

// Login routes
router.get("/login", authController.getLogin)
router.post("/login", authController.postLogin)

// Logout route
router.get("/logout", authController.logout)

// Forgot password routes
router.get("/forgot-password", authController.getForgotPassword)
router.post("/forgot-password", authController.postForgotPassword)

// Reset password routes
router.get("/reset-password", authController.getResetPassword)
router.post("/reset-password", authController.postResetPassword)

module.exports = router
