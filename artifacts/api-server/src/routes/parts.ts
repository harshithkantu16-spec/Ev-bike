import { Router, type IRouter } from "express";
import { and, eq, ilike, or } from "drizzle-orm";
import { db, partsTable } from "@workspace/db";
import {
  CreatePartBody,
  CreatePartResponse,
  DeletePartParams,
  ListPartsQueryParams,
  ListPartsResponse,
  UpdatePartBody,
  UpdatePartParams,
  UpdatePartResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../lib/auth";

const router: IRouter = Router();

router.get("/parts", async (req, res): Promise<void> => {
  const parsedParams = ListPartsQueryParams.safeParse(req.query);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  const { search, category } = parsedParams.data;
  const filters = [];
  if (category) filters.push(eq(partsTable.category, category));
  if (search) {
    filters.push(
      or(
        ilike(partsTable.name, `%${search}%`),
        ilike(partsTable.category, `%${search}%`),
        ilike(partsTable.description, `%${search}%`),
      ),
    );
  }

  const parts = await db
    .select()
    .from(partsTable)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(partsTable.createdAt);

  res.json(ListPartsResponse.parse(parts));
});

router.post("/parts", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePartBody.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(parsed.data?.price)) {
    res.status(400).json({ error: parsed.success ? "Price must be a whole number" : parsed.error.message });
    return;
  }

  const [part] = await db
    .insert(partsTable)
    .values({
      ...parsed.data,
      imageUrl: parsed.data.imageUrl ?? null,
    })
    .returning();

  res.status(201).json(CreatePartResponse.parse(part));
});

router.patch("/parts/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdatePartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePartBody.safeParse(req.body);
  if (!parsed.success || (parsed.data.price !== undefined && !Number.isInteger(parsed.data.price))) {
    res.status(400).json({ error: parsed.success ? "Price must be a whole number" : parsed.error.message });
    return;
  }

  if (Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "At least one field is required" });
    return;
  }

  const [part] = await db
    .update(partsTable)
    .set({
      ...parsed.data,
      ...(parsed.data.imageUrl !== undefined
        ? { imageUrl: parsed.data.imageUrl }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(partsTable.id, params.data.id))
    .returning();

  if (!part) {
    res.status(404).json({ error: "Part not found" });
    return;
  }

  res.json(UpdatePartResponse.parse(part));
});

router.delete("/parts/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeletePartParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [part] = await db
    .delete(partsTable)
    .where(eq(partsTable.id, params.data.id))
    .returning({ id: partsTable.id });

  if (!part) {
    res.status(404).json({ error: "Part not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;