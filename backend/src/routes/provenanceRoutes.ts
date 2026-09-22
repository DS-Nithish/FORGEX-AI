import { Router, Request, Response, NextFunction } from "express";
import { getAllSources, getSourceById } from "../db/repositories/sourcesRepository";

const router = Router();

/**
 * GET /api/provenance/sources
 * Lists all registered sources in descending order of creation.
 */
router.get("/sources", (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sources = getAllSources();
    res.json(sources);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/provenance/sources/:id
 * Fetches a single registered source by ID. Returns 404 if not found.
 */
router.get("/sources/:id", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const source = getSourceById(id);

    if (!source) {
      res.status(404).json({ error: `Source not found with id: ${id}` });
      return;
    }

    res.json(source);
  } catch (error) {
    next(error);
  }
});

export default router;
