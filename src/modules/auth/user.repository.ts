import { eq, or, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type * as schema from '../../db/schema.js';
import { users, type NewUser, type User } from '../../db/schema.js';

type Db = BetterSQLite3Database<typeof schema>;

export class UserRepository {
  constructor(private readonly db: Db) {}

  findByEmail(email: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.email, email),
    });
  }

  findByUsername(username: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: sql`lower(${users.username}) = lower(${username})`,
    });
  }

  findByUsernameOrEmail(identifier: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: or(
        sql`lower(${users.email}) = lower(${identifier})`,
        sql`lower(${users.username}) = lower(${identifier})`,
      ),
    });
  }

  findByGoogleSub(googleSub: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.googleSub, googleSub),
    });
  }

  findById(id: number): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: eq(users.id, id),
    });
  }

  create(input: NewUser): Promise<User> {
    return this.db
      .insert(users)
      .values(input)
      .returning()
      .then((rows) => {
        const row = rows[0];
        if (!row) {
          throw new Error('User insert returned no row');
        }
        return row;
      });
  }

  update(id: number, patch: Partial<NewUser>): Promise<User | undefined> {
    return this.db
      .update(users)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
      .then((rows) => rows[0]);
  }
}
