import OpenAI from 'openai';
import { computeVerdict, type Verdict } from '@/lib/verdict';

// Module-scope client persists across warm invocations.
const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
});

const INSTRUCTOR_PROMPT = `You are a senior JTAC instructor debriefing a student after a CAS run.
Tone: clipped, professional, blunt. 3-5 sentences. Reference the verdict ({{VERDICT}}).
If verdict is 'unsafe', explicitly call out the friendlies proximity in meters.
If verdict is 'needs_work', name the miss distance to target.
If verdict is 'solid', acknowledge the hit and one thing to maintain next time.
Do NOT use bullet points. Do NOT mention you are an AI.`;

type DebriefBody = {
  transcript: Array<{ role: 'user' | 'pilot'; text: string }>;
  impact: { distanceToTarget: number; distanceToFriendlies: number; grid: string } | null;
  correctGrid: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as DebriefBody;

  const verdict: Verdict = computeVerdict(body.impact);

  if (verdict === 'no_strike') {
    return Response.json({ verdict, critique: 'No ordnance released this run.' });
  }

  const userPayload = [
    `VERDICT: ${verdict}`,
    `TRANSMITTED GRID: ${body.impact?.grid ?? 'none'}`,
    `CORRECT GRID (lased): ${body.correctGrid}`,
    `IMPACT DISTANCE TO TARGET: ${body.impact?.distanceToTarget?.toFixed(1) ?? 'N/A'} m`,
    `IMPACT DISTANCE TO FRIENDLIES: ${body.impact?.distanceToFriendlies?.toFixed(1) ?? 'N/A'} m`,
    '',
    'TRANSCRIPT:',
    ...body.transcript.map((t) => `${t.role.toUpperCase()}: ${t.text}`),
  ].join('\n');

  try {
    const completion = await client.chat.completions.create({
      model: 'qwen-plus',
      stream: false,
      messages: [
        { role: 'system', content: INSTRUCTOR_PROMPT.replace('{{VERDICT}}', verdict) },
        { role: 'user', content: userPayload },
      ],
    });
    const critique = completion.choices[0]?.message?.content?.trim() ?? '(no critique generated)';
    return Response.json({ verdict, critique });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json(
      { verdict, critique: `Debrief generation failed: ${msg}. (Verdict computed from numbers.)` },
      { status: 200 },
    );
  }
}
