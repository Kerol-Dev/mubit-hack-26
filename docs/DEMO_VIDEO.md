# Wellby demo film — proposed production plan

**Recommendation:** a 105-second, 16:9 product walkthrough, with a 90-second cut if the submission limit requires it. Confirm the organiser's maximum duration and file-size limit before rendering. This document is a storyboard, not a claim that a video has been produced.

The film follows one fictional patient's journey from concern to confirmed demo appointment, then shows the repeatable task and measured Mubit evidence. Approximately 80% actual screen footage and 20% typography, transitions and a simple system diagram.

## Timeline

| Time     | Actual footage / visual                                                   | Story beat                                                                                                          |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0–8 s    | Tight product crop, brief title over a cream background                   | “Finding the right care starts before the appointment.” Introduce Wellby.                                           |
| 8–32 s   | Real symptom entry, relevant health details and reviewed summary          | Follow one fictional patient. Keep enough context to see each actual action.                                        |
| 32–49 s  | Actual route, available clinician/time, confirmation and appointment list | Show a complete successful journey. The confirmation must come from the server.                                     |
| 49–63 s  | Open Ask Wellby, show a genuine reply and care-summary card               | Conversational access to the same care-navigation flow. Keep the non-medical-advice notice legible.                 |
| 63–79 s  | A simple animated diagram alongside actual learning UI                    | Historical-style examples → retained examples → task adapter → automatic routing when eligible. Distinguish stages. |
| 79–97 s  | Actual matched endpoint results and dated Mubit evidence                  | Show measured agreement, time and reported cost availability. Explain the current status accurately.                |
| 97–105 s | Return to the confirmed appointment, then understated logo/title          | “Wellby. A clearer next step.” Brief fictional-demo caption and repository link.                                    |

## Art direction

- Keep the application's forest green, cream, white and restrained brass palette.
- Full-size UI with intentional crops; avoid unreadable whole-desktop recordings and floating 3D browser mockups.
- Gentle push-ins to the symptom field, route decision and confirmation. Use clean cuts when changing context.
- Small cursor emphasis only when needed. Avoid frantic cursor movement, exaggerated click rings and decorative charts.
- Titles are short and editorial. The UI carries the story.
- Preserve source recordings. Any time-compressed wait is visibly marked; never use an edited sequence as evidence of measured latency.

## Voice, music and captions

- Warm, composed British-English narration, roughly 190–210 words for this runtime. A natural human voice or a carefully directed licensed synthetic voice is suitable.
- Quiet instrumental bed with no vocals. Soft texture and restrained rhythm, with music ducked beneath speech.
- Captions throughout, limited to two readable lines. Sentence-based emphasis, not bouncing word-by-word captions. Keep captions away from inputs, route cards and booking controls.
- Use licensed audio and retain the source/licence details with the production files.

## Evidence rules

- Record the running application using fictional details. Do not simulate an AI response, appointment write or loading completion in an animation tool.
- Mubit gateway traffic is not automatically adapter traffic. Only describe a response as adapter-served when independently supported by the serving evidence.
- Use the actual latest quality score, case count and date. Do not imply an unachieved 90% score.
- Cost savings require comparable reported costs; otherwise say “cost not reported” or omit the savings claim.
- Explain that expected routes are illustrative synthetic labels, not clinical validation.
- If the adapter is still below its gate at recording time, show the implemented workflow and genuine training progress. Frame future benefits as goals.

## Production and export

Capture real workflows first, then edit the strongest takes. Record or generate the narration after timings are locked. Use Remotion or a conventional editor for typography, controlled crops, captions, music and final compositing; do not rebuild the application as a fake animated UI.

Recommended delivery: `wellby-demo.mp4`, 1920×1080, 30 fps, H.264, AAC stereo at 48 kHz, web-friendly fast-start metadata. An 8–12 Mbps video rate is a practical starting point, then adapt to the actual upload limit. Keep a caption sidecar (`.srt`) and a clean high-quality master as well as burned-in captions in the submission copy.

References: [Remotion documentation](https://www.remotion.dev/docs/), [MP4 encoding guidance](https://support.google.com/youtube/answer/1722171?hl=en). These are production references, not the hackathon's submission rules.
