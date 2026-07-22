import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import { Player, Match } from './types';

// Database Interface
export interface Database {
  getPlayers(): Promise<Player[]>;
  getMatches(): Promise<Match[]>;
  addPlayer(name: string): Promise<Player>;
  deletePlayer(id: string): Promise<void>;
  renamePlayer(id: string, name: string): Promise<void>;
  addMatch(match: Omit<Match, 'id' | 'created_at'> & { created_at?: string }): Promise<Match>;
  deleteMatch(id: number): Promise<void>;
  updateMatchScore(id: number, gameScores: [number, number][], winnerId: string, createdAt?: string): Promise<void>;
}

// JSON file implementation for local development
class JsonDatabase implements Database {
  private filePath = path.join(process.cwd(), 'db.json');

  private readData(): { players: Player[]; matches: Match[]; nextMatchId: number } {
    if (!fs.existsSync(this.filePath)) {
      const initial = { players: [], matches: [], nextMatchId: 1 };
      fs.writeFileSync(this.filePath, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error('Failed to read JSON DB', e);
      return { players: [], matches: [], nextMatchId: 1 };
    }
  }

  private writeData(data: { players: Player[]; matches: Match[]; nextMatchId: number }) {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  async getPlayers(): Promise<Player[]> {
    return this.readData().players;
  }

  async getMatches(): Promise<Match[]> {
    return this.readData().matches;
  }

  async addPlayer(name: string): Promise<Player> {
    const data = this.readData();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Name cannot be empty');
    if (data.players.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error(`Player "${cleanName}" already exists`);
    }
    const newPlayer: Player = {
      id: Math.random().toString(36).substring(2, 9),
      name: cleanName,
      created_at: new Date().toISOString(),
    };
    data.players.push(newPlayer);
    this.writeData(data);
    return newPlayer;
  }

  async deletePlayer(id: string): Promise<void> {
    const data = this.readData();
    data.players = data.players.filter(p => p.id !== id);
    // Also remove their matches to prevent broken references
    data.matches = data.matches.filter(m => m.player1_id !== id && m.player2_id !== id);
    this.writeData(data);
  }

  async renamePlayer(id: string, name: string): Promise<void> {
    const data = this.readData();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Name cannot be empty');
    const existing = data.players.find(p => p.name.toLowerCase() === cleanName.toLowerCase() && p.id !== id);
    if (existing) throw new Error(`Player "${cleanName}" already exists`);
    const player = data.players.find(p => p.id === id);
    if (!player) throw new Error('Player not found');
    player.name = cleanName;
    this.writeData(data);
  }

  async addMatch(match: Omit<Match, 'id' | 'created_at'> & { created_at?: string }): Promise<Match> {
    const data = this.readData();
    const newMatch: Match = {
      ...match,
      id: data.nextMatchId++,
      created_at: match.created_at ? new Date(match.created_at).toISOString() : new Date().toISOString(),
    };
    data.matches.push(newMatch);
    this.writeData(data);
    return newMatch;
  }

  async deleteMatch(id: number): Promise<void> {
    const data = this.readData();
    data.matches = data.matches.filter(m => m.id !== id);
    this.writeData(data);
  }

  async updateMatchScore(id: number, gameScores: [number, number][], winnerId: string, createdAt?: string): Promise<void> {
    const data = this.readData();
    const match = data.matches.find(m => m.id === id);
    if (!match) throw new Error('Match not found');
    match.game_scores = gameScores;
    match.winner_id = winnerId;
    if (createdAt) {
      match.created_at = new Date(createdAt).toISOString();
    }
    this.writeData(data);
  }
}

// Postgres/Neon implementation for production
class NeonDatabase implements Database {
  private sql;
  private initialized = false;

  constructor() {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL is not set for NeonDatabase');
    }
    this.sql = neon(dbUrl);
  }

  private async ensureTables() {
    if (this.initialized) return;
    await this.sql`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        player1_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        player2_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        match_type TEXT NOT NULL,
        game_scores TEXT NOT NULL, -- JSON string
        winner_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    this.initialized = true;
  }

  async getPlayers(): Promise<Player[]> {
    await this.ensureTables();
    const rows = await this.sql`SELECT * FROM players ORDER BY name ASC`;
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      created_at: String(r.created_at),
    }));
  }

  async getMatches(): Promise<Match[]> {
    await this.ensureTables();
    const rows = await this.sql`SELECT * FROM matches ORDER BY id ASC`;
    return rows.map(r => ({
      id: Number(r.id),
      player1_id: r.player1_id,
      player2_id: r.player2_id,
      match_type: r.match_type as '11' | '21',
      game_scores: JSON.parse(r.game_scores),
      winner_id: r.winner_id,
      created_at: String(r.created_at),
    }));
  }

  async addPlayer(name: string): Promise<Player> {
    await this.ensureTables();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Name cannot be empty');
    const id = Math.random().toString(36).substring(2, 9);
    const rows = await this.sql`
      INSERT INTO players (id, name)
      VALUES (${id}, ${cleanName})
      RETURNING *
    `;
    const r = rows[0];
    return {
      id: r.id,
      name: r.name,
      created_at: String(r.created_at),
    };
  }

  async deletePlayer(id: string): Promise<void> {
    await this.ensureTables();
    // Explicitly delete associated matches first, in case ON DELETE CASCADE
    // isn't active (e.g. table was created before the constraint was added)
    await this.sql`DELETE FROM matches WHERE player1_id = ${id} OR player2_id = ${id}`;
    await this.sql`DELETE FROM players WHERE id = ${id}`;
  }

  async renamePlayer(id: string, name: string): Promise<void> {
    await this.ensureTables();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Name cannot be empty');
    const existing = await this.sql`SELECT id FROM players WHERE LOWER(name) = LOWER(${cleanName}) AND id != ${id}`;
    if (existing.length > 0) throw new Error(`Player "${cleanName}" already exists`);
    await this.sql`UPDATE players SET name = ${cleanName} WHERE id = ${id}`;
  }

  async addMatch(match: Omit<Match, 'id' | 'created_at'> & { created_at?: string }): Promise<Match> {
    await this.ensureTables();
    const gameScoresJson = JSON.stringify(match.game_scores);
    const rows = match.created_at
      ? await this.sql`
          INSERT INTO matches (player1_id, player2_id, match_type, game_scores, winner_id, created_at)
          VALUES (${match.player1_id}, ${match.player2_id}, ${match.match_type}, ${gameScoresJson}, ${match.winner_id}, ${new Date(match.created_at).toISOString()})
          RETURNING *
        `
      : await this.sql`
          INSERT INTO matches (player1_id, player2_id, match_type, game_scores, winner_id)
          VALUES (${match.player1_id}, ${match.player2_id}, ${match.match_type}, ${gameScoresJson}, ${match.winner_id})
          RETURNING *
        `;
    const r = rows[0];
    return {
      id: Number(r.id),
      player1_id: r.player1_id,
      player2_id: r.player2_id,
      match_type: r.match_type as '11' | '21',
      game_scores: JSON.parse(r.game_scores),
      winner_id: r.winner_id,
      created_at: String(r.created_at),
    };
  }

  async deleteMatch(id: number): Promise<void> {
    await this.ensureTables();
    await this.sql`DELETE FROM matches WHERE id = ${id}`;
  }

  async updateMatchScore(id: number, gameScores: [number, number][], winnerId: string, createdAt?: string): Promise<void> {
    await this.ensureTables();
    const gameScoresJson = JSON.stringify(gameScores);
    if (createdAt) {
      const isoDate = new Date(createdAt).toISOString();
      await this.sql`
        UPDATE matches
        SET game_scores = ${gameScoresJson}, winner_id = ${winnerId}, created_at = ${isoDate}
        WHERE id = ${id}
      `;
    } else {
      await this.sql`
        UPDATE matches
        SET game_scores = ${gameScoresJson}, winner_id = ${winnerId}
        WHERE id = ${id}
      `;
    }
  }
}

// Export a singleton instance based on availability of env variables
const hasDbUrl = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
export const db: Database = hasDbUrl ? new NeonDatabase() : new JsonDatabase();
