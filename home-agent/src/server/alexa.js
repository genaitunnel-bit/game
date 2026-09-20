/**
 * Alexa カスタムスキルの受け口。
 * Echo から「アレクサ、うちの子に　洗濯やったって伝えて」のように話しかけられる。
 *
 * 注意: ここは署名検証をしていない。インターネットに直接晒すなら、
 * SignatureCertChainUrl の検証をリバースプロキシ側で行うか、
 * VPN / Tailscale 越しに限定して公開すること（README 参照）。
 */
function speak(text, { end = true } = {}) {
  return {
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text },
      shouldEndSession: end,
    },
  };
}

function slotValue(request, ...names) {
  const slots = request.intent?.slots ?? {};
  for (const name of names) {
    const value = slots[name]?.value;
    if (value) return value;
  }
  return null;
}

export async function handleAlexa(body, { agent, skillId }) {
  if (skillId) {
    const incoming = body?.context?.System?.application?.applicationId ?? body?.session?.application?.applicationId;
    if (incoming && incoming !== skillId) return { status: 403, payload: { error: 'unknown skill' } };
  }

  const type = body?.request?.type;
  if (type === 'SessionEndedRequest') return { status: 200, payload: speak('') };

  if (type === 'LaunchRequest') {
    const summary = agent.tasks.summary();
    return { status: 200, payload: speak(agent.statusText(summary), { end: false }) };
  }

  if (type !== 'IntentRequest') return { status: 200, payload: speak('うまく聞き取れなかった。') };

  const name = body.request.intent?.name;
  if (name === 'AMAZON.StopIntent' || name === 'AMAZON.CancelIntent') {
    return { status: 200, payload: speak('わかった。') };
  }
  if (name === 'AMAZON.HelpIntent') {
    return {
      status: 200,
      payload: speak('今日やることを聞いたり、終わったことを伝えたり、あとでって言ったりできるよ。', { end: false }),
    };
  }

  // 自由発話（AMAZON.SearchQuery）と、定型インテントのどちらでも同じ入口に流す
  const text =
    slotValue(body.request, 'text', 'query', 'task', 'utterance') ??
    { DoneIntent: 'やった', StatusIntent: '今日の残りは？', SnoozeIntent: 'あとで' }[name] ??
    '';
  const minutes = slotValue(body.request, 'minutes');
  const phrase = minutes ? `${text} ${minutes}分` : text;
  const { reply } = await agent.converse(phrase, { by: 'alexa' });
  return { status: 200, payload: speak(reply, { end: false }) };
}
