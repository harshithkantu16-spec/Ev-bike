import { Router, type IRouter } from "express";
import { GetAdminStatusResponse } from "@workspace/api-zod";
import { getSignedInEmail, isAdminEmail, requireSignedIn } from "../lib/auth";

const router: IRouter = Router();

router.get("/admin/status", requireSignedIn, async (req, res): Promise<void> => {
  const email = await getSignedInEmail(req);
  res.json(
    GetAdminStatusResponse.parse({
      isAdmin: isAdminEmail(email),
      email: email ?? "",
    }),
  );
});

export default router;