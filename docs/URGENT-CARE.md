# Urgent care waiting times

The patient portal includes **Nearest NHS urgent care**, a postcode-based journey with real service locations across England, Scotland, Wales and Northern Ireland. Waiting-time forecasts are limited to the three curated West London centres represented in the historical dataset. Other centres return sourced location and access information, with waiting times marked unavailable. The form checks for emergency concerns before requesting a waiting-time forecast. Results show nearby centres, a range, opening hours, access details and an NHS 111 handoff. It does not book an NHS urgent-care appointment or read live queues.

## Data and learning

The reproducible dataset contains 1,200 historical encounters, 500 training inputs and 100 later evaluation inputs. Records contain date, hour, weekday, month, centre, concern and arrival-to-first-treating-clinician wait. All encounter records are fictional. Centre access information is sourced from NHS provider websites, checked on 24 October 2026.

The model receives historical cohort statistics and arrival context. It never receives the current case's target wait or postcode. Training and evaluation dates and identifiers are disjoint. The postcode is looked up using postcodes.io on the server.

Mubit learns from recorded provider responses under stable instructions. This is not a direct upload of labelled patient outcomes: historical cohorts inform the teacher's forecasts, and Mubit reviews those calls for adapter training. 500/500 recorded training calls completed successfully. The console shows the task **Wellby urgent care waiting-time**, ID `ln_e899dd7e5668cde3596c1ece`, with 500 calls and status **Reviewing examples**, 0 kept at the last inspection. No waiting-time adapter has been verified as serving.

## Evaluation

100/100 separate calls completed with recording off. 87 returned forecasts; 13 diverted for review. Mean absolute error was 20.9 minutes on those 87 forecasts. 72/87 observed waits fell within returned intervals (82.8%). These are measurements on synthetic cases through the gateway, not clinical accuracy or proof of adapter performance. Results are in `docs/evidence/urgent-care-evaluation.json`. Raw receipts and the reproducible dataset remain in the ignored `.wellby/urgent-wait/` directory.

Patient calls use metadata-only recording. Responses require a gateway receipt, exact requested centre IDs, valid ordered intervals, and empty forecasts for safety diversions. An unchanged provider model alias is not treated as proof of the serving route. When a forecast fails, sourced directory results can still be shown, with the forecast failure explained. No local fallback wait is invented. A 5-second per-patient cooldown prevents accidental duplicate calls.

## Running explicit batches

Prepare only: `node --import tsx server/urgent-training.ts --count=500`.
Submit training: add `--send`. Evaluate: `--evaluate --count=100 --send`. Paid calls occur only with `--send`; already attempted IDs are skipped, and no automatic retry is made. Do not train on evaluation cases.

## Sources

- https://www.lnwh.nhs.uk/urgent-treatment-centre/
- https://www.lnwh.nhs.uk/central-middlesex-hospital
- https://www.imperial.nhs.uk/our-services/emergency-care/urgent-treatment-centres
- https://www.nhs.uk/nhs-services/urgent-and-emergency-care-services/when-to-visit-an-urgent-treatment-centre/
- https://docs.mubit.ai/guides/first-adapter
- https://docs.mubit.ai/reference/api

## Current review blocker

The task history reports 200 calls sent for review and 300 not reviewed because of today's limit (154 + 146). Advanced settings confirm `adapters.rate.max_per_day = 200`, set by Middleware, with no edit control exposed. `adapters.max_rows = 250` is the separate per-training-run cap. Training acceptance and adapter qualification remain external prerequisites; thresholds were not lowered.

## Practice workspace

Open **Practice workspace → Urgent care** to inspect the dedicated dataset, recorded training attempts, dated console review status and saved held-out results. Choose 1, 10, 25 or 100 cases to explicitly run an evaluation through Mubit; the interface shows that calls are billable. Stop takes effect after the in-flight call. Evaluation recording is off and the original measured run is preserved. Training sends only remaining, unattempted training cases. Export includes saved receipt evidence without credentials.

## UK directory

Current UK postcodes resolve through postcodes.io. Nearby services are ranked by straight-line distance. The attributed directory combines filtered GB open data, official HSC Northern Ireland service listings and verified NHS corrections. It is not exhaustive and does not supply live queue data. Unknown opening hours remain unknown. See [directory provenance and licences](../data/uk-services/README.md).
