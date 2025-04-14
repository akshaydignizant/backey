// import jwt from "jsonwebtoken";

// // const generateToken = (id: string): string => {
// //   return jwt.sign({ id }, process.env.JWT_SECRET as string, {
// //     expiresIn: "7d",
// //   });
// export const generateToken = (userId: string) => {
//     return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "1h" });
//   };

// // export const validateToken = (token: string): boolean => {
// //   try {
// //         const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
// //         return true;
// //       } catch (error) {
// //         return false;
// //       }
// // };


import { Role } from "@prisma/client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your_refresh_secret";
const JWT_EXPIRES_IN = "1h"; // Short-lived access token
const REFRESH_EXPIRES_IN = "7d"; // Refresh token lasts 7 days

export const generateToken = (userId: string, role: Role | null) => {
  const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign({ userId, role }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  return { token, refreshToken };
};
