import multer from "multer";
import path from "path";
import fs from "fs";

const AUDIO_DIR = path.join(process.cwd(), "public", "uploads", "audio");
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AUDIO_DIR),
  filename: (_req, file, cb) => {
    cb(null, `user-${Date.now()}${path.extname(file.originalname) || ".m4a"}`);
  },
});

export const audioUpload = multer({ storage });
