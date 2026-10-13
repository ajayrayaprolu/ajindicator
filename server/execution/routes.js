import express from "express";
import { getExecutionService, ExecutionServiceError } from "./service.js";
import { OrderValidationError } from "./validation.js";

function hasAuthenticatedPrincipal(req) {
  return Boolean(
    req.user?.id ||
    req.user?.sub ||
    req.auth?.sub ||
    req.session?.user?.id ||
    req.session?.userId,
  );
}

function requireExecutionApiEnabled(_req, res, next) {
  // Safe rollout default: account data is not exposed until the app's real
  // authentication middleware is connected and this feature is explicitly enabled.
  if (process.env.AJ_EXECUTION_API_ENABLED !== "true") {
    return res.status(503).json({
      success: false,
      code: "EXECUTION_API_DISABLED",
      message: "Execution data API is disabled until application authentication is configured.",
    });
  }
  return next();
}

function requireUserIdentity(req, res, next) {
  // Do not provide a loopback bypass. This backend may be published through a
  // reverse proxy or tunnel, where a public request can arrive from loopback.
  if (!hasAuthenticatedPrincipal(req)) {
    return res.status(401).json({
      success: false,
      code: "AUTHENTICATION_REQUIRED",
      message: "Execution endpoints require an authenticated application user.",
    });
  }
  return next();
}

function handleError(res, error) {
  const status = Number(error?.httpStatus ?? 500);
  const code = String(error?.code ?? "EXECUTION_API_ERROR");
  const safeMessage = error instanceof OrderValidationError || error instanceof ExecutionServiceError
    ? error.message
    : status >= 500
      ? "The broker operation failed. Check server diagnostics and sync status."
      : String(error?.message ?? "Request failed.");
  return res.status(status).json({ success: false, code, message: safeMessage });
}

export function createExecutionRouter({ service = null } = {}) {
  const router = express.Router();
  const resolveService = async () => service ?? await getExecutionService();
  router.use(requireExecutionApiEnabled, requireUserIdentity);

  router.get("/status", (_req, res) => {
    return res.json({
      success: true,
      feature: "execution",
      supportedReadBrokers: ["fyers"],
      liveOrderSubmissionEnabled: false,
      liveCancelEnabled: false,
      liveModifyEnabled: false,
      mode: "READ_ONLY_RECONCILIATION_AND_DRY_RUN",
    });
  });

  router.get("/snapshot", async (req, res) => {
    try {
      const snapshot = await (await resolveService()).syncSnapshot(req.query.broker ?? "fyers");
      return res.json(snapshot);
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/sync", async (req, res) => {
    try {
      const snapshot = await (await resolveService()).syncSnapshot(req.body?.broker ?? "fyers", { force: true });
      return res.json(snapshot);
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get("/orders", async (req, res) => {
    try {
      const snapshot = (await resolveService()).getStoredSnapshot(req.query.broker ?? "fyers");
      return res.json({ success: true, broker: snapshot.broker, orders: snapshot.data.orders, sync: snapshot.sync });
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get("/trades", async (req, res) => {
    try {
      const snapshot = (await resolveService()).getStoredSnapshot(req.query.broker ?? "fyers");
      return res.json({ success: true, broker: snapshot.broker, trades: snapshot.data.trades, sync: snapshot.sync });
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.get("/positions", async (req, res) => {
    try {
      const snapshot = (await resolveService()).getStoredSnapshot(req.query.broker ?? "fyers");
      return res.json({ success: true, broker: snapshot.broker, positions: snapshot.data.positions, pnl: snapshot.data.pnl, sync: snapshot.sync });
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/orders", async (req, res) => {
    try {
      const result = (await resolveService()).createDryRunOrderIntent({
        broker: req.body?.broker ?? "fyers",
        order: req.body ?? {},
      });
      return res.status(201).json(result);
    } catch (error) {
      return handleError(res, error);
    }
  });

  router.post("/orders/:orderId/cancel", (_req, res) => {
    return handleError(res, new ExecutionServiceError(
      "Live order cancellation is disabled pending broker reconciliation and exit-safety tests.",
      { code: "LIVE_EXECUTION_DISABLED", httpStatus: 423 },
    ));
  });

  router.patch("/orders/:orderId", (_req, res) => {
    return handleError(res, new ExecutionServiceError(
      "Live order modification is disabled pending broker reconciliation and exit-safety tests.",
      { code: "LIVE_EXECUTION_DISABLED", httpStatus: 423 },
    ));
  });

  return router;
}

export default createExecutionRouter;
