# Wellby submission

- [Watch the full product demo](Wellby-demo-1080p.mp4): 93 seconds, 1920 × 1080, 30 fps, H.264 + AAC. Female narration, captions and quiet background music.
- [PDF deck](Wellby-deck.pdf): nine slides, including the NHS urgent-care waiting-time journey.

## Video chapters

| Time      | Journey                                              |
| --------- | ---------------------------------------------------- |
| 00:00     | Current patient home                                 |
| 00:07     | Symptom intake and context                           |
| 00:21     | Care pathway                                         |
| 00:25     | Appointment selection and confirmation               |
| 00:35     | Ask Wellby                                           |
| **00:43** | **Nearest NHS urgent care: concern and postcode**    |
| **00:53** | **Recorded 55–110 minute result and nearby centres** |
| 01:03     | Mubit learning workflow                              |
| 01:11     | Matched direct-provider and gateway comparison       |
| 01:25     | Full-product closing                                 |

## Evidence and production

The home uses the actual patient-home component and application styles. Other scenes replay the workflow using deterministic UI state; comparison progress replays saved response receipts rather than making new calls during rendering. Values are recorded measurements, not invented improvements. The urgent-care result comes from the existing synthetic-data demonstration, not a live NHS feed. A gateway response does not establish adapter serving.

All 2,790 encoded frames were checked for cursor visibility; frame borders, headings and the booking panel were checked for the previously reported flashing. The two verification files contain the results. Patients and appointment availability are fictional. Directory locations are sourced separately in `data/uk-services`.

Editable rendering materials remain in the local ignored `artifacts/demo-video/v11-current-product` directory. The repository includes the finished submission assets, not thousands of intermediate frames.
