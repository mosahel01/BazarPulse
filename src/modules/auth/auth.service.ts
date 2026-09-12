import argon2 from 'argon2';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { AppError } from '../../common/errors/app-error.js';
import { env } from '../../config/env.js';
import type * as schema from '../../db/schema.js';
import type { User, UserRole } from '../../db/schema.js';
import type { GoogleProfile } from './google.service.js';
import { verifyGoogleIdToken } from './google.service.js';
import { UserRepository } from './user.repository.js';

type Db = BetterSQLite3Database<typeof schema>;

export interface AuthUserDto {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResult {
  token: string;
  user: AuthUserDto;
}

export function toAuthUserDto(user: User): AuthUserDto {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
  };
}

const USERNAME_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export class AuthService {
  private readonly repo: UserRepository;

  constructor(db: Db) {
    this.repo = new UserRepository(db);
  }

  async register(input: {
    username: string;
    email: string;
    password: string;
  }): Promise<AuthUserDto> {
    const email = input.email.trim().toLowerCase();

    if (await this.repo.findByUsername(input.username)) {
      throw AppError.conflict('Username is already taken.');
    }
    if (await this.repo.findByEmail(email)) {
      throw AppError.conflict('An account with this email already exists.');
    }

    const passwordHash = await argon2.hash(input.password);

    try {
      const user = await this.repo.create({
        username: input.username,
        email,
        passwordHash,
        role: 'USER',
        emailVerified: false,
      });
      return toAuthUserDto(user);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw AppError.conflict('Username or email is already registered.');
      }
      throw error;
    }
  }

  async login(identifier: string, password: string): Promise<AuthUserDto> {
    const user = await this.repo.findByUsernameOrEmail(identifier.trim());

    if (!user?.passwordHash) {
      throw AppError.unauthorized('Invalid username/email or password.');
    }

    const passwordMatches = await argon2.verify(user.passwordHash, password);
    if (!passwordMatches || !user.isActive) {
      throw AppError.unauthorized('Invalid username/email or password.');
    }

    return toAuthUserDto(user);
  }

  async googleSignIn(idToken: string): Promise<AuthUserDto> {
    const profile = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID || undefined);

    const existing = await this.repo.findByGoogleSub(profile.sub);
    if (existing) {
      return toAuthUserDto(existing);
    }

    const byEmail = await this.repo.findByEmail(profile.email);
    if (byEmail) {
      const linked = await this.repo.update(byEmail.id, {
        googleSub: profile.sub,
        googlePicture: profile.picture ?? null,
        emailVerified: true,
      });
      if (linked) {
        return toAuthUserDto(linked);
      }
    }

    const username = await this.generateUniqueUsername(profile);
    const user = await this.repo.create({
      username,
      email: profile.email,
      googleSub: profile.sub,
      googlePicture: profile.picture ?? null,
      emailVerified: true,
      role: 'USER',
      passwordHash: null,
    });

    return toAuthUserDto(user);
  }

  async me(userId: number): Promise<AuthUserDto> {
    const user = await this.repo.findById(userId);
    if (!user || !user.isActive) {
      throw AppError.unauthorized('Account not found or disabled.');
    }
    return toAuthUserDto(user);
  }

  private async generateUniqueUsername(profile: GoogleProfile): Promise<string> {
    const raw = profile.displayName ?? profile.email.split('@')[0] ?? 'user';
    const base = raw
      .normalize('NFKD')
      .replace(/[^A-Za-z0-9_]+/g, '')
      .slice(0, 24)
      .toLowerCase();

    const safeBase = base.length >= 3 ? base : `user${base}`;

    if (!(await this.repo.findByUsername(safeBase))) {
      return safeBase;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      let suffix = '';
      for (let i = 0; i < 4; i += 1) {
        suffix += USERNAME_ALPHABET[Math.floor(Math.random() * USERNAME_ALPHABET.length)];
      }
      const candidate = `${safeBase}_${suffix}`;
      if (!(await this.repo.findByUsername(candidate))) {
        return candidate;
      }
    }

    throw AppError.conflict('Could not generate a unique username.');
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string' &&
      error.code.startsWith('SQLITE_CONSTRAINT')
    );
  }
}
