import { validateIspConfig } from "../config/env.js";

export function createCustomerController({ customerSummaryService }) {
  async function getCustomerSummary(req, res) {
    if (!validateIspConfig()) {
      return res.status(500).json({
        error: "Faltan variables ISP_API_KEY/ISP_CLIENT_ID/ISP_API_USER/ISP_API_PASS",
      });
    }

    try {
      const result = await customerSummaryService.getSummaryByDni(req.query.dni);

      if (result.error) {
        return res.status(result.status).json({ error: result.error });
      }

      return res.set("x-cache", result.cacheStatus).status(result.status).json(result.data);
    } catch (error) {
      console.error("Error en getCustomerSummary:", error);
      return res.status(502).json({ error: "falló consulta ISP", detail: error.message });
    }
  }

  return { getCustomerSummary };
}
