import jwt, { SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "supersecret";

const HOUR = 3600;

export const generateToken = (payload: object, expiresIn = HOUR) => {
  const options: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, SECRET, options);
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET);
};
