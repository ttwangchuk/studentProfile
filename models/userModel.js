const db = require("../config/db")

// Create new user table if not exist
const createUserTable = async () => {
  try {
    await db.none(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(255) DEFAULT 'student',
                is_verified BOOLEAN DEFAULT FALSE,
                verification_token TEXT,
                reset_token TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
    console.log("Users Table created!!!")
  } catch (error) {
    console.error("Error creating users table", error)
  }
}

module.exports = {
  createUserTable,
}
