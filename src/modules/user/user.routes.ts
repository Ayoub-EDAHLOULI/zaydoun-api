import { Router } from "express";
import { userController } from "./user.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { userValidation } from "./user.validation";

const router = Router();

router.use(authenticate);

router.get("/me", userController.getMe);
router.patch(
  "/me",
  validate(userValidation.updateUser),
  userController.updateMe,
);
router.delete("/me", userController.deleteMe);

export default router;
