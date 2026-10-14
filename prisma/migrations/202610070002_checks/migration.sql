ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_stock_nonnegative" CHECK ("onHand">=0 AND "reserved">=0 AND "reserved"<="onHand"), ADD CONSTRAINT "variant_quantity_positive" CHECK ("moq">0 AND "step">0 AND "moq"%"step"=0);
ALTER TABLE "PriceTier" ADD CONSTRAINT "tier_nonnegative" CHECK ("minQty">0 AND "standard">=0 AND "vip">=0);
ALTER TABLE "CartItem" ADD CONSTRAINT "cart_quantity_positive" CHECK ("quantity">0);
ALTER TABLE "Order" ADD CONSTRAINT "order_totals_valid" CHECK ("subtotal">=0 AND "shipping">=0 AND "total"="subtotal"+"shipping" AND "total"="supply"+"tax" AND "currency"='KRW');
ALTER TABLE "OrderItem" ADD CONSTRAINT "order_item_valid" CHECK ("quantity">0 AND "unitPrice">=0 AND "amount"="unitPrice"*"quantity" AND "amount"="supply"+"tax");
ALTER TABLE "ShippingGroup" ADD CONSTRAINT "shipping_policy_valid" CHECK ("fee">=0 AND ("freeAbove" IS NULL OR "freeAbove">=0) AND "mode" IN ('FREE','FIXED','CONDITIONAL'));
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "reservation_quantity_positive" CHECK ("quantity">0);
ALTER TABLE "QuoteItem" ADD CONSTRAINT "quote_quantity_positive" CHECK ("quantity">0);