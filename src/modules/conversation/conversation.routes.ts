import { Router } from "express";
import { conversationController } from "./conversation.controller";
import { validate } from "../../shared/middleware/validation.middleware";
import { authenticate } from "../../shared/middleware/auth.middleware";
import { conversationValidation } from "./conversation.validation";
import { audioUpload } from "../../shared/utils/audio-multer";

const router = Router();

router.use(authenticate);

router.get("/", conversationController.listConversations);
router.post(
  "/",
  validate(conversationValidation.createConversation),
  conversationController.createConversation,
);
router.get(
  "/:id",
  validate(conversationValidation.conversationId),
  conversationController.getConversation,
);
router.post(
  "/:id/talk",
  audioUpload.single("audio"), // The Multer middleware
  conversationController.talkToZaydoun,
);
router.post(
  "/:id/messages",
  validate(conversationValidation.addMessage),
  conversationController.addMessage,
);
router.delete(
  "/:id",
  validate(conversationValidation.conversationId),
  conversationController.deleteConversation,
);

export default router;
