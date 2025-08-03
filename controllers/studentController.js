const db = require("../config/db")
const jwt = require("jsonwebtoken")

// Get current user from token
const getCurrentUser = (req) => {
  const token = req.cookies.token
  if (!token) return null
  try {
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch (error) {
    return null
  }
}

exports.getDashboard = async (req, res) => {
  try {
    const user = getCurrentUser(req)
    if (!user) return res.redirect("/login")

    const student = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])
    const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])

    res.render("student/dashboard", {
      student,
      user: userInfo,
      message: null,
    })
  } catch (error) {
    console.error("Error fetching dashboard:", error)
    res.status(500).send("Server Error")
  }
}

exports.getProfile = async (req, res) => {
  try {
    const user = getCurrentUser(req)
    if (!user) return res.redirect("/login")

    const student = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])
    const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])

    res.render("student/profile", {
      student,
      user: userInfo,
      message: null,
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    res.status(500).send("Server Error")
  }
}

exports.postProfile = async (req, res) => {
  let user = null
  try {
    user = getCurrentUser(req)
    if (!user) return res.redirect("/login")

    const {
      student_id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      address,
      parent_name,
      parent_phone,
      profile_image,
      department,
      program,
      year_of_study,
      semester,
      batch_year,
      cgpa,
    } = req.body

    // Validate required fields
    if (!student_id || !first_name || !last_name) {
      const student = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])
      const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])
      return res.render("student/profile", {
        student,
        user: userInfo,
        message: "Student ID, first name, and last name are required.",
      })
    }

    // Convert empty strings to null for database storage where appropriate
    const parsedDepartment = department || null
    const parsedProgram = program || null
    const parsedYearOfStudy = year_of_study ? Number.parseInt(year_of_study) : null
    const parsedSemester = semester ? Number.parseInt(semester) : null
    const parsedBatchYear = batch_year ? Number.parseInt(batch_year) : null
    const parsedCgpa = cgpa ? Number.parseFloat(cgpa) : null
    const parsedDateOfBirth = date_of_birth || null
    const parsedGender = gender || null
    const parsedPhone = phone || null
    const parsedAddress = address || null
    const parsedParentName = parent_name || null
    const parsedParentPhone = parent_phone || null
    const parsedProfileImage = profile_image || null

    const existingStudent = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])

    if (existingStudent) {
      // Check if student_id is unique (excluding current student)
      const duplicateStudentId = await db.oneOrNone("SELECT id FROM students WHERE student_id = $1 AND user_id != $2", [
        student_id,
        user.id,
      ])

      if (duplicateStudentId) {
        const student = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])
        const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])
        return res.render("student/profile", {
          student,
          user: userInfo,
          message: "Student ID already exists. Please use a different Student ID.",
        })
      }

      // Update existing profile
      await db.none(
        `
              UPDATE students SET 
                  student_id = $1, first_name = $2, last_name = $3, date_of_birth = $4, gender = $5,
                  phone = $6, address = $7, parent_name = $8, parent_phone = $9,
                  profile_image = $10, department = $11, program = $12, year_of_study = $13,
                  semester = $14, batch_year = $15, cgpa = $16, updated_at = CURRENT_TIMESTAMP
              WHERE user_id = $17
          `,
        [
          student_id,
          first_name,
          last_name,
          parsedDateOfBirth,
          parsedGender,
          parsedPhone,
          parsedAddress,
          parsedParentName,
          parsedParentPhone,
          parsedProfileImage,
          parsedDepartment,
          parsedProgram,
          parsedYearOfStudy,
          parsedSemester,
          parsedBatchYear,
          parsedCgpa,
          user.id,
        ],
      )
    } else {
      // Check if student_id is unique for new profile
      const duplicateStudentId = await db.oneOrNone("SELECT id FROM students WHERE student_id = $1", [student_id])

      if (duplicateStudentId) {
        const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])
        return res.render("student/profile", {
          student: null,
          user: userInfo,
          message: "Student ID already exists. Please use a different Student ID.",
        })
      }

      // Create new profile with student_id
      await db.none(
        `
              INSERT INTO students (
                  user_id, student_id, first_name, last_name, date_of_birth, gender,
                  phone, address, parent_name, parent_phone, profile_image, status,
                  department, program, year_of_study, semester, batch_year, cgpa
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
          `,
        [
          user.id,
          student_id,
          first_name,
          last_name,
          parsedDateOfBirth,
          parsedGender,
          parsedPhone,
          parsedAddress,
          parsedParentName,
          parsedParentPhone,
          parsedProfileImage,
          "active", // Set as active since they provided their student ID
          parsedDepartment,
          parsedProgram,
          parsedYearOfStudy,
          parsedSemester,
          parsedBatchYear,
          parsedCgpa,
        ],
      )
    }

    const student = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])
    const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])

    res.render("student/profile", {
      student,
      user: userInfo,
      message: "Profile updated successfully!",
    })
  } catch (error) {
    console.error("Error updating profile:", error)

    // If user is not defined, redirect to login
    if (!user) {
      return res.redirect("/login")
    }

    try {
      const student = await db.oneOrNone("SELECT * FROM students WHERE user_id = $1", [user.id])
      const userInfo = await db.oneOrNone("SELECT name, email FROM users WHERE id = $1", [user.id])
      res.render("student/profile", {
        student,
        user: userInfo,
        message: "Error updating profile. Please try again.",
      })
    } catch (innerError) {
      console.error("Error in catch block:", innerError)
      res.redirect("/login")
    }
  }
}
