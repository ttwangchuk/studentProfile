const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const db = require("../config/db")
const nodemailer = require("nodemailer")
require("dotenv").config()

const saltRounds = 10

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
})

// Render the sign up page
exports.getSignUp = (req, res) => {
  res.render("pages/signup", { message: null })
}

// Handles sign up logic
exports.postSignUp = async (req, res) => {
  const { name, email, password, role } = req.body
  try {
    // Check if user already exists
    const existingUser = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser) {
      return res.render("pages/signup", { message: "Email already registered" })
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Generate verification token
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" })

    // Insert user into the database
    await db.none(`INSERT INTO users (name, email, password, role, verification_token) VALUES ($1, $2, $3, $4, $5)`, [
      name,
      email,
      hashedPassword,
      role,
      verificationToken,
    ])

    // Send verification email
    const verificationLink = `${process.env.BASE_URL}/verify-email?token=${verificationToken}`

    await transporter.sendMail({
      from: `"Student Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Email Verification - Student Portal",
      html: `<p>Hi ${name},</p>
                   <p>Welcome to the Student Portal! Please verify your email by clicking the link below:</p>
                   <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Verify Email</a>
                   <p>If you did not sign up, please ignore this email.</p>`,
    })

    res.render("pages/signup", { message: "Registration successful! Please check your email to verify your account." })
  } catch (error) {
    console.error("Error during sign up:", error)
    res.render("pages/signup", { message: "An error occurred during registration. Please try again." })
  }
}

// Email verification route
exports.verifyEmail = async (req, res) => {
  const { token } = req.query

  try {
    const decode = jwt.verify(token, process.env.JWT_SECRET)
    const email = decode.email

    await db.none(`UPDATE users SET is_verified = true, verification_token = NULL WHERE email = $1`, [email])
    res.render("pages/verification-success", { message: "Email verified successfully! You can now log in." })
  } catch (error) {
    res.render("pages/verification-error", { message: "Invalid or expired verification link" })
  }
}

// Get login
exports.getLogin = (req, res) => {
  res.render("pages/login", { message: null })
}

// Handles login logic
exports.postLogin = async (req, res) => {
  const { email, password } = req.body

  try {
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email])
    if (!user) {
      return res.render("pages/login", { message: "Invalid email or password" })
    }
    if (!user.is_verified) {
      return res.render("pages/login", { message: "Please verify your email before logging in." })
    }

    const match = await bcrypt.compare(password, user.password)
    if (!match) {
      return res.render("pages/login", { message: "Invalid email or password" })
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    )

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
    })

    // Redirect based on user role
    if (user.role === "admin") {
      res.redirect("/admin/dashboard")
    } else {
      res.redirect("/student/dashboard")
    }
  } catch (error) {
    console.error("Error during login:", error)
    res.render("pages/login", { message: "An error occurred during login. Please try again." })
  }
}

// Logout logic
exports.logout = (req, res) => {
  try {
    res.clearCookie("token")
    res.redirect("/login")
  } catch (error) {
    console.error("Error during logout:", error)
    res.render("pages/login", { message: "An error occurred during logout. Please try again." })
  }
}

// Get forgot password page
exports.getForgotPassword = (req, res) => {
  res.render("pages/forgot-password", { message: null })
}

// Handle forgot password request
exports.postForgotPassword = async (req, res) => {
  const { email } = req.body

  try {
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email])
    if (!user) {
      return res.render("pages/forgot-password", {
        message: "If an account with that email exists, we've sent a reset link.",
      })
    }

    // Generate reset token
    const resetToken = jwt.sign({ email: user.email, id: user.id }, process.env.JWT_SECRET, { expiresIn: "1h" })

    // Save reset token to database
    await db.none("UPDATE users SET reset_token = $1 WHERE email = $2", [resetToken, email])

    // Send reset email
    const resetLink = `${process.env.BASE_URL}/reset-password?token=${resetToken}`

    await transporter.sendMail({
      from: `"Student Portal" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset - Student Portal",
      html: `
        <p>Hi ${user.name},</p>
        <p>You requested a password reset for your Student Portal account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
      `,
    })

    res.render("pages/forgot-password", { message: "If an account with that email exists, we've sent a reset link." })
  } catch (error) {
    console.error("Error during forgot password:", error)
    res.render("pages/forgot-password", { message: "An error occurred. Please try again." })
  }
}

// Get reset password page
exports.getResetPassword = async (req, res) => {
  const { token } = req.query

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1 AND reset_token = $2", [decoded.email, token])

    if (!user) {
      return res.render("pages/verification-error", { message: "Invalid or expired reset link" })
    }

    res.render("pages/reset-password", { token, message: null })
  } catch (error) {
    res.render("pages/verification-error", { message: "Invalid or expired reset link" })
  }
}

// Handle password reset
exports.postResetPassword = async (req, res) => {
  const { token, newPassword } = req.body

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await db.oneOrNone("SELECT * FROM users WHERE email = $1 AND reset_token = $2", [decoded.email, token])

    if (!user) {
      return res.render("pages/reset-password", { token, message: "Invalid or expired reset link" })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    // Update password and clear reset token
    await db.none("UPDATE users SET password = $1, reset_token = NULL WHERE email = $2", [hashedPassword, user.email])

    res.render("pages/verification-success", {
      message: "Password reset successful! You can now log in with your new password.",
    })
  } catch (error) {
    console.error("Error during password reset:", error)
    res.render("pages/reset-password", { token, message: "An error occurred. Please try again." })
  }
}
