import express from "express";
import { validateRequest } from "zod-express-middleware";
import authMiddleware from "../middleware/auth-middleware.js";
import { createWorkspaceSchema } from "../libs/validate-schema.js";
import { createWorkspace, getWorkspaceDetails, getWorkspaces } from "../controller/workspace.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validateRequest({ body: createWorkspaceSchema }),
  createWorkspace
);
router.get("/", authMiddleware, getWorkspaces);
router.get("/:workspaceId", authMiddleware, getWorkspaceDetails);

export default router;
