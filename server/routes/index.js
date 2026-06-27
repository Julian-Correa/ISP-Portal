import { Router } from "express";

export function createRoutes({ customerController, healthController }) {
  const router = Router();

  router.get("/health", healthController.health);
  router.get("/customer-summary", customerController.getCustomerSummary);
  router.put("/customers/:dni/email", customerController.updateCustomerEmail);

  return router;
}
