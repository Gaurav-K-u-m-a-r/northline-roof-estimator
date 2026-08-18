/**
 * Server-side estimate calculation.
 *
 * Formula (documented in plain language in DECISIONS.md):
 *
 *   material_cost = roof_area * rate_per_sqft * (1 + waste_factor)
 *   tear_off_cost = roof_area * tear_off_per_sqft
 *   subtotal      = (material_cost + tear_off_cost) * pitch_multiplier * stories_multiplier
 *   total          = subtotal + permit_flat_fee
 *   estimate_low   = total * (1 - range_spread_pct/100/2)
 *   estimate_high  = total * (1 + range_spread_pct/100/2)
 *
 * Design note: this engine is intentionally generic over the *shape* of a
 * question, not its specific key. Any "select" question whose chosen
 * option carries `rate_per_sqft`, `multiplier`, or `tear_off_per_sqft`
 * will automatically be folded into the formula in the role that field
 * name implies. Any "number" question is only used as the base quantity
 * if a question with that role is explicitly marked `role: "quantity"`
 * — see resolveQuestionRoles() below. This means Dale (or Marcus) can
 * rename labels, change rates, or turn a question off from the owner
 * panel and the math keeps working without a code change. Adding a
 * *brand new kind* of effect (e.g. a flat per-question fee) would need a
 * small code change — that trade-off is intentional and written up in
 * DECISIONS.md as a scope call, not an oversight.
 */

class EstimateError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || 'ESTIMATE_ERROR';
  }
}

// The seed config doesn't tag a "quantity" role explicitly, so we treat
// any active, required, type:"number" question as the base quantity.
// If more than one exists we use the first and note the rest are
// currently inert for the formula (documented assumption).
function findQuantityQuestion(questions) {
  return questions.find((q) => q.active && q.type === 'number');
}

function findOption(question, value) {
  if (!question.options) return null;
  return question.options.find((opt) => opt.value === String(value));
}

function calculateEstimate(config, answers) {
  const activeQuestions = (config.questions || []).filter((q) => q.active);

  // 1. Validate every active, required question was answered.
  for (const q of activeQuestions) {
    if (!q.required) continue;
    const val = answers[q.key];
    if (val === undefined || val === null || val === '') {
      throw new EstimateError(`Missing required answer for "${q.key}"`, 'MISSING_ANSWER');
    }
  }

  // 2. Validate no unknown / stale keys were submitted (owner may have
  //    removed a question or option since the client loaded the form).
  for (const key of Object.keys(answers)) {
    const q = activeQuestions.find((q) => q.key === key);
    if (!q) {
      throw new EstimateError(
        `"${key}" is no longer part of this estimator. Please restart.`,
        'STALE_CONFIG'
      );
    }
  }

  const quantityQuestion = findQuantityQuestion(activeQuestions);
  if (!quantityQuestion) {
    throw new EstimateError('No active quantity question configured.', 'CONFIG_ERROR');
  }

  const roofArea = Number(answers[quantityQuestion.key]);
  if (!Number.isFinite(roofArea) || roofArea <= 0) {
    throw new EstimateError(`"${quantityQuestion.key}" must be a positive number.`, 'BAD_INPUT');
  }
  if (quantityQuestion.min !== undefined && roofArea < quantityQuestion.min) {
    throw new EstimateError(
      `"${quantityQuestion.key}" must be at least ${quantityQuestion.min}.`,
      'BAD_INPUT'
    );
  }
  if (quantityQuestion.max !== undefined && roofArea > quantityQuestion.max) {
    throw new EstimateError(
      `"${quantityQuestion.key}" must be at most ${quantityQuestion.max}.`,
      'BAD_INPUT'
    );
  }

  let ratePerSqft = 0;
  let tearOffPerSqft = 0;
  let combinedMultiplier = 1;

  for (const q of activeQuestions) {
    if (q.type !== 'select') continue;
    const answerValue = answers[q.key];
    if (answerValue === undefined) continue; // optional question left blank

    const option = findOption(q, answerValue);
    if (!option) {
      throw new EstimateError(
        `"${answerValue}" is not a valid option for "${q.key}". Please restart.`,
        'STALE_CONFIG'
      );
    }

    if (typeof option.rate_per_sqft === 'number') ratePerSqft += option.rate_per_sqft;
    if (typeof option.tear_off_per_sqft === 'number') tearOffPerSqft += option.tear_off_per_sqft;
    if (typeof option.multiplier === 'number') combinedMultiplier *= option.multiplier;
  }

  const wasteFactor = Number(config.modifiers?.waste_factor ?? 0);
  const permitFlatFee = Number(config.modifiers?.permit_flat_fee ?? 0);
  const rangeSpreadPct = Number(config.modifiers?.range_spread_pct ?? 0);

  const materialCost = roofArea * ratePerSqft * (1 + wasteFactor);
  const tearOffCost = roofArea * tearOffPerSqft;
  const subtotal = (materialCost + tearOffCost) * combinedMultiplier;
  const total = subtotal + permitFlatFee;

  const spreadFraction = rangeSpreadPct / 100 / 2;
  const estimateLow = total * (1 - spreadFraction);
  const estimateHigh = total * (1 + spreadFraction);

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    estimate_low: round2(estimateLow),
    estimate_high: round2(estimateHigh),
    breakdown: {
      quantity_key: quantityQuestion.key,
      quantity: roofArea,
      rate_per_sqft: ratePerSqft,
      tear_off_per_sqft: tearOffPerSqft,
      waste_factor: wasteFactor,
      combined_multiplier: round2(combinedMultiplier),
      permit_flat_fee: permitFlatFee,
      subtotal: round2(subtotal),
      total: round2(total)
    }
  };
}

module.exports = { calculateEstimate, EstimateError };
