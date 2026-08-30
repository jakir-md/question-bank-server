/**
 * @file cq-ingestion.controller.test.ts
 * @description Unit tests for Creative Question (CQ) Ingestion Express Controller layer using Vitest.
 * Tests HTTP request parsing, response formatting, and error forwarding.
 */

import { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CQIngestionController } from "../cq-ingestion.controller";
import { CQIngestionService } from "../cq-ingestion.service";

vi.mock("../cq-ingestion.service", () => ({
  CQIngestionService: {
    ingestCQ: vi.fn(),
    getCQs: vi.fn(),
    getCQById: vi.fn(),
    updateCQ: vi.fn(),
    deleteCQ: vi.fn(),
    getCQStats: vi.fn(),
  },
}));

describe("CQ Ingestion Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    nextFunction = vi.fn();
  });

  describe("ingestCQ", () => {
    it("should respond with 201 when CQ package is created successfully", async () => {
      const mockResult = {
        id: "ctx-1",
        title: "গতিবিদ্যা উদ্দীপক",
        questions: [{ id: "q-1" }, { id: "q-2" }, { id: "q-3" }, { id: "q-4" }],
      };

      (CQIngestionService.ingestCQ as any).mockResolvedValue(mockResult);

      mockRequest = {
        body: {
          stimulus: { contextText: "উদ্দীপক..." },
          questions: [],
          totalMarks: 10,
        },
      };

      await CQIngestionController.ingestCQ(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(CQIngestionService.ingestCQ).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Creative Question (CQ) ingested successfully",
        meta: undefined,
        data: mockResult,
      });
    });

    it("should pass error to next function if service throws", async () => {
      const error = new Error("Database error");
      (CQIngestionService.ingestCQ as any).mockRejectedValue(error);

      mockRequest = { body: {} };

      await CQIngestionController.ingestCQ(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });

  describe("getCQs", () => {
    it("should parse query parameters and return 200 with paginated data", async () => {
      const mockData = {
        data: [{ id: "ctx-1", title: "দৃশ্যকল্প ১" }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      (CQIngestionService.getCQs as any).mockResolvedValue(mockData);

      mockRequest = {
        query: {
          search: "তড়িৎ",
          difficulty: "HARD",
          tags: "Board-2024, Physics",
          operator: "OR",
          isActive: "true",
          isPublished: "true",
          page: "1",
          limit: "10",
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      };

      await CQIngestionController.getCQs(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(CQIngestionService.getCQs).toHaveBeenCalledWith({
        search: "তড়িৎ",
        educationLevelId: undefined,
        subjectId: undefined,
        chapterId: undefined,
        topicId: undefined,
        difficulty: "HARD",
        tags: ["Board-2024", "Physics"],
        operator: "OR",
        isActive: true,
        isPublished: true,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Creative Questions retrieved successfully",
        meta: mockData.meta,
        data: mockData.data,
      });
    });
  });

  describe("getCQById", () => {
    it("should return single CQ with 200 status", async () => {
      const mockCQ = { id: "ctx-100", title: "তরঙ্গ উদ্দীপক" };
      (CQIngestionService.getCQById as any).mockResolvedValue(mockCQ);

      mockRequest = {
        params: { id: "ctx-100" },
      };

      await CQIngestionController.getCQById(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(CQIngestionService.getCQById).toHaveBeenCalledWith("ctx-100");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Creative Question retrieved successfully",
        meta: undefined,
        data: mockCQ,
      });
    });
  });

  describe("updateCQ", () => {
    it("should update CQ and return 200 status", async () => {
      const mockUpdated = { id: "ctx-100", title: "আপডেট উদ্দীপক" };
      (CQIngestionService.updateCQ as any).mockResolvedValue(mockUpdated);

      mockRequest = {
        params: { id: "ctx-100" },
        body: { stimulus: { title: "আপডেট উদ্দীপক" } },
      };

      await CQIngestionController.updateCQ(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(CQIngestionService.updateCQ).toHaveBeenCalledWith("ctx-100", mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Creative Question updated successfully",
        meta: undefined,
        data: mockUpdated,
      });
    });
  });

  describe("deleteCQ", () => {
    it("should delete CQ package and return 200 status", async () => {
      const mockDeleteRes = {
        success: true,
        message: "Creative Question set 'ctx-100' and its 4 sub-questions deleted successfully",
      };
      (CQIngestionService.deleteCQ as any).mockResolvedValue(mockDeleteRes);

      mockRequest = {
        params: { id: "ctx-100" },
      };

      await CQIngestionController.deleteCQ(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(CQIngestionService.deleteCQ).toHaveBeenCalledWith("ctx-100");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Creative Question deleted successfully",
        meta: undefined,
        data: mockDeleteRes,
      });
    });
  });

  describe("getCQStats", () => {
    it("should return aggregated statistics with 200 status", async () => {
      const mockStats = {
        totalCQSets: 15,
        totalSubQuestions: 60,
        cognitiveDistribution: {
          KNOWLEDGE: 15,
          COMPREHENSION: 15,
          APPLICATION: 15,
          HIGHER_ABILITY: 15,
        },
        difficultyDistribution: { EASY: 15, MEDIUM: 30, HARD: 15 },
        totalMarksLogged: 150,
        totalActive: 15,
        totalPublished: 15,
      };

      (CQIngestionService.getCQStats as any).mockResolvedValue(mockStats);

      mockRequest = {};

      await CQIngestionController.getCQStats(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(CQIngestionService.getCQStats).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Creative Question statistics fetched successfully",
        meta: undefined,
        data: mockStats,
      });
    });
  });
});
