import { seedIfEmpty } from '../db/seed';
import { db } from '../db/client';

// ── Mock the database ─────────────────────────────────────────────────────────
jest.mock('../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
  },
}));

const mockDb = db as unknown as {
  select: jest.Mock;
  insert: jest.Mock;
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('seedIfEmpty', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('seeds categories, habits, targets and logs when the database is empty', async () => {
    // select().from(categories) returns [] — nothing seeded yet
    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    });

    // Insert calls in seed order:
    //   1st  → categories (needs .returning() for ids)
    //   2nd  → habits     (needs .returning() for ids)
    //   3rd+ → targets, habitLogs (just .values(), no returning)
    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1, name: 'Health',      color: '#4CAF50', icon: 'heart'     },
            { id: 2, name: 'Fitness',     color: '#2196F3', icon: 'barbell'   },
            { id: 3, name: 'Mindfulness', color: '#9C27B0', icon: 'leaf'      },
            { id: 4, name: 'Learning',    color: '#FF9800', icon: 'book-open' },
          ]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
            { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 },
          ]),
        }),
      })
      .mockReturnValue({
        // targets and habitLogs — no .returning() call
        values: jest.fn().mockResolvedValue(undefined),
      });

    await seedIfEmpty();

    // insert should have been called at least for categories + habits + targets + logs
    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockDb.insert.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('seeds the four Loop categories: Health, Fitness, Mindfulness, Learning', async () => {
    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([]),
    });

    mockDb.insert
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1, name: 'Health',      color: '#4CAF50', icon: 'heart'     },
            { id: 2, name: 'Fitness',     color: '#2196F3', icon: 'barbell'   },
            { id: 3, name: 'Mindfulness', color: '#9C27B0', icon: 'leaf'      },
            { id: 4, name: 'Learning',    color: '#FF9800', icon: 'book-open' },
          ]),
        }),
      })
      .mockReturnValueOnce({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([
            { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
            { id: 5 }, { id: 6 }, { id: 7 }, { id: 8 },
          ]),
        }),
      })
      .mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

    await seedIfEmpty();

    // First insert call should include the four Loop categories
    const categoriesInsertArg = mockDb.insert.mock.calls[0][0];
    expect(categoriesInsertArg).toBeDefined();

    const categoriesValuesCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
    expect(categoriesValuesCall).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Health'      }),
        expect.objectContaining({ name: 'Fitness'     }),
        expect.objectContaining({ name: 'Mindfulness' }),
        expect.objectContaining({ name: 'Learning'    }),
      ])
    );
  });

  it('does nothing when categories already exist', async () => {
    // Simulate a pre-seeded database
    mockDb.select.mockReturnValue({
      from: jest.fn().mockResolvedValue([
        { id: 1, name: 'Health', color: '#4CAF50', icon: 'heart' },
      ]),
    });

    await seedIfEmpty();

    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
