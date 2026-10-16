import { Request, Response } from "express";
import {
  DOCUMENT_TYPES,
  FREE_SHIPPING_THRESHOLD,
  PERSON_TYPES,
  PICKUP_STORES,
  PSE_BANKS,
  SHIPPING_COST,
  TEST_DATA,
} from "../config/checkout";

export function getCheckoutConfig(_req: Request, res: Response) {
  res.json({
    shipping: { cost: SHIPPING_COST, freeThreshold: FREE_SHIPPING_THRESHOLD },
    pickupStores: PICKUP_STORES,
    pseBanks: PSE_BANKS,
    personTypes: PERSON_TYPES,
    documentTypes: DOCUMENT_TYPES,
    testData: TEST_DATA,
  });
}
