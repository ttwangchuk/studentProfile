const db = require("../config/db")

const createStudentTable = async () => {
  try {
    await db.none(`
            CREATE TABLE IF NOT EXISTS students (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                student_id VARCHAR(50) UNIQUE,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                date_of_birth DATE,
                gender VARCHAR(20),
                phone VARCHAR(20),
                address TEXT,
                parent_name VARCHAR(100),
                parent_phone VARCHAR(20),
                department VARCHAR(100),
                program VARCHAR(100),
                year_of_study INTEGER,
                semester INTEGER,
                batch_year INTEGER,
                cgpa DECIMAL(3,2),
                profile_image TEXT,
                admission_date DATE DEFAULT CURRENT_DATE,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
    console.log("✅ Students table created successfully for Sherubtse College.")
  } catch (err) {
    console.error("❌ Error creating students table:", err)
  }
}

module.exports = {
  createStudentTable,
}
