# Silent Symptom Diary (React)

Daily 30-second check-in (voice, typing, phone motion) compared with each patient's own baseline, plus a doctor dashboard.
Team: The Ultimate Descenders | BitSetGo'26 | HealthTech

## Run it

```bash
npm install
npm run dev        # opens http://localhost:5173
npm run build      # makes the dist/ folder (works on any static host)
npm run preview    # test the built site
```

Needs Node.js 18 or newer. The app uses `HashRouter`, so links look like `/#/doctor` and no server setup is needed.

Microphone and motion sensors need HTTPS or localhost. To try it on a phone, deploy `dist/` to Netlify, Vercel or GitHub Pages.

## Routes

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/consent` | Consent (required first) |
| `/home` | Patient home |
| `/checkin` | Voice, typing and motion check-in |
| `/result` | Result against the baseline |
| `/trends` | Patient trend chart |
| `/settings` | Download, sample history, delete, withdraw |
| `/doctor` | Doctor dashboard |
| `/doctor/patient/:id` | One patient (try `014`, `027`, or `me`) |

## Folders

```
src/
  main.jsx            starts React and the router
  App.jsx             routes and the consent guard
  hooks.js            useCheckins, useTodayNotes
  lib/data.js         storage, baseline maths, flags, sample patients
  lib/measure.js      voice, typing and motion measurements
  components/         Shell (sidebar, banner, cards), Charts, Illustrations, signals
  pages/              one file per page
  styles/theme.css    colours, layout and components
```

## Change the design

- Colours and sizes: the `:root` block at the top of `src/styles/theme.css`.
- Illustrations: `src/components/Illustrations.jsx` (plain SVG).
- Rules for baseline and flags: the constants at the top of `src/lib/data.js`.

## Notes

- Data stays in the browser (localStorage). Nothing is uploaded.
- Patients 014 to 033 and anything labelled "sample" are made-up demo data.
- This is a prototype concept, not a medical device.
