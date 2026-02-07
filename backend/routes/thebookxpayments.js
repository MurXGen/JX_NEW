import express from "express";
import { createOrder } from "../controllers/thebookxpayment_controller";

const router = express.Router();

router.post("/create-order", createOrder);

export default router;
