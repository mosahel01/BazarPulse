import { AppError } from '../../common/errors/app-error.js';
import type { ReportReason, ReportStatus, UserRole } from '../../db/schema.js';
import type { PostRepository } from '../posts/posts.repository.js';
import type { ReportRow } from './moderation.repository.js';
import type { ModerationRepository } from './moderation.repository.js';

export interface CreateReportInput {
  postId?: number;
  commentId?: number;
  reason: ReportReason;
  description?: string;
}

export interface ReportDto {
  id: number;
  reporter: string;
  postId: number | null;
  commentId: number | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedBy: number | null;
  reviewedAt: string | null;
}

const MODERATION_ROLES = new Set<UserRole>(['MODERATOR', 'ADMIN']);

export function assertModerator(role: UserRole): void {
  if (!MODERATION_ROLES.has(role)) {
    throw AppError.forbidden('Moderator or admin access required.');
  }
}

export class ModerationService {
  constructor(
    private readonly repo: ModerationRepository,
    private readonly posts: PostRepository,
  ) {}

  async createReport(userId: number, input: CreateReportInput): Promise<ReportDto> {
    const hasPost = input.postId !== undefined;
    const hasComment = input.commentId !== undefined;
    if (hasPost === hasComment) {
      throw AppError.validation(
        [{ field: 'body', message: 'Report exactly one target: postId or commentId (not both)' }],
        'Invalid report target',
      );
    }

    if (hasPost) {
      const post = await this.posts.findById(input.postId!);
      if (!post) {
        throw AppError.notFound('Post not found.');
      }
    } else {
      const comment = await this.posts.findCommentById(input.commentId!);
      if (!comment) {
        throw AppError.notFound('Comment not found.');
      }
    }

    const existing = await this.repo.findOpenByReporterAndTarget(userId, {
      ...(input.postId !== undefined ? { postId: input.postId } : {}),
      ...(input.commentId !== undefined ? { commentId: input.commentId } : {}),
    });
    if (existing) {
      return toDto({ ...existing, reporter: 'self' });
    }

    const report = await this.repo.create({
      reporterId: userId,
      postId: input.postId ?? null,
      commentId: input.commentId ?? null,
      reason: input.reason,
      description: input.description ?? null,
      status: 'OPEN',
    });
    return toDto({ ...report, reporter: 'self' });
  }

  async listReports(options: {
    status?: ReportStatus | undefined;
    page?: number;
    pageSize?: number;
  }): Promise<{
    rows: ReportDto[];
    total: number;
  }> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const rows = await this.repo.list({
      ...(options.status !== undefined ? { status: options.status } : {}),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return { rows: rows.map(rowsToDto), total: rows.length };
  }

  async reviewReport(
    moderatorId: number,
    role: UserRole,
    reportId: number,
    status: ReportStatus,
  ): Promise<ReportDto> {
    assertModerator(role);
    const report = await this.repo.findById(reportId);
    if (!report) {
      throw AppError.notFound('Report not found.');
    }
    const updated = await this.repo.updateStatus(reportId, status, moderatorId);
    return toDto({ ...(updated ?? report), reporter: 'self' });
  }

  async hidePost(role: UserRole, postId: number): Promise<void> {
    assertModerator(role);
    const post = await this.posts.findById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    await this.posts.setStatus(postId, 'HIDDEN');
  }

  async restorePost(role: UserRole, postId: number): Promise<void> {
    assertModerator(role);
    const post = await this.posts.findById(postId);
    if (!post) {
      throw AppError.notFound('Post not found.');
    }
    await this.posts.setStatus(postId, 'ACTIVE');
  }
}

function toDto(report: ReportRow): ReportDto {
  return {
    id: report.id,
    reporter: report.reporter === 'self' ? 'self' : report.reporter,
    postId: report.postId,
    commentId: report.commentId,
    reason: report.reason,
    description: report.description,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    reviewedBy: report.reviewedBy,
    reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
  };
}

function rowsToDto(report: ReportRow): ReportDto {
  return {
    id: report.id,
    reporter: report.reporter,
    postId: report.postId,
    commentId: report.commentId,
    reason: report.reason,
    description: report.description,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
    reviewedBy: report.reviewedBy,
    reviewedAt: report.reviewedAt ? report.reviewedAt.toISOString() : null,
  };
}