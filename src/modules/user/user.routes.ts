import { Router } from "express";
import { userController } from "./user.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import {
  authenticate,
  requireRole,
} from "../../shared/middleware/auth.middleware";
import { userValidation } from "./user.validation";

const router = Router();

router.use(authenticate);

// ── Self routes ────────────────────────────────────────────────────────────
router.get("/me", userController.getMe);
router.get("/me/stats", userController.getStats);
router.patch(
  "/me",
  validate(userValidation.updateUser),
  userController.updateMe,
);
router.delete("/me", userController.deleteMe);

// ── Admin routes ───────────────────────────────────────────────────────────
router.get("/", requireRole("ADMIN"), userController.listUsers);
router.patch("/:id/role", requireRole("ADMIN"), userController.updateRole);
router.delete("/:id", requireRole("ADMIN"), userController.adminDeleteUser);

export default router;
