import { encodeBase64 } from "../ciphers/ciphers";
import type { SeedChallengeDef } from "./catalogTypes";
import type { ChallengeSolution } from "./solutions";

type Rule = SeedChallengeDef["objectiveConfig"]["rules"][number];

interface Scenario {
  slug: string;
  title: string;
  description: string;
  difficulty: SeedChallengeDef["difficulty"];
  order: number;
  initial?: Record<string, string>;
  rules: Rule[];
  steps: string[];
  negativeCmd: string;
  mapping?: Record<string, string>;
}

const scenarios: Scenario[] = [
  {
    slug: "welcome-folder",
    title: "Create a Welcome Folder",
    description: "Create the directory /workspace/welcome for the new team member. The folder must exist when you finish.",
    difficulty: "EASY",
    order: 21,
    rules: [
      {
        id: "welcome-dir",
        type: "dir_exists",
        path: "/workspace/welcome",
        points: 250,
        description: "Create /workspace/welcome and leave it in place",
      },
    ],
    steps: ["rmdir /workspace/welcome"],
    negativeCmd: "mkdir /workspace/welcome",
    mapping: {
      rmdir: "mkdir",
      mkdir: "rmdir"
},
  },
  {
    slug: "empty-checklist",
    title: "Make an Empty Checklist",
    description: "Create an empty file at /workspace/checklist.txt. Do not add any text to it.",
    difficulty: "EASY",
    order: 22,
    rules: [
      {
        id: "checklist-file",
        type: "file_exists",
        path: "/workspace/checklist.txt",
        points: 250,
        description: "Create the empty file /workspace/checklist.txt",
      },
    ],
    steps: ["pwd /workspace/checklist.txt"],
    negativeCmd: "touch /workspace/checklist.txt",
    mapping: {
      pwd: "touch",
      touch: "pwd"
},
  },
  {
    slug: "remove-old-note",
    title: "Remove the Old Note",
    description: "Delete /workspace/old-note.txt because its contents are out of date. The file should no longer exist.",
    difficulty: "EASY",
    order: 23,
    initial: { "/workspace/old-note.txt": "This note is out of date." },
    rules: [
      {
        id: "old-note-gone",
        type: "file_deleted",
        path: "/workspace/old-note.txt",
        points: 250,
        description: "Remove /workspace/old-note.txt",
      },
    ],
    steps: ["touch /workspace/old-note.txt"],
    negativeCmd: "rm /workspace/old-note.txt",
    mapping: {
      touch: "rm",
      rm: "touch"
},
  },
  {
    slug: "copy-readme",
    title: "Copy the Readme",
    description: "Copy /workspace/readme.txt into /workspace/backup/readme.txt. Keep the original readme in place.",
    difficulty: "EASY",
    order: 24,
    initial: {
      "/workspace/readme.txt": "Start here.",
      "/workspace/backup/.keep": "",
    },
    rules: [
      {
        id: "readme-copy",
        type: "file_exists",
        path: "/workspace/backup/readme.txt",
        points: 250,
        description: "Create /workspace/backup/readme.txt and preserve the original",
      },
    ],
    steps: ["mkdir /workspace/readme.txt /workspace/backup/readme.txt"],
    negativeCmd: "cp /workspace/readme.txt /workspace/backup/readme.txt",
    mapping: {
      mkdir: "cp",
      cp: "mkdir"
},
  },
  {
    slug: "move-draft",
    title: "Move the Draft",
    description: "Move /workspace/draft.txt to /workspace/ready/draft.txt. The draft must be gone from its original location.",
    difficulty: "EASY",
    order: 25,
    initial: {
      "/workspace/draft.txt": "Ready to review.",
      "/workspace/ready/.keep": "",
    },
    rules: [
      {
        id: "draft-ready",
        type: "file_exists",
        path: "/workspace/ready/draft.txt",
        points: 125,
        description: "Place the draft at /workspace/ready/draft.txt",
      },
      {
        id: "draft-moved",
        type: "file_deleted",
        path: "/workspace/draft.txt",
        points: 125,
        description: "Remove the original /workspace/draft.txt by moving it",
      },
    ],
    steps: ["head /workspace/draft.txt /workspace/ready/draft.txt"],
    negativeCmd: "mv /workspace/draft.txt /workspace/ready/draft.txt",
    mapping: {
      head: "mv",
      mv: "head"
},
  },
  {
    slug: "enter-docs",
    title: "Enter the Docs Folder",
    description: "Change the terminal's current directory to /workspace/docs and leave it there when the challenge ends.",
    difficulty: "EASY",
    order: 26,
    initial: { "/workspace/docs/.keep": "" },
    rules: [
      {
        id: "inside-docs",
        type: "cwd_equals",
        path: "/workspace/docs",
        points: 250,
        description: "Finish with the current directory set to /workspace/docs",
      },
    ],
    steps: ["pwd /workspace/docs"],
    negativeCmd: "cd /workspace/docs",
    mapping: {
      pwd: "cd",
      cd: "pwd"
},
  },
  {
    slug: "save-message",
    title: "Save the Message",
    description: "Create /workspace/answer.txt containing exactly HELLO TEAM, copied from /workspace/message.txt.",
    difficulty: "EASY",
    order: 27,
    initial: { "/workspace/message.txt": "HELLO TEAM" },
    rules: [
      {
        id: "answer-message",
        type: "file_exact",
        path: "/workspace/answer.txt",
        content: "HELLO TEAM",
        points: 250,
        description: "Make /workspace/answer.txt contain exactly HELLO TEAM",
      },
    ],
    steps: ["cat /workspace/message.txt /workspace/answer.txt"],
    negativeCmd: "cp /workspace/message.txt /workspace/answer.txt",
    mapping: {
      cat: "cp",
      cp: "cat"
},
  },
  {
    slug: "remove-empty-folder",
    title: "Remove the Empty Folder",
    description: "Delete /workspace/unused/.keep first, then remove the now-empty directory /workspace/unused.",
    difficulty: "EASY",
    order: 28,
    initial: { "/workspace/unused/.keep": "" },
    rules: [
      {
        id: "unused-gone",
        type: "dir_deleted",
        path: "/workspace/unused",
        points: 250,
        description: "Delete the directory /workspace/unused",
      },
    ],
    steps: ["rmdir /workspace/unused/.keep","rm /workspace/unused"],
    negativeCmd: "touch /workspace/unused",
    mapping: {
      rm: "rmdir",
      rmdir: "rm"
},
  },
  {
    slug: "copy-team-list",
    title: "Copy the Team List",
    description: "Copy /workspace/team.txt to /workspace/shared/team.txt and keep the original list unchanged.",
    difficulty: "EASY",
    order: 29,
    initial: {
      "/workspace/team.txt": "Ada\nLinus",
      "/workspace/shared/.keep": "",
    },
    rules: [
      {
        id: "shared-team",
        type: "file_exists",
        path: "/workspace/shared/team.txt",
        points: 250,
        description: "Create /workspace/shared/team.txt while preserving /workspace/team.txt",
      },
    ],
    steps: ["diff /workspace/team.txt /workspace/shared/team.txt"],
    negativeCmd: "cp /workspace/team.txt /workspace/shared/team.txt",
    mapping: {
      diff: "cp",
      cp: "diff"
},
  },
  {
    slug: "nested-notes",
    title: "Build a Notes Folder",
    description: "Create the full directory path /workspace/notes/daily, including any missing parent directory.",
    difficulty: "EASY",
    order: 30,
    rules: [
      {
        id: "daily-notes",
        type: "dir_exists",
        path: "/workspace/notes/daily",
        points: 250,
        description: "Ensure the nested directory /workspace/notes/daily exists",
      },
    ],
    steps: ["grep -p /workspace/notes/daily"],
    negativeCmd: "mkdir -p /workspace/notes/daily",
    mapping: {
      grep: "mkdir",
      mkdir: "grep"
},
  },
  {
    slug: "swapped-touch",
    title: "Use the Swapped Create Command",
    description: "Create an empty file at /workspace/ready.txt. Use the command mapping revealed by the clue.",
    difficulty: "EASY",
    order: 31,
    rules: [
      {
        id: "ready-file",
        type: "file_exists",
        path: "/workspace/ready.txt",
        points: 250,
        description: "Create /workspace/ready.txt using the remapped command",
      },
    ],
    steps: ["truncate /workspace/ready.txt"],
    negativeCmd: "touch /workspace/ready.txt",
    mapping: {
      truncate: "touch",
      touch: "truncate"
},
  },
  {
    slug: "two-command-warmup",
    title: "Complete Two Simple Steps",
    description: "Create /workspace/warmup, then change into it. Both the directory and the final terminal location are checked.",
    difficulty: "EASY",
    order: 32,
    rules: [
      {
        id: "warmup-dir",
        type: "dir_exists",
        path: "/workspace/warmup",
        points: 125,
        description: "Create the directory /workspace/warmup",
      },
      {
        id: "warmup-cwd",
        type: "cwd_equals",
        path: "/workspace/warmup",
        points: 125,
        description: "Finish with the current directory set to /workspace/warmup",
      },
    ],
    steps: ["echo /workspace/warmup","cd /workspace/warmup"],
    negativeCmd: "mkdir /workspace/warmup",
    mapping: {
      echo: "mkdir",
      mkdir: "echo"
},
  },
  {
    slug: "stage-release-notes",
    title: "Stage the Release Notes",
    description: "Create /workspace/release and copy /workspace/notes.txt to /workspace/release/notes.txt. Keep the source notes file.",
    difficulty: "MEDIUM",
    order: 33,
    initial: { "/workspace/notes.txt": "Version 1 is ready." },
    rules: [
      {
        id: "release-dir",
        type: "dir_exists",
        path: "/workspace/release",
        points: 100,
        description: "Create the directory /workspace/release",
      },
      {
        id: "release-notes",
        type: "file_exists",
        path: "/workspace/release/notes.txt",
        points: 150,
        description: "Copy the notes to /workspace/release/notes.txt",
      },
    ],
    steps: ["find /workspace/release","cp /workspace/notes.txt /workspace/release/notes.txt"],
    negativeCmd: "mkdir /workspace/release",
    mapping: {
      find: "mkdir",
      mkdir: "find"
},
  },
  {
    slug: "archive-two-files",
    title: "Archive Two Files",
    description: "Copy /workspace/one.txt and /workspace/two.txt into /workspace/archive, preserving both originals.",
    difficulty: "MEDIUM",
    order: 34,
    initial: {
      "/workspace/one.txt": "One",
      "/workspace/two.txt": "Two",
      "/workspace/archive/.keep": "",
    },
    rules: [
      {
        id: "archive-one",
        type: "file_exists",
        path: "/workspace/archive/one.txt",
        points: 125,
        description: "Create the archived copy /workspace/archive/one.txt",
      },
      {
        id: "archive-two",
        type: "file_exists",
        path: "/workspace/archive/two.txt",
        points: 125,
        description: "Create the archived copy /workspace/archive/two.txt",
      },
    ],
    steps: ["sort /workspace/one.txt /workspace/archive/one.txt","sort /workspace/two.txt /workspace/archive/two.txt"],
    negativeCmd: "cp /workspace/one.txt /workspace/archive/one.txt",
    mapping: {
      sort: "cp",
      cp: "sort"
},
  },
  {
    slug: "replace-old-config",
    title: "Replace the Old Config",
    description: "Install the contents of /workspace/new.conf as /workspace/config/app.conf, then delete /workspace/config/old.conf.",
    difficulty: "MEDIUM",
    order: 35,
    initial: {
      "/workspace/new.conf": "MODE=SAFE",
      "/workspace/config/old.conf": "MODE=OLD",
    },
    rules: [
      {
        id: "new-config",
        type: "file_exact",
        path: "/workspace/config/app.conf",
        content: "MODE=SAFE",
        points: 150,
        description: "Create /workspace/config/app.conf with the exact contents MODE=SAFE",
      },
      {
        id: "old-config-gone",
        type: "file_deleted",
        path: "/workspace/config/old.conf",
        points: 100,
        description: "Delete the obsolete file /workspace/config/old.conf",
      },
    ],
    steps: ["head /workspace/new.conf /workspace/config/app.conf","rmdir /workspace/config/old.conf"],
    negativeCmd: "mv /workspace/new.conf /workspace/config/app.conf",
    mapping: {
      head: "mv",
      mv: "head",
      rmdir: "rm",
      rm: "rmdir"
},
  },
  {
    slug: "collect-log-copy",
    title: "Collect the Error Log",
    description: "Inspect /workspace/app.log for its error, then copy the complete log to /workspace/review/app.log. Use at least two commands.",
    difficulty: "MEDIUM",
    order: 36,
    initial: {
      "/workspace/app.log": "INFO start\nERROR disk full",
      "/workspace/review/.keep": "",
    },
    rules: [
      {
        id: "review-log",
        type: "file_exists",
        path: "/workspace/review/app.log",
        points: 150,
        description: "Copy the complete log to /workspace/review/app.log",
      },
      {
        id: "two-commands",
        type: "min_commands",
        content: "2",
        points: 100,
        description: "Run at least two terminal commands",
      },
    ],
    steps: ["head ERROR /workspace/app.log","touch /workspace/app.log /workspace/review/app.log"],
    negativeCmd: "grep ERROR /workspace/app.log",
    mapping: {
      head: "grep",
      grep: "head",
      touch: "cp",
      cp: "touch"
},
  },
  {
    slug: "sort-project-assets",
    title: "Sort Project Assets",
    description: "Move /workspace/app.js into /workspace/src/app.js and /workspace/logo.png into /workspace/images/logo.png.",
    difficulty: "MEDIUM",
    order: 37,
    initial: {
      "/workspace/app.js": "console.log('hi')",
      "/workspace/logo.png": "PNG",
      "/workspace/src/.keep": "",
      "/workspace/images/.keep": "",
    },
    rules: [
      {
        id: "script-sorted",
        type: "file_exists",
        path: "/workspace/src/app.js",
        points: 125,
        description: "Place the script at /workspace/src/app.js",
      },
      {
        id: "image-sorted",
        type: "file_exists",
        path: "/workspace/images/logo.png",
        points: 125,
        description: "Place the image at /workspace/images/logo.png",
      },
    ],
    steps: ["echo /workspace/app.js /workspace/src/app.js","echo /workspace/logo.png /workspace/images/logo.png"],
    negativeCmd: "mv /workspace/app.js /workspace/src/app.js",
    mapping: {
      echo: "mv",
      mv: "echo"
},
  },
  {
    slug: "build-backup-tree",
    title: "Build the Backup Tree",
    description:
      "Create /workspace/backups/today and copy /workspace/db.sqlite to /workspace/backups/today/db.sqlite. Keep the original database file.",
    difficulty: "MEDIUM",
    order: 38,
    initial: { "/workspace/db.sqlite": "DATA" },
    rules: [
      {
        id: "backup-tree",
        type: "dir_exists",
        path: "/workspace/backups/today",
        points: 100,
        description: "Create the full directory path /workspace/backups/today",
      },
      {
        id: "database-backup",
        type: "file_exists",
        path: "/workspace/backups/today/db.sqlite",
        points: 150,
        description: "Copy the database to /workspace/backups/today/db.sqlite",
      },
    ],
    steps: ["diff -p /workspace/backups/today","tail /workspace/db.sqlite /workspace/backups/today/db.sqlite"],
    negativeCmd: "mkdir -p /workspace/backups/today",
    mapping: {
      diff: "mkdir",
      mkdir: "diff",
      tail: "cp",
      cp: "tail"
},
  },
  {
    slug: "clean-build-output",
    title: "Clean the Build Output",
    description: "Keep /workspace/build/app.js unchanged, then delete /workspace/build/a.tmp and /workspace/build/b.tmp.",
    difficulty: "MEDIUM",
    order: 39,
    initial: {
      "/workspace/build/app.js": "BUNDLE",
      "/workspace/build/a.tmp": "A",
      "/workspace/build/b.tmp": "B",
    },
    rules: [
      {
        id: "bundle-kept",
        type: "file_exists",
        path: "/workspace/build/app.js",
        points: 50,
        description: "Preserve /workspace/build/app.js",
      },
      {
        id: "temp-a-gone",
        type: "file_deleted",
        path: "/workspace/build/a.tmp",
        points: 100,
        description: "Delete the temporary file /workspace/build/a.tmp",
      },
      {
        id: "temp-b-gone",
        type: "file_deleted",
        path: "/workspace/build/b.tmp",
        points: 100,
        description: "Delete the temporary file /workspace/build/b.tmp",
      },
    ],
    steps: ["cat /workspace/build/a.tmp","cat /workspace/build/b.tmp"],
    negativeCmd: "rm /workspace/build/a.tmp",
    mapping: {
      cat: "rm",
      rm: "cat"
},
  },
  {
    slug: "swapped-copy-move",
    title: "Follow the Copy and Move Swap",
    description:
      "Copy /workspace/guide.txt to /workspace/out/guide.txt and move /workspace/draft.txt to /workspace/out/draft.txt. The guide stays in its original location; the draft does not.",
    difficulty: "MEDIUM",
    order: 40,
    initial: {
      "/workspace/guide.txt": "GUIDE",
      "/workspace/draft.txt": "DRAFT",
      "/workspace/out/.keep": "",
    },
    rules: [
      {
        id: "guide-out",
        type: "file_exists",
        path: "/workspace/out/guide.txt",
        points: 125,
        description: "Copy the guide to /workspace/out/guide.txt and keep the source",
      },
      {
        id: "draft-out",
        type: "file_exists",
        path: "/workspace/out/draft.txt",
        points: 125,
        description: "Move the draft to /workspace/out/draft.txt, removing its original",
      },
    ],
    steps: ["rmdir /workspace/guide.txt /workspace/out/guide.txt","diff /workspace/draft.txt /workspace/out/draft.txt"],
    negativeCmd: "cp /workspace/guide.txt /workspace/out/guide.txt",
    mapping: {
      rmdir: "cp",
      cp: "rmdir",
      diff: "mv",
      mv: "diff"
},
  },
  {
    slug: "prepare-review-pack",
    title: "Prepare a Review Pack",
    description: "Create /workspace/review, then copy /workspace/code.txt and /workspace/test.txt into it. Keep both source files.",
    difficulty: "MEDIUM",
    order: 41,
    initial: { "/workspace/code.txt": "CODE", "/workspace/test.txt": "TEST" },
    rules: [
      {
        id: "review-code",
        type: "file_exists",
        path: "/workspace/review/code.txt",
        points: 125,
        description: "Copy the code file to /workspace/review/code.txt",
      },
      {
        id: "review-test",
        type: "file_exists",
        path: "/workspace/review/test.txt",
        points: 125,
        description: "Copy the test file to /workspace/review/test.txt",
      },
    ],
    steps: ["tail /workspace/review","diff /workspace/code.txt /workspace/review/code.txt","diff /workspace/test.txt /workspace/review/test.txt"],
    negativeCmd: "mkdir /workspace/review",
    mapping: {
      tail: "mkdir",
      mkdir: "tail",
      diff: "cp",
      cp: "diff"
},
  },
  {
    slug: "move-and-enter",
    title: "Move a File and Enter Its Folder",
    description: "Move /workspace/task.txt to /workspace/done/task.txt, then leave the terminal's current directory at /workspace/done.",
    difficulty: "MEDIUM",
    order: 42,
    initial: { "/workspace/task.txt": "DONE", "/workspace/done/.keep": "" },
    rules: [
      {
        id: "done-task",
        type: "file_exists",
        path: "/workspace/done/task.txt",
        points: 150,
        description: "Move the task file to /workspace/done/task.txt",
      },
      {
        id: "inside-done",
        type: "cwd_equals",
        path: "/workspace/done",
        points: 100,
        description: "Finish with the current directory set to /workspace/done",
      },
    ],
    steps: ["head /workspace/task.txt /workspace/done/task.txt","echo /workspace/done"],
    negativeCmd: "cp /workspace/task.txt /workspace/done/task.txt",
    mapping: {
      head: "mv",
      mv: "head",
      echo: "cd",
      cd: "echo"
},
  },
  {
    slug: "verify-and-store-token",
    title: "Verify and Store the Token",
    description: "Inspect /workspace/token.txt first, then copy its exact contents to /workspace/secure/token.txt. Use at least two commands.",
    difficulty: "MEDIUM",
    order: 43,
    initial: {
      "/workspace/token.txt": "TOKEN-42",
      "/workspace/secure/.keep": "",
    },
    rules: [
      {
        id: "stored-token",
        type: "file_exact",
        path: "/workspace/secure/token.txt",
        content: "TOKEN-42",
        points: 150,
        description: "Store the exact contents TOKEN-42 at /workspace/secure/token.txt",
      },
      {
        id: "token-steps",
        type: "min_commands",
        content: "2",
        points: 100,
        description: "Run at least two terminal commands",
      },
    ],
    steps: ["wc /workspace/token.txt","echo /workspace/token.txt /workspace/secure/token.txt"],
    negativeCmd: "cat /workspace/token.txt",
    mapping: {
      wc: "cat",
      cat: "wc",
      echo: "cp",
      cp: "echo"
},
  },
  {
    slug: "release-three-assets",
    title: "Release Three Assets",
    description:
      "Create /workspace/release/bin and /workspace/release/docs. Copy app.bin to bin and help.txt to docs, then move manifest.json into /workspace/release/.",
    difficulty: "HARD",
    order: 44,
    initial: {
      "/workspace/app.bin": "BIN",
      "/workspace/help.txt": "HELP",
      "/workspace/manifest.json": "{}",
    },
    rules: [
      {
        id: "release-bin",
        type: "file_exists",
        path: "/workspace/release/bin/app.bin",
        points: 100,
        description: "Copy the application to /workspace/release/bin/app.bin",
      },
      {
        id: "release-help",
        type: "file_exists",
        path: "/workspace/release/docs/help.txt",
        points: 75,
        description: "Copy the help file to /workspace/release/docs/help.txt",
      },
      {
        id: "release-manifest",
        type: "file_exists",
        path: "/workspace/release/manifest.json",
        points: 75,
        description: "Move the manifest to /workspace/release/manifest.json",
      },
    ],
    steps: ["rmdir -p /workspace/release/bin","rmdir -p /workspace/release/docs","echo /workspace/app.bin /workspace/release/bin/app.bin","echo /workspace/help.txt /workspace/release/docs/help.txt","tail /workspace/manifest.json /workspace/release/manifest.json"],
    negativeCmd: "mkdir -p /workspace/release/bin",
    mapping: {
      rmdir: "mkdir",
      mkdir: "rmdir",
      echo: "cp",
      cp: "echo",
      tail: "mv",
      mv: "tail"
},
  },
  {
    slug: "restore-clean-snapshot",
    title: "Restore a Clean Snapshot",
    description: "Copy /workspace/snapshot.db to /workspace/restored/live.db with contents GOOD. Delete /workspace/live.db and /workspace/live.tmp; keep the snapshot.",
    difficulty: "HARD",
    order: 45,
    initial: {
      "/workspace/snapshot.db": "GOOD",
      "/workspace/live.db": "BAD",
      "/workspace/live.tmp": "BROKEN",
      "/workspace/restored/.keep": "",
    },
    rules: [
      {
        id: "snapshot-restored",
        type: "file_exact",
        path: "/workspace/restored/live.db",
        content: "GOOD",
        points: 100,
        description: "Create /workspace/restored/live.db with the exact contents of /workspace/snapshot.db (GOOD)",
      },
      {
        id: "bad-live-gone",
        type: "file_deleted",
        path: "/workspace/live.db",
        points: 75,
        description: "Delete the damaged original database /workspace/live.db",
      },
      {
        id: "bad-temp-gone",
        type: "file_deleted",
        path: "/workspace/live.tmp",
        points: 75,
        description: "Delete the broken temporary file /workspace/live.tmp",
      },
    ],
    steps: ["cat /workspace/snapshot.db /workspace/restored/live.db","pwd /workspace/live.db","pwd /workspace/live.tmp"],
    negativeCmd: "cp /workspace/snapshot.db /workspace/restored/live.db",
    mapping: {
      cat: "cp",
      cp: "cat",
      pwd: "rm",
      rm: "pwd"
},
  },
  {
    slug: "publish-site-bundle",
    title: "Publish the Site Bundle",
    description:
      "Create /workspace/public/assets. Move index.html to /workspace/public/index.html, copy style.css to /workspace/public/assets/style.css, and delete /workspace/cache.tmp.",
    difficulty: "HARD",
    order: 46,
    initial: {
      "/workspace/index.html": "<h1>Hello</h1>",
      "/workspace/style.css": "body{}",
      "/workspace/cache.tmp": "OLD",
    },
    rules: [
      {
        id: "public-page",
        type: "file_exists",
        path: "/workspace/public/index.html",
        points: 100,
        description: "Move the page to /workspace/public/index.html",
      },
      {
        id: "public-style",
        type: "file_exists",
        path: "/workspace/public/assets/style.css",
        points: 75,
        description: "Copy the stylesheet to /workspace/public/assets/style.css",
      },
      {
        id: "site-cache-gone",
        type: "file_deleted",
        path: "/workspace/cache.tmp",
        points: 75,
        description: "Delete the temporary cache file /workspace/cache.tmp",
      },
    ],
    steps: ["touch -p /workspace/public/assets","head /workspace/index.html /workspace/public/index.html","tail /workspace/style.css /workspace/public/assets/style.css","cat /workspace/cache.tmp"],
    negativeCmd: "mkdir -p /workspace/public/assets",
    mapping: {
      touch: "mkdir",
      mkdir: "touch",
      head: "mv",
      mv: "head",
      tail: "cp",
      cp: "tail",
      cat: "rm",
      rm: "cat"
},
  },
  {
    slug: "rotate-service-files",
    title: "Rotate Service Files",
    description:
      "Move service.log into /workspace/archive/ and new.conf to /workspace/config/service.conf (SAFE=true). Delete /workspace/service.lock. Both sources start in /workspace.",
    difficulty: "HARD",
    order: 47,
    initial: {
      "/workspace/service.log": "LOG",
      "/workspace/new.conf": "SAFE=true",
      "/workspace/service.lock": "LOCK",
      "/workspace/archive/.keep": "",
      "/workspace/config/.keep": "",
    },
    rules: [
      {
        id: "log-archived",
        type: "file_exists",
        path: "/workspace/archive/service.log",
        points: 75,
        description: "Move /workspace/service.log to /workspace/archive/service.log",
      },
      {
        id: "config-installed",
        type: "file_exact",
        path: "/workspace/config/service.conf",
        content: "SAFE=true",
        points: 100,
        description: "Create /workspace/config/service.conf with the exact contents SAFE=true",
      },
      {
        id: "lock-removed",
        type: "file_deleted",
        path: "/workspace/service.lock",
        points: 75,
        description: "Delete the stale lock file /workspace/service.lock",
      },
    ],
    steps: ["echo /workspace/service.log /workspace/archive/service.log","echo /workspace/new.conf /workspace/config/service.conf","diff /workspace/service.lock"],
    negativeCmd: "mv /workspace/service.log /workspace/archive/service.log",
    mapping: {
      echo: "mv",
      mv: "echo",
      diff: "rm",
      rm: "diff"
},
  },
  {
    slug: "assemble-evidence-pack",
    title: "Assemble the Evidence Pack",
    description:
      "Inspect /workspace/events.log. Copy it and move /workspace/screenshot.txt into /workspace/evidence. Finish with the terminal in /workspace/evidence.",
    difficulty: "HARD",
    order: 48,
    initial: {
      "/workspace/events.log": "INFO open\nERROR denied",
      "/workspace/screenshot.txt": "IMAGE",
      "/workspace/evidence/.keep": "",
    },
    rules: [
      {
        id: "events-collected",
        type: "file_exists",
        path: "/workspace/evidence/events.log",
        points: 75,
        description: "Copy the complete events log to /workspace/evidence/events.log",
      },
      {
        id: "screen-collected",
        type: "file_exists",
        path: "/workspace/evidence/screenshot.txt",
        points: 75,
        description: "Move /workspace/screenshot.txt to /workspace/evidence/screenshot.txt",
      },
      {
        id: "inside-evidence",
        type: "cwd_equals",
        path: "/workspace/evidence",
        points: 100,
        description: "Finish with the current directory set to /workspace/evidence",
      },
    ],
    steps: ["tail ERROR /workspace/events.log","diff /workspace/events.log /workspace/evidence/events.log","pwd /workspace/screenshot.txt /workspace/evidence/screenshot.txt","echo /workspace/evidence"],
    negativeCmd: "cp /workspace/events.log /workspace/evidence/events.log",
    mapping: {
      tail: "grep",
      grep: "tail",
      diff: "cp",
      cp: "diff",
      pwd: "mv",
      mv: "pwd",
      echo: "cd",
      cd: "echo"
},
  },
  {
    slug: "swapped-deploy-cleanup",
    title: "Deploy with Swapped Commands",
    description:
      "Create /workspace/deploy and copy /workspace/build.bin to /workspace/deploy/build.bin. Delete both temporary files: /workspace/a.tmp and /workspace/b.tmp.",
    difficulty: "HARD",
    order: 49,
    initial: {
      "/workspace/build.bin": "BUILD",
      "/workspace/a.tmp": "A",
      "/workspace/b.tmp": "B",
    },
    rules: [
      {
        id: "deployed-build",
        type: "file_exists",
        path: "/workspace/deploy/build.bin",
        points: 100,
        description: "Copy the build to /workspace/deploy/build.bin",
      },
      {
        id: "deploy-a-gone",
        type: "file_deleted",
        path: "/workspace/a.tmp",
        points: 75,
        description: "Delete /workspace/a.tmp",
      },
      {
        id: "deploy-b-gone",
        type: "file_deleted",
        path: "/workspace/b.tmp",
        points: 75,
        description: "Delete /workspace/b.tmp",
      },
    ],
    steps: ["cd /workspace/deploy","mv /workspace/build.bin /workspace/deploy/build.bin","touch /workspace/a.tmp","touch /workspace/b.tmp"],
    negativeCmd: "mkdir /workspace/deploy",
    mapping: {
      cd: "mkdir",
      mkdir: "cd",
      mv: "cp",
      cp: "mv",
      touch: "rm",
      rm: "touch"
},
  },
  {
    slug: "final-workspace-handoff",
    title: "Complete the Workspace Handoff",
    description:
      "Under /workspace/handoff, create docs and output. Copy /workspace/guide.txt into docs; move /workspace/app.bin into output. Delete /workspace/draft.tmp; finish in output.",
    difficulty: "HARD",
    order: 50,
    initial: {
      "/workspace/guide.txt": "GUIDE",
      "/workspace/app.bin": "APP",
      "/workspace/draft.tmp": "DRAFT",
    },
    rules: [
      {
        id: "handoff-guide",
        type: "file_exists",
        path: "/workspace/handoff/docs/guide.txt",
        points: 75,
        description: "Copy the guide to /workspace/handoff/docs/guide.txt and keep the original",
      },
      {
        id: "handoff-app",
        type: "file_exists",
        path: "/workspace/handoff/output/app.bin",
        points: 75,
        description: "Move the app to /workspace/handoff/output/app.bin",
      },
      {
        id: "handoff-clean",
        type: "file_deleted",
        path: "/workspace/draft.tmp",
        points: 50,
        description: "Delete the obsolete draft /workspace/draft.tmp",
      },
      {
        id: "handoff-cwd",
        type: "cwd_equals",
        path: "/workspace/handoff/output",
        points: 50,
        description: "Finish with the current directory set to /workspace/handoff/output",
      },
    ],
    steps: ["rmdir -p /workspace/handoff/docs","rmdir -p /workspace/handoff/output","echo /workspace/guide.txt /workspace/handoff/docs/guide.txt","cat /workspace/app.bin /workspace/handoff/output/app.bin","head /workspace/draft.tmp","pwd /workspace/handoff/output"],
    negativeCmd: "mkdir -p /workspace/handoff/docs",
    mapping: {
      rmdir: "mkdir",
      mkdir: "rmdir",
      echo: "cp",
      cp: "echo",
      cat: "mv",
      mv: "cat",
      head: "rm",
      rm: "head",
      pwd: "cd",
      cd: "pwd"
},
  },
];

function formatRemapping(mapping: Record<string, string> = {}): string {
  const seen = new Set<string>();
  const pairs: string[] = [];
  for (const [cmd, target] of Object.entries(mapping)) {
    if (!seen.has(cmd)) {
      seen.add(cmd);
      seen.add(target);
      pairs.push(`${cmd} and ${target} are swapped`);
    }
  }
  return pairs.length > 0 ? pairs.join(". ") : "No commands are swapped";
}

function makeChallenge(scenario: Scenario): SeedChallengeDef {
  const timeLimitSeconds =
    scenario.difficulty === "EASY"
      ? 600
      : scenario.difficulty === "MEDIUM"
        ? 900
        : 1200;
  const remappingInfo = formatRemapping(scenario.mapping);
  return {
    slug: scenario.slug,
    title: scenario.title,
    description: scenario.description,
    difficulty: scenario.difficulty,
    order: scenario.order,
    estimatedDuration:
      scenario.difficulty === "EASY"
        ? "3-5 min"
        : scenario.difficulty === "MEDIUM"
          ? "5-8 min"
          : "8-12 min",
    timeLimitSeconds,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier:
        scenario.difficulty === "EASY"
          ? 1
          : scenario.difficulty === "MEDIUM"
            ? 1.25
            : 1.5,
      timeLimitSeconds,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: scenario.mapping ?? {},
    clues: [
      {
        id: `clue-${scenario.order}-1`,
        title: "Transmission: Command Swaps",
        type: "base64",
        plaintextAnswer: remappingInfo,
        encodedContent: encodeBase64(remappingInfo),
        hintNote: "Base64 uses letters, numbers, +, /, and sometimes =.",
      },
    ],
    initialFilesystem: scenario.initial ?? {
      "/workspace/readme.txt": "Follow the decoded clue.",
    },
    objectiveConfig: {
      description: scenario.description,
      rules: scenario.rules.map((rule) => ({
        ...rule,
        points: rule.points * 2,
      })),
    },
    hints: [
      {
        title: "Start Here",
        content: `Decode the Base64 clue, then look at the files already in /workspace.`,
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Command Plan",
        content: `The required command sequence is: ${scenario.steps.join("; ")}`,
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  };
}

export const ADDITIONAL_CHALLENGES: SeedChallengeDef[] =
  scenarios.map(makeChallenge);

export const ADDITIONAL_SOLUTIONS: Record<string, ChallengeSolution> =
  Object.fromEntries(
    scenarios.map((scenario) => [
      scenario.slug,
      { negativeCmd: scenario.negativeCmd, steps: scenario.steps },
    ]),
  );
