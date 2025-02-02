import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

export const useDatabase = () => {
  const [users, setUsers] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const db = useSQLiteContext();

  useEffect(() => {
    db.withTransactionAsync(async () => {
      await fetchAllUsers();
      await fetchAllRecordings();
    });
  }, [db]);
  async function checkDatabase() {
    const result = await db.getAllAsync("SELECT * FROM recordings;");
    console.log("Database Records:", result);
  }

  useEffect(() => {
    checkDatabase();
  }, []);
  async function fetchAllUsers() {
    const result = await db.getAllAsync("SELECT * FROM users;");
    setUsers(result);
    return result;
  }

  async function insertUser(id, name) {
    db.withTransactionAsync(async () => {
      await db.runAsync("INSERT INTO users (id, name) VALUES (?, ?);", [
        id,
        name,
      ]);
      await fetchAllUsers();
    });
  }

  async function deleteUser(id) {
    db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM users WHERE id = ?;", [id]);
      await fetchAllUsers();
      await fetchAllRecordings();
    });
  }

  async function fetchRecordings(userId) {
    const result = await db.getAllAsync(
      "SELECT * FROM recordings WHERE userId = ?;",
      [userId]
    );
    return result;
  }

  async function fetchAllRecordings() {
    const result = await db.getAllAsync(
      "SELECT * FROM recordings ORDER BY userId"
    );
    setRecordings(result);
    return result;
  }

  async function insertRecording(userId, recording) {
    db.withTransactionAsync(async () => {
      await db.runAsync(
        "INSERT INTO recordings (userId, filename, fileUri) VALUES (?, ?, ?);",
        userId,
        recording.filename,
        recording.fileUri
      );
      await fetchAllRecordings();
    });
  }

  async function deleteRecording(id) {
    db.withTransactionAsync(async () => {
      await db.runAsync("DELETE FROM recordings WHERE id = ?;", [id]);
      await fetchAllRecordings();
    });
  }

  return {
    fetchUsers: fetchAllUsers,
    insertUser,
    deleteUser,
    fetchRecordings,
    fetchAllRecordings,
    insertRecording,
    deleteRecording,
  };
};

export const loadDatabase = async () => {
  const dbName = "mySQLiteDB.db";
  const dbAsset = require("../mySQLiteDB.db");
  const dbUri = Asset.fromModule(dbAsset).uri;
  const dbFilePath = `${FileSystem.documentDirectory}SQLite/${dbName}`;

  const fileInfo = await FileSystem.getInfoAsync(dbFilePath);
  if (!fileInfo.exists) {
    await FileSystem.makeDirectoryAsync(
      `${FileSystem.documentDirectory}SQLite`,
      { intermediates: true }
    );
    await FileSystem.downloadAsync(dbUri, dbFilePath);
  }
  console.log("Database loaded");
};
