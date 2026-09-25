import type { Request, Response } from "express";
import { ApiResponse } from "../../shared/response/api-response";

export class HealthController {
  static check(_req: Request, res: Response) {
    return res.status(200).json(
      ApiResponse.success("Server is healthy", {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
    );
  }
}
