import { Request, Response } from "express";
import { ResponseStatus } from "../enums/ResponseStatus.enum.js";
import { CustomFormService } from "../services/CustomFormService.js";

const buildExportFilename = (title: string) =>
  `${title || "form-responses"}`
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase()
    .slice(0, 80) || "form_responses";

export class CustomFormController {
  static async create(req: Request, res: Response) {
    const form = await CustomFormService.createForm(req.body, (req as any).user);

    return res.status(ResponseStatus.CREATED).json({
      data: form,
      message: "Form created successfully",
    });
  }

  static async list(req: Request, res: Response) {
    const isGlobal =
      req.query.isGlobal === undefined
        ? undefined
        : req.query.isGlobal === "true";
    const ticketId = req.query.ticketId as string | undefined;

    const forms = await CustomFormService.getForms({
      isGlobal,
      ticketId,
      creatorId: (req as any).user?.id,
    });

    return res.status(ResponseStatus.SUCCESS).json({
      data: forms,
    });
  }

  static async getOne(req: Request, res: Response) {
    const form = await CustomFormService.getFormById(req.params.id);

    return res.status(ResponseStatus.SUCCESS).json({
      data: form,
    });
  }

  static async update(req: Request, res: Response) {
    const form = await CustomFormService.updateForm(req.params.id, req.body);

    return res.status(ResponseStatus.SUCCESS).json({
      data: form,
      message: "Form updated successfully",
    });
  }

  static async delete(req: Request, res: Response) {
    await CustomFormService.deleteForm(req.params.id);

    return res.status(ResponseStatus.SUCCESS).json({
      message: "Form deleted successfully",
    });
  }

  static async duplicateToTicket(req: Request, res: Response) {
    const form = await CustomFormService.duplicateToTicket(
      req.params.id,
      req.body,
      (req as any).user,
    );

    return res.status(ResponseStatus.CREATED).json({
      data: form,
      message: "Form attached to ticket successfully",
    });
  }

  static async createShareLink(req: Request, res: Response) {
    const shareLink = await CustomFormService.createShareLink(
      req.params.id,
      req.body?.expiresInHours,
    );

    return res.status(ResponseStatus.SUCCESS).json({
      data: shareLink,
    });
  }

  static async getByToken(req: Request, res: Response) {
    const form = await CustomFormService.getFormByShareToken(req.params.token);

    return res.status(ResponseStatus.SUCCESS).json({
      data: form,
    });
  }

  static async submit(req: Request, res: Response) {
    const response = await CustomFormService.submitResponse(
      req.params.id,
      req.body,
      (req as any).user,
    );

    return res.status(ResponseStatus.CREATED).json({
      data: response,
      message: "Response submitted successfully",
    });
  }

  static async submitPublic(req: Request, res: Response) {
    const response = await CustomFormService.submitPublicResponse(
      req.params.token,
      req.body,
    );

    return res.status(ResponseStatus.CREATED).json({
      data: response,
      message: "Response submitted successfully",
    });
  }

  static async getResponses(req: Request, res: Response) {
    const responses = await CustomFormService.getResponses(req.params.id);

    return res.status(ResponseStatus.SUCCESS).json({
      data: responses,
    });
  }

  static async exportResponses(req: Request, res: Response) {
    const { workbook, title } = await CustomFormService.exportResponsesWorkbook(
      req.params.id,
    );
    const filename = `${buildExportFilename(title)}_responses.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  }
}
