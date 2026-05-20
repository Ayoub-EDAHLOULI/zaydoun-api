import { Router } from "express";
import { chunkController } from "./chunk.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { chunkValidation } from "./chunk.validation";

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  "/",
  validate(chunkValidation.bookId),
  chunkController.getChunksByBook,
);
router.get(
  "/page/:page",
  validate(chunkValidation.bookId),
  chunkController.getChunksByPage,
);

export default router;
