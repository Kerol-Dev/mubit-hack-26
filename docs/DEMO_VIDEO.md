# Wellby final product video

The final package is in [`demo/`](../demo/README.md): a 97-second, 1920 x 1080, 30 fps MP4 and a matching nine-slide PDF deck.

## Story and narration

The video follows a fictional patient through symptom intake, Mubit-powered care routing, appointment booking, Ask Wellby chat and nearby NHS urgent-care waiting times. It then shows the learning workflow and an illustrative team comparison.

The British female voice explicitly identifies Mubit in each AI action. The routing sentence is: “Now it's finding your care options, powered by Mubit, and connecting you to available appointments.” Chat and urgent-care forecasts have their own Mubit narration. Captions follow the spoken wording.

See the [chapter timings](../demo/README.md#chapters). The PDF uses screenshots from the same final video and includes a dedicated slide covering all three Mubit-powered actions.

## Production

The workflow is deterministic UI playback, using the product's components and styles. A framed screen, smooth cursor movement and a continuously filling loading bar keep the demonstration legible. Loading lasts 5.3 seconds. The scene duration is editorial and is not a latency measurement.

Female narration, quiet background music and captions are retained. Final export uses H.264 video, AAC audio and fast-start metadata. All 2,910 encoded frames were checked for cursor visibility, with additional checks for the previously reported booking-panel flashing.

## Evidence boundaries

- Comparison figures in this team-preview video and deck are illustrative, not measured results or claims about current adapter performance.
- The website retains its separate recorded results and response receipts. The video edit does not change them.
- Mubit gateway traffic alone does not prove a trained adapter served a response.
- Patients, bookings and historical encounters are fictional. Waiting-time forecasts are not a live NHS feed.
- Model evaluation cases remain separate from training.

## Editable source

Local rendering and audio sources are in `artifacts/demo-video/v19-final`, using the frames in `v17-moving-loading`. PDF authoring is in `tmp/pdfs/build_final_deck.py`. These intermediate directories are ignored; the finished video, deck and verification files are included in the repository.
