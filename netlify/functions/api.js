import "dotenv/config";
import { handleRequest } from "../../server/http/apiHandler.js";

export const handler = handleRequest;
