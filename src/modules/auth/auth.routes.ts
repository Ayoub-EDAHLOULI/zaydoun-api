import { Router } from "express";
import { authController } from "./auth.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { authValidation } from "./auth.validation";

const router = Router();

router.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);
router.post("/login", validate(authValidation.login), authController.login);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.post(
  "/forgot-password",
  validate(authValidation.forgotPassword),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  validate(authValidation.resetPassword),
  authController.resetPassword,
);

router.get("/profile", authenticate, authController.getProfile);
router.patch(
  "/profile",
  authenticate,
  validate(authValidation.updateProfile),
  authController.updateProfile,
);
router.patch(
  "/change-password",
  authenticate,
  validate(authValidation.changePassword),
  authController.changePassword,
);

export default router;
