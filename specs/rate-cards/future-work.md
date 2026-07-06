# Rate Cards Future Work

Ideas and enhancements deferred from the initial implementation.

## Enhancements

### 1. Dynamic Fuel Surcharge Engine
- Apply an index-based fuel surcharge percentage (e.g., +12.5%) dynamically calculated on top of the base weight slab rate.
- Support configuring surcharges per shipping method or per customer group.

### 2. Remote Area Surcharges (Out-of-Area Surcharge)
- Map specific zip codes or remote provinces to a supplementary flat fee surcharge (e.g. +$4.50 for deliveries to Alaska or Hawaii).

### 3. Multi-Currency Display & Billing
- Maintain rate cards in different currencies (e.g., USD, VND).
- Add support for real-time exchange rate conversions in checkout portals.

## Technical Debt

- Optimize large-batch calculation procedures (TanStack queries caching) when rendering shipping costs for hundreds of orders simultaneously in Excel upload reviews.
