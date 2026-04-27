import jwt, { SignOptions } from "jsonwebtoken";
import { StringValue } from "ms";

const SECRET = process.env.JWT_SECRET || "supersecret";

const HOUR = 3600;

export const generateToken = (
  payload: object,
  expiresIn: StringValue | number = HOUR
) => {
  const options: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, SECRET, options);
};

export const verifyToken = (token: string, ignoreExpiration: boolean = false) => {
  return jwt.verify(token, SECRET, { ignoreExpiration });
};
