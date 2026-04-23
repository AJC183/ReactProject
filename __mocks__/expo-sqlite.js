// Manual Jest mock for expo-sqlite.
// Provides the minimal surface that db/client.ts uses so tests that
// transitively import it (e.g. via @/app/_layout) don't crash on the
// missing native module.

const noOp = () => {};

const mockDb = {
  execSync:            noOp,
  runSync:             noOp,
  getFirstSync:        () => null,
  getAllSync:           () => [],
  prepareSync:         () => ({
    executeSync:       () => ({ rows: [] }),
    finalizeSync:      noOp,
  }),
  withTransactionSync: (fn) => fn(),
  closeSync:           noOp,
};

module.exports = {
  openDatabaseSync: () => mockDb,
  SQLiteDatabase:   jest.fn(),
};
