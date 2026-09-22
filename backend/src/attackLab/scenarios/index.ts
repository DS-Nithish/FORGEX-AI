import { AttackScenario, LegitimateScenario } from "../types";
import { scenario1DirectOverride } from "./scenario1_directOverride";
import { scenario2FakeSystem } from "./scenario2_fakeSystem";
import { scenario3IndirectStaged } from "./scenario3_indirectStaged";
import { scenario4LowRiskSmuggling } from "./scenario4_lowRiskSmuggling";
import { scenario5ObfuscatedPayload } from "./scenario5_obfuscatedPayload";
import { benign1CleanSpec } from "./benign1_cleanSpec";
import { benign2TrustedOverlap } from "./benign2_trustedOverlap";
import { legit1DirectHighRisk } from "./legit1_directHighRisk";
import { legit2LowRiskRoutine } from "./legit2_lowRiskRoutine";
import { legit3TrustedOverlap } from "./legit3_trustedOverlap";
import { legit4MultiStepTrusted } from "./legit4_multiStepTrusted";
import { legit5UserAuthorizedMedium } from "./legit5_userAuthorizedMedium";

export {
  scenario1DirectOverride,
  scenario2FakeSystem,
  scenario3IndirectStaged,
  scenario4LowRiskSmuggling,
  scenario5ObfuscatedPayload,
  benign1CleanSpec,
  benign2TrustedOverlap,
  legit1DirectHighRisk,
  legit2LowRiskRoutine,
  legit3TrustedOverlap,
  legit4MultiStepTrusted,
  legit5UserAuthorizedMedium,
};

export const MALICIOUS_SCENARIOS: AttackScenario[] = [
  scenario1DirectOverride,
  scenario2FakeSystem,
  scenario3IndirectStaged,
  scenario4LowRiskSmuggling,
  scenario5ObfuscatedPayload,
];

export const BENIGN_SCENARIOS: AttackScenario[] = [
  benign1CleanSpec,
  benign2TrustedOverlap,
];

export const ALL_ATTACK_SCENARIOS: AttackScenario[] = [
  ...MALICIOUS_SCENARIOS,
  ...BENIGN_SCENARIOS,
];

export const LEGITIMATE_SCENARIOS: LegitimateScenario[] = [
  legit1DirectHighRisk,
  legit2LowRiskRoutine,
  legit3TrustedOverlap,
  legit4MultiStepTrusted,
  legit5UserAuthorizedMedium,
];

export function getScenarioById(id: string): AttackScenario | undefined {
  return ALL_ATTACK_SCENARIOS.find((scenario) => scenario.id === id);
}

export function getLegitimateScenarioById(id: string): LegitimateScenario | undefined {
  return LEGITIMATE_SCENARIOS.find((scenario) => scenario.id === id);
}
