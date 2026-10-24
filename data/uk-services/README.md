# UK service locations

England, Scotland and Wales: UK Hospitals, September 2026, Postcodes UK, https://www.postcodesuk.com/data-downloads/hospitals. Source download https://www.postcodesuk.com/downloads/data/uk-hospitals.csv. SHA-256 f3b5bf50ea6bc39e9852610f299adeb18d9a8d44d7c72476f874ad8c9455142d. 1,708 source rows. Includes © OpenStreetMap contributors (ODbL https://www.openstreetmap.org/copyright), with ONS postcode matching under OGL v3.0. The compilation is attributed to Postcodes UK.

Northern Ireland: HSC Service Finder, https://online.hscni.net/hsc-service-finder/, accessed 24 October 2026. Emergency/urgent service names and published contact addresses; postcode coordinates resolved through postcodes.io. Adult services only. Hours and admission arrangements should be checked with each provider.

This is an open-data location directory, not NHS Directory of Services access, a comprehensive clinical service directory, or a live queue feed. Type/A&E fields reflect source tags. Private, paediatric-only, psychiatric and maternity-only entries are excluded. Minor injury capability is not inferred from generic hospital records. Sites with unknown hours are labelled accordingly.

`hospitals.csv` is the unchanged source. `locations.json` is the filtered derivative. `northern-ireland.json` contains sourced NI records. All files are available in the repository under their applicable source licences; they contain no patient data.

`official-overrides.json` adds source-tag omissions verified against official service pages. University Hospital of Wales Emergency Department: NHS 111 Wales, https://111.wales.nhs.uk/LocalServices/ViewLocalService.aspx?id=3133, checked 24 October 2026; coordinates from the original hospital record. The source CSV does not flag this hospital as an emergency department.

Antrim Area Hospital still publishes BT41 2RL; its static coordinates were resolved through the postcodes.io terminated-postcode endpoint (postcode terminated September 2025). User searches use current UK postcodes.
