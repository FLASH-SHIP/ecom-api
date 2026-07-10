# Vietnam Administrative Divisions Decisions

## ADR-001: 2-Level Administrative Hierarchy

### Context

Traditional administrative structures in Vietnam feature three tiers: Province (Tỉnh/Thành phố), District (Quận/Huyện), and Ward (Phường/Xã). However, for specific localization and administrative routing flows in this project, a simplified 2-level model is requested (Provinces directly mapped to Wards).

### Options Considered

1. **Standard 3-Tier Model (Province -> District -> Ward)**
   - *Pros*: Matches standard postal/geographical models; matches Vietnam's official structure.
   - *Cons*: Higher UX complexity (requires 3 cascading dropdowns); extra table and schema overhead.

2. **Simplified 2-Tier Model (Province -> Ward)**
   - *Pros*: Streamlines address creation (only 2 steps); fits the specific user requirements.
   - *Cons*: Wards might have identical names in different districts of the same province, requiring `code` or `codeName` to act as the primary unique identifier instead of just the name.

### Decision

Option 2 was chosen as explicitly requested. We map Wards directly to Provinces using the Province's unique `code` as the foreign key (`provinceCode` in the `Ward` model).

### Consequences

- All UI address cascading dropdowns will transition directly from Province to Ward.
- Wards must store `provinceCode` as their parent link.
- To avoid name collision issues, Wards will be identified uniquely in the database by their unique `code` rather than their names.
