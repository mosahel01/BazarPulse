import { and, desc, eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { reports, users, type NewReport, type Report, type ReportStatus } from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface ReportRow extends Report {
  reporter: string;
}

export interface ReportListOptions {
  status?: ReportStatus;
  limit?: number;
  offset?: number;
}

export class ModerationRepository {
  constructor(private readonly db: Db) {}

  create(input: NewReport): Promise<Report> {
    return this.db.insert(reports).values(input).returning().then(firstRowOrThrow);
  }

  async list(options: ReportListOptions = {}): Promise<ReportRow[]> {
    return this.db
      .select({ ...selectColumns, reporter: users.username } as never)
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .where(options.status ? eq(reports.status, options.status) : undefined)
      .orderBy(desc(reports.createdAt))
      .limit(options.limit ?? 50)
      .offset(options.offset ?? 0)
      .all() as unknown as ReportRow[];
  }

  findById(id: number): Promise<Report | undefined> {
    return this.db.query.reports.findFirst({ where: eq(reports.id, id) });
  }

  async findOpenByReporterAndTarget(
    reporterId: number,
    target: { postId?: number; commentId?: number },
  ): Promise<Report | undefined> {
    const where = and(
      eq(reports.reporterId, reporterId),
      eq(reports.status, 'OPEN'),
      target.postId !== undefined
        ? eq(reports.postId, target.postId)
        : eq(reports.commentId, target.commentId as number),
    );
    return this.db.query.reports.findFirst({ where });
  }

  async updateStatus(
    id: number,
    status: ReportStatus,
    reviewedBy: number,
  ): Promise<Report | undefined> {
    const rows = await this.db
      .update(reports)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return rows[0];
  }
}

const selectColumns = {
  id: reports.id,
  reporterId: reports.reporterId,
  postId: reports.postId,
  commentId: reports.commentId,
  reason: reports.reason,
  description: reports.description,
  status: reports.status,
  reviewedBy: reports.reviewedBy,
  reviewedAt: reports.reviewedAt,
  createdAt: reports.createdAt,
};

function firstRowOrThrow<T>(rows: T[]): T {
  const row = rows[0];
  if (!row) {
    throw new Error('Expected a row to be returned.');
  }
  return row;
}