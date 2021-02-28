import { FileResult } from "common/replayBrowser";
import { app } from "electron";
import path from "path";
import * as sqlite3 from "sqlite3";

const db = new sqlite3.Database(path.join(app.getPath("userData"), "statsdb.sqlite"), (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log("Connected to the replay database.");
  db.run(`
  CREATE TABLE IF NOT EXISTS replays (
       fullPath      TEXT PRIMARY KEY,
       name          TEXT,
       folder        TEXT,
       startTime     TEXT,
       lastFrame     INTEGER,
       playerCount   INTEGER,
       player1       INTEGER,
       player2       INTEGER,
       player3       INTEGER,
       player4       INTEGER,
       settings      JSON,
       metadata      JSON,
       stats         JSON)
  `);

  db.run("CREATE INDEX IF NOT EXISTS folder_idx  ON replays(folder)");
  db.run("CREATE INDEX IF NOT EXISTS player1_idx ON replays(player1)");
  db.run("CREATE INDEX IF NOT EXISTS player2_idx ON replays(player2)");
  db.run("CREATE INDEX IF NOT EXISTS player3_idx ON replays(player3)");
  db.run("CREATE INDEX IF NOT EXISTS player4_idx ON replays(player4)");
});

const parseRow = (row: any) => {
  return {
    name: row.name,
    fullPath: row.fullPath,
    settings: JSON.parse(row.settings),
    startTime: row.startTime,
    lastFrame: row.lastFrame,
    metadata: JSON.parse(row.metadata),
    stats: JSON.parse(row.stats || null),
    playerCount: row.playerCount,
    player1: row.player1,
    player2: row.player2,
    player3: row.player3,
    player4: row.player4,
    folder: row.folder,
  } as FileResult;
};

export const getFolderFiles = (folder: string) => {
  return new Promise<string[]>((resolve, reject) =>
    db.all(
      `
    SELECT fullPath
    FROM replays 
    WHERE folder = ?
    ORDER by startTime DESC`,
      [folder],
      (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(files ? files.map((f) => f.fullPath) : []);
        }
      },
    ),
  );
};

export const getFolderReplays = (folder: string) => {
  return new Promise<FileResult[]>((resolve, reject) =>
    db.all(
      `
    SELECT fullPath, name, folder, startTime, lastFrame, 
    playerCount, player1, player2, player3, player4, 
    settings, metadata 
    FROM replays 
    WHERE folder = ?
    ORDER by startTime DESC`,
      [folder],
      (err, docs) => {
        if (err) {
          reject(err);
        } else {
          const files = docs.map(parseRow);
          resolve(docs ? files : []);
        }
      },
    ),
  );
};

export const getFullReplay = (file: string) => {
  return new Promise((resolve, reject) =>
    db.all("SELECT * from replays WHERE fullPath = ?", [file], (err, docs) => {
      if (err) {
        reject(err);
      } else {
        const files = docs.map(parseRow);
        resolve(docs ? files[0] : []);
      }
    }),
  );
};

export const getPlayerReplays = (player: string) => {
  return new Promise<FileResult[]>((resolve, reject) =>
    db.all("SELECT * from replays WHERE (?) IN (player1, player2, player3, player4)", [player], (err, docs) => {
      if (err) {
        reject(err);
      } else {
        const files = docs.map(parseRow);
        resolve(docs ? files : []);
      }
    }),
  );
};

export const saveReplays = async (replays: FileResult[]) => {
  const batchSize = 100;
  const batches = Math.floor(replays.length / batchSize);
  for (let i = 0; i <= batches; i++) {
    const start = i * batchSize;
    const end = Math.min(i * batchSize + batchSize, replays.length);
    const slice = replays.slice(start, end);
    await saveReplayBatch(slice);
  }
};

const saveReplayBatch = async (replays: FileResult[]) => {
  return new Promise((resolve, reject) => {
    const placeholders = replays.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
    db.run(
      `
       INSERT INTO replays(
       fullPath, name, folder, startTime, lastFrame, 
       playerCount, player1, player2, player3, player4, 
       settings, metadata, stats)
       VALUES ` + placeholders,
      replays.flatMap((replay: FileResult) => [
        replay.fullPath,
        replay.name,
        replay.folder,
        replay.startTime,
        replay.lastFrame,
        replay.playerCount,
        replay.player1,
        replay.player2,
        replay.player3,
        replay.player4,
        JSON.stringify(replay.settings),
        JSON.stringify(replay.metadata),
        JSON.stringify(replay.stats),
      ]),
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(null);
        }
      },
    );
  });
};

export const deleteReplays = (files: string[]) => {
  const qfmt = files.map(() => "?").join(",");
  return new Promise((resolve, reject) =>
    db.run(`DELETE FROM replays WHERE fullPath IN (${qfmt})`, files, (err) => (err ? reject(err) : resolve(null))),
  );
};

export const pruneFolders = (existingFolders: string[]) => {
  const qfmt = existingFolders.map(() => "?").join(", ");
  return new Promise((resolve, reject) =>
    db.run(`DELETE FROM replays WHERE folder NOT IN (${qfmt})`, existingFolders, (err) =>
      err ? reject(err) : resolve(null),
    ),
  );
};
