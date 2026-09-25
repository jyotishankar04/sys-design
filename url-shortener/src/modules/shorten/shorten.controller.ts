import type { Request, Response } from "express";
import { ShortensService } from "./shorten.service";
import { ApiResponse } from "../../shared/response/api-response";
import { z } from "zod";
import { db } from "../../db";
import { urlsTable } from "../../db/schema";

const shortenSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
});



export class ShortensController {
  constructor(private readonly shortensService: ShortensService) { }

  create = async (req: Request, res: Response) => {
    const { url, title } = shortenSchema.parse(req.body);
    const data = await this.shortensService.create(url,title);

    return res
      .status(201)
      .json(ApiResponse.success("Shorten created successfully", data));
  };

  get = async (req: Request, res: Response) => {
    const { shortCode } = req.params;
    if(!shortCode || Array.isArray(shortCode)) return res.status(400).json(ApiResponse.error("ShortCode is required"));

    const data = await this.shortensService.get(shortCode);

    return res.status(200).json(ApiResponse.success("Shorten retrieved successfully", data));
  };

  getAll = async (req: Request, res: Response) => {
    const data = await this.shortensService.getAll();

    return res.status(200).json(ApiResponse.success("Shortens retrieved successfully", data));
  };
}
