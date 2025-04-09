// import dotenvFlow from 'dotenv-flow'

// dotenvFlow.config()

// export default {
//     // General
//     ENV: process.env.ENV,
//     PORT: process.env.PORT,
//     SERVER_URL: process.env.SERVER_URL,

//     // Database
//     DATABASE_URL: process.env.DATABASE_URL
// } as const

import dotenvFlow from 'dotenv-flow'
dotenvFlow.config()

export default {
  ENV: process.env.ENV,
  PORT: process.env.PORT,
  SERVER_URL: process.env.SERVER_URL,
  DATABASE_URL: process.env.DATABASE_URL
} as const
