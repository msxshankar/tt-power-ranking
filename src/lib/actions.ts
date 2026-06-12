'use server';

import { revalidatePath } from 'next/cache';
import { db } from './db';
import { validateMatchScores } from './elo';

// 1. Add a new player
export async function addPlayerAction(name: string) {
  try {
    const cleanName = name.trim();
    if (!cleanName) {
      return { success: false, error: 'Player name cannot be empty.' };
    }
    const player = await db.addPlayer(cleanName);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, player };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to add player.' };
  }
}

// 2. Delete a player (Admin)
export async function deletePlayerAction(id: string) {
  try {
    if (!id) {
      return { success: false, error: 'Player ID is required.' };
    }
    await db.deletePlayer(id);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to delete player.' };
  }
}

// 3. Rename a player (Admin)
export async function renamePlayerAction(id: string, name: string) {
  try {
    const cleanName = name.trim();
    if (!id || !cleanName) {
      return { success: false, error: 'Player ID and name are required.' };
    }
    await db.renamePlayer(id, cleanName);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to rename player.' };
  }
}

// 4. Add a new match
export async function addMatchAction(
  player1Id: string,
  player2Id: string,
  matchType: '11' | '21',
  gameScores: [number, number][]
) {
  try {
    if (!player1Id || !player2Id) {
      return { success: false, error: 'Both players must be selected.' };
    }
    if (player1Id === player2Id) {
      return { success: false, error: 'A player cannot play against themselves.' };
    }

    // Verify players exist
    const players = await db.getPlayers();
    const p1 = players.find(p => p.id === player1Id);
    const p2 = players.find(p => p.id === player2Id);
    if (!p1 || !p2) {
      return { success: false, error: 'One or both of the selected players do not exist.' };
    }

    // Validate scores
    const validation = validateMatchScores(gameScores, matchType);
    if (!validation.isValid) {
      return { success: false, error: validation.error || 'Invalid scores entered.' };
    }

    // Determine winner
    const winnerId = validation.winnerIndex === 0 ? player1Id : player2Id;

    const match = await db.addMatch({
      player1_id: player1Id,
      player2_id: player2Id,
      match_type: matchType,
      game_scores: gameScores,
      winner_id: winnerId,
    });

    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true, match };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to add match.' };
  }
}

// 5. Delete a match (Admin)
export async function deleteMatchAction(id: number) {
  try {
    if (!id) {
      return { success: false, error: 'Match ID is required.' };
    }
    await db.deleteMatch(id);
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to delete match.' };
  }
}

// 6. Update a match score (Admin)
export async function updateMatchScoreAction(id: number, gameScores: [number, number][]) {
  try {
    if (!id) {
      return { success: false, error: 'Match ID is required.' };
    }

    // Fetch matches to find the match metadata
    const matches = await db.getMatches();
    const match = matches.find(m => m.id === id);
    if (!match) {
      return { success: false, error: 'Match not found.' };
    }

    // Validate new scores
    const validation = validateMatchScores(gameScores, match.match_type);
    if (!validation.isValid) {
      return { success: false, error: validation.error || 'Invalid scores entered.' };
    }

    // Determine new winner
    const winnerId = validation.winnerIndex === 0 ? match.player1_id : match.player2_id;

    await db.updateMatchScore(id, gameScores, winnerId);
    
    revalidatePath('/');
    revalidatePath('/admin');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update match score.' };
  }
}
