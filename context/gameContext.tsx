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
  lastEvent: null,
  diceResult: null,
};

interface GameContextValue {
  gameState: GameState;
  addItem: (playerId: string, item: Item) => void;
  updatePlayerHP: (playerId: string, hp: number) => void;
  setDiceResult: (result: number) => void;
  addStoryMessage: (message: Message) => void;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(DEFAULT_STATE);

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
    <GameContext.Provider value={{ gameState, addItem, updatePlayerHP, setDiceResult, addStoryMessage, setGameState }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
