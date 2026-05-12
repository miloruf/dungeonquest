import React, { createContext, useContext, useState } from 'react';
import { GameState, Item, Message } from '../types';

const DEFAULT_ROOM = {
  roomCode: '',
  players: [],
  status: 'waiting' as const,
  currentTurn: '',
  difficulty: 'medium' as const,
};

const DEFAULT_STATE: GameState = {
  room: DEFAULT_ROOM,
  storyHistory: [],
  currentScene: 'start',
  currentSituation: null,
  lastEvent: null,
  diceResult: null,
};

interface GameContextValue {
  gameState: GameState;
  localPlayerId: string | null;
  addItem: (playerId: string, item: Item) => void;
  removeItem: (playerId: string, itemId: string) => void;
  updatePlayerHP: (playerId: string, hp: number) => void;
  setDiceResult: (result: number) => void;
  addStoryMessage: (message: Message) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  setLocalPlayerId: (id: string) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);

  function addItem(playerId: string, item: Item) {
    setGameState(prev => ({
      ...prev,
      room: {
        ...prev.room,
        players: prev.room.players.map(p =>
          p.id === playerId ? { ...p, inventory: [...p.inventory, item] } : p
        ),
      },
    }));
  }

  function removeItem(playerId: string, itemId: string) {
    setGameState(prev => ({
      ...prev,
      room: {
        ...prev.room,
        players: prev.room.players.map(p =>
          p.id === playerId ? { ...p, inventory: p.inventory.filter(i => i.id !== itemId) } : p
        ),
      },
    }));
  }

  function updatePlayerHP(playerId: string, hp: number) {
    setGameState(prev => ({
      ...prev,
      room: {
        ...prev.room,
        players: prev.room.players.map(p =>
          p.id === playerId ? { ...p, hp: Math.max(0, Math.min(hp, p.maxHp)) } : p
        ),
      },
    }));
  }

  function setDiceResult(result: number) {
    setGameState(prev => ({ ...prev, diceResult: result }));
  }

  function addStoryMessage(message: Message) {
    setGameState(prev => ({
      ...prev,
      storyHistory: [...prev.storyHistory, message],
    }));
  }

  return (
    <GameContext.Provider value={{
      gameState, localPlayerId,
      addItem, removeItem, updatePlayerHP, setDiceResult, addStoryMessage,
      setGameState, setLocalPlayerId,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider');
  return context;
}
