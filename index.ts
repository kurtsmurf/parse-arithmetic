// @ts-ignore
import deepequal from "https://cdn.skypack.dev/deepequal";

// TYPES

namespace Lexing {
  type TokenType = "reference" | "operator" | "number" | "parenthetical";
  type Token = { type: TokenType; value: string };
  type Error = "ERROR";

  type MatchFn = (input: string) => Token | Error;
  type MunchFn = (input: string) => [Token, string] | Error;
  type LexFn = (input: string) => Token[] | Error;

  // IMPLEMENTATION
  const matchers: [TokenType, RegExp][] = [
    ["reference", /^([A-Z])\1*[1-9][0-9]*/],
    ["number", /^\d+/],
    ["operator", /^[+\-*/]/],
    ["parenthetical", /^\(.*\)/],
  ];

  const match: MatchFn = (input) => {
    for (const [type, regExp] of matchers) {
      const value = regExp.exec(input)?.[0];
      if (value) return { type, value };
    }
    return "ERROR";
  };

  const munch: MunchFn = (input) => {
    const trimmed = input.trim();
    const matchResult = match(trimmed);
    if (matchResult === "ERROR") return matchResult;
    const rest = trimmed.slice(matchResult.value.length);
    const token = matchResult.type === "parenthetical"
      // remove parens from value
      ? { ...matchResult, value: matchResult.value.slice(1, -1) }
      : matchResult;
    return [token, rest];
  };

  const lexShallow: LexFn = (input) => {
    let remaining = input;
    let result = [];
    while (remaining.length > 0) {
      const munchResult = munch(remaining);
      if (munchResult === "ERROR") return munchResult;
      const [head, rest] = munchResult;
      result.push(head);
      remaining = rest;
    }
    return result;
  };

  export const lex = (input: string): any => {
    const result = lexShallow(input);
    if (result === "ERROR") return result;
    for (const [index, token] of result.entries()) {
      if (token.type === "parenthetical") {
        const value = result[index].value;
        // @ts-ignore
        delete result[index].value;
        const tokens = lex(value);
        if (tokens === "ERROR") return tokens;
        // @ts-ignore
        result[index].tokens = tokens;
      }
    }

    return result;
  };
}

// TESTS

type TestCase = {
  fn: (x: any) => any;
  input: any;
  expected: any;
};

const test = ({ fn, input, expected }: TestCase) => {
  const actual = fn(input);
  const passed = deepequal(expected, actual);
  console.log(passed ? "✅" : "❌", "TEST");
  if (!passed) {
    console.log("input:   ", input);
    console.log("expected:", JSON.stringify(expected, null, 2));
    console.log("actual:  ", JSON.stringify(actual, null, 2));
  }
};

const testCases: TestCase[] = [
  {
    input: "A1",
    expected: [{ type: "reference", value: "A1" }],
    fn: Lexing.lex,
  },
  {
    input: "+",
    expected: [{ type: "operator", value: "+" }],
    fn: Lexing.lex,
  },
  {
    input: "1",
    expected: [{ type: "number", value: "1" }],
    fn: Lexing.lex,
  },
  {
    input: "  1234!#$*",
    expected: "ERROR",
    fn: Lexing.lex,
  },
  {
    input: "A01",
    expected: "ERROR",
    fn: Lexing.lex,
  },
  {
    input: "AB",
    expected: "ERROR",
    fn: Lexing.lex,
  },
  {
    input: "A1 + 17",
    expected: [
      { type: "reference", value: "A1" },
      { type: "operator", value: "+" },
      { type: "number", value: "17" },
    ],
    fn: Lexing.lex,
  },
  {
    input: "A1 + !",
    expected: "ERROR",
    fn: Lexing.lex,
  },
  {
    input: "AA12 * (1 + 2) - 123 / B7",
    expected: [
      { type: "reference", value: "AA12" },
      { type: "operator", value: "*" },
      {
        type: "parenthetical",
        tokens: [
          { type: "number", value: "1" },
          { type: "operator", value: "+" },
          { type: "number", value: "2" },
        ],
      },
      { type: "operator", value: "-" },
      { type: "number", value: "123" },
      { type: "operator", value: "/" },
      { type: "reference", value: "B7" },
    ],
    fn: Lexing.lex,
  },
  {
    input: "1 + (1 + (1 + 1))",
    expected: [
      { type: "number", value: "1" },
      { type: "operator", value: "+" },
      {
        type: "parenthetical",
        tokens: [
          { type: "number", value: "1" },
          { type: "operator", value: "+" },
          {
            type: "parenthetical",
            tokens: [
              { type: "number", value: "1" },
              { type: "operator", value: "+" },
              { type: "number", value: "1" },
            ],
          },
        ],
      },
    ],
    fn: Lexing.lex,
  },
  {
    input: "1 + (!@#$)",
    expected: "ERROR",
    fn: Lexing.lex,
  },
  {
    input: "-1",
    expected: [
      { type: "operator", value: "-" },
      { type: "number", value: "1" },
    ],
    fn: Lexing.lex,
  },
  {
    input: "1 - - 1",
    expected: [
      { type: "number", value: "1" },
      { type: "operator", value: "-" },
      { type: "operator", value: "-" },
      { type: "number", value: "1" },
    ],
    fn: Lexing.lex,
  },
];

testCases.forEach(test);
