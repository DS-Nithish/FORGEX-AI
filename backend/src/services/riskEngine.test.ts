import { describe, it, expect } from "vitest";
import { getRisk } from "./riskEngine";

describe("Risk Engine (PRD Section 8.3)", () => {
  it("returns the correct fixed risk level for each of the 5 MVP tools", () => {
    // search_web -> LOW
    const searchRisk = getRisk("search_web");
    expect(searchRisk).toEqual({
      risk: "LOW",
      known: true,
    });

    // read_pdf -> LOW
    const readPdfRisk = getRisk("read_pdf");
    expect(readPdfRisk).toEqual({
      risk: "LOW",
      known: true,
    });

    // send_email -> MEDIUM
    const sendEmailRisk = getRisk("send_email");
    expect(sendEmailRisk).toEqual({
      risk: "MEDIUM",
      known: true,
    });

    // create_database -> HIGH
    const createDbRisk = getRisk("create_database");
    expect(createDbRisk).toEqual({
      risk: "HIGH",
      known: true,
    });

    // delete_file -> CRITICAL
    const deleteFileRisk = getRisk("delete_file");
    expect(deleteFileRisk).toEqual({
      risk: "CRITICAL",
      known: true,
    });
  });

  it("fails closed: returns { risk: 'CRITICAL', known: false } for unknown tools", () => {
    // Unrecognized tool name must fail-closed to CRITICAL with known: false
    const unknownResult = getRisk("unknown_exploit_tool");
    expect(unknownResult).toEqual({
      risk: "CRITICAL",
      known: false,
    });

    // Also handles empty or invalid string safely
    const emptyResult = getRisk("");
    expect(emptyResult).toEqual({
      risk: "CRITICAL",
      known: false,
    });
  });

  it("is a pure deterministic function (calling twice with the same tool name returns identical result)", () => {
    const run1 = getRisk("create_database");
    const run2 = getRisk("create_database");
    expect(run1).toEqual(run2);

    const unknownRun1 = getRisk("non_existent_tool");
    const unknownRun2 = getRisk("non_existent_tool");
    expect(unknownRun1).toEqual(unknownRun2);
  });

  it("handles case-insensitivity and whitespace trimming gracefully", () => {
    expect(getRisk(" CREATE_DATABASE ")).toEqual({
      risk: "HIGH",
      known: true,
    });
    expect(getRisk("Search_Web")).toEqual({
      risk: "LOW",
      known: true,
    });
  });
});
