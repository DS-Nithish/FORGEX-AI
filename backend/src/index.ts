import express from "express";
import cors from "cors";
import { config, logger } from "./shared";
import { initDatabase } from "./db";
import gatewayRoutes from "./routes/gatewayRoutes";
import agentRoutes from "./routes/agentRoutes";
import provenanceRoutes from "./routes/provenanceRoutes";
import firewallRoutes from "./routes/firewallRoutes";
import approvalRoutes from "./routes/approvalRoutes";
import eventRoutes from "./routes/eventRoutes";
import attackLabRoutes from "./routes/attackLabRoutes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Gateway, Content, Agent, Provenance, Firewall, Approvals, Events, and Attack Lab routes
app.use("/api", gatewayRoutes);
app.use("/api", agentRoutes);
app.use("/api/provenance", provenanceRoutes);
app.use("/api/firewall", firewallRoutes);
app.use("/api/approvals", approvalRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/attack-lab", attackLabRoutes);

// Centralized error handling
app.use(errorHandler);

// Start
async function main() {
  // Connect to database
  await initDatabase();
  logger.info("Database schema initialized");

  logger.warn(
    "WARNING: /api/tool/execute currently bypasses AgentShield and is for manual testing only. This will be replaced in Phase 15.",
  );

  app.listen(config.PORT, () => {
    logger.info(`AgentShield backend running on http://localhost:${config.PORT}`);
  });
}

if (!process.env.VITEST) {
  main().catch((err) => {
    logger.error("Failed to start:", err);
    process.exit(1);
  });
}

export { app };
