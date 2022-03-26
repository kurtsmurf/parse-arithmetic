// @ts-ignore
import deepequal from "https://cdn.skypack.dev/deepequal";

export namespace Lexing {
  type TokenType = "reference" | "operator" | "number";
  type Token = { type: TokenType; value: string };
  type Parenthetical = { type: "parenthetical"; value: string };

  type MatchFn = (input: string) => Token | Parenthetical;
  type MunchFn = (input: string) => [Token | Parenthetical, string];

  type LexShallowResult = (Token | Parenthetical)[];
  type LexShallowFn = (input: string) => LexShallowResult;

  type LexResult = (Token | LexResult)[];
  type LexFn = (input: string) => LexResult;

  const matchers: [TokenType | "parenthetical", RegExp][] = [
    ["reference", /^[A-Z]+[1-9][0-9]*/],
    ["number", /^\d+/],
    ["operator", /^[+\-*/]/],
    ["parenthetical", /^\(.*\)/],
  ];

  const match: MatchFn = (input) => {
    for (const [type, regExp] of matchers) {
      const value = regExp.exec(input)?.[0];
      if (value) return { type, value };
    }
    throw "ERROR";
  };

  const munch: MunchFn = (input) => {
    const trimmed = input.trim();
    const matchResult = match(trimmed);
    const rest = trimmed.slice(matchResult.value.length);
    const token = matchResult.type === "parenthetical"
      // remove parens from value
      ? { ...matchResult, value: matchResult.value.slice(1, -1) }
      : matchResult;
    return [token, rest];
  };

  const lexShallow: LexShallowFn = (input) => {
    let remaining = input;
    let result = [];
    while (remaining.length > 0) {
      const munchResult = munch(remaining);
      const [head, rest] = munchResult;
      result.push(head);
      remaining = rest;
    }
    return result;
  };

  export const lex: LexFn = (input: string) =>
    lexShallow(input).map((x) => x.type === "parenthetical" ? lex(x.value) : x);
}

// ===============================================
// ==================== TESTS ====================
// ===============================================

type TestCase = {
  input: any;
  expected: any;
};

const test = ({ input, expected }: TestCase) => {
  let actual;
  
  // FIXME: You shouldn't have to wrap lex in a try/catch
  // I want to get error info back from lex in case of error
  // without having to try/catch
  // e.g.
  // let lex = string => Graph | Error
  // where Graph = (Token | Graph)[]
  // and Error = ...some info about the error
  // like "where" (index) and "why" ("unexpected token")
  // e.g.
  // err: Error = { reason: "unexpected token", index: 5, input: "1 + 7!" }
  // ...or something :(
  // That way we it's in the type system that it can throw
  // the caller will be reminded to deal with that case
  // and it will be nicerr for them
  // then try/catching barf (everybody knows trycatching is gross)
  // 
  try {
    actual = Lexing.lex(input);
  } catch (e) {
    actual = e;
  }

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
  },
  {
    input: "+",
    expected: [{ type: "operator", value: "+" }],
  },
  {
    input: "1",
    expected: [{ type: "number", value: "1" }],
  },
  {
    input: "  1234!#$*",
    expected: "ERROR",
  },
  {
    input: "A01",
    expected: "ERROR",
  },
  {
    input: "AB",
    expected: "ERROR",
  },
  {
    input: "A1 + 17",
    expected: [
      { type: "reference", value: "A1" },
      { type: "operator", value: "+" },
      { type: "number", value: "17" },
    ],
  },
  {
    input: "A1 + !",
    expected: "ERROR",
  },
  {
    input: "AA12 * (1 + 2) - 123 / B7",
    expected: [
      { type: "reference", value: "AA12" },
      { type: "operator", value: "*" },
      [
        { type: "number", value: "1" },
        { type: "operator", value: "+" },
        { type: "number", value: "2" },
      ],
      { type: "operator", value: "-" },
      { type: "number", value: "123" },
      { type: "operator", value: "/" },
      { type: "reference", value: "B7" },
    ],
  },
  {
    input: "1 + (1 + (1 + 1))",
    expected: [
      { type: "number", value: "1" },
      { type: "operator", value: "+" },
      [
        { type: "number", value: "1" },
        { type: "operator", value: "+" },
        [
          { type: "number", value: "1" },
          { type: "operator", value: "+" },
          { type: "number", value: "1" },
        ],
      ],
    ],
  },
  {
    input: "1 + (!@#$)",
    expected: "ERROR",
  },
  {
    input: "-1",
    expected: [
      { type: "operator", value: "-" },
      { type: "number", value: "1" },
    ],
  },
  {
    input: "1 - - 1",
    expected: [
      { type: "number", value: "1" },
      { type: "operator", value: "-" },
      { type: "operator", value: "-" },
      { type: "number", value: "1" },
    ],
  },
];

testCases.forEach(test);
