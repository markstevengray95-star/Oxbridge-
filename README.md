# Oxbridge Interview Tutor

An interactive preparation app for students applying to Oxford or Cambridge.

## Included

- Personal Oxford, Cambridge or combined pathway with course, test, written-work and interview guidance
- Voice or typed multi-turn adaptive interview practice across seven course families, with targeted follow-ups, a three-level hint ladder, thinking-move tracking, four pressure levels, four interviewer styles and a sourced published-interview archive
- 2,520 structured interview combinations, unseen-material mode, full mock day flow and drawable whiteboard
- 3,400+ original TMUA, ESAT, TARA, LNAT and UCAT-style questions, including longer passage/data clusters, section filters, adaptive practice, persistent redo queues, bookmarks and full-length mock structures matched to current official formats
- Official-practice links, section-by-section mock timing, missed-question review, Oxford published tutor questions, Cambridge official mock/example resources, personal-statement defence, supercurricular tracking and a subject reading tutor
- Preparation planner, 2027 deadline timeline, technology checks and daily challenge
- Skills dashboard, mistake intelligence and timestamped interview replay
- Teacher applicant overview and original interview-sequence generator
- Automatic progress saving in the browser
- Responsive desktop and mobile interface

The app uses original practice material. Students should always confirm current requirements and use official test-provider materials for definitive specifications.

## Run locally

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```


Automated production-build verification runs on pull requests and pushes to `main`.
\n## Interview-source policy\n\nThe published archive only uses material universities have made public. Oxford entries link to official tutor examples. Cambridge live interview questions are not reproduced because Cambridge requires interview confidentiality; the app links official Cambridge mock/example interview resources instead.\n
CI installs the pinned pnpm version from `package.json` before running the production build, avoiding Corepack key drift on hosted runners.
