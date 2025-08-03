const express = require("express")
const path = require("path")
require("dotenv").config()
const cookieParser = require("cookie-parser")
const session = require("express-session")
const { createUserTable } = require("./models/userModel")
const { createStudentTable } = require("./models/studentModel")

const app = express()
const PORT = process.env.PORT || 3000

// Middleware setup
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(
  session({
    secret: process.env.SESSION_SECRET || "sherubtse_secret_key",
    resave: false,
    saveUninitialized: true,
  }),
)

// Setting up view engine as ejs
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.static(path.join(__dirname, "public")))

// Route imports
const authRoutes = require("./routes/authRoutes")
const adminRoutes = require("./routes/adminRoutes")
const studentRoutes = require("./routes/studentRoutes")

app.use("/", authRoutes)
app.use("/admin", adminRoutes)
app.use("/student", studentRoutes)

// Create database tables
createUserTable()
createStudentTable()

// Starting the server
app.listen(PORT, () => {
  console.log(`🎓 Sherubtse College Student Management System running on http://localhost:${PORT}`)
})
