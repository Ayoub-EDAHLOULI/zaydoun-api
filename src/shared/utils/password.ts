import bcrypt from "bcryptjs";

export const passwordUtils = {
  /**
   * Hashes a plain text password
   */
  hash: async (password: string): Promise<string> => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  },

  /**
   * Compares a plain text password with a hash
   */
  compare: async (plain: string, hashed: string): Promise<boolean> => {
    return bcrypt.compare(plain, hashed);
  },
};
