import { artes, hiddenArtes } from "./velvet";
import { argv } from "process";

const validNames = [
  "amorphous",
  "apodous",
  "armored",
  "beast",
  "crustacean",
  "demihuman",
  "dragon",
  "earth",
  "fiend",
  "fire",
  "non‑elemental",
  "non-elemental",
  "person",
  "undead",
  "water",
  "wind",
  "winged",
];

const Color = {
  Reset: "\x1b[0m",
  Bright: "\x1b[1m",
  Dim: "\x1b[2m",
  Underscore: "\x1b[4m",
  Blink: "\x1b[5m",
  Reverse: "\x1b[7m",
  Hidden: "\x1b[8m",

  FgBlack: "\x1b[30m",
  FgRed: "\x1b[31m",
  FgGreen: "\x1b[32m",
  FgYellow: "\x1b[33m",
  FgBlue: "\x1b[34m",
  FgMagenta: "\x1b[35m",
  FgCyan: "\x1b[36m",
  FgWhite: "\x1b[37m",

  BgBlack: "\x1b[40m",
  BgRed: "\x1b[41m",
  BgGreen: "\x1b[42m",
  BgYellow: "\x1b[43m",
  BgBlue: "\x1b[44m",
  BgMagenta: "\x1b[45m",
  BgCyan: "\x1b[46m",
  BgWhite: "\x1b[47m",
};
const weaknesses = (argv[2] && argv[2].split(",")) || [];
const resistances = (argv[3] && argv[3].split(",")) || [];

function toLowerCase(str) {
  return str.toLowerCase();
}

function sortBy(key) {
  return (a, b) => {
    if (a[key] > b[key]) return 1;
    if (a[key] < b[key]) return -1;
    return 0;
  };
}

const filterArtes = (strict = true) => {
  if (!weaknesses.length) return () => true;
  return (arte) => {
    const elements = arte["Elemental Attributes"].split("\n").map(toLowerCase);
    const race = arte["Enemy Race"].split("\n").map(toLowerCase);
    return [...elements, ...race].some((element) =>
      strict
        ? [...weaknesses].map(toLowerCase).includes(element)
        : [...weaknesses, "Non‑Elemental"].map(toLowerCase).includes(element)
    );
  };
};

const formatArte = (arte) => {
  return {
    ...arte,
    "Arte Name": arte["Arte Name"].split("\n")[0],
  };
};

function debugLookup(lookup) {
  for (const [key, value] of lookup) {
    if (value.target == 77)
      console.log(
        key,
        value.artes.map((arte) => arte["Arte Name"])
      );
  }
}

function color(color, string) {
  return `${color}${string}${Color.Reset}`;
}

const RESISTANCE = {
  mods: resistances,
  attr: "Elemental Attributes",
  factor: 0.1,
};
const ELEMENTAL = {
  mods: weaknesses,
  attr: "Elemental Attributes",
  factor: 1.5,
};
const RACE = {
  mods: weaknesses,
  attr: "Enemy Race",
  factor: 1.25,
};
function applyBonuses(modifiers) {
  const { attr, factor, mods } = modifiers;
  return (arte) => {
    if (!mods) return arte;
    const elements = arte[attr].split("\n").map(toLowerCase);
    if (elements.some((element) => mods.includes(element))) {
      return {
        ...arte,
        "Base Power": Math.floor(arte["Base Power"] * factor),
      };
    }
    return arte;
  };
}

function calculate(artes, hiddenArtes) {
  let allArtes = [
    ...hiddenArtes.filter(filterArtes()),
    ...artes.filter(filterArtes()),
  ];
  if (allArtes.length < 4) {
    allArtes = [
      ...hiddenArtes.filter(filterArtes(false)),
      ...artes.filter(filterArtes(false)),
    ];
  }

  const validArtes = allArtes
    .map(applyBonuses(ELEMENTAL))
    .map(applyBonuses(RACE))
    .map(applyBonuses(RESISTANCE))
    // .map(applyBonuses(resistances, RESISTANCE))
    .sort(sortBy("SG Cost"))
    .map(formatArte);

  const allMoves = knapSack(
    validArtes,
    validArtes.length - 1,
    // 120,
    30,
    new Map(),
    4
  );
  console.log(
    color(Color.FgGreen, formatResult(allMoves)),
    "=",
    color(Color.FgRed, allMoves.damage)
  );
}
function formatResult(artes) {
  const printArte = (arte) => `${arte["Arte Name"]}:${arte["SG Cost"]}`;
  return artes.artes.map(printArte).reverse().join(" > ");
}

const knapSack = (artes, n, target, lookup, moves, used = 0) => {
  // base case: when we cannot have take more items
  if (target < 0) {
    return { artes: [], cost: 0, damage: Number.MIN_SAFE_INTEGER };
  }

  // base case: when no items are left or capacity becomes 0
  // if (artes[n] && (target == 77 || target == 66 || target == 57)) {
  //   console.log(
  //     color(Color.FgGreen, artes[n] && artes[n]["Arte Name"]),
  //     used,
  //     target
  //   );
  // }
  if (n < 0 || used == moves || target == 0) {
    // return 0;
    return { artes: [], cost: 0, damage: 0 };
  }

  // form a unique key from the inputs for memoization
  const key = `${artes[n]["Arte Name"]}|${used}|${target}`;

  // If the sub-problem is appearing for first time, solve it and
  // store its result in the map
  if (!lookup.has(key)) {
    // pick current item n in knapSack and recur
    // for remaining items (n-1) with reduced capacity (target - weights[n])
    let include =
      // values[n] + knapSack(values, weights, n - 1, target - weights[n], lookup);
      knapSack(
        artes,
        n - 1,
        target - artes[n]["SG Cost"] + 30,
        lookup,
        moves,
        used + 1
      );

    // leave current item n from knapSack and recur for remaining items (n-1)
    let exclude = knapSack(artes, n - 1, target, lookup, moves, used);

    // Assign max value we get by picking or leaving the current item
    // lookup.set(key, Math.max(include, exclude));
    if (include.damage + artes[n]["Base Power"] > exclude.damage) {
      lookup.set(key, {
        artes: [artes[n], ...include.artes],
        damage: include.damage + artes[n]["Base Power"],
        cost: artes[n]["SG Cost"] + include.cost,
      });
    } else {
      lookup.set(key, {
        artes: exclude.artes,
        damage: exclude.damage,
        cost: exclude.cost,
      });
    }
    // lookup.set(key, include);
  }

  // return the value
  return lookup.get(key);
};

function validateInputs(input) {
  input.forEach((value) => {
    if (!validNames.includes(value)) {
      console.log(color(Color.FgRed, `"${value}"`), "is not a valid name");
    }
  });
}

validateInputs(resistances);
validateInputs(weaknesses);
calculate(artes, hiddenArtes);

// function parse(artes, hiddenArtes) {
//   let allArtes = [...hiddenArtes, ...artes];

//   allArtes = allArtes.reduce((prev, curr) => {
//     return [
//       ...prev,
//       ...curr["Elemental Attributes"].split("\n"),
//       ...curr["Enemy Race"].split("\n"),
//     ];
//   }, []);
//   allArtes = Array.from(new Set(allArtes));
//   // allArtes.sort()
//   console.log(allArtes.sort());
// }
// parse(artes, hiddenArtes);
