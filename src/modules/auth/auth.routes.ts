import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { authValidation } from "./auth.validation";

const router = Router();

router.post("/login", validate(authValidation.login), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);

router.get("/profile", authenticate, authController.getProfile);
router.put(
  "/profile",
  authenticate,
  validate(authValidation.updateProfile),
  authController.updateProfile,
);

export default router;
