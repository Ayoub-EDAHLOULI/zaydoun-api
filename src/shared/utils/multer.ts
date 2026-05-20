import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter(_req, file, cb) {
    if (file.mimetype !== "application/pdf") {
      return cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only PDF files are allowed.`,
        ),
      );
    }
    cb(null, true);
  },
});

export { upload };
