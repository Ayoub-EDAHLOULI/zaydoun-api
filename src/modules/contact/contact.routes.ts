import { Router } from "express";
import { contactController } from "./contact.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { contactValidation } from "./contact.validation";

const router = Router();

router.post("/", validate(contactValidation.submit), contactController.submit);

export default router;
