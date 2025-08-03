const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")

router.get("/dashboard", adminController.getAdminDashboard)
router.get("/students", adminController.getAllStudents)
router.get("/add-student", adminController.getAddStudent)
router.post("/add-student", adminController.postAddStudent)
router.get("/edit-student/:id", adminController.getEditStudent)
router.post("/edit-student/:id", adminController.postEditStudent)
router.get("/student/:id", adminController.getStudentDetails)
router.post("/delete-student/:id", adminController.deleteStudent)

module.exports = router
