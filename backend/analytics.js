const WON_STATUSES = new Set(["APPROVED", "COMPLETED", "FINALISED", "ACTIONED"]);
const OPEN_STATUSES = new Set(["DRAFT", "SUBMITTED"]);

const MANCHESTER_BRANCH = "Jackson Fire & Security Manchester";

function parseNumber(value) {
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthKey(date) {
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function normalizeBranch(name) {
  const trimmed = (name || "").trim();
  return trimmed || "(Unassigned)";
}

function getQuoteCreatedDate(quote) {
  return parseDate(quote.quote_created_date || quote.created || quote.date);
}

function getServiceValue(quote) {
  return parseNumber(quote.product_subtotal);
}

function getDefectValue(quote) {
  return parseNumber(quote.authorisation_amount);
}

function getConversionDate(quote) {
  return parseDate(
    quote.status_changed_approved ||
      quote.status_changed_submitted ||
      quote.last_actioned
  );
}

function daysBetween(start, end) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

function hasTouchpoint(quote) {
  return !!(
    quote.viewed_via_email_at ||
    quote.viewed_via_link_at ||
    quote.viewed_via_customer_portal_at
  );
}

function getTouchpointCount(quote) {
  let count = 0;
  if (quote.viewed_via_email_at) count++;
  if (quote.viewed_via_link_at) count++;
  if (quote.viewed_via_customer_portal_at) count++;
  return count;
}

function quoteTypeLabel(type) {
  return type === "service" ? "Sales Quote" : "Defect Quote";
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function enrichQuote(quote, type) {
  const created = getQuoteCreatedDate(quote);
  const converted = getConversionDate(quote);
  const rawValue = type === "service" ? getServiceValue(quote) : getDefectValue(quote);
  const value = rawValue;
  const status = (quote.status || "Unknown").toUpperCase();
  const branch = normalizeBranch(quote.branch_name);
  const salesperson = (quote.salesperson_name || "").trim() || "(Unassigned)";
  const hasMissingValue = value === 0;

  return {
    ...quote,
    _type: type,
    _created: created,
    _converted: converted,
    _value: value,
    _status: status,
    _branch: branch,
    _salesperson: salesperson,
    _isWon: WON_STATUSES.has(status),
    _conversionDays: WON_STATUSES.has(status) ? daysBetween(created, converted) : null,
    _hasTouchpoint: hasTouchpoint(quote),
    _touchpointCount: getTouchpointCount(quote),
    _hasMissingValue: hasMissingValue,
  };
}

function getConversionBucket(days) {
  if (days === null || days === undefined) return "Unknown";
  if (days <= 7) return "0–7 days";
  if (days <= 14) return "8–14 days";
  if (days <= 30) return "15–30 days";
  if (days <= 60) return "31–60 days";
  return "60+ days";
}

function getClientName(quote) {
  return (
    (quote.client_company_name || quote.final_client_company || quote.final_company || "").trim() ||
    "(Unknown client)"
  );
}

function buildQuoteRecords(quotes) {
  return quotes.map((q, index) => {
    const mk = monthKey(q._created);
    const touchpoints = [];
    if (q.viewed_via_email_at) touchpoints.push("Email");
    if (q.viewed_via_link_at) touchpoints.push("Link");
    if (q.viewed_via_customer_portal_at) touchpoints.push("Portal");
    const reference =
      (q.quote_reference || q.reference || q.quote_number || "").trim() || `Q-${index + 1}`;

    return {
      id: `${q._type}-${reference}-${index}`,
      reference,
      type: quoteTypeLabel(q._type),
      typeKey: q._type,
      status: q._status,
      value: round2(q._value),
      client: getClientName(q),
      salesperson: q._salesperson,
      branch: q._branch,
      created: q.quote_created_date || q.created || q.date || "",
      month: mk || "",
      monthLabel: mk ? formatMonthLabel(mk) : "—",
      isWon: q._isWon,
      hasMissingValue: q._hasMissingValue,
      conversionDays: q._conversionDays,
      conversionBucket: q._isWon ? getConversionBucket(q._conversionDays) : null,
      touchpoints,
      hasTouchpoint: q._hasTouchpoint,
    };
  });
}

function buildLeadRecords(leads) {
  return leads.map((l, index) => {
    const mk = monthKey(parseDate(l.Date));
    return {
      id: `lead-${index}-${l.Email || l.Phone || index}`,
      date: l.Date || "",
      month: mk || "",
      monthLabel: mk ? formatMonthLabel(mk) : "—",
      source: (l.Source || "").trim() || "Unknown",
      company: (l.Company || "").trim() || "—",
      name: (l.Name || "").trim() || "—",
      email: (l.Email || "").trim() || "—",
      phone: (l.Phone || "").trim() || "—",
      enquiry: (l.Enquiry || "").trim() || "",
    };
  });
}

function buildQuoteDataset(serviceQuotes, defectQuotes) {
  const service = serviceQuotes.map((q) => enrichQuote(q, "service"));
  const defect = defectQuotes.map((q) => enrichQuote(q, "defect"));
  return [...service, ...defect];
}

function filterByBranch(quotes, branchName) {
  return quotes.filter((q) => q._branch === branchName);
}

function countBy(items, keyFn) {
  const map = {};
  for (const item of items) {
    const key = keyFn(item);
    map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sumBy(items, keyFn) {
  return items.reduce((sum, item) => sum + keyFn(item), 0);
}

function buildSummary(quotes) {
  const service = quotes.filter((q) => q._type === "service");
  const defect = quotes.filter((q) => q._type === "defect");

  const serviceValue = sumBy(service, (q) => q._value);
  const defectValue = sumBy(defect, (q) => q._value);
  const wonQuotes = quotes.filter((q) => q._isWon);
  const wonValue = sumBy(wonQuotes, (q) => q._value);

  const conversionDays = wonQuotes
    .map((q) => q._conversionDays)
    .filter((d) => d !== null);
  const avgConversionDays =
    conversionDays.length > 0
      ? Math.round(conversionDays.reduce((a, b) => a + b, 0) / conversionDays.length)
      : null;

  const withTouchpoints = quotes.filter((q) => q._hasTouchpoint).length;
  const missingValue = quotes.filter((q) => q._hasMissingValue).length;
  const expiredQuotes = quotes.filter((q) => q._status === "EXPIRED");
  const unassignedBranchQuotes = quotes.filter((q) => q._branch === "(Unassigned)");
  const unassignedValue = sumBy(unassignedBranchQuotes, (q) => q._value);
  const totalVal = serviceValue + defectValue;

  return {
    totalQuotes: quotes.length,
    totalValue: totalVal,
    salesQuotes: service.length,
    defectQuotes: defect.length,
    salesValue: serviceValue,
    defectValue,
    avgQuoteValue: quotes.length > 0 ? round2(totalVal / quotes.length) : 0,
    quotesMissingValue: missingValue,
    missingValueRate:
      quotes.length > 0 ? round2((missingValue / quotes.length) * 100) : 0,
    expiredQuotes: expiredQuotes.length,
    expiredQuoteRate:
      quotes.length > 0 ? round2((expiredQuotes.length / quotes.length) * 100) : 0,
    unassignedValue: round2(unassignedValue),
    unassignedValueRate:
      totalVal > 0 ? round2((unassignedValue / totalVal) * 100) : 0,
    wonQuotes: wonQuotes.length,
    wonValue,
    conversionRate:
      quotes.length > 0
        ? Math.round((wonQuotes.length / quotes.length) * 1000) / 10
        : 0,
    avgConversionDays,
    touchpointQuotes: withTouchpoints,
    touchpointRate:
      quotes.length > 0
        ? Math.round((withTouchpoints / quotes.length) * 1000) / 10
        : 0,
  };
}

function buildQuoteStatusBreakdown(quotes) {
  const map = {};
  for (const q of quotes) {
    const key = `${q._type}|${q._status}`;
    if (!map[key]) {
      map[key] = {
        quoteType: quoteTypeLabel(q._type),
        status: q._status,
        quoteCount: 0,
        totalValue: 0,
      };
    }
    map[key].quoteCount++;
    map[key].totalValue += q._value;
  }
  return Object.values(map)
    .map((row) => ({
      id: `${row.quoteType}-${row.status}`,
      quoteType: row.quoteType,
      status: row.status,
      quoteCount: row.quoteCount,
      totalValue: round2(row.totalValue),
      averageValue: row.quoteCount > 0 ? round2(row.totalValue / row.quoteCount) : 0,
    }))
    .sort(
      (a, b) =>
        a.quoteType.localeCompare(b.quoteType) ||
        b.quoteCount - a.quoteCount
    );
}

function buildStatusPivot(quotes) {
  const map = {};
  for (const q of quotes) {
    if (!map[q._status]) {
      map[q._status] = { status: q._status, salesQuote: 0, defectQuote: 0 };
    }
    if (q._type === "service") map[q._status].salesQuote++;
    else map[q._status].defectQuote++;
  }
  return Object.values(map)
    .map((row) => ({
      id: `pivot-${row.status}`,
      status: row.status,
      salesQuote: row.salesQuote,
      defectQuote: row.defectQuote,
      total: row.salesQuote + row.defectQuote,
    }))
    .sort((a, b) => b.total - a.total);
}

function buildMonthlyQuoteDetail(quotes) {
  const map = {};
  for (const q of quotes) {
    const month = monthKey(q._created);
    if (!month) continue;
    if (!map[month]) {
      map[month] = {
        month,
        monthLabel: formatMonthLabel(month),
        quoteCount: 0,
        totalValue: 0,
      };
    }
    map[month].quoteCount++;
    map[month].totalValue += q._value;
  }
  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((row) => ({
      id: row.month,
      month: row.monthLabel,
      monthKey: row.month,
      quoteCount: row.quoteCount,
      totalValue: round2(row.totalValue),
      averageValue: row.quoteCount > 0 ? round2(row.totalValue / row.quoteCount) : 0,
    }));
}

function buildStatusBreakdown(quotes) {
  return countBy(quotes, (q) => q._status);
}

function buildMonthlyBreakdown(quotes) {
  const map = {};
  for (const q of quotes) {
    const key = monthKey(q._created);
    if (!key) continue;
    if (!map[key]) {
      map[key] = {
        month: key,
        label: formatMonthLabel(key),
        count: 0,
        salesCount: 0,
        defectCount: 0,
        value: 0,
        won: 0,
      };
    }
    map[key].count++;
    if (q._type === "service") map[key].salesCount++;
    else map[key].defectCount++;
    map[key].value += q._value;
    if (q._isWon) map[key].won++;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

function buildTopClients(quotes, limit = 10) {
  const map = {};
  for (const q of quotes) {
    const client =
      (q.client_company_name || q.final_client_company || q.final_company || "").trim() ||
      "(Unknown client)";
    if (!map[client]) map[client] = { client, quotes: 0, value: 0, won: 0, wonValue: 0 };
    map[client].quotes++;
    map[client].value += q._value;
    if (q._isWon) {
      map[client].won++;
      map[client].wonValue += q._value;
    }
  }
  return Object.values(map)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function buildSalespersonLeague(quotes) {
  const map = {};
  for (const q of quotes) {
    const person = q._salesperson;
    if (!map[person]) {
      map[person] = {
        name: person,
        quotesCreated: 0,
        quotesWon: 0,
        totalQuotedValue: 0,
        wonValue: 0,
        conversionDays: [],
      };
    }
    const row = map[person];
    row.quotesCreated++;
    row.totalQuotedValue += q._value;
    if (q._isWon) {
      row.quotesWon++;
      row.wonValue += q._value;
      if (q._conversionDays !== null) row.conversionDays.push(q._conversionDays);
    }
  }

  return Object.values(map)
    .map((row) => ({
      name: row.name,
      quotesCreated: row.quotesCreated,
      quotesWon: row.quotesWon,
      conversionRate:
        row.quotesCreated > 0
          ? Math.round((row.quotesWon / row.quotesCreated) * 1000) / 10
          : 0,
      totalQuotedValue: Math.round(row.totalQuotedValue * 100) / 100,
      wonValue: Math.round(row.wonValue * 100) / 100,
      avgQuoteValue:
        row.quotesCreated > 0
          ? Math.round((row.totalQuotedValue / row.quotesCreated) * 100) / 100
          : 0,
      avgConversionDays:
        row.conversionDays.length > 0
          ? Math.round(
              row.conversionDays.reduce((a, b) => a + b, 0) / row.conversionDays.length
            )
          : null,
      efficiencyScore:
        row.quotesCreated > 0
          ? Math.round((row.wonValue / row.quotesCreated) * 100) / 100
          : 0,
    }))
    .sort((a, b) => {
      if (a.name === "(Unassigned)") return 1
      if (b.name === "(Unassigned)") return -1
      return b.efficiencyScore - a.efficiencyScore
    })
}

function buildBranchLeague(quotes) {
  const map = {};
  for (const q of quotes) {
    const branch = q._branch;
    if (!map[branch]) {
      map[branch] = {
        branch,
        quotes: 0,
        value: 0,
        won: 0,
        wonValue: 0,
        expired: 0,
        salesQuotes: 0,
        defectQuotes: 0,
      };
    }
    const row = map[branch];
    row.quotes++;
    row.value += q._value;
    if (q._type === "service") row.salesQuotes++;
    else row.defectQuotes++;
    if (q._status === "EXPIRED") row.expired++;
    if (q._isWon) {
      row.won++;
      row.wonValue += q._value;
    }
  }

  const totalValue = sumBy(quotes, (q) => q._value);

  return Object.values(map)
    .map((row) => ({
      ...row,
      value: Math.round(row.value * 100) / 100,
      wonValue: Math.round(row.wonValue * 100) / 100,
      conversionRate:
        row.quotes > 0 ? Math.round((row.won / row.quotes) * 1000) / 10 : 0,
      expiredRate:
        row.quotes > 0 ? Math.round((row.expired / row.quotes) * 1000) / 10 : 0,
      valueShare:
        totalValue > 0 ? Math.round((row.value / totalValue) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildTouchpointBreakdown(quotes) {
  let email = 0;
  let link = 0;
  let portal = 0;
  let none = 0;
  for (const q of quotes) {
    if (q.viewed_via_email_at) email++;
    if (q.viewed_via_link_at) link++;
    if (q.viewed_via_customer_portal_at) portal++;
    if (!q._hasTouchpoint) none++;
  }
  return [
    { name: "Email view", value: email },
    { name: "Link view", value: link },
    { name: "Customer portal", value: portal },
    { name: "No touchpoint recorded", value: none },
  ];
}

function buildConversionTiming(quotes) {
  const buckets = {
    "0–7 days": 0,
    "8–14 days": 0,
    "15–30 days": 0,
    "31–60 days": 0,
    "60+ days": 0,
  };

  for (const q of quotes.filter((x) => x._isWon)) {
    const days = q._conversionDays;
    if (days === null) continue;
    if (days <= 7) buckets["0–7 days"]++;
    else if (days <= 14) buckets["8–14 days"]++;
    else if (days <= 30) buckets["15–30 days"]++;
    else if (days <= 60) buckets["31–60 days"]++;
    else buckets["60+ days"]++;
  }

  return Object.entries(buckets).map(([name, value]) => ({ name, value }));
}

function buildDataGaps(allQuotes, leads) {
  const service = allQuotes.filter((q) => q._type === "service");
  const unassignedBranchService = service.filter((q) => q._branch === "(Unassigned)");
  const unassignedValue = sumBy(unassignedBranchService, (q) => q._value);
  const totalServiceValue = sumBy(service, (q) => q._value);
  const unassignedSales = allQuotes.filter((q) => q._salesperson === "(Unassigned)").length;
  const defectWithValue = allQuotes.filter(
    (q) => q._type === "defect" && q._value > 0
  ).length;
  const defectTotal = allQuotes.filter((q) => q._type === "defect").length;

  return {
    leadToQuoteMatching: {
      status: "not_available",
      message:
        "Leads cannot currently be traced into Uptick quotes — no reliable company, contact, email, or phone match exists in the data.",
      leadCount: leads.length,
    },
    branchAttribution: {
      unassignedServiceQuotes: unassignedBranchService.length,
      unassignedServiceValue: Math.round(unassignedValue),
      unassignedValuePercent:
        totalServiceValue > 0
          ? Math.round((unassignedValue / totalServiceValue) * 1000) / 10
          : 0,
      message: `${Math.round((unassignedValue / totalServiceValue) * 100) || 0}% of sales quote value has no branch assigned in Uptick — limiting branch-level visibility.`,
    },
    salespersonAttribution: {
      unassignedQuotes: unassignedSales,
      message:
        unassignedSales > 0
          ? `${unassignedSales} quotes have no salesperson assigned.`
          : "All quotes have salesperson attribution.",
    },
    defectQuoteValues: {
      quotesWithValue: defectWithValue,
      totalDefectQuotes: defectTotal,
      message: `Only ${defectWithValue} of ${defectTotal} defect quotes have an authorisation amount — defect quote value is under-reported.`,
    },
    uptickIntegration: {
      status: "available",
      message:
        "Uptick sales and defect quote data is flowing and usable for reporting today.",
    },
    recommendations: [
      "Standardise branch assignment on all sales quotes at creation.",
      "Capture lead source and link leads to quote refs in Uptick.",
      "Ensure defect quote values are populated consistently.",
      "Use salesperson and branch fields to enable fair league-table comparisons.",
    ],
  };
}

function buildView(quotes) {
  return {
    summary: buildSummary(quotes),
    quoteTypeSplit: [
      { name: "Sales quotes", value: quotes.filter((q) => q._type === "service").length },
      { name: "Defect quotes", value: quotes.filter((q) => q._type === "defect").length },
    ],
    statusBreakdown: buildStatusBreakdown(quotes),
    quoteStatusBreakdown: buildQuoteStatusBreakdown(quotes),
    statusPivot: buildStatusPivot(quotes),
    monthlyQuoteDetail: buildMonthlyQuoteDetail(quotes),
    monthlyBreakdown: buildMonthlyBreakdown(quotes),
    topClients: buildTopClients(quotes),
    salespersonLeague: buildSalespersonLeague(quotes),
    branchLeague: buildBranchLeague(quotes),
    touchpoints: buildTouchpointBreakdown(quotes),
    conversionTiming: buildConversionTiming(quotes),
    quoteRecords: buildQuoteRecords(quotes),
  };
}

function buildLeadSummary(leads) {
  const total = leads.length;
  const bySourceRaw = countBy(leads, (l) => (l.Source || "").trim() || "Unknown");

  const monthlyMap = {};
  for (const l of leads) {
    const mk = monthKey(parseDate(l.Date));
    if (!mk) continue;
    if (!monthlyMap[mk]) {
      monthlyMap[mk] = { month: mk, label: formatMonthLabel(mk), count: 0 };
    }
    monthlyMap[mk].count++;
  }
  const monthlyLeads = Object.values(monthlyMap).sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  return {
    total,
    branch: "Manchester",
    bySource: bySourceRaw.map((row) => ({
      ...row,
      percent: total > 0 ? round2((row.value / total) * 100) : 0,
    })),
    monthlyLeads,
    leadRecords: buildLeadRecords(leads),
  };
}

function buildDashboardPayload(serviceQuotes, defectQuotes, leads) {
  const allQuotes = buildQuoteDataset(serviceQuotes, defectQuotes);
  const manchesterQuotes = filterByBranch(allQuotes, MANCHESTER_BRANCH);

  return {
    lastUpdated: new Date().toISOString(),
    manchesterBranchKey: MANCHESTER_BRANCH,
    manchesterDisplayName: "Manchester",
    leadSummary: buildLeadSummary(leads),
    dataGaps: buildDataGaps(allQuotes, leads),
    headOffice: buildView(allQuotes),
    manchester: buildView(manchesterQuotes),
  };
}

module.exports = {
  MANCHESTER_BRANCH,
  buildDashboardPayload,
};
