/**
 * @file taxonomy-tree.controller.ts
 * @description Controller layer for Taxonomy Tree, Lineage, and Stats (MVC - Controller).
 * Complies with Essential TypeScript standards and TSDoc documentation.
 */

import { Request, Response } from "express";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../../shared/sendResponse";
import { TaxonomyTreeService } from "./taxonomy-tree.service";

/**
 * Controller to fetch the full 4-tier taxonomy tree.
 */
export const getFullTaxonomyTree = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const onlyActive = req.query.onlyActive === "true";
    const result = await TaxonomyTreeService.getFullTaxonomyTree(onlyActive);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Taxonomy tree fetched successfully",
      meta: {
        page: 1,
        limit: result.tree.length,
        total: result.tree.length,
      },
      data: result,
    });
  },
);

/**
 * Controller to resolve lineage / breadcrumbs for a given Topic ID.
 */
export const getTopicLineage = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const topicId = Array.isArray(req.params.topicId) ? req.params.topicId[0] : req.params.topicId;
    const result = await TaxonomyTreeService.getTopicLineage(topicId);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Topic lineage resolved successfully",
      data: result,
    });
  },
);

/**
 * Controller to fetch aggregated taxonomy statistics.
 */
export const getTaxonomyStats = catchAsync(
  async (req: Request, res: Response): Promise<void> => {
    const result = await TaxonomyTreeService.getTaxonomyStats();

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Taxonomy statistics fetched successfully",
      data: result,
    });
  },
);

export const TaxonomyTreeController = {
  getFullTaxonomyTree,
  getTopicLineage,
  getTaxonomyStats,
};
