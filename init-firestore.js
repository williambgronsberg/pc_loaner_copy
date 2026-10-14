// Usage: set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON, and CONFIRM=true to actually run.
// node init-firestore.js
const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON path.');
  process.exit(1);
}

if (process.env.CONFIRM !== 'true') {
  console.error('This will delete and recreate collections. Set CONFIRM=true to proceed.');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

async function clearCollection(path, batchSize = 500) {
  const collectionRef = db.collection(path);
  const query = collectionRef.limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });

  async function deleteQueryBatch(query, resolve) {
    const snapshot = await query.get();
    if (snapshot.size === 0) {
      resolve();
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid exploding the stack.
    process.nextTick(() => {
      deleteQueryBatch(query, resolve);
    });
  }
}

async function seedWorkstations() {
  const workstations = [
    { name: 'PC-01', type: 'pc', keyboard: 'Standard', mouse: 'Logitech', accessories: '', status: 'available', borrower: null, borrowedAt: null, currentBorrowRecord: null },
    { name: 'PC-02', type: 'pc', keyboard: 'Standard', mouse: 'Logitech', accessories: '', status: 'available', borrower: null, borrowedAt: null, currentBorrowRecord: null },
    { name: 'PS-01', type: 'playstation', keyboard: '', mouse: '', accessories: 'Controller', status: 'available', borrower: null, borrowedAt: null, currentBorrowRecord: null }
  ];

  const batch = db.batch();
  for (const ws of workstations) {
    const ref = db.collection('workstations').doc();
    batch.set(ref, ws);
  }
  await batch.commit();
  console.log('Seeded workstations:', workstations.length);
}

async function main() {
  try {
    console.log('Clearing workstations...');
    await clearCollection('workstations');
    console.log('Clearing borrowRecords...');
    await clearCollection('borrowRecords');

    console.log('Seeding initial data...');
    await seedWorkstations();

    console.log('Init complete.');
  } catch (e) {
    console.error('Error:', e);
    process.exit(1);
  }
}

main();
