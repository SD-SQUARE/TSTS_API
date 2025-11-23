import bcrypt from "bcrypt";

/**
 * Hashes a given password using bcrypt with a salt of 12 rounds.
 * @param {string} password - The password to be hashed.
 * @returns {Promise<string>} - A promise that resolves to the hashed password.
 */
export const hashPassword = async (password: string) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compares a given password with a hashed password using bcrypt.
 * @param {string} password - The password to be compared.
 * @param {string} hash - The hashed password to compare with.
 * @returns {Promise<boolean>} - A promise that resolves to true if the
 *   password matches the hash, false otherwise.
 */
export const comparePassword = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};

export const getRandomId = () => {
  return crypto.randomUUID();
};
