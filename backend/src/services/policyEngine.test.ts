import { describe, it, expect } from "vitest";
import { evaluatePolicy, PolicyInput, POLICY_RULES } from "./policyEngine";

describe("Policy Engine (evaluatePolicy)", () => {
  describe("Demo Scenarios", () => {
    it("Demo 1 (happy path): trusted + not tainted + HIGH risk + userAuthorized → CONFIRM", () => {
      const input: PolicyInput = {
        trustLevel: "trusted",
        tainted: false,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: true,
      };

      const decision = evaluatePolicy(input);

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_4);
      expect(decision.reasoning).toBeTruthy();
    });

    it("Demo 2 (attack path): untrusted + tainted + HIGH risk → BLOCK", () => {
      const input: PolicyInput = {
        trustLevel: "untrusted",
        tainted: true,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: false,
      };

      const decision = evaluatePolicy(input);

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_1);
      expect(decision.reasoning).toContain("tainted");
    });

    it("LOW risk + not tainted + trusted → ALLOW", () => {
      const input: PolicyInput = {
        trustLevel: "trusted",
        tainted: false,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: false,
      };

      const decision = evaluatePolicy(input);

      expect(decision.decision).toBe("ALLOW");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_6);
      expect(decision.reasoning).toBeTruthy();
    });
  });

  describe("Unknown Tool Fail-Closed Protection (Rule 7)", () => {
    it("blocks unrecognized tool regardless of other inputs (trusted, untainted, userAuthorized)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: false,
        risk: "CRITICAL",
        riskKnown: false,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_7);
      expect(decision.reasoning).toContain("Unrecognized or unregistered tool");
    });

    it("blocks unrecognized tool even if low risk and untainted", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: false,
        risk: "LOW",
        riskKnown: false,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_7);
    });

    it("blocks unrecognized tool when untrusted and tainted", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: true,
        risk: "MEDIUM",
        riskKnown: false,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_7);
    });

    it("blocks unrecognized tool when tainted with low risk", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "LOW",
        riskKnown: false,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_7);
    });
  });

  describe("Individual Rules in Isolation", () => {
    it("Rule 1: tainted === true AND risk in [HIGH, CRITICAL] → BLOCK (HIGH risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_1);
      expect(decision.reasoning).toContain("tainted");
    });

    it("Rule 1: tainted === true AND risk in [HIGH, CRITICAL] → BLOCK (CRITICAL risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "CRITICAL",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_1);
      expect(decision.reasoning).toContain("CRITICAL");
    });

    it("Rule 2: tainted === true AND risk in [LOW, MEDIUM] → CONFIRM (LOW risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_2);
      expect(decision.reasoning).toContain("LOW");
    });

    it("Rule 2: tainted === true AND risk in [LOW, MEDIUM] → CONFIRM (MEDIUM risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "MEDIUM",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_2);
      expect(decision.reasoning).toContain("MEDIUM");
    });

    it("Rule 3: trustLevel === 'untrusted' AND risk === 'CRITICAL' → BLOCK", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "CRITICAL",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_3);
      expect(decision.reasoning).toContain("untrusted");
    });

    it("Rule 4: trustLevel === 'trusted' AND risk in [HIGH, CRITICAL] → CONFIRM (HIGH risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: false,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_4);
      expect(decision.reasoning).toContain("HIGH");
    });

    it("Rule 4: trustLevel === 'trusted' AND risk in [HIGH, CRITICAL] → CONFIRM (CRITICAL risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: false,
        risk: "CRITICAL",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_4);
      expect(decision.reasoning).toContain("CRITICAL");
    });

    it("Rule 5: userAuthorized === true AND risk in [LOW, MEDIUM] → ALLOW (LOW risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("ALLOW");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_5);
      expect(decision.reasoning).toContain("user-authorized");
    });

    it("Rule 5: userAuthorized === true AND risk in [LOW, MEDIUM] → ALLOW (MEDIUM risk)", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "MEDIUM",
        riskKnown: true,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("ALLOW");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_5);
      expect(decision.reasoning).toContain("MEDIUM");
    });

    it("Rule 6: risk === 'LOW' AND tainted === false → ALLOW (not user authorized, untrusted source)", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("ALLOW");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_6);
      expect(decision.reasoning).toContain("low risk");
    });

    it("Rule 7: risk.known === false (unrecognized tool) → BLOCK (in isolation)", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "MEDIUM",
        riskKnown: false,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_7);
      expect(decision.reasoning).toContain("Unrecognized");
    });

    it("Rule 8: default fallback → CONFIRM (untrusted, untainted, medium risk, unauthorized)", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "MEDIUM",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_8);
      expect(decision.reasoning).toContain("fallback");
    });

    it("Rule 8: default fallback → CONFIRM (untrusted, untainted, high risk, unauthorized)", () => {
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: false,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_8);
    });
  });

  describe("Rule Priority and Precedence Order", () => {
    it("Rule 1 beats Rule 3 when untrusted + tainted + CRITICAL risk (Rule 1 wins)", () => {
      // Both Rule 1 (tainted + CRITICAL -> BLOCK) and Rule 3 (untrusted + CRITICAL -> BLOCK) match.
      const decision = evaluatePolicy({
        trustLevel: "untrusted",
        tainted: true,
        risk: "CRITICAL",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_1);
    });

    it("Rule 1 (BLOCK) beats Rule 4 (CONFIRM) when trusted + tainted + HIGH risk", () => {
      // Rule 1: tainted + HIGH -> BLOCK
      // Rule 4: trusted + HIGH -> CONFIRM
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_1);
    });

    it("Rule 1 (BLOCK) beats Rule 5 (ALLOW) when userAuthorized + tainted + HIGH risk", () => {
      // Attacker manipulates a command that user authorized, but taint check flags it
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("BLOCK");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_1);
    });

    it("Rule 2 (CONFIRM) beats Rule 5 (ALLOW) when userAuthorized + tainted + LOW risk", () => {
      // Rule 2: tainted + LOW -> CONFIRM
      // Rule 5: userAuthorized + LOW -> ALLOW
      // Priority requires CONFIRM over ALLOW for tainted requests
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_2);
    });

    it("Rule 2 (CONFIRM) beats Rule 6 (ALLOW) when tainted + LOW risk", () => {
      // Rule 2: tainted + LOW -> CONFIRM
      // Rule 6: LOW risk + NOT tainted -> only matches when untainted
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: true,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: false,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_2);
    });

    it("Rule 4 (CONFIRM) beats Rule 5 when trusted + userAuthorized + HIGH risk", () => {
      // HIGH risk requires human confirmation even if user initiated it
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: false,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("CONFIRM");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_4);
    });

    it("Rule 5 (ALLOW) beats Rule 6 (ALLOW) when userAuthorized + untainted + LOW risk", () => {
      const decision = evaluatePolicy({
        trustLevel: "trusted",
        tainted: false,
        risk: "LOW",
        riskKnown: true,
        userAuthorized: true,
      });

      expect(decision.decision).toBe("ALLOW");
      expect(decision.matchedRule).toBe(POLICY_RULES.RULE_5);
    });
  });

  describe("Explainability and Determinism Guarantees (FR-11)", () => {
    it("returns non-empty matchedRule and reasoning for every rule path", () => {
      const inputs: PolicyInput[] = [
        {
          trustLevel: "trusted",
          tainted: true,
          risk: "HIGH",
          riskKnown: true,
          userAuthorized: false,
        },
        {
          trustLevel: "trusted",
          tainted: true,
          risk: "LOW",
          riskKnown: true,
          userAuthorized: false,
        },
        {
          trustLevel: "untrusted",
          tainted: false,
          risk: "CRITICAL",
          riskKnown: true,
          userAuthorized: false,
        },
        {
          trustLevel: "trusted",
          tainted: false,
          risk: "HIGH",
          riskKnown: true,
          userAuthorized: false,
        },
        {
          trustLevel: "trusted",
          tainted: false,
          risk: "LOW",
          riskKnown: true,
          userAuthorized: true,
        },
        {
          trustLevel: "untrusted",
          tainted: false,
          risk: "LOW",
          riskKnown: true,
          userAuthorized: false,
        },
        {
          trustLevel: "trusted",
          tainted: false,
          risk: "MEDIUM",
          riskKnown: false,
          userAuthorized: false,
        },
        {
          trustLevel: "untrusted",
          tainted: false,
          risk: "MEDIUM",
          riskKnown: true,
          userAuthorized: false,
        },
      ];

      for (const input of inputs) {
        const result = evaluatePolicy(input);
        expect(result.decision).toMatch(/^(ALLOW|CONFIRM|BLOCK)$/);
        expect(result.matchedRule).toBeTruthy();
        expect(typeof result.matchedRule).toBe("string");
        expect(result.matchedRule.length).toBeGreaterThan(5);
        expect(result.reasoning).toBeTruthy();
        expect(typeof result.reasoning).toBe("string");
        expect(result.reasoning.length).toBeGreaterThan(10);
      }
    });

    it("is completely deterministic: calling evaluatePolicy 100 times returns identical results", () => {
      const input: PolicyInput = {
        trustLevel: "trusted",
        tainted: false,
        risk: "HIGH",
        riskKnown: true,
        userAuthorized: true,
      };

      const first = evaluatePolicy(input);
      for (let i = 0; i < 100; i++) {
        const next = evaluatePolicy(input);
        expect(next).toEqual(first);
      }
    });

    it("normalizes uppercase and lowercase trust levels identically", () => {
      const inputLower: PolicyInput = {
        trustLevel: "untrusted",
        tainted: false,
        risk: "CRITICAL",
        riskKnown: true,
        userAuthorized: false,
      };

      const inputUpper: PolicyInput = {
        trustLevel: "UNTRUSTED",
        tainted: false,
        risk: "CRITICAL",
        riskKnown: true,
        userAuthorized: false,
      };

      const resLower = evaluatePolicy(inputLower);
      const resUpper = evaluatePolicy(inputUpper);

      expect(resLower).toEqual(resUpper);
      expect(resLower.decision).toBe("BLOCK");
    });
  });
});
