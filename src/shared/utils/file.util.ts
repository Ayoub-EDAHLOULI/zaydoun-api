import fs from "fs/promises";

export const fileUtils = {
  /**
   * Silently deletes a file. Wraps in a try/catch so if the file
   * is already gone, it doesn't crash your Express server.
   */
  async safeDelete(filePath: string | undefined) {
    if (!filePath) return;
    try {
      await fs.unlink(filePath);
      console.log(`🧹 [Cleanup] Deleted temporary file: ${filePath}`);
    } catch (error) {
      console.error(`⚠️ [Cleanup Error] Failed to delete ${filePath}:`, error);
    }
  },
};
