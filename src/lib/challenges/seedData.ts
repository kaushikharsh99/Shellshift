import {
  encodeAsciiDecimal,
  encodeBase64,
  encodeBinary,
  encodeHex,
  encodeMorse,
  encodeRot13,
  encodeUrlPercent,
} from "../ciphers/ciphers";
import type { SeedChallengeDef } from "./catalogTypes";
import { ADDITIONAL_CHALLENGES } from "./additionalSeedData";

export type { ClueItem, SeedChallengeDef } from "./catalogTypes";

export const SEED_CHALLENGES: SeedChallengeDef[] = [
  // ==========================================
  // ==========================================
  // LEVEL 1: EASY — Operation Inversion
  // ==========================================
  {
    slug: "operation-inversion",
    title: "Swapped Commands",
    description:
      "Decode the clue to discover the swapped commands, then create the directory /workspace/breach.",
    difficulty: "EASY",
    order: 1,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 1200,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 1200,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      cd: "mkdir",
      mkdir: "cd",
    },
    clues: [
      {
        id: "clue-1-1",
        title: "Transmission: Command Swaps",
        type: "base64",
        plaintextAnswer:
          "cd and mkdir are swapped",
        encodedContent: encodeBase64(
          "cd and mkdir are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/readme.txt":
        "Welcome to ShellShift. Decode the transmission clue to discover swapped commands.",
    },
    objectiveConfig: {
      description: "Decode the clue to discover the swapped commands, then create the directory /workspace/breach.",
      rules: [
        {
          id: "obj-1-breach-dir",
          points: 500,
          type: "dir_exists",
          path: "/workspace/breach",
          description: "Create the directory /workspace/breach",
        },
      ],
    },
    hints: [
      {
        title: "Decoding the Clue",
        content: "The clue reveals that 'cd' and 'mkdir' have swapped jobs.",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Deploying Recovery",
        content: "Run 'cd /workspace/breach' to create the folder.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 2: EASY — Make a Folder
  // ==========================================
  {
    slug: "pathfinder-basics",
    title: "Make a Project Folder",
    description:
      "Create the directory /workspace/project. Decode the clue to find which command now creates folders.",
    difficulty: "EASY",
    order: 2,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      touch: "mkdir",
      mkdir: "touch",
    },
    clues: [
      {
        id: "clue-2-1",
        title: "Directive: Folder Creation",
        type: "base64",
        plaintextAnswer:
          "touch and mkdir are swapped",
        encodedContent: encodeBase64(
          "touch and mkdir are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/readme.txt": "Mission: Create a directory named project.",
    },
    objectiveConfig: {
      description: "Create the directory /workspace/project. Decode the clue to find which command now creates folders.",
      rules: [
        {
          id: "obj-2-project-dir",
          points: 500,
          type: "dir_exists",
          path: "/workspace/project",
          description: "Create the directory /workspace/project",
        },
      ],
    },
    hints: [
      {
        title: "Swapped Creation",
        content:
          "The command 'touch' has been swapped to create directories instead of files.",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Command Syntax",
        content:
          "Enter 'touch /workspace/project' to complete the objective.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 3: EASY — Morse Message
  // ==========================================
  {
    slug: "morse-mail",
    title: "Read the Morse Note",
    description:
      "Read /workspace/note.txt using the remapped read command, then create the confirmation file /workspace/read.txt.",
    difficulty: "EASY",
    order: 3,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      touch: "cat",
      cat: "touch",
    },
    clues: [
      {
        id: "clue-3-1",
        title: "Morse Code Directive",
        type: "morse",
        plaintextAnswer:
          "touch and cat are swapped",
        encodedContent: encodeMorse(
          "touch and cat are swapped",
        ),
        hintNote: "Morse code: dots (.), dashes (-), and slashes (/) for spaces.",
      },
    ],
    initialFilesystem: {
      "/workspace/note.txt":
        "WELCOME: You read the hidden note! Now run 'cat /workspace/read.txt' to complete.",
    },
    objectiveConfig: {
      description: "Read /workspace/note.txt using the remapped read command, then create the confirmation file /workspace/read.txt.",
      rules: [
        {
          id: "obj-3-read-file",
          points: 500,
          type: "file_exists",
          path: "/workspace/read.txt",
          description: "Ensure the file /workspace/read.txt exists",
        },
      ],
    },
    hints: [
      {
        title: "Viewing Files",
        content:
          "The Morse code clue reveals that 'touch' reads files and 'cat' creates files.",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Reading and Creating",
        content:
          "Run 'touch /workspace/note.txt' to print the note, then 'cat /workspace/read.txt' to finish.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 4: EASY — Binary Message
  // ==========================================
  {
    slug: "binary-breadcrumbs",
    title: "Follow the Binary Clue",
    description:
      "Decode the binary command-swap clue, then create the directory /workspace/secret.",
    difficulty: "EASY",
    order: 4,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      pwd: "mkdir",
      mkdir: "pwd",
    },
    clues: [
      {
        id: "clue-4-1",
        title: "Binary Directive: Swapped Folders",
        type: "binary",
        plaintextAnswer:
          "pwd and mkdir are swapped",
        encodedContent: encodeBinary(
          "pwd and mkdir are swapped",
        ),
        hintNote: "Binary encoding: each character is 8 bits (0s and 1s).",
      },
    ],
    initialFilesystem: {
      "/workspace/message.txt":
        "01010011 01000101 01000011 01010010 01000101 01010100",
    },
    objectiveConfig: {
      description:
        "Decode the binary command-swap clue, then create the directory /workspace/secret.",
      rules: [
        {
          id: "obj-4-secret-dir",
          points: 500,
          type: "dir_exists",
          path: "/workspace/secret",
          description: "Create the directory /workspace/secret",
        },
      ],
    },
    hints: [
      {
        title: "Decoding Binary",
        content:
          "The binary clue reveals that 'pwd' creates directories (acting as mkdir).",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Creating Folder",
        content:
          "'pwd' creates directories in this level. Run 'pwd /workspace/secret'.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 5: EASY — Remove the Temporary File
  // ==========================================
  {
    slug: "hex-in-plain-sight",
    title: "Remove the Temporary File",
    description:
      "Delete /workspace/temp.txt and keep /workspace/keep.txt. Decode the hex clue to discover the correct removal command.",
    difficulty: "EASY",
    order: 5,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      mkdir: "rm",
      rm: "mkdir",
    },
    clues: [
      {
        id: "clue-5-1",
        title: "Hex Removal Directive",
        type: "hex",
        plaintextAnswer:
          "mkdir and rm are swapped",
        encodedContent: encodeHex(
          "mkdir and rm are swapped",
        ),
        hintNote: "Hexadecimal byte encoding (0-9, a-f).",
      },
    ],
    initialFilesystem: {
      "/workspace/keep.txt": "Required system configuration.",
      "/workspace/temp.txt": "Temporary file to be deleted.",
    },
    objectiveConfig: {
      description:
        "Delete /workspace/temp.txt and keep /workspace/keep.txt. Decode the hex clue to discover the correct removal command.",
      rules: [
        {
          id: "obj-5-temp-del",
          points: 300,
          type: "file_deleted",
          path: "/workspace/temp.txt",
          description: "Delete /workspace/temp.txt",
        },
        {
          id: "obj-5-keep-exists",
          points: 200,
          type: "file_exists",
          path: "/workspace/keep.txt",
          description: "Ensure the file /workspace/keep.txt exists",
        },
      ],
    },
    hints: [
      {
        title: "Deleting with mkdir",
        content:
          "The hex clue explains that 'mkdir' is remapped to remove files in this challenge.",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Executing Removal",
        content:
          "Run 'mkdir /workspace/temp.txt' to delete the temporary file.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 6: EASY — Hex Name
  // ==========================================
  {
    slug: "directory-flip",
    title: "Copy the Flag File",
    description:
      "Copy /workspace/flag.txt to /workspace/found.txt. The destination must contain HEX_SUCCESS from the flag file.",
    difficulty: "EASY",
    order: 6,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      touch: "cp",
      cp: "touch",
    },
    clues: [
      {
        id: "clue-6-1",
        title: "Hex Encoded Target",
        type: "hex",
        plaintextAnswer:
          "touch and cp are swapped",
        encodedContent: encodeHex(
          "touch and cp are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/flag.txt": "HEX_SUCCESS: You located the hex target file!",
      "/workspace/decoy.txt": "Not this file.",
    },
    objectiveConfig: {
      description: "Copy /workspace/flag.txt to /workspace/found.txt. The destination must contain HEX_SUCCESS from the flag file.",
      rules: [
        {
          id: "obj-6-found",
          points: 500,
          type: "file_contains",
          path: "/workspace/found.txt",
          content: "HEX_SUCCESS",
          description: "Make /workspace/found.txt contain HEX_SUCCESS",
        },
      ],
    },
    hints: [
      {
        title: "Decoding Hex",
        content:
          "The hex bytes translate to 'flag.txt'. In this level, 'touch' copies files (acting as cp).",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Copying Target",
        content:
          "Run 'touch /workspace/flag.txt /workspace/found.txt' to copy the file.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 7: EASY — Copy the File
  // ==========================================
  {
    slug: "the-missing-file",
    title: "Copy Data to Backup",
    description:
      "Copy /workspace/data.txt to /workspace/backup/data.txt. Keep /workspace/data.txt in its original location.",
    difficulty: "EASY",
    order: 7,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      mv: "cp",
      cp: "mv",
    },
    clues: [
      {
        id: "clue-7-1",
        title: "Duplication Directive",
        type: "base64",
        plaintextAnswer:
          "mv and cp are swapped",
        encodedContent: encodeBase64(
          "mv and cp are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/data.txt": "Original data payload.",
      "/workspace/backup/.keep": "",
    },
    objectiveConfig: {
      description:
        "Copy /workspace/data.txt to /workspace/backup/data.txt. Keep /workspace/data.txt in its original location.",
      rules: [
        {
          id: "obj-7-backup-file",
          points: 300,
          type: "file_exists",
          path: "/workspace/backup/data.txt",
          description: "Ensure the file /workspace/backup/data.txt exists",
        },
        {
          id: "obj-7-orig-file",
          points: 200,
          type: "file_exists",
          path: "/workspace/data.txt",
          description: "Ensure the file /workspace/data.txt exists",
        },
      ],
    },
    hints: [
      {
        title: "Copying with mv",
        content:
          "In this challenge, 'mv' acts as 'cp' without removing the original file.",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Target Command",
        content: "Run 'mv /workspace/data.txt /workspace/backup/data.txt'.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 8: EASY — First Mission
  // ==========================================
  {
    slug: "first-flag",
    title: "Prepare the Mission Folder",
    description:
      "Create /workspace/mission, then copy /workspace/briefing.txt to /workspace/mission/briefing.txt.",
    difficulty: "EASY",
    order: 8,
    estimatedDuration: "2-4 min",
    timeLimitSeconds: 600,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.0,
      timeLimitSeconds: 600,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      cat: "mkdir",
      mkdir: "cat",
    },
    clues: [
      {
        id: "clue-8-1",
        title: "Combined Mission Directive",
        type: "hex",
        plaintextAnswer:
          "cat and mkdir are swapped",
        encodedContent: encodeHex(
          "cat and mkdir are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/briefing.txt": "MISSION DIRECTIVE: Level 8 complete.",
    },
    objectiveConfig: {
      description: "Create /workspace/mission, then copy /workspace/briefing.txt to /workspace/mission/briefing.txt.",
      rules: [
        {
          id: "obj-8-mission-dir",
          points: 250,
          type: "dir_exists",
          path: "/workspace/mission",
          description: "Create the directory /workspace/mission",
        },
        {
          id: "obj-8-briefing-copy",
          points: 250,
          type: "file_exists",
          path: "/workspace/mission/briefing.txt",
          description: "Ensure the file /workspace/mission/briefing.txt exists",
        },
      ],
    },
    hints: [
      {
        title: "Folder Creation",
        content:
          "'cat' creates directories here. First run 'cat /workspace/mission'.",
        penaltySeconds: 15,
        pointPenalty: 20,
        order: 1,
      },
      {
        title: "Copying Briefing",
        content:
          "Run 'cp /workspace/briefing.txt /workspace/mission/briefing.txt'.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 9: MEDIUM — The Cryptic Agent
  // ==========================================
  {
    slug: "the-cryptic-agent",
    title: "Create the Agent Key",
    description:
      "Read /workspace/notes.txt, then create /workspace/agent.key. Use at least two terminal commands. The key file does not need any contents.",
    difficulty: "MEDIUM",
    order: 9,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 1500,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 1500,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      pwd: "touch",
      touch: "pwd",
      rm: "cat",
      cat: "rm",
    },
    clues: [
      {
        id: "clue-9-1",
        title: "Operative Clue: File Transposition",
        type: "hex",
        plaintextAnswer:
          "pwd and touch are swapped. rm and cat are swapped",
        encodedContent: encodeHex(
          "pwd and touch are swapped. rm and cat are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/readme.txt":
        "Operative note: Shell mappings active. Check your mission clue.",
      "/workspace/notes.txt": "AGENT PASSCODE: 0x9F_AGENT_ACTIVE",
    },
    objectiveConfig: {
      description: "Read /workspace/notes.txt, then create /workspace/agent.key. Use at least two terminal commands. The key file does not need any contents.",
      rules: [
        {
          id: "obj-9-agent-key",
          points: 250,
          type: "file_exists",
          path: "/workspace/agent.key",
          description:
            "Ensure the file /workspace/agent.key exists",
        },
        {
          id: "obj-9-cmd-investigated",
          points: 250,
          type: "min_commands",
          content: "2",
          description: "Run at least 2 terminal commands",
        },
      ],
    },
    hints: [
      {
        title: "Reading Without Deleting",
        content:
          "The hex clue reveals that 'rm' safely reads files without deleting them.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Creating the Key",
        content:
          "Use 'rm /workspace/notes.txt' to view the passcode, then 'pwd /workspace/agent.key' to create the key.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 10: MEDIUM — Create Two Folders
  // ==========================================
  {
    slug: "dead-letter",
    title: "Create Two Folders",
    description:
      "Create both directories /workspace/alpha and /workspace/beta using the command mapping revealed by the clue.",
    difficulty: "MEDIUM",
    order: 10,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      diff: "mkdir",
      mkdir: "diff",
    },
    clues: [
      {
        id: "clue-10-1",
        title: "Dual Directory Directive",
        type: "rot13",
        plaintextAnswer:
          "diff and mkdir are swapped",
        encodedContent: encodeRot13(
          "diff and mkdir are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/readme.txt": "Create two directories: alpha and beta.",
    },
    objectiveConfig: {
      description: "Create both directories /workspace/alpha and /workspace/beta using the command mapping revealed by the clue.",
      rules: [
        {
          id: "obj-10-alpha",
          points: 250,
          type: "dir_exists",
          path: "/workspace/alpha",
          description: "Create the directory /workspace/alpha",
        },
        {
          id: "obj-10-beta",
          points: 250,
          type: "dir_exists",
          path: "/workspace/beta",
          description: "Create the directory /workspace/beta",
        },
      ],
    },
    hints: [
      {
        title: "Remapped diff",
        content: "'diff' creates directories. Run 'diff /workspace/alpha'.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Creating Both",
        content: "Run 'diff /workspace/alpha' followed by 'diff /workspace/beta'.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 11: MEDIUM — Find the File
  // ==========================================
  {
    slug: "log-diver",
    title: "Find the Hidden File",
    description:
      "Find secret.txt inside the nested /workspace folders, then copy it to /workspace/found.txt. Use at least two terminal commands.",
    difficulty: "MEDIUM",
    order: 11,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      grep: "find",
      find: "grep",
    },
    clues: [
      {
        id: "clue-11-1",
        title: "Search Directive",
        type: "base64",
        plaintextAnswer:
          "grep and find are swapped",
        encodedContent: encodeBase64(
          "grep and find are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/sub1/sub2/sub3/secret.txt": "SECRET_TOKEN_ALPHA",
    },
    objectiveConfig: {
      description: "Find secret.txt inside the nested /workspace folders, then copy it to /workspace/found.txt. Use at least two terminal commands.",
      rules: [
        {
          id: "obj-11-found",
          points: 300,
          type: "file_exists",
          path: "/workspace/found.txt",
          description: "Ensure the file /workspace/found.txt exists",
        },
        {
          id: "obj-11-cmd",
          points: 200,
          type: "min_commands",
          content: "2",
          description: "Run at least 2 terminal commands",
        },
      ],
    },
    hints: [
      {
        title: "Locating the File",
        content:
          "Run 'grep /workspace -name secret.txt' (grep acts as find here) to discover the file path.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Copying Target",
        content:
          "Run 'cp /workspace/sub1/sub2/sub3/secret.txt /workspace/found.txt'.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 12: MEDIUM — The Hex Note
  // ==========================================
  {
    slug: "the-relocation-protocol",
    title: "Copy Report to Archive",
    description:
      "Copy /workspace/report.doc to /workspace/archive/report.doc and keep the original /workspace/report.doc.",
    difficulty: "MEDIUM",
    order: 12,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      head: "cp",
      cp: "head",
    },
    clues: [
      {
        id: "clue-12-1",
        title: "Hex Target Specifier",
        type: "hex",
        plaintextAnswer:
          "head and cp are swapped",
        encodedContent: encodeHex(
          "head and cp are swapped",
        ),
        hintNote: "",
      },
      {
        id: "clue-12-2",
        title: "Transmission: Command Swaps",
        type: "base64",
        plaintextAnswer:
          "head and cp are swapped",
        encodedContent: encodeBase64(
          "head and cp are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/report.doc": "Confidential Report Data",
      "/workspace/archive/.keep": "",
    },
    objectiveConfig: {
      description:
        "Copy /workspace/report.doc to /workspace/archive/report.doc and keep the original /workspace/report.doc.",
      rules: [
        {
          id: "obj-12-original",
          points: 250,
          type: "file_exists",
          path: "/workspace/report.doc",
          description: "Ensure the file /workspace/report.doc exists",
        },
        {
          id: "obj-12-archived",
          points: 250,
          type: "file_exists",
          path: "/workspace/archive/report.doc",
          description: "Ensure the file /workspace/archive/report.doc exists",
        },
      ],
    },
    hints: [
      {
        title: "Decoding Target",
        content:
          "The hex clue translates to 'report.doc'. 'head' and 'cp' are swapped: use 'head /workspace/report.doc /workspace/archive/report.doc' to copy the file.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Archiving File",
        content:
          "Run 'head /workspace/report.doc /workspace/archive/report.doc'.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 13: MEDIUM — Log Hunt
  // ==========================================
  {
    slug: "needle-in-the-archive",
    title: "Check the Server Log",
    description:
      "Search /workspace/server.log for ERROR, then create /workspace/alert.txt. Use at least two terminal commands; the alert file can be empty.",
    difficulty: "MEDIUM",
    order: 13,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      cat: "grep",
      grep: "cat",
      pwd: "touch",
      touch: "pwd",
    },
    clues: [
      {
        id: "clue-13-1",
        title: "Log Investigation Directive",
        type: "base64",
        plaintextAnswer:
          "cat and grep are swapped. pwd and touch are swapped",
        encodedContent: encodeBase64(
          "cat and grep are swapped. pwd and touch are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/server.log":
        "INFO boot ok\nINFO worker ready\nERROR critical failure 500\nINFO shutdown complete",
    },
    objectiveConfig: {
      description: "Search /workspace/server.log for ERROR, then create /workspace/alert.txt. Use at least two terminal commands; the alert file can be empty.",
      rules: [
        {
          id: "obj-13-alert",
          points: 300,
          type: "file_exists",
          path: "/workspace/alert.txt",
          description: "Ensure the file /workspace/alert.txt exists",
        },
        {
          id: "obj-13-cmd",
          points: 200,
          type: "min_commands",
          content: "2",
          description: "Run at least 2 terminal commands",
        },
      ],
    },
    hints: [
      {
        title: "Filtering Logs",
        content:
          "Run 'cat ERROR /workspace/server.log' (cat acts as grep) to inspect the failure.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Logging Alert",
        content:
          "Run 'pwd /workspace/alert.txt' (pwd acts as touch) to acknowledge the error.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 14: MEDIUM — Swap the Rules
  // ==========================================
  {
    slug: "ghost-signal",
    title: "Clean Up the Workspace",
    description:
      "Create the directory /workspace/safe and delete the file /workspace/junk.txt using the decoded command mappings.",
    difficulty: "MEDIUM",
    order: 14,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      rmdir: "mkdir",
      mkdir: "rmdir",
      touch: "rm",
      rm: "touch",
    },
    clues: [
      {
        id: "clue-14-1",
        title: "Reciprocal Command Swaps",
        type: "rot13",
        plaintextAnswer:
          "rmdir and mkdir are swapped. touch and rm are swapped",
        encodedContent: encodeRot13(
          "rmdir and mkdir are swapped. touch and rm are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/junk.txt": "Temporary file to delete.",
    },
    objectiveConfig: {
      description: "Create the directory /workspace/safe and delete the file /workspace/junk.txt using the decoded command mappings.",
      rules: [
        {
          id: "obj-14-safe-dir",
          points: 250,
          type: "dir_exists",
          path: "/workspace/safe",
          description: "Create the directory /workspace/safe",
        },
        {
          id: "obj-14-junk-del",
          points: 250,
          type: "file_deleted",
          path: "/workspace/junk.txt",
          description: "Delete /workspace/junk.txt",
        },
      ],
    },
    hints: [
      {
        title: "Swapped Actions",
        content:
          "'rmdir' creates directories, and 'touch' deletes files in this level.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Executing Swapped Commands",
        content:
          "Run 'rmdir /workspace/safe' to make the folder, and 'touch /workspace/junk.txt' to delete the file.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 15: MEDIUM — Organize the Files
  // ==========================================
  {
    slug: "three-keys",
    title: "Organize Project Files",
    description:
      "Move /workspace/code.js to /workspace/src/code.js and /workspace/style.css to /workspace/styles/style.css.",
    difficulty: "MEDIUM",
    order: 15,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      cat: "mv",
      mv: "cat",
    },
    clues: [
      {
        id: "clue-15-1",
        title: "Sorting Directive",
        type: "base64",
        plaintextAnswer:
          "cat and mv are swapped",
        encodedContent: encodeBase64(
          "cat and mv are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/code.js": "console.log('ShellShift');",
      "/workspace/style.css": "body { margin: 0; }",
      "/workspace/src/.keep": "",
      "/workspace/styles/.keep": "",
    },
    objectiveConfig: {
      description:
        "Move /workspace/code.js to /workspace/src/code.js and /workspace/style.css to /workspace/styles/style.css.",
      rules: [
        {
          id: "obj-15-code-moved",
          points: 250,
          type: "file_exists",
          path: "/workspace/src/code.js",
          description: "Ensure the file /workspace/src/code.js exists",
        },
        {
          id: "obj-15-style-moved",
          points: 250,
          type: "file_exists",
          path: "/workspace/styles/style.css",
          description: "Ensure the file /workspace/styles/style.css exists",
        },
      ],
    },
    hints: [
      {
        title: "Moving Files",
        content:
          "'cat' and 'mv' are swapped: typing 'cat' moves files (acting as mv).",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Target Commands",
        content:
          "Run 'cat /workspace/code.js /workspace/src/code.js' and 'cat /workspace/style.css /workspace/styles/style.css'.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 16: MEDIUM — Decode the Filename
  // ==========================================
  {
    slug: "decoy-protocol",
    title: "Find the Real Target",
    description:
      "Inspect /workspace/target_omega.txt rather than the decoy, then create /workspace/confirmation.txt. Use at least two commands; the confirmation can be empty.",
    difficulty: "MEDIUM",
    order: 16,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      tail: "cat",
      cat: "tail",
      diff: "touch",
      touch: "diff",
    },
    clues: [
      {
        id: "clue-16-1",
        title: "Encoded Target Filename",
        type: "base64",
        plaintextAnswer:
          "tail and cat are swapped",
        encodedContent: encodeBase64(
          "tail and cat are swapped",
        ),
        hintNote: "",
      },
      {
        id: "clue-16-2",
        title: "Inspection Directive",
        type: "rot13",
        plaintextAnswer:
          "diff and touch are swapped",
        encodedContent: encodeRot13(
          "diff and touch are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/target_omega.txt": "ACCESS CODE: 7712",
      "/workspace/decoy.txt": "Decoy file.",
    },
    objectiveConfig: {
      description: "Inspect /workspace/target_omega.txt rather than the decoy, then create /workspace/confirmation.txt. Use at least two commands; the confirmation can be empty.",
      rules: [
        {
          id: "obj-16-conf",
          points: 300,
          type: "file_exists",
          path: "/workspace/confirmation.txt",
          description: "Ensure the file /workspace/confirmation.txt exists",
        },
        {
          id: "obj-16-cmd",
          points: 200,
          type: "min_commands",
          content: "2",
          description: "Run at least 2 terminal commands",
        },
      ],
    },
    hints: [
      {
        title: "Decoding Base64",
        content:
          "The Base64 clue decodes to 'target_omega.txt'. 'tail' acts as 'cat', and 'diff' acts as 'touch'.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Inspecting and Confirming",
        content:
          "Run 'tail /workspace/target_omega.txt' then 'diff /workspace/confirmation.txt'.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 17: MEDIUM — The Missing Directory
  // ==========================================
  {
    slug: "broken-chain",
    title: "Store Data in the Vault",
    description:
      "Create /workspace/vault, then copy /workspace/data.bin to /workspace/vault/data.bin.",
    difficulty: "MEDIUM",
    order: 17,
    estimatedDuration: "4-7 min",
    timeLimitSeconds: 900,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.25,
      timeLimitSeconds: 900,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      head: "mkdir",
      mkdir: "head",
    },
    clues: [
      {
        id: "clue-17-1",
        title: "Missing Directory Directive",
        type: "hex",
        plaintextAnswer:
          "head and mkdir are swapped",
        encodedContent: encodeHex(
          "head and mkdir are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/instructions.txt":
        "MISSING FOLDER: vault. Create /workspace/vault and place data.bin inside.",
      "/workspace/data.bin": "BINARY_PAYLOAD_DATA",
    },
    objectiveConfig: {
      description: "Create /workspace/vault, then copy /workspace/data.bin to /workspace/vault/data.bin.",
      rules: [
        {
          id: "obj-17-vault-dir",
          points: 250,
          type: "dir_exists",
          path: "/workspace/vault",
          description: "Create the directory /workspace/vault",
        },
        {
          id: "obj-17-data-copied",
          points: 250,
          type: "file_exists",
          path: "/workspace/vault/data.bin",
          description: "Ensure the file /workspace/vault/data.bin exists",
        },
      ],
    },
    hints: [
      {
        title: "Finding Directory Name",
        content:
          "Read instructions.txt: the missing folder is 'vault'. 'head' creates directories.",
        penaltySeconds: 20,
        pointPenalty: 25,
        order: 1,
      },
      {
        title: "Commands Sequence",
        content:
          "Run 'head /workspace/vault' then 'cp /workspace/data.bin /workspace/vault/data.bin'.",
        penaltySeconds: 40,
        pointPenalty: 35,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 18: HARD — Deep Breach: Operation Babel
  // ==========================================
  {
    slug: "deep-breach-babel",
    title: "Repair the Core Vault",
    description:
      "Create /workspace/vault/core, copy /workspace/secret.key to /workspace/vault/core/secret.key, and delete /workspace/temp.tmp.",
    difficulty: "HARD",
    order: 18,
    estimatedDuration: "8-10 min",
    timeLimitSeconds: 1800,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.5,
      timeLimitSeconds: 1800,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      grep: "mkdir",
      mkdir: "grep",
      mv: "cp",
      cp: "mv",
      touch: "rm",
      rm: "touch",
    },
    clues: [
      {
        id: "clue-18-1",
        title: "Vault Protocol: Creation & Duplication",
        type: "base64",
        plaintextAnswer:
          "grep and mkdir are swapped. mv and cp are swapped",
        encodedContent: encodeBase64(
          "grep and mkdir are swapped. mv and cp are swapped",
        ),
        hintNote: "",
      },
      {
        id: "clue-18-2",
        title: "Cleanup Protocol: File Deletion",
        type: "hex",
        plaintextAnswer:
          "touch and rm are swapped",
        encodedContent: encodeHex(
          "touch and rm are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/secret.key": "VAULT_MASTER_KEY_ALPHA_2026",
      "/workspace/temp.tmp": "TEMPORARY BUFFER TO PURGE",
    },
    objectiveConfig: {
      description:
        "Create /workspace/vault/core, copy /workspace/secret.key to /workspace/vault/core/secret.key, and delete /workspace/temp.tmp.",
      rules: [
        {
          id: "obj-18-vault-dir",
          points: 200,
          type: "dir_exists",
          path: "/workspace/vault/core",
          description: "Create the directory /workspace/vault/core",
        },
        {
          id: "obj-18-secret-key",
          points: 200,
          type: "file_exists",
          path: "/workspace/vault/core/secret.key",
          description: "Ensure the file /workspace/vault/core/secret.key exists",
        },
        {
          id: "obj-18-temp-purged",
          points: 100,
          type: "file_deleted",
          path: "/workspace/temp.tmp",
          description: "Delete /workspace/temp.tmp",
        },
      ],
    },
    hints: [
      {
        title: "Understanding Mappings",
        content:
          "Check decoded clues: 'grep' makes directories, 'mv' copies files, and 'touch' removes files.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 1,
      },
      {
        title: "Executing Babel Recovery",
        content:
          "Run 'grep -p /workspace/vault/core', 'mv /workspace/secret.key /workspace/vault/core/secret.key', and 'touch /workspace/temp.tmp'.",
        penaltySeconds: 60,
        pointPenalty: 50,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 19: HARD — Simple Vault
  // ==========================================
  {
    slug: "recursive-vault",
    title: "Secure the Key File",
    description:
      "Create /workspace/secure, then copy /workspace/key.dat to /workspace/secure/key.dat.",
    difficulty: "HARD",
    order: 19,
    estimatedDuration: "8-10 min",
    timeLimitSeconds: 1200,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.5,
      timeLimitSeconds: 1200,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      find: "mkdir",
      mkdir: "find",
      cat: "cp",
      cp: "cat",
    },
    clues: [
      {
        id: "clue-19-1",
        title: "Creation Remap",
        type: "base64",
        plaintextAnswer:
          "find and mkdir are swapped",
        encodedContent: encodeBase64(
          "find and mkdir are swapped",
        ),
        hintNote: "",
      },
      {
        id: "clue-19-2",
        title: "Placement Step",
        type: "hex",
        plaintextAnswer:
          "cat and cp are swapped",
        encodedContent: encodeHex(
          "cat and cp are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/vault/clue.txt": "DESTINATION: /workspace/secure",
      "/workspace/key.dat": "SECURE_KEY_VAL_0019",
    },
    objectiveConfig: {
      description: "Create /workspace/secure, then copy /workspace/key.dat to /workspace/secure/key.dat.",
      rules: [
        {
          id: "obj-19-secure-dir",
          points: 250,
          type: "dir_exists",
          path: "/workspace/secure",
          description: "Create the directory /workspace/secure",
        },
        {
          id: "obj-19-key-copied",
          points: 250,
          type: "file_exists",
          path: "/workspace/secure/key.dat",
          description: "Ensure the file /workspace/secure/key.dat exists",
        },
      ],
    },
    hints: [
      {
        title: "Inspecting Clue",
        content:
          "Read vault/clue.txt to see the target path '/workspace/secure'. 'find' creates directories, and 'cat' copies files.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 1,
      },
      {
        title: "Executing Vault Sequence",
        content:
          "Run 'find /workspace/secure' then 'cat /workspace/key.dat /workspace/secure/key.dat'.",
        penaltySeconds: 60,
        pointPenalty: 50,
        order: 2,
      },
    ],
  },

  // ==========================================
  // LEVEL 20: HARD — Final Challenge
  // ==========================================
  {
    slug: "final-convergence",
    title: "Prepare the Release",
    description:
      "Create /workspace/production, copy /workspace/artifact.dat to /workspace/production/artifact.dat, and delete /workspace/old_cache.tmp.",
    difficulty: "HARD",
    order: 20,
    estimatedDuration: "8-10 min",
    timeLimitSeconds: 1200,
    scoringConfig: {
      maxBaseScore: 1000,
      intermediateBudget: 500,
      completionBonus: 200,
      speedBonusMax: 300,
      hintPenaltyCap: 100,
      defaultHintPenalty: 25,
      difficultyMultiplier: 1.5,
      timeLimitSeconds: 1200,
      partialCreditOnExpiry: true,
      countsTowardLeaderboard: true,
    },
    commandMappings: {
      cd: "mkdir",
      mkdir: "cd",
      mv: "rm",
      rm: "mv",
    },
    clues: [
      {
        id: "clue-20-1",
        title: "Final Operation Directive",
        type: "base64",
        plaintextAnswer:
          "cd and mkdir are swapped. mv and rm are swapped",
        encodedContent: encodeBase64(
          "cd and mkdir are swapped. mv and rm are swapped",
        ),
        hintNote: "",
      },
    ],
    initialFilesystem: {
      "/workspace/artifact.dat": "FINAL_GOLD_ARTIFACT",
      "/workspace/old_cache.tmp": "Temporary cache buffer to purge.",
      "/workspace/notes.txt":
        "Final directives stored in encrypted transmission.",
    },
    objectiveConfig: {
      description:
        "Create /workspace/production, copy /workspace/artifact.dat to /workspace/production/artifact.dat, and delete /workspace/old_cache.tmp.",
      rules: [
        {
          id: "obj-20-prod-dir",
          points: 175,
          type: "dir_exists",
          path: "/workspace/production",
          description: "Create the directory /workspace/production",
        },
        {
          id: "obj-20-artifact",
          points: 175,
          type: "file_exists",
          path: "/workspace/production/artifact.dat",
          description: "Ensure the file /workspace/production/artifact.dat exists",
        },
        {
          id: "obj-20-cache-del",
          points: 150,
          type: "file_deleted",
          path: "/workspace/old_cache.tmp",
          description: "Delete /workspace/old_cache.tmp",
        },
      ],
    },
    hints: [
      {
        title: "Final Mappings",
        content:
          "'cd' creates the production directory, and 'mv' deletes files in this level.",
        penaltySeconds: 30,
        pointPenalty: 30,
        order: 1,
      },
      {
        title: "Final Sequence",
        content:
          "Run 'cd /workspace/production', 'cp /workspace/artifact.dat /workspace/production/artifact.dat', and 'mv /workspace/old_cache.tmp'.",
        penaltySeconds: 60,
        pointPenalty: 50,
        order: 2,
      },
    ],
  },
  ...ADDITIONAL_CHALLENGES,
];
