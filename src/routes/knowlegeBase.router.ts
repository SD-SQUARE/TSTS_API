import { Router} from "express";
import { createKnowledgeBaseItem, deleteKnowledgeBaseItem, getKnowledgeBaseItemById, getKnowledgeBaseItems, updateKnowledgeBaseItem } from "../controllers/KnowlegeBase.controller.js";

const knowlegeBaseRouter = Router();
knowlegeBaseRouter.get("/", getKnowledgeBaseItems);
knowlegeBaseRouter.post("/", createKnowledgeBaseItem);
knowlegeBaseRouter.get("/:id", getKnowledgeBaseItemById);
knowlegeBaseRouter.put("/:id", updateKnowledgeBaseItem);
knowlegeBaseRouter.delete("/:id", deleteKnowledgeBaseItem);
export default knowlegeBaseRouter;
