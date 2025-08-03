const db = require("../config/db")

exports.getAdminDashboard = async (req, res) => {
  try {
    const totalStudents = await db.one("SELECT COUNT(*) FROM students")
    const activeStudents = await db.one("SELECT COUNT(*) FROM students WHERE status = $1", ["active"])
    const departments = await db.any(
      "SELECT department, COUNT(*) as count FROM students WHERE department IS NOT NULL GROUP BY department",
    )
    const recentStudents = await db.any(`
            SELECT s.*, u.name, u.email 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            ORDER BY s.created_at DESC 
            LIMIT 5
        `)

    res.render("admin/dashboard", {
      totalStudents: totalStudents.count,
      activeStudents: activeStudents.count,
      departments,
      recentStudents,
      message: null,
    })
  } catch (error) {
    console.error("Error fetching admin dashboard:", error)
    res.status(500).send("Server Error")
  }
}

exports.getAllStudents = async (req, res) => {
  try {
    const { search, department, year, program } = req.query
    let query = `
            SELECT s.*, u.name, u.email 
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE 1=1
        `
    const params = []

    if (search) {
      query += ` AND (s.first_name ILIKE $${params.length + 1} OR s.last_name ILIKE $${params.length + 1} OR s.student_id ILIKE $${params.length + 1})`
      params.push(`%${search}%`)
    }

    if (department) {
      query += ` AND s.department ILIKE $${params.length + 1}`
      params.push(`%${department}%`)
    }

    if (year) {
      query += ` AND s.year_of_study = $${params.length + 1}`
      params.push(year)
    }

    if (program) {
      query += ` AND s.program ILIKE $${params.length + 1}`
      params.push(`%${program}%`)
    }

    query += ` ORDER BY s.created_at DESC`

    const students = await db.any(query, params)
    const departments = await db.any("SELECT DISTINCT department FROM students WHERE department IS NOT NULL")
    const programs = await db.any("SELECT DISTINCT program FROM students WHERE program IS NOT NULL")

    res.render("admin/students", {
      students,
      departments,
      programs,
      filters: { search, department, year, program },
    })
  } catch (error) {
    console.error("Error fetching students:", error)
    res.status(500).send("Server Error")
  }
}

exports.getAddStudent = (req, res) => {
  res.render("admin/add-student", { message: null })
}

exports.postAddStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      student_id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      address,
      parent_name,
      parent_phone,
      department,
      program,
      year_of_study,
      semester,
      batch_year,
      profile_image,
    } = req.body

    // Check if student ID already exists
    const existingStudent = await db.oneOrNone("SELECT * FROM students WHERE student_id = $1", [student_id])
    if (existingStudent) {
      return res.render("admin/add-student", { message: "Student ID already exists" })
    }

    // Check if email already exists
    const existingUser = await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser) {
      return res.render("admin/add-student", { message: "Email already registered" })
    }

    // Create user account
    const defaultPassword = "student123" // You might want to generate a random password
    const bcrypt = require("bcrypt")
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const userResult = await db.one(
      `INSERT INTO users (name, email, password, role, is_verified) 
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, email, hashedPassword, "student", true],
    )

    // Create student profile
    await db.none(
      `
            INSERT INTO students (
                user_id, student_id, first_name, last_name, date_of_birth, gender,
                phone, address, parent_name, parent_phone, department, program,
                year_of_study, semester, batch_year, profile_image
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
      [
        userResult.id,
        student_id,
        first_name,
        last_name,
        date_of_birth,
        gender,
        phone,
        address,
        parent_name,
        parent_phone,
        department,
        program,
        year_of_study,
        semester,
        batch_year,
        profile_image,
      ],
    )

    res.render("admin/add-student", { message: "Student added successfully!" })
  } catch (error) {
    console.error("Error adding student:", error)
    res.render("admin/add-student", { message: "Error adding student. Please try again." })
  }
}

exports.getEditStudent = async (req, res) => {
  try {
    const { id } = req.params
    const student = await db.oneOrNone(
      `
            SELECT s.*, u.name, u.email
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = $1
        `,
      [id],
    )

    if (!student) {
      return res.status(404).send("Student not found")
    }

    res.render("admin/edit-student", { student, message: null })
  } catch (error) {
    console.error("Error fetching student for edit:", error)
    res.status(500).send("Server Error")
  }
}

exports.postEditStudent = async (req, res) => {
  try {
    const { id } = req.params
    const {
      name,
      email,
      student_id,
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      address,
      parent_name,
      parent_phone,
      department,
      program,
      year_of_study,
      semester,
      batch_year,
      cgpa,
      profile_image,
      status,
    } = req.body

    const student = await db.oneOrNone("SELECT user_id FROM students WHERE id = $1", [id])
    if (!student) {
      return res.status(404).send("Student not found")
    }

    // Check if student_id is unique (excluding current student)
    const existingStudent = await db.oneOrNone("SELECT id FROM students WHERE student_id = $1 AND id != $2", [
      student_id,
      id,
    ])
    if (existingStudent) {
      const updatedStudent = await db.oneOrNone(
        `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
        [id],
      )
      return res.render("admin/edit-student", {
        student: updatedStudent,
        message: "Student ID already exists. Please use a different ID.",
      })
    }

    // Check if email is unique (excluding current user)
    const existingUser = await db.oneOrNone("SELECT id FROM users WHERE email = $1 AND id != $2", [
      email,
      student.user_id,
    ])
    if (existingUser) {
      const updatedStudent = await db.oneOrNone(
        `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
        [id],
      )
      return res.render("admin/edit-student", {
        student: updatedStudent,
        message: "Email already exists. Please use a different email.",
      })
    }

    // Update user information
    await db.none("UPDATE users SET name = $1, email = $2 WHERE id = $3", [name, email, student.user_id])

    // Update student information
    await db.none(
      `
            UPDATE students SET 
                student_id = $1, first_name = $2, last_name = $3, date_of_birth = $4,
                gender = $5, phone = $6, address = $7, parent_name = $8,
                parent_phone = $9, department = $10, program = $11, year_of_study = $12,
                semester = $13, batch_year = $14, cgpa = $15, profile_image = $16,
                status = $17, updated_at = CURRENT_TIMESTAMP
            WHERE id = $18
        `,
      [
        student_id,
        first_name,
        last_name,
        date_of_birth || null,
        gender,
        phone,
        address,
        parent_name,
        parent_phone,
        department,
        program,
        year_of_study ? Number.parseInt(year_of_study) : null,
        semester ? Number.parseInt(semester) : null,
        batch_year ? Number.parseInt(batch_year) : null,
        cgpa ? Number.parseFloat(cgpa) : null,
        profile_image,
        status,
        id,
      ],
    )

    const updatedStudent = await db.oneOrNone(
      `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [id],
    )

    res.render("admin/edit-student", { student: updatedStudent, message: "Student updated successfully!" })
  } catch (error) {
    console.error("Error updating student:", error)
    const student = await db.oneOrNone(
      `SELECT s.*, u.name, u.email FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
      [req.params.id],
    )
    res.render("admin/edit-student", { student, message: "Error updating student. Please try again." })
  }
}

exports.getStudentDetails = async (req, res) => {
  try {
    const { id } = req.params
    const student = await db.oneOrNone(
      `
            SELECT s.*, u.name, u.email, u.created_at as user_created_at
            FROM students s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.id = $1
        `,
      [id],
    )

    if (!student) {
      return res.status(404).send("Student not found")
    }

    res.render("admin/student-details", { student })
  } catch (error) {
    console.error("Error fetching student details:", error)
    res.status(500).send("Server Error")
  }
}

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params

    const student = await db.oneOrNone("SELECT user_id FROM students WHERE id = $1", [id])
    if (!student) {
      return res.status(404).send("Student not found")
    }

    // Delete student record (user will be deleted due to CASCADE)
    await db.none("DELETE FROM users WHERE id = $1", [student.user_id])

    res.redirect("/admin/students")
  } catch (error) {
    console.error("Error deleting student:", error)
    res.status(500).send("Server Error")
  }
}
