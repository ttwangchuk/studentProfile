const express = require("express")
const router = express.Router()
const studentController = require("../controllers/studentController")

router.get("/dashboard", studentController.getDashboard)
router.get("/profile", studentController.getProfile)
router.post("/profile", studentController.postProfile)

module.exports = router
