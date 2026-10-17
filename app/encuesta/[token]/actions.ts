"use server";

import { answerSurvey, getSurveyByToken } from "@/lib/ops/satisfaction";
import { validateAnswer } from "@/lib/ops/satisfaction-rules";

/** Respuesta pública de la encuesta (solo con el token; una sola vez). */
export async function answerSurveyAction(token: string, input: { score: number; nps: string; comment: string }): Promise<{ ok: boolean; message?: string }> {
  const s = await getSurveyByToken(token);
  if (!s) return { ok: false, message: "La encuesta no existe." };
  if (s.answered) return { ok: false, message: "Esta encuesta ya fue respondida. ¡Gracias!" };
  const v = validateAnswer(input);
  if (!v.ok) return { ok: false, message: v.message };
  await answerSurvey(s.id, v.value);
  return { ok: true };
}
