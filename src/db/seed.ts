import argon2 from 'argon2';
import { count } from 'drizzle-orm';
import { env } from '../config/env.js';
import { createDatabase } from './client.js';
import { applyMigrations } from './migrate.js';
import * as s from './schema.js';

const DEV_PASSWORD = 'MarketPulse@2026';

if (env.NODE_ENV === 'production' && process.env.SEED_ALLOWED !== 'true') {
  console.error(
    'Refusing to seed in production. If you really want demo data, set SEED_ALLOWED=true for disposable environments only.',
  );
  process.exit(1);
}

const seedUsers: Array<{
  username: string;
  email: string;
  role: s.UserRole;
}> = [
  { username: 'admin', email: 'admin@marketpulse.dev', role: 'ADMIN' },
  { username: 'mod_mechanic', email: 'mod_mechanic@example.com', role: 'MODERATOR' },
  { username: 'sahiltrades', email: 'sahiltrades@example.com', role: 'USER' },
  { username: 'vikram__rm', email: 'vikram__rm@example.com', role: 'USER' },
  { username: 'priya_invests', email: 'priya_invests@example.com', role: 'USER' },
  { username: 'desi_value', email: 'desi_value@example.com', role: 'USER' },
  { username: 'chart_ravi', email: 'chart_ravi@example.com', role: 'USER' },
  { username: 'gamma_god', email: 'gamma_god@example.com', role: 'USER' },
  { username: 'hidden_hand', email: 'hidden_hand@example.com', role: 'USER' },
  { username: 'nifty_nomad', email: 'nifty_nomad@example.com', role: 'USER' },
  { username: 'delta_dash', email: 'delta_dash@example.com', role: 'USER' },
  { username: 'yieldyogi', email: 'yieldyogi@example.com', role: 'USER' },
  { username: 'bankroll_ben', email: 'bankroll_ben@example.com', role: 'USER' },
];

const seedStocks: Array<Omit<s.NewStock, 'createdAt'>> = [
  {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries',
    exchange: 'NSE',
    sector: 'Energy',
    description: 'Conglomerate with energy, retail and telecom interests.',
  },
  {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services',
    exchange: 'NSE',
    sector: 'Technology',
    description: 'IT services and consulting giant.',
  },
  {
    symbol: 'INFY',
    companyName: 'Infosys',
    exchange: 'NSE',
    sector: 'Technology',
    description: 'Global digital services and consulting company.',
  },
  {
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank',
    exchange: 'NSE',
    sector: 'Financials',
    description: 'Leading private sector bank.',
  },
  {
    symbol: 'ICICIBANK',
    companyName: 'ICICI Bank',
    exchange: 'NSE',
    sector: 'Financials',
    description: 'Private sector bank with strong retail franchise.',
  },
  {
    symbol: 'SBIN',
    companyName: 'State Bank of India',
    exchange: 'NSE',
    sector: 'Financials',
    description: 'Largest public sector bank in India.',
  },
  {
    symbol: 'ITC',
    companyName: 'ITC Limited',
    exchange: 'NSE',
    sector: 'Consumer',
    description: 'Diversified conglomerate spanning FMCG, hotels and agri.',
  },
  {
    symbol: 'TATASTEEL',
    companyName: 'Tata Steel',
    exchange: 'NSE',
    sector: 'Materials',
    description: "One of the world's top steel producers.",
  },
  {
    symbol: 'BHARTIARTL',
    companyName: 'Bharti Airtel',
    exchange: 'NSE',
    sector: 'Telecom',
    description: 'Global telecommunications services company.',
  },
  {
    symbol: 'HINDUNILVR',
    companyName: 'Hindustan Unilever',
    exchange: 'NSE',
    sector: 'Consumer',
    description: 'FMCG leader across home and personal care products.',
  },
];

const seedPosts: Array<{
  author: string;
  stockSymbol: string;
  title: string;
  body: string;
  status: s.PostStatus;
  hoursAgo: number;
}> = [
  {
    author: 'sahiltrades',
    stockSymbol: 'TATASTEEL',
    title: 'Possible breakout above resistance',
    body: 'Tata Steel has been consolidating in a tight range for six weeks. Volume on the last three sessions has picked up while the range tightened — classic coil setup. A close above 158 on strong volume could open the path toward 172. Risk: the whole metals complex remains sensitive to China demand data.',
    status: 'ACTIVE',
    hoursAgo: 2,
  },
  {
    author: 'vikram__rm',
    stockSymbol: 'INFY',
    title: 'Margin story is finally turning',
    body: 'QoQ margin expansion of 90bps was the headline, but attrition claims and the large-deal pipeline deserve attention. If the 6%+ guided growth materializes, this re-rating has room to run. Watch the 1550 support zone.',
    status: 'ACTIVE',
    hoursAgo: 5,
  },
  {
    author: 'priya_invests',
    stockSymbol: 'SBIN',
    title: 'PSU lenders — yield chasing or fundamentals?',
    body: 'Everyone piles into PSU banks when the yield curve steepens. The risk is the "one big trade" crowding. SBI\'s deposit franchise is real, but don\'t mistake beta for alpha. Fundamentals still matter at these valuations.',
    status: 'ACTIVE',
    hoursAgo: 9,
  },
  {
    author: 'desi_value',
    stockSymbol: 'ITC',
    title: 'ITC hotels: the underappreciated optionality',
    body: 'The market values the FMCG book and ignores the hotel portfolio. That is a free option on the India travel cycle. Slow and boring, but the margin trajectory is quietly improving every quarter.',
    status: 'ACTIVE',
    hoursAgo: 15,
  },
  {
    author: 'chart_ravi',
    stockSymbol: 'RELIANCE',
    title: 'Retail demerger math',
    body: "Throwing a few numbers at the retail demerger: listed peers trade at ~6x EV/Sales. Apply that to Reliance Retail's revenue and the stub math suggests the parent is getting the retail business nearly free. Check my numbers.",
    status: 'ACTIVE',
    hoursAgo: 22,
  },
  {
    author: 'sahiltrades',
    stockSymbol: 'HDFCBANK',
    title: 'Why I am waiting for the base to build',
    body: 'HDFC Bank has repaired its loan book but the stock needs time to rebuild its base. A year of consolidation is not a tragedy when you get paid dividend while you wait. Patience is a position.',
    status: 'ACTIVE',
    hoursAgo: 30,
  },
  {
    author: 'mod_mechanic',
    stockSymbol: 'ICICIBANK',
    title: 'Best-in-class delivery on capital ratios',
    body: 'CET-1 above 17% plus a solid loan growth engine. ICICI keeps executing when peers stumble. The RR curve on this one is the cleanest in the private bank pack right now.',
    status: 'ACTIVE',
    hoursAgo: 45,
  },
  {
    author: 'gamma_god',
    stockSymbol: 'BHARTIARTL',
    title: 'ARPU upcycle thesis — still intact?',
    body: 'Premium mix is doing the heavy lifting while rural ARPU lags. The question is whether the next tariff hike lands in the next two quarters. If yes, expect the Street to re-rate the multiple.',
    status: 'ACTIVE',
    hoursAgo: 52,
  },
  {
    author: 'hidden_hand',
    stockSymbol: 'TCS',
    title: 'Hidden post — moderation sample',
    body: 'This post is hidden and must not appear in public feeds.',
    status: 'HIDDEN',
    hoursAgo: 60,
  },
];

const seedComments: Array<{ postTitle: string; author: string; body: string; hoursAgo: number }> = [
  {
    postTitle: 'Possible breakout above resistance',
    author: 'nifty_nomad',
    body: '158 close is the line in the sand. Printed a decent double bottom on the hourly.',
    hoursAgo: 1.6,
  },
  {
    postTitle: 'Possible breakout above resistance',
    author: 'sahiltrades',
    body: 'Agreed — and I would respect the 148 stop. Metals are whippy.',
    hoursAgo: 1.4,
  },
  {
    postTitle: 'Possible breakout above resistance',
    author: 'delta_dash',
    body: 'China property data next week is the real catalyst.',
    hoursAgo: 1.1,
  },
  {
    postTitle: 'Possible breakout above resistance',
    author: 'yieldyogi',
    body: 'Volume pick-up on a breakout attempt matters more than price alone here.',
    hoursAgo: 0.7,
  },
  {
    postTitle: 'PSU lenders — yield chasing or fundamentals?',
    author: 'bankroll_ben',
    body: 'Funding cost pressure is under-appreciated. Net interest margins could compress.',
    hoursAgo: 8,
  },
  {
    postTitle: 'PSU lenders — yield chasing or fundamentals?',
    author: 'priya_invests',
    body: 'Exactly — that is why I said the deposit franchise, not the loan book, is the moat.',
    hoursAgo: 8.5,
  },
];

const seedIdeas: Array<{
  author: string;
  stockSymbol: string;
  direction: s.IdeaDirection;
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  thesis: string;
  status: s.IdeaStatus;
  hoursAgo: number;
}> = [
  {
    author: 'sahiltrades',
    stockSymbol: 'INFY',
    direction: 'BULLISH',
    entryPrice: 1565,
    targetPrice: 1685,
    stopLossPrice: 1505,
    thesis: 'Margin recovery plus a strong large-deal pipeline; stop below the recent swing low.',
    status: 'OPEN',
    hoursAgo: 10,
  },
  {
    author: 'desi_value',
    stockSymbol: 'ITC',
    direction: 'BULLISH',
    entryPrice: 478,
    targetPrice: 525,
    stopLossPrice: 462,
    thesis:
      'Hotels optionality repricing with steady FMCG dividend. Low-risk long for a patient horizon.',
    status: 'OPEN',
    hoursAgo: 26,
  },
  {
    author: 'chart_ravi',
    stockSymbol: 'TATASTEEL',
    direction: 'BULLISH',
    entryPrice: 152,
    targetPrice: 172,
    stopLossPrice: 143,
    thesis:
      'Range breakout with ascending volume; trade only on a confirmed close above resistance.',
    status: 'HIT_TARGET',
    hoursAgo: 120,
  },
  {
    author: 'gamma_god',
    stockSymbol: 'BHARTIARTL',
    direction: 'BEARISH',
    entryPrice: 1560,
    targetPrice: 1480,
    stopLossPrice: 1605,
    thesis:
      'Premium mix stalled while valuation pricing in an aggressive tariff upcycle. Short the multiple.',
    status: 'OPEN',
    hoursAgo: 18,
  },
  {
    author: 'mod_mechanic',
    stockSymbol: 'RELIANCE',
    direction: 'NEUTRAL',
    entryPrice: 2905,
    targetPrice: 3120,
    stopLossPrice: 2760,
    thesis:
      'Demerger outcome is binary; prefer a tight range and wait for the record date clarity.',
    status: 'EXPIRED',
    hoursAgo: 260,
  },
];

const seedWatchlists: Array<{ username: string; name: string; stocks: string[] }> = [
  { username: 'sahiltrades', name: 'My Stocks', stocks: ['TATASTEEL', 'INFY', 'RELIANCE'] },
  {
    username: 'priya_invests',
    name: 'Long Term',
    stocks: ['HDFCBANK', 'ITC', 'HINDUNILVR', 'TCS'],
  },
  {
    username: 'chart_ravi',
    name: 'Watch Closely',
    stocks: ['SBIN', 'ICICIBANK', 'BHARTIARTL'],
  },
];

const hoursAgo = (hours: number): Date => new Date(Date.now() - Math.round(hours * 3600 * 1000));

async function seed(): Promise<void> {
  const { db, sqlite } = createDatabase();

  applyMigrations(db);

  const counts = await db.select({ value: count() }).from(s.users);
  const existingUsers = counts[0]?.value ?? 0;
  if (existingUsers > 0) {
    console.log('Database already seeded. Skipping.');
    sqlite.close();
    return;
  }

  const passwordHash = await argon2.hash(DEV_PASSWORD);

  db.transaction((tx) => {
    for (const seedUser of seedUsers) {
      tx.insert(s.users)
        .values({
          username: seedUser.username,
          email: seedUser.email,
          passwordHash,
          role: seedUser.role,
          emailVerified: false,
        })
        .run();
    }

    for (const stock of seedStocks) {
      tx.insert(s.stocks).values(stock).run();
    }

    const allUsers = tx.select().from(s.users).all();
    const userByUsername = new Map(allUsers.map((u) => [u.username, u]));

    const postIds = new Map<string, number>();
    for (const post of seedPosts) {
      const author = userByUsername.get(post.author);
      if (!author) {
        throw new Error(`Seed user not found: ${post.author}`);
      }
      const row = tx
        .insert(s.posts)
        .values({
          authorId: author.id,
          stockId: post.stockSymbol,
          title: post.title,
          body: post.body,
          status: post.status,
          createdAt: hoursAgo(post.hoursAgo),
          updatedAt: hoursAgo(post.hoursAgo),
        })
        .returning()
        .all()[0];
      if (row) {
        postIds.set(post.title, row.id);
      }
    }

    for (const comment of seedComments) {
      const postId = postIds.get(comment.postTitle);
      const author = userByUsername.get(comment.author);
      if (postId === undefined || !author) {
        throw new Error(`Seed comment target not found: ${comment.postTitle}`);
      }
      tx.insert(s.comments)
        .values({
          postId,
          authorId: author.id,
          body: comment.body,
          status: 'ACTIVE',
          createdAt: hoursAgo(comment.hoursAgo),
          updatedAt: hoursAgo(comment.hoursAgo),
        })
        .run();
    }

    const voters = ['vikram__rm', 'nifty_nomad', 'delta_dash', 'yieldyogi', 'bankroll_ben'];
    const skipVotesForTitles = new Set(['Retail demerger math']);
    for (const post of seedPosts) {
      if (skipVotesForTitles.has(post.title)) {
        continue;
      }
      const postId = postIds.get(post.title);
      if (postId === undefined) {
        throw new Error(`Seed post not found: ${post.title}`);
      }
      for (const username of voters) {
        const voter = userByUsername.get(username);
        if (!voter) {
          continue;
        }
        tx.insert(s.postVotes)
          .values({ userId: voter.id, postId, value: 1 })
          .onConflictDoNothing()
          .run();
      }
    }

    for (const idea of seedIdeas) {
      const author = userByUsername.get(idea.author);
      if (!author) {
        throw new Error(`Seed user not found: ${idea.author}`);
      }
      tx.insert(s.tradingIdeas)
        .values({
          authorId: author.id,
          stockId: idea.stockSymbol,
          direction: idea.direction,
          entryPrice: idea.entryPrice,
          targetPrice: idea.targetPrice,
          stopLossPrice: idea.stopLossPrice,
          thesis: idea.thesis,
          status: idea.status,
          createdAt: hoursAgo(idea.hoursAgo),
          updatedAt: hoursAgo(idea.hoursAgo),
        })
        .run();
    }

    for (const watchlist of seedWatchlists) {
      const owner = userByUsername.get(watchlist.username);
      if (!owner) {
        throw new Error(`Seed user not found: ${watchlist.username}`);
      }
      const watchlistRow = tx
        .insert(s.watchlists)
        .values({ userId: owner.id, name: watchlist.name })
        .returning()
        .all()[0];
      if (!watchlistRow) {
        throw new Error('Failed to create seed watchlist');
      }
      for (const stockSymbol of watchlist.stocks) {
        tx.insert(s.watchlistItems)
          .values({ watchlistId: watchlistRow.id, stockId: stockSymbol })
          .onConflictDoNothing()
          .run();
      }
    }
  });

  console.log(`Seeded ${seedUsers.length} users, ${seedStocks.length} stocks and content.`);
  console.log(`DEV-ONLY credentials: all seed users use password "${DEV_PASSWORD}"`);
  sqlite.close();
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
