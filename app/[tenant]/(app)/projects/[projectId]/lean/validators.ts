export type CreateLookaheadTaskValues = {
  code: string;
  description: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  responsible: string;
  isRestricted: boolean;
  notes?: string | null;
};

export type CreateCommitmentValues = {
  description: string;
  responsible: string;
  weekStartDate: string;
};

export type UpdateCommitmentStatusValues = {
  status: "PENDING" | "COMPLETED" | "FAILED";
  failureCause?: "WEATHER" | "MATERIALS" | "LABOR" | "EQUIPMENT" | "DESIGN_CHANGE" | "PREVIOUS_WORK" | "OTHER" | null;
  failureNotes?: string | null;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const CAUSES = new Set(["WEATHER", "MATERIALS", "LABOR", "EQUIPMENT", "DESIGN_CHANGE", "PREVIOUS_WORK", "OTHER"]);

function asBoolean(v: unknown): boolean {
  if (v === true || v === "true" || v === "on") return true;
  if (v === false || v === "false") return false;
  return false;
}

export function validateCreateLookaheadTask(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  const code = String(raw.code ?? "").trim();
  if (code.length === 0) errors.code = ["El código es requerido."];
  else if (code.length > 24) errors.code = ["Máximo 24 caracteres."];
  const description = String(raw.description ?? "").trim();
  if (description.length === 0) errors.description = ["La descripción es requerida."];
  else if (description.length > 500) errors.description = ["Máximo 500 caracteres."];
  const weekNum = Number(raw.weekNumber);
  if (!Number.isFinite(weekNum) || !Number.isInteger(weekNum)) errors.weekNumber = ["Debe ser un número entero."];
  else if (weekNum < 1 || weekNum > 6) errors.weekNumber = ["La semana debe estar entre 1 y 6."];
  const startDate = String(raw.startDate ?? "").trim();
  if (!DATE_RE.test(startDate)) errors.startDate = ["Formato de fecha inválido (YYYY-MM-DD)."];
  const endDate = String(raw.endDate ?? "").trim();
  if (!DATE_RE.test(endDate)) errors.endDate = ["Formato de fecha inválido (YYYY-MM-DD)."];
  const responsible = String(raw.responsible ?? "").trim();
  if (responsible.length === 0) errors.responsible = ["El responsable es requerido."];
  else if (responsible.length > 160) errors.responsible = ["Máximo 160 caracteres."];
  if (DATE_RE.test(startDate) && DATE_RE.test(endDate) && endDate < startDate) {
    errors.endDate = ["La fecha de fin debe ser mayor o igual a la de inicio."];
  }
  const notesVal = raw.notes === null || raw.notes === undefined ? null : String(raw.notes);
  if (notesVal !== null && notesVal.length > 500) errors.notes = ["Máximo 500 caracteres."];
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values: null };
  }
  return {
    ok: true as const,
    errors: {},
    values: {
      code,
      description,
      weekNumber: weekNum,
      startDate,
      endDate,
      responsible,
      isRestricted: asBoolean(raw.isRestricted),
      notes: notesVal,
    },
  };
}

export function validateCreateCommitment(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  const description = String(raw.description ?? "").trim();
  if (description.length === 0) errors.description = ["La descripción es requerida."];
  else if (description.length > 500) errors.description = ["Máximo 500 caracteres."];
  const responsible = String(raw.responsible ?? "").trim();
  if (responsible.length === 0) errors.responsible = ["El responsable es requerido."];
  else if (responsible.length > 160) errors.responsible = ["Máximo 160 caracteres."];
  const weekStartDate = String(raw.weekStartDate ?? "").trim();
  if (!DATE_RE.test(weekStartDate)) errors.weekStartDate = ["Formato de fecha inválido (YYYY-MM-DD)."];
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values: null };
  }
  return { ok: true as const, errors: {}, values: { description, responsible, weekStartDate } };
}

export function validateUpdateCommitmentStatus(input: unknown) {
  const raw = (input ?? {}) as Record<string, unknown>;
  const errors: Record<string, string[]> = {};
  const status = String(raw.status ?? "");
  if (status !== "PENDING" && status !== "COMPLETED" && status !== "FAILED") {
    errors.status = ["Estado inválido."];
  }
  const failureCauseRaw = raw.failureCause;
  let failureCause: UpdateCommitmentStatusValues["failureCause"] = null;
  if (failureCauseRaw === null || failureCauseRaw === undefined || failureCauseRaw === "") {
    failureCause = null;
  } else {
    const fc = String(failureCauseRaw);
    if (CAUSES.has(fc)) failureCause = fc as UpdateCommitmentStatusValues["failureCause"];
    else failureCause = null;
  }
  const failureNotesVal = raw.failureNotes === null || raw.failureNotes === undefined ? null : String(raw.failureNotes);
  if (failureNotesVal !== null && failureNotesVal.length > 500) errors.failureNotes = ["Máximo 500 caracteres."];
  if (status === "FAILED" && failureCause === null) {
    errors.failureCause = ["La causa de no cumplimiento es requerida cuando el estado es No cumplido."];
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors, values: null };
  }
  return {
    ok: true as const,
    errors: {},
    values: {
      status: status as UpdateCommitmentStatusValues["status"],
      failureCause,
      failureNotes: failureNotesVal,
    },
  };
}
