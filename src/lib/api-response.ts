import { NextResponse } from "next/server";

export interface PaginationParams {
  page: number;
  per_page: number;
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const per_page = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "50", 10)));
  return { page, per_page };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) {
  return NextResponse.json({
    data,
    meta: {
      page: pagination.page,
      per_page: pagination.per_page,
      total,
      total_pages: Math.ceil(total / pagination.per_page),
    },
  });
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json(
    { error: { message, status } },
    { status }
  );
}

export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json({ data }, { status });
}
