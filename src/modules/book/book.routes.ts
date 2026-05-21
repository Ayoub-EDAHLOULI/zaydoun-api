import { Router } from "express";
import { bookController } from "./book.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { upload } from "../../shared/utils/multer";
import { bookValidation } from "./book.validation";

const router = Router();

router.use(authenticate);

router.get("/", bookController.listBooks);
router.get("/:id", validate(bookValidation.bookId), bookController.getBook);
router.post(
  "/",
  upload.single("file"),
  validate(bookValidation.createBook),
  bookController.uploadBook,
);
router.delete(
  "/:id",
  validate(bookValidation.bookId),
  bookController.deleteBook,
);
router.post(
  "/:id/process",
  validate(bookValidation.bookId),
  bookController.processBook,
);

export default router;
