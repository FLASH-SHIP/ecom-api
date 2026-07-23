# US Divisions Future Work

## Additional Countries
Extend `administrative_divisions` to support other countries (CN, JP, KR, etc.) by adding new seed data files. No schema changes needed — just add data with different `countryCode`.

## Order Form Integration
Integrate US states/cities dropdown into the order creation form for `receiverState`/`senderState` validation. Replace current free-text input with a cascading select component.

## Rate Card by State/Region
Support shipping rate calculation based on US state/region zones. Map states to zones for rate card pricing.

## Zip Code Support
Add zip code data to cities for more precise address validation and auto-fill functionality.

## Address Autocomplete
Integrate with Google Places API or similar for real-time address autocomplete using the administrative divisions as a fallback/validation layer.
