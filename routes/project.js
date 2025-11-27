import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import { validateRequest } from "zod-express-middleware";
import { projectSchema, updateProjectSchema } from "../libs/validate-schema.js";
import { z } from "zod";
import { createProject, getProjectDetails, getProjectTasks, updateProject } from "../controller/project.js";

const router = express.Router();

router.post(
  "/:workspaceId/create-project",
  authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string(),
    }),
    body: projectSchema,
  }),
  createProject
);

router.get(
  "/:projectId",
  authMiddleware,
  validateRequest({
    params: z.object({ projectId: z.string() }),
  }),
  getProjectDetails
);

router.put(
  "/:projectId",
  authMiddleware,
  validateRequest({
    params: z.object({ projectId: z.string() }),
    body: updateProjectSchema,
  }),
  updateProject
);

router.get(
  "/:projectId/tasks",
  authMiddleware,
  validateRequest({ params: z.object({ projectId: z.string() }) }),
  getProjectTasks
);

export default router;
