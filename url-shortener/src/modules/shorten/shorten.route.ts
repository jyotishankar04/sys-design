import { Router } from "express";
import { ShortensService } from "./shorten.service";

import { ShortensController } from "./shorten.controller";
import { db } from "../../db";

const router = Router();
const shortensService = new ShortensService(db);
const shortensController = new ShortensController(shortensService);

router.post("/", shortensController.create);
router.get("/:shortCode", shortensController.get);
router.get("/", shortensController.getAll);

export default router;
