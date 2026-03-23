import { Router } from "express";

export function createRoutes({ customerController, healthController }) {
  const router = Router();

  router.get("/health", healthController.health);
  router.get("/customer-summary", customerController.getCustomerSummary);

  return router;
}
