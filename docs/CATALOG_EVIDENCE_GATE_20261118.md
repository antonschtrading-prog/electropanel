# Catalogue evidence gate — second batch

The intake package adds six explicit device-type contracts (MCB, RCD, RCBO, METER, RELAY, CONTACTOR), per-field evidence requirements and a non-mutating legacy adapter. It **does not** assert manufacturer verification. Even structurally complete entries are `READY_FOR_HUMAN_REVIEW`, never engineering-approved. Records with missing article identity evidence are blocked.

No user interface, calculation logic, original catalogue, existing test, or asset was changed. Synthetic test identifiers are not commercial product records. Future verified intake must provide manufacturer documents with exact SKU and page/section locators for every required field. The integration team must agree RCD naming, contactor utilization categories, meter topology and expanded attributes before importing.

The strict evidence gate is an intake policy, not a demand that the end user upload datasheets for every design value. Missing manufacturer data may remain unknown in the project, but cannot be presented as verified.
