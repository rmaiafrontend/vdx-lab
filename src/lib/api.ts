import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import {
  FormulaError,
  SelectorError,
  ValidationError,
  type ValidationIssue,
} from "@/lib/engine";
import { Prisma } from "@prisma/client";

export function errorResponse(
  errors: ValidationIssue[] | { code: string; message: string; field?: string }[],
  status = 422
) {
  return NextResponse.json({ errors }, { status });
}

export function zodToErrors(err: ZodError): ValidationIssue[] {
  return err.issues.map((i) => ({
    code: "FORMULA_PARSE_ERROR",
    field: i.path.length > 0 ? i.path.join(".") : "(root)",
    message: i.message,
  }));
}

export function engineErrorTo422(err: unknown): NextResponse | null {
  if (
    err instanceof FormulaError ||
    err instanceof SelectorError ||
    err instanceof ValidationError
  ) {
    return NextResponse.json(
      { errors: [err.toJSON()] },
      { status: 422 }
    );
  }
  return null;
}

export function prismaErrorTo400(err: unknown): NextResponse | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return NextResponse.json(
        {
          errors: [
            {
              code: "UNIQUE_CONSTRAINT_VIOLATION",
              field: (err.meta?.target as string[] | undefined)?.join(".") ?? "(unknown)",
              message: "violação de unicidade",
            },
          ],
        },
        { status: 409 }
      );
    }
    if (err.code === "P2003") {
      return NextResponse.json(
        {
          errors: [
            {
              code: "FOREIGN_KEY_VIOLATION",
              field: (err.meta?.field_name as string | undefined) ?? "(unknown)",
              message: "referência inválida",
            },
          ],
        },
        { status: 400 }
      );
    }
  }
  return null;
}
