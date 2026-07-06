# Rate Cards Decisions

## ADR-001: Waterfall Pricing Priority Cascade

### Context
Ecom needs to support multiple tariff models (standard public pricing, VIP volume tiers, and special negotiated prices for specific clients). We need a clear priority order to calculate cước without duplicating data or causing calculation conflicts.

### Options Considered
1. **Direct Customer Assignments**: Linking Rate Cards directly to individual customers (`RateCardCustomer`) alongside groups (`RateCardGroup`).
   - *Pros*: Extreme granular mapping.
   - *Cons*: High database bloat, complex waterfall queries, hard to trace pricing allocations, and audit issues when deleting/archiving cards.
2. **Group-Only Assignments (Selected)**: Removing individual customer mappings. All rate cards are assigned exclusively to `CustomerGroup` records (via `RateCardGroup`). If a customer needs a custom negotiated rate card, they are assigned to a custom group containing only their account.
   - *Pros*: 100% unified mapping. Simplifies database schemas and waterfall logic into a clean 2-step fallback, and guarantees operational integrity.
   - *Cons*: Requires creating a group first for single negotiated customer pricing.

### Decision
Option 2: All rate cards will be mapped exclusively to Customer Groups. The priority resolver applies a simple 2-step fallback cascade:
$$\text{Group-Specific Card (RateCardGroup)} \implies \text{System Default Card (empty group list)}$$

### Consequences
- Sells pricing administration is streamlined and standardized.
- The lookup database queries are extremely fast with minimal JOIN logic.

---

## ADR-002: Dynamic Weight Step and Rate Card Types

### Context
Different shipping methods apply different weight step rounding rules (Epacket bills in 0.05kg increments; Express bills in 0.5kg increments). Additionally, rates are slab-based flat fees for low weight packages, and multiply-by-weight per-kg fees for heavy cargo. We need a unified database model to support both structures.

### Options Considered
1. **Hardcoding Rounding and Threshold Rules**: Writing `if (method === "EPACKET") { ... }` in backend code.
   - *Pros*: Simple to code initially.
   - *Cons*: Any tariff change (e.g., Express changing step from 0.5kg to 0.2kg, or Epacket charging per-kg above 3kg) would require a code redeployment.
2. **Database-driven Dynamic Weight Steps & Rate Card Types (Selected)**: Storing `weightStep` directly on the `RateCard` parent model, and adding `rateType` (`STEP_FIXED` / `RANGE_FIXED` / `RANGE_PER_KG`) to the `RateCardItem` model.
   - *Pros*: 100% dynamic; tariff increments, ranges, and calculation types are configured entirely in the database per rate card. Whitelist validation options are filtered on the UI based on the shipping method.
   - *Cons*: Requires more complex query boundaries.

### Decision
Option 2: We will store `weightStep` on the `RateCard` model (enforcing UI step whitelists: `[0.05, 0.10]` for Epacket; `[0.50, 1.00]` for Express) and support `STEP_FIXED`, `RANGE_FIXED`, and `RANGE_PER_KG` calculations in the billing engine.
