import cron from 'node-cron';
import * as XLSX from 'xlsx';
import { adminDb, adminStorage } from '../firebase-admin';

/**
 * Cleanup backups older than 30 days
 */
export async function cleanupOldBackups() {
  if (!adminStorage) {
    console.error("Storage not initialized for cleanup");
    return;
  }

  const bucket = adminStorage.bucket();
  const [files] = await bucket.getFiles({ prefix: 'backups/' });

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  for (const file of files) {
    const [metadata] = await file.getMetadata();
    const timeCreated = new Date(metadata.timeCreated).getTime();

    if (timeCreated < thirtyDaysAgo) {
      await file.delete();
      deletedCount++;
      console.log(`Deleted old backup: ${file.name}`);
    }
  }

  return deletedCount;
}

/**
 * Generate Excel backup using Admin SDK
 */
export async function generateExcelBackup() {
  if (!adminDb || !adminStorage) {
    console.error("Firebase Admin not fully initialized for backup");
    return null;
  }

  try {
    const productsSnap = await adminDb.collection("products").get();
    const ordersSnap = await adminDb.collection("orders").get();
    const customersSnap = await adminDb.collection("customers").get();

    const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const orders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const customers = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `backup_${timestamp}.xlsx`;

    const wb = XLSX.utils.book_new();

    const wsProducts = XLSX.utils.json_to_sheet(products);
    XLSX.utils.book_append_sheet(wb, wsProducts, "Products");

    const wsOrders = XLSX.utils.json_to_sheet(orders);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Orders");

    const wsCustomers = XLSX.utils.json_to_sheet(customers);
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    const bucket = adminStorage.bucket();
    const file = bucket.file(`backups/${fileName}`);
    await file.save(excelBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    console.log(`Successfully generated and uploaded automated backup: ${fileName}`);

    // After automated backup, clear out old backups
    await cleanupOldBackups();

    return fileName;
  } catch (error) {
    console.error("Error creating automated backup:", error);
    throw error;
  }
}

/**
 * Initialize cron jobs
 */
export function initBackupCron() {
  // Run every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    console.log("Running scheduled backup cron job...");
    await generateExcelBackup();
  });
  console.log("Backup cron job scheduled for 0 0 * * 0 (every Sunday at midnight)");
}
