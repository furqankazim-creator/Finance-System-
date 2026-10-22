import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUser } from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => bcrypt.compare(password, hashedPassword);

export const signToken = (user: IUser): string => {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): { id: string; email: string } => {
  return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
};
