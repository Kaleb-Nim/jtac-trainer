import OpenAI from 'openai';

// Lazy-init so build-time page-data collection doesn't require the secret.
let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });
  }
  return client;
}

const EVALUATOR_PROMPT = `You are a senior JTAC instructor scoring a trainee's CAS run end-to-end.

Output STRICT JSON ONLY in this exact shape (no prose, no markdown fences):
{"scores":{"overall":N,"phraseology":N,"gridAccuracy":N,"safety":N},"didWell":[...],"needsWork":[...]}

Score each dimension 0-100:

PHRASEOLOGY — 9-line CAS phraseology adherence. Judge holistically (loose, not a checklist):
  - Did the trainee transmit lines 1-9 in order with the right labels (IP/heading, heading+offset, distance, target elevation, target description, target location, mark type, friendlies, egress)?
  - Callsign discipline: trainee is "romeo2"; pilot is "hog1". Proper exchange.
  - Clipped brevity, mil-radio cadence, no chatbot pleasantries.
  - Digit reads should use "niner" for 9; tolerate "five" for 5.

GRID ACCURACY — based on IMPACT DISTANCE TO TARGET (meters) provided in the payload:
  - <=30m: 90+
  - 30-100m: 60-80
  - 100-500m: 30-60
  - >500m or no strike: <30

SAFETY — based on IMPACT DISTANCE TO FRIENDLIES (meters):
  - >150m: 80-100
  - 75-150m: 50-80
  - 25-75m: 15-40 (dangerously close)
  - <=25m: <15 (fratricide-close)

OVERALL — your weighted judgment. HARD RULE: if Safety < 40, Overall MUST be < 60.

didWell / needsWork — 2 to 4 bullets each, terse instructor voice. Reference specific
9-line elements, grid digits, or distances. No chatbot pleasantries. No mention of
being an AI. If the run is mostly bad, didWell can be 0-1 bullets; if mostly good,
needsWork can be 0-1 bullets.`;

type EvaluateBody = {
  transcript: Array<{ role: 'user' | 'pilot'; text: string }>;
  impact: { distanceToTarget: number; distanceToFriendlies: number; grid: string } | null;
  correctGrid: string;
};

type Evaluation = {
  scores: { overall: number; phraseology: number; gridAccuracy: number; safety: number };
  didWell: string[];
  needsWork: string[];
};

const ZERO_SCORES = { overall: 0, phraseology: 0, gridAccuracy: 0, safety: 0 };

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asStringArray(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  return x.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
}

function normalize(raw: unknown): Evaluation {
  const o = (raw ?? {}) as Record<string, unknown>;
  const s = (o.scores ?? {}) as Record<string, unknown>;
  return {
    scores: {
      overall: clampScore(s.overall),
      phraseology: clampScore(s.phraseology),
      gridAccuracy: clampScore(s.gridAccuracy),
      safety: clampScore(s.safety),
    },
    didWell: asStringArray(o.didWell),
    needsWork: asStringArray(o.needsWork),
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as EvaluateBody;

  if (body.impact === null) {
    return Response.json({
      scores: ZERO_SCORES,
      didWell: [],
      needsWork: ['No ordnance released this run.'],
    } satisfies Evaluation);
  }

  const userPayload = [
    `TRANSMITTED GRID: ${body.impact.grid}`,
    `CORRECT GRID (lased): ${body.correctGrid}`,
    `IMPACT DISTANCE TO TARGET: ${body.impact.distanceToTarget.toFixed(1)} m`,
    `IMPACT DISTANCE TO FRIENDLIES: ${body.impact.distanceToFriendlies.toFixed(1)} m`,
    '',
    'TRANSCRIPT:',
    ...body.transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`),
  ].join('\n');

  try {
    const completion = await getClient().chat.completions.create({
      model: 'qwen-plus',
      stream: false,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EVALUATOR_PROMPT },
        { role: 'user', content: userPayload },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() ?? '{}';
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return Response.json({
        scores: ZERO_SCORES,
        didWell: [],
        needsWork: ['Evaluator returned malformed output.'],
      } satisfies Evaluation);
    }
    return Response.json(normalize(parsed));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      {
        scores: ZERO_SCORES,
        didWell: [],
        needsWork: [`Evaluator request failed: ${msg}.`],
      } satisfies Evaluation,
      { status: 200 },
    );
  }
}
