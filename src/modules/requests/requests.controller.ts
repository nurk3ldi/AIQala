import { Request, Response } from 'express';

import { AssignRequestDto, CreateCommentDto, CreateRequestDto, RequestListQueryDto, UpdateCommentDto, UpdateRequestDto, UpdateRequestStatusDto } from './dto/request.dto';
import { RequestsService } from './requests.service';

export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  create = async (request: Request, response: Response): Promise<void> => {
    const createdRequest = await this.requestsService.createRequest(request.user!.id, request.body as CreateRequestDto);

    response.status(201).json({
      success: true,
      data: createdRequest,
    });
  };

  listMy = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.listMyRequests(request.user!.id, request.query as unknown as RequestListQueryDto);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  getMyById = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.getMyRequestById(request.user!.id, request.params.id as string);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  list = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.listRequests(request.user!, request.query as unknown as RequestListQueryDto);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  getById = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.getRequestDetail(request.user!, request.params.id as string);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  assign = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.assignRequest(request.params.id as string, request.body as AssignRequestDto);

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  update = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.updateRequest(
      request.user!,
      request.params.id as string,
      request.body as UpdateRequestDto,
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  updateStatus = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.updateRequestStatus(
      request.user!,
      request.params.id as string,
      request.body as UpdateRequestStatusDto,
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  addComment = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.addComment(
      request.user!,
      request.params.id as string,
      request.body as CreateCommentDto,
    );

    response.status(201).json({
      success: true,
      data: result,
    });
  };

  updateComment = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.updateComment(
      request.user!,
      request.params.id as string,
      request.params.commentId as string,
      request.body as UpdateCommentDto,
    );

    response.status(200).json({
      success: true,
      data: result,
    });
  };

  deleteComment = async (request: Request, response: Response): Promise<void> => {
    await this.requestsService.deleteComment(
      request.user!,
      request.params.id as string,
      request.params.commentId as string,
    );

    response.status(204).send();
  };

  addMedia = async (request: Request, response: Response): Promise<void> => {
    const result = await this.requestsService.addMedia(request.user!, request.params.id as string, request.file);

    response.status(201).json({
      success: true,
      data: result,
    });
  };

  delete = async (request: Request, response: Response): Promise<void> => {
    await this.requestsService.deleteRequest(request.user!, request.params.id as string);

    response.status(204).send();
  };
}
