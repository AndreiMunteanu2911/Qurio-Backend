import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { db } from '../lib/firebase.js';
import { SHOP_ITEMS_MAP } from '../schemas/shop.js';

type InventoryItem = { itemId: string; quantity: number; acquiredAt: string };

export const inventoryRouter = Router();

const currencyCol = db.collection('currency');
const inventoryCol = db.collection('inventory');

inventoryRouter.use('/api/inventory', requireAuth);

function defaultInventory(): { userId: string; items: InventoryItem[]; activeCosmetics: Record<string, string> } {
  return {
    userId: '',
    items: [],
    activeCosmetics: {}
  };
}

inventoryRouter.get('/api/inventory', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const snap = await inventoryCol.doc(uid).get();
    res.json(snap.exists ? snap.data() : defaultInventory());
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/api/inventory/purchase', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const { itemId } = req.body as { itemId: string };

    const item = SHOP_ITEMS_MAP.get(itemId);
    if (!item) {
      res.status(400).json({ error: { message: 'Item not found.' } });
      return;
    }

    // Check balance
    const currencySnap = await currencyCol.doc(uid).get();
    const balance = currencySnap.exists ? ((currencySnap.data()?.balance as number) ?? 0) : 0;

    if (balance < item.cost) {
      res.status(400).json({ error: { message: 'Insufficient currency.' } });
      return;
    }

    // Deduct currency
    await currencyCol.doc(uid).set({
      userId: uid,
      balance: balance - item.cost,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Add to inventory
    const invRef = inventoryCol.doc(uid);
    const invSnap = await invRef.get();
    const inv = (invSnap.exists ? (invSnap.data() as ReturnType<typeof defaultInventory>) : defaultInventory());
    const items = [...inv.items];

    const existingIndex = items.findIndex((i) => i.itemId === itemId);
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      if (item.consumable) {
        const existing = items[existingIndex];
        if (existing) {
          items[existingIndex] = { itemId: existing.itemId, quantity: existing.quantity + 1, acquiredAt: existing.acquiredAt };
        }
      } else {
        // Already owned cosmetic — just return success
        res.json({ balance: balance - item.cost, owned: true });
        return;
      }
    } else {
      items.push({ itemId, quantity: item.consumable ? 1 : 1, acquiredAt: now });
    }

    await invRef.set({ userId: uid, items, activeCosmetics: inv.activeCosmetics ?? {} }, { merge: true });

    res.json({ balance: balance - item.cost, owned: false });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/api/inventory/use', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const { itemId } = req.body as { itemId: string };

    const invRef = inventoryCol.doc(uid);
    const invSnap = await invRef.get();

    if (!invSnap.exists) {
      res.status(400).json({ error: { message: 'Item not owned.' } });
      return;
    }

    const inv = invSnap.data()!;
    const items = [...(inv.items as Array<{ itemId: string; quantity: number; acquiredAt: string }>)];
    const idx = items.findIndex((i) => i.itemId === itemId);

    const target = items[idx];
    if (!target || target.quantity < 1) {
      res.status(400).json({ error: { message: 'Item not owned or out of charges.' } });
      return;
    }

    items[idx] = { itemId: target.itemId, quantity: target.quantity - 1, acquiredAt: target.acquiredAt };
    await invRef.set({ ...inv, items }, { merge: true });

    res.json({ used: true, remaining: target.quantity - 1 });
  } catch (error) {
    next(error);
  }
});

inventoryRouter.post('/api/inventory/equip', async (req, res, next) => {
  try {
    const { uid } = (req as unknown as AuthenticatedRequest).user;
    const { itemId, slot } = req.body as { itemId: string | null; slot: string };

    const invRef = inventoryCol.doc(uid);
    const invSnap = await invRef.get();
    const inv = (invSnap.exists ? (invSnap.data() as ReturnType<typeof defaultInventory>) : defaultInventory());
    const activeCosmetics = { ...(inv.activeCosmetics ?? {}) };

    if (itemId === null) {
      delete activeCosmetics[slot];
    } else {
      const owned = inv.items.some((i) => i.itemId === itemId);
      if (!owned) {
        res.status(400).json({ error: { message: 'Item not owned.' } });
        return;
      }
      activeCosmetics[slot] = itemId;
    }

    await invRef.set({ userId: uid, items: inv.items, activeCosmetics }, { merge: true });
    res.json({ activeCosmetics });
  } catch (error) {
    next(error);
  }
});
