/**
 * Test-only Kane stand-ins. Imported by the gate only when CRITIQUE_TEST_MODE=1.
 * Not used in production.
 */

const INFRA_VERDICT = {
  ok: false,
  status: "failed",
  failureDetail:
    "member demo/dark_mode_toggle_test.md: chrome slot failed: All CDP ports 9222-9230 are in use. Close other Chrome instances.",
  testUrl: null,
  durationWallClock: 0,
  MOCKED: true,
};

export function stubVerdict(kind) {
  if (kind === "infra") return INFRA_VERDICT;
  if (kind === "fail") {
    return {
      ok: false,
      status: "failed",
      failureDetail:
        "Step 2 (Verify the page title is exactly ZZZ_CRITIQUE_FORCE_FAIL) failed: assert: expected title ZZZ_CRITIQUE_FORCE_FAIL, got KaneAI – Getting Started",
      testUrl: "https://test-manager.lambdatest.com/MOCKED",
      durationWallClock: 0,
      MOCKED: true,
    };
  }
  if (kind === "pass") {
    return { ok: true, status: "passed", failureDetail: null, testUrl: null, durationWallClock: 0, MOCKED: true };
  }
  if (kind === "throw") {
    throw new Error("CRITIQUE_TEST_MODE stub throw");
  }
  if (kind === "timeout") {
    return { ok: false, status: "timeout", failureDetail: "Kane timed out", testUrl: null, durationWallClock: 0, MOCKED: true };
  }
  if (kind === "error") {
    return { ok: false, status: "error", failureDetail: "Kane error", testUrl: null, durationWallClock: 0, MOCKED: true };
  }
  return null;
}
