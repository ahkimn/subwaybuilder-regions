# Preset Dataset Reference

This document lists valid preset combinations for `scripts/extract-map-features.ts`:

- `--country-code=<CODE>`
- `--data-type=<DATASET_ID>`

The `Online` column indicates whether the dataset is currently available through an online source in runtime/dev fetch flows.
The `Population Data` column indicates whether population dataset can also be fetched Online, or is limited to the dev-flow from local source data

| `country-code` | `data-type`         | Description                      | Source                            | Online | Population Data |
| -------------- | ------------------- | -------------------------------- | --------------------------------- | ------ | --------------- |
| **US**         | counties            | Counties                         | US Census Bureau                  | Yes    | Online          |
| **US**         | county-subdivisions | County Subdivisions              | US Census Bureau                  | Yes    | Online          |
| **US**         | zctas               | ZIP Code Tabulation Areas        | US Census Bureau                  | Yes    | Online          |
| **CA**         | feds                | Federal Electoral Districts      | CA Statistics Canada              | Yes    | None            |
| **CA**         | peds                | Provincial Electoral Districts   | CA Provincial Electoral Districts | No     | None            |
| **CA**         | csds                | Census Subdivisions              | CA Statistics Canada              | Yes    | None            |
| **CA**         | fsas                | Forward Sortation Areas          | CA Statistics Canada              | Yes    | None            |
| **GB**         | districts           | Districts                        | UK ONS                            | Yes    | Local           |
| **GB**         | bua                 | Built-Up Areas                   | UK ONS                            | Yes    | Local           |
| **GB**         | wards               | Electoral Wards                  | UK ONS                            | Yes    | Local           |
| **FR**         | departments         | Départements                     | FR IGN GéoPF                      | Yes    | Online          |
| **FR**         | arrondissements     | Arrondissements                  | FR IGN GéoPF                      | Yes    | Online          |
| **FR**         | cantons             | Cantons                          | FR IGN GéoPF                      | Yes    | Online          |
| **FR**         | epci                | EPCI                             | FR IGN GéoPF                      | Yes    | Online          |
| **FR**         | communes            | Communes                         | FR IGN GéoPF                      | Yes    | Online          |
| **AU**         | sa3s                | Statistical Areas Level 3        | AU ABS (ASGS 2021)                | Yes    | Online          |
| **AU**         | sa2s                | Statistical Areas Level 2        | AU ABS (ASGS 2021)                | Yes    | Online          |
| **AU**         | ceds                | Commonwealth Electoral Divisions | AU ABS (ASGS 2021)                | Yes    | Online          |
| **AU**         | seds                | State Electoral Divisions        | AU ABS (ASGS 2021)                | Yes    | Online          |
| **AU**         | lgas                | Local Government Areas           | AU ABS (ASGS 2021)                | Yes    | Online          |
| **AU**         | poas                | Postal Areas                     | AU ABS (ASGS 2021)                | Yes    | Online          |
