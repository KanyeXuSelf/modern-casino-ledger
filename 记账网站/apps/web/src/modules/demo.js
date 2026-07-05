function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sum(values) {
  return values.reduce((total, value) => total + toNumber(value), 0);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildPlayerRecord(player) {
  const totalBuyIn = sum(player.buyIns);
  const cashOut = toNumber(player.cashOut);
  const profit = toNumber(player.profit);
  const settledAmount = Math.max(toNumber(player.settledAmount), 0);
  const coverAmount = profit < 0 ? Math.min(Math.max(toNumber(player.coverAmount), 0), Math.abs(profit)) : 0;
  const remainingAmount = profit > 0 ? Math.max(profit - settledAmount, 0) : Math.max(Math.abs(profit) - coverAmount - settledAmount, 0);
  return {
    playerId: player.playerId || `demo-player-${player.name}`,
    name: player.name,
    buyInEntries: [...player.buyIns],
    totalBuyIn,
    cashOut,
    cashOutHistory: [cashOut].filter((value) => value > 0),
    cashOutRecorded: true,
    insuranceProfit: 0,
    profit,
    playMs: 10 * 60 * 60 * 1000,
    settlementStatus:
      remainingAmount <= 0.009 ? "settled" : settledAmount > 0 || coverAmount > 0 ? "partial" : "pending",
    settledAmount,
    coverAmount,
    remainingAmount,
    partnerName: player.partnerName || "",
  };
}

function buildSession({ id, name, date, location, dealerFee, players }) {
  const mappedPlayers = players.map(buildPlayerRecord);
  const totalBuyIn = sum(mappedPlayers.map((player) => player.totalBuyIn));
  const totalCashOut = sum(mappedPlayers.map((player) => player.cashOut));
  const totalCover = sum(mappedPlayers.map((player) => player.coverAmount));
  const totalCosts = dealerFee + totalCover;
  return {
    id,
    name,
    date,
    location,
    dealerNames: "",
    dealerSharePercent: 0,
    dealerShareEnabled: "No",
    collaborationName: "",
    collaborationSharePercent: 0,
    durationHours: 10,
    notes: "Workbook sample demo",
    stage: "settlement",
    dealerFee,
    totalBuyIn,
    totalCashOut,
    totalCover,
    totalCosts,
    netProfit: totalBuyIn - totalCashOut - totalCosts,
    modernNetProfit: totalBuyIn - totalCashOut - totalCosts,
    dealerShareAmount: 0,
    collaborationShareAmount: 0,
    players: mappedPlayers,
    partners: [],
    createdAt: new Date(`${date}:00Z`).toISOString(),
  };
}

function buildKnownPlayers(sessions) {
  const seen = new Map();
  sessions.forEach((session) => {
    session.players.forEach((player) => {
      const key = String(player.name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.set(key, {
        id: player.playerId || `demo-known-${key}`,
        name: player.name,
      });
    });
  });
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
}

export function createWorkbookDemoState() {
  const sessions = [
    buildSession({
      id: "demo-6-1",
      name: "样本账单 6.1",
      date: "2026-06-01T20:00",
      location: "Fort lee",
      dealerFee: 2650,
      players: [
        { name: "Kanye", buyIns: [5000, 10000], cashOut: 23000, profit: 8000 },
        { name: "Blues", buyIns: [3000, 3000], cashOut: 11800, profit: 5800 },
        { name: "JW", buyIns: [3000, 10000, 10000, 17000, 60000], cashOut: 48500, profit: -51500 },
        { name: "XW", buyIns: [3000, 3000, 4000], cashOut: 10000, profit: 0 },
        { name: "wy", buyIns: [3000, 7000, 10000], cashOut: 29000, profit: 9000 },
        { name: "ad", buyIns: [3000, 7000, 10000], cashOut: 7000, profit: -13000 },
        { name: "rkd", buyIns: [3000, 7000], cashOut: 39950, profit: 29950 },
        { name: "kala", buyIns: [3000, 3000, 4000, 5000, 5000, 5000, 25000], cashOut: 6500, profit: -43500 },
        { name: "gw", buyIns: [3000, 3000, 4000], cashOut: 1000, profit: -9000 },
        { name: "Elaine", buyIns: [5000, 5000], cashOut: 3600, profit: -6400 },
        { name: "Wyf", buyIns: [10000, 40000, 10000], cashOut: 63800, profit: 3800 },
        { name: "henry", buyIns: [3000], cashOut: 13925, profit: 10925 },
        { name: "Nina", buyIns: [7000], cashOut: 14000, profit: 7000 },
        { name: "昊昊", buyIns: [5000], cashOut: 10050, profit: 5050 },
      ],
    }),
    buildSession({
      id: "demo-6-12",
      name: "样本账单 6.12",
      date: "2026-06-12T20:00",
      location: "Fort lee",
      dealerFee: 4000,
      players: [
        { name: "Blues", buyIns: [3000, 10000, 10000, 20000, 20000], cashOut: 36650, profit: -26350 },
        { name: "JW", buyIns: [3000, 3000, 3000, 1000, 7000], cashOut: 24000, profit: 7000 },
        { name: "XW", buyIns: [3000, 7000, 10000], cashOut: 15000, profit: -5000 },
        { name: "Kell", buyIns: [3000, 3000, 4000, 10000], cashOut: 20000, profit: 0 },
        { name: "赵", buyIns: [3000], cashOut: 17400, profit: 14400 },
        { name: "WY", buyIns: [3000], cashOut: 39075, profit: 36075 },
        { name: "AD", buyIns: [3000, 7000], cashOut: 18600, profit: 8600 },
        { name: "ZX", buyIns: [3000, 10000, 17000, 20000, 50000, 50000], cashOut: 91060, profit: -58940 },
        { name: "庄圆", buyIns: [5000], cashOut: 5000, profit: 0 },
        { name: "苏永康", buyIns: [5000], cashOut: 9000, profit: 4000 },
        { name: "elaine", buyIns: [5000], cashOut: 6825, profit: 1825 },
        { name: "壮壮", buyIns: [3000, 5000], cashOut: 125, profit: -7875 },
      ],
    }),
    buildSession({
      id: "demo-6-19",
      name: "样本账单 6.19",
      date: "2026-06-19T20:00",
      location: "Fort lee",
      dealerFee: 8400,
      players: [
        { name: "JW", buyIns: [3000, 3000, 6000], cashOut: 19100, profit: 7100 },
        { name: "XW", buyIns: [3000, 3000, 4000, 20000], cashOut: 35400, profit: 5400 },
        { name: "wy", buyIns: [3000, 3000, 14000], cashOut: 0, profit: -20000 },
        { name: "AD", buyIns: [3000, 3000, 4000, 3000, 7000, 20000], cashOut: 10000, profit: -30000 },
        { name: "简单", buyIns: [3000], cashOut: 12100, profit: 9100, settledAmount: 9100 },
        { name: "Xu", buyIns: [3000, 5000, 10000, 10000, 10000, 10000], cashOut: 18000, profit: -30000, settledAmount: 30000 },
        { name: "Narmi", buyIns: [3000, 3000, 6000], cashOut: 18700, profit: 6700, settledAmount: 6700 },
        { name: "李润科", buyIns: [5000, 15000, 20000], cashOut: 20000, profit: -20000, settledAmount: 20000 },
        { name: "叶子源", buyIns: [5000], cashOut: 8400, profit: 3400, settledAmount: 3400 },
        { name: "丁丁", buyIns: [5000, 5000], cashOut: 26000, profit: 16000, settledAmount: 16000 },
      ],
    }),
    buildSession({
      id: "demo-6-26",
      name: "样本账单 6.26",
      date: "2026-06-26T20:00",
      location: "Fort lee",
      dealerFee: 0,
      players: [
        { name: "Blues", buyIns: [3000, 7000], cashOut: 10000, profit: 0 },
        { name: "JW", buyIns: [3000, 5000, 2000, 10000], cashOut: 24350, profit: 4350 },
        { name: "WY", buyIns: [3000, 3000, 4000, 10000, 20000], cashOut: 10000, profit: -30000, settledAmount: 30000 },
        { name: "Jason", buyIns: [3000, 2000, 5000, 5000, 5000, 5000], cashOut: 10000, profit: -15000, settledAmount: 15000 },
        { name: "ZY", buyIns: [3000, 10000], cashOut: 8000, profit: -5000, settledAmount: 5000 },
        { name: "Narmi", buyIns: [3000, 3000], cashOut: 43000, profit: 37000 },
        { name: "LRK", buyIns: [5000, 15000, 20000], cashOut: 42300, profit: 2300, settledAmount: 2300 },
        { name: "XU", buyIns: [5000, 5000, 5000, 7000, 10000], cashOut: 9593, profit: -22407, settledAmount: 22407 },
        { name: "mike", buyIns: [3000, 10000, 20000, 20000], cashOut: 47000, profit: -6000 },
        { name: "Tian", buyIns: [10000], cashOut: 25900, profit: 15900, settledAmount: 15900 },
      ],
    }),
    buildSession({
      id: "demo-7-3",
      name: "样本账单 7.3",
      date: "2026-07-03T20:00",
      location: "Fort lee",
      dealerFee: 12168,
      players: [
        { name: "Blues", buyIns: [8000], cashOut: 12600, profit: 4600 },
        { name: "JW", buyIns: [40000], cashOut: 40000, profit: 0 },
        { name: "简单", buyIns: [18000], cashOut: 52000, profit: 34000 },
        { name: "BS", buyIns: [50000], cashOut: 100000, profit: 50000 },
        { name: "Mike", buyIns: [200000], cashOut: 61000, profit: -139000 },
        { name: "Narmi", buyIns: [12000], cashOut: 13000, profit: 1000 },
        { name: "zz", buyIns: [11000], cashOut: 2400, profit: -8600, settledAmount: 8600 },
        { name: "xu", buyIns: [15000], cashOut: 37700, profit: 22700 },
        { name: "ding", buyIns: [30000], cashOut: 40400, profit: 10400 },
        { name: "wy", buyIns: [30000], cashOut: 5000, profit: -25000, settledAmount: 25000 },
        { name: "苗", buyIns: [15000], cashOut: 42000, profit: 27000 },
        { name: "wyf", buyIns: [40000], cashOut: 30900, profit: -9100, settledAmount: 9100 },
        { name: "zy", buyIns: [20000], cashOut: 14400, profit: -5600, settledAmount: 5600 },
        { name: "lrk", buyIns: [50000], cashOut: 23500, profit: -26500, settledAmount: 26500 },
      ],
    }),
  ];

  const deletedSource = clone(sessions[0]);
  deletedSource.id = "demo-trash-6-1";
  deletedSource.name = "垃圾箱样本 6.1";

  return {
    ui: {
      activeView: "history",
      expandedPlayerId: "",
      expandedHistorySettlementPlayerKey: "",
      statsTab: "overview",
      leaderboardPage: 1,
    },
    draftSession: {
      name: "Workbook Demo",
      date: "2026-07-05T20:00",
      location: "Fort lee",
      collaboration: "No",
      collaborationName: "",
      collaborationSharePercent: 0,
      dealerShareEnabled: "No",
      dealerSharePercent: 0,
      dealerNames: "",
      durationHours: 0,
      notes: "",
      stage: "live",
      dealerFee: 0,
      startedAt: "",
      endedAt: "",
      players: [],
      partners: [
        { id: "demo-partner-blue", name: "Blue", sharePercent: 39.6, cost: 0, manualAdvance: 0, advance: 0 },
        { id: "demo-partner-xiang", name: "项往", sharePercent: 29.7, cost: 0, manualAdvance: 0, advance: 0 },
        { id: "demo-partner-jw", name: "JW", sharePercent: 29.7, cost: 0, manualAdvance: 0, advance: 0 },
        { id: "demo-partner-kanye", name: "Kanye", sharePercent: 1, cost: 0, manualAdvance: 0, advance: 0 },
      ],
    },
    sessions,
    deletedSessions: [
      {
        id: deletedSource.id,
        deletedAt: "2026-07-05T00:00:00.000Z",
        restoreBefore: "2026-07-06T00:00:00.000Z",
        session: deletedSource,
      },
    ],
    players: buildKnownPlayers(sessions),
    meta: {
      revision: 1,
      updatedAt: "2026-07-05T00:00:00.000Z",
      updatedBy: "demo-workbook",
    },
  };
}
