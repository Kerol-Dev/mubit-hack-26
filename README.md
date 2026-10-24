# Wellby

**Your care, all in one place.**

Wellby brings symptom intake, care navigation, appointments and nearby urgent care into one patient portal. Describe what is happening, find a suitable next step and choose an appointment—without having to understand the practice's departments first.

Built for the **Mubit hackathon**, with Mubit powering **care routing, Ask Wellby chat and urgent-care waiting-time forecasts**.

**[Watch the final demo](demo/Wellby-demo-1080p.mp4) · [Open the PDF deck](demo/Wellby-deck.pdf) · [Run locally](#run-locally) · [Explore the architecture](docs/ARCHITECTURE.md)**

![Wellby patient portal](docs/images/patient-portal.png)

## The product

### From a concern to an appointment

A guided care request collects symptoms, duration, severity and relevant health details. Patients review their information before sending it. Mubit suggests a care pathway; Wellby validates the response and presents the appropriate next step.

Routine journeys lead to clinician and appointment selection, followed by an explicit booking confirmation. Patients can then view, reschedule or cancel their appointments and download a calendar entry. The care directory includes GP, pharmacy, nursing, physiotherapy and other services, with NHS, private and self-referral options.

### Ask Wellby

A chat panel stays within reach throughout the portal. It answers general health questions through Mubit, helps patients describe a concern and prepares an editable care summary. Once the patient confirms that summary, chat uses the same care-routing function as the main request flow.

Appointment confirmation comes from the booking system, not from a generated chat reply. Urgent-care location and waiting-time questions hand off to the dedicated finder with the postcode carried across.

### Nearby urgent care

Enter a UK postcode and a concern to find nearby services. Postcodes are resolved against a real postcode service, and centre details come from attributed public directories covering all four UK nations.

For centres supported by the historical dataset, Mubit forecasts a waiting-time range using the concern, arrival time and historical patterns. The results show only centres with complete forecasts. Severe or worsening symptoms change the interface to urgent advice instead of showing a queue estimate.

**Current forecast coverage:** Central Middlesex, St Mary's and Charing Cross. UK-wide location lookup does not mean every centre has waiting-time data. These forecasts use fictional historical encounters, not a live NHS queue feed.

### Practice workspace

The staff-facing workspace brings together care requests, schedules, training progress and model comparisons. It includes a dedicated urgent-care area for its separate training task, held-out evaluation and request receipts.

## See it in action

| Deliverable                                       | What's inside                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| [Final product video](demo/Wellby-demo-1080p.mp4) | 97 seconds · 1080p · 30 fps · female narration, captions and music        |
| [Submission deck](demo/Wellby-deck.pdf)           | Nine slides covering the patient journey and all three Mubit integrations |
| [Demo guide](demo/README.md)                      | Chapter timestamps, media details and evidence notes                      |

The video follows the patient home, symptom intake, Mubit routing, appointment booking, chat, urgent-care forecasts and the practice workspace. Its comparison segment uses **illustrative team-preview figures**, not measured adapter performance. Actual application runs retain their own measured results and receipts.

## Run locally

Use **Node.js 24** and npm. Wellby uses Node's built-in SQLite module; no separate database server is needed.

```sh
git clone https://github.com/Kerol-Dev/mubit-hack-26.git
cd mubit-hack-26
npm ci
cp .env.example .env
```

Add your `MUBIT_API_KEY` to `.env`, then start the app:

```sh
npm run dev
```

Open **http://127.0.0.1:4174**. The first start creates the fictional practice, demo account and appointment availability automatically.

Choose **Continue as Maya Patel**, or sign in with:

|          | Demo credential    |
| -------- | ------------------ |
| Email    | `maya@wellby.demo` |
| Password | `Wellby2026!`      |

Without an API key, the portal and local appointment-management screens still work; AI features show an unavailable state. Starting the server does not start training or evaluation batches.

### Configuration

All credentials belong in the local `.env` file and stay on the server.

| Variable                            | Purpose                                                                  | Default                  |
| ----------------------------------- | ------------------------------------------------------------------------ | ------------------------ |
| `MUBIT_API_KEY`                     | Care routing, chat, waiting-time forecasts and Mubit comparisons         | Required for AI features |
| `MUBIT_MODEL`                       | Care-navigation model                                                    | `claude-haiku-4-5`       |
| `ANTHROPIC_API_KEY`                 | Direct Anthropic side of a Haiku comparison                              | Optional                 |
| `OPENAI_API_KEY`                    | Direct OpenAI side of a GPT comparison                                   | Optional                 |
| `COMPARISON_MODEL`                  | Model requested by new comparison runs                                   | `claude-haiku-4-5`       |
| `MUBIT_RECORD_DEMO_REQUESTS`        | Record fictional portal care-routing inputs and outputs for Mubit review | `false`                  |
| `MUBIT_CONSOLE_URL`                 | Link to your own Mubit project or task                                   | Unset                    |
| `MUBIT_SHOW_DEMO_TRAINING_SNAPSHOT` | Show the original project's dated hackathon snapshot                     | `false`                  |
| `PORT`                              | Local server port                                                        | `4174`                   |

Model calls can incur provider charges. Start comparisons with one case; larger runs are explicit actions.

### Try these journeys

1. **Request care:** describe a fictional mild shoulder ache lasting three weeks, review the details and follow the suggested pathway to an available appointment.
2. **Chat:** open **Ask Wellby**, describe a concern and review its proposed care summary before continuing.
3. **Urgent care:** use a fictional minor ankle injury and postcode `W10 6DZ` to explore the supported forecast area. Changing the severity demonstrates the urgent-review state.
4. **Compare endpoints:** open **Practice workspace → Model comparison**, create a run and select one case. A Haiku comparison needs both Mubit and direct Anthropic keys.

## How Mubit fits

All three AI features make server-side requests through Mubit's Anthropic-compatible gateway. They have different responsibilities:

| Feature              | Input                                                                 | Output used by Wellby                                  |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ |
| Care navigation      | Structured symptom intake and relevant health details                 | A validated pathway and next step                      |
| Ask Wellby           | Conversation and supported application context                        | A reply or a care summary for the patient to confirm   |
| Urgent-care forecast | Concern, arrival-time features and centre-specific historical cohorts | Validated waiting-time ranges, or escalation to review |

Care navigation maps to seven pathways: **pharmacy, GP, nurse, physiotherapy, urgent care, emergency services and practice review**. The app then handles available services, appointment slots and persistence itself.

Mubit automatically decides how a gateway request is served. **Using the gateway is not, by itself, evidence that a trained adapter answered.** The application preserves returned models and request evidence rather than labelling every Mubit response as an adapter response.

### Recording, learning and evaluation

- **Training:** synthetic examples use a consistent task contract and full recording. Mubit reviews eligible answers and manages example retention and adapter training.
- **Patient journeys:** care requests default to metadata-only recording. Enable `MUBIT_RECORD_DEMO_REQUESTS` only for fictional inputs when you want their input/output recorded for review. General chat replies remain metadata-only.
- **Evaluation:** held-out comparison cases remain separate from training and do not become training examples through the demo-recording switch.
- **Progress:** submitted calls, retained examples, trained versions and verified serving are separate stages. Saving a local staff correction does not retrain an adapter.

Metadata-only calls may not appear in the console's Requests list. Inspect the application's receipts when checking whether a call happened. A fresh checkout does not include the original project's private run history or live training state.

See [architecture and data flow](docs/ARCHITECTURE.md) and [urgent-care training, data and evaluation](docs/URGENT-CARE.md) for implementation details and dated evidence.

## Comparing direct calls with Mubit

The comparison workspace runs the same held-out cases through two endpoints:

| Left side                                            | Right side                          |
| ---------------------------------------------------- | ----------------------------------- |
| Direct Anthropic for Haiku, or direct OpenAI for GPT | The corresponding Mubit gateway     |
| Provider key                                         | Mubit key                           |
| Same model request and case content                  | Same model request and case content |

Each run tracks route accuracy against the synthetic expected answers, response time, token usage, available cost information and request receipts. Failures remain in accuracy denominators; missing cost data remains unknown. Historical runs keep their original model labels.

The 100-case comparison set measures agreement with authored expected routes, not clinical effectiveness. Adapter-serving claims require serving evidence, and video preview figures are separate from these stored measurements.

## Development

| Command                | Purpose                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Start the local app with server watching and Vite development tooling |
| `npm test`             | Run offline workflow and integrity tests; no paid inference           |
| `npm run build`        | Check TypeScript and create the production frontend                   |
| `npm start`            | Serve the built app locally                                           |
| `npm run format:check` | Check source and documentation formatting                             |

```text
src/        Patient portal, guided care flow, chat and practice workspace
server/     Express API, model clients, SQLite storage and tests
shared/     Pathways, departments, types and API contracts
data/       Sourced UK service-directory data and attribution
public/     Static assets and photography credits
docs/       Architecture, urgent-care implementation and video notes
demo/       Final MP4, PDF deck and verification reports
```

**Stack:** React 19, TypeScript, Vite, Express, SQLite, Radix UI and Lucide.

Local accounts, profile photos, conversations, requests, bookings and measured results are stored in `.wellby/practice.sqlite` and persist across restarts. `.wellby/` and `.env` are excluded from Git.

## Scope and credits

Wellby is a hackathon demonstration with fictional patients, historical encounters and appointment availability. It does not diagnose conditions, connect to NHS booking systems or create real healthcare appointments. The practice workspace and local authentication are not a production clinical access-control system.

- [UK service-directory sources and licences](data/uk-services/README.md)
- [Portrait photography credits](public/photo-credits.txt)—photos represent fictional identities and do not imply endorsement.
- [Architecture](docs/ARCHITECTURE.md)
- [Urgent-care implementation](docs/URGENT-CARE.md)
- [Final video production notes](docs/DEMO_VIDEO.md)
