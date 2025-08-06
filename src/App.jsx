import React, { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "flashcard_game_data_v4";

// --- Card Component ---
// Updated to make interactive styles dependent on the onClick prop.
function Card({ card, isSelected, isMatched, status, onClick, size = 'normal' }) {
  const sizeClasses = size === 'large' ? 'h-40 sm:h-48 text-2xl' : 'h-28 sm:h-32';
  const statusClasses = {
    correct: 'ring-4 ring-green-500 bg-green-600',
    incorrect: 'ring-4 ring-red-500 bg-red-600',
  };
  return (
    <div
      onClick={onClick}
      className={`
                p-3 flex items-center justify-center text-center rounded-lg shadow-lg text-white font-medium
                select-none transition-all duration-200
                ${sizeClasses}
                ${status ? statusClasses[status] : 'bg-gray-700'}
                ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''}
                ${isMatched
          ? 'opacity-0 scale-90 pointer-events-none'
          // FIX 2: Only add interactive classes if an onClick prop is provided
          : onClick ? 'cursor-pointer hover:scale-105 hover:shadow-xl' : ''
        }
            `}
    >
      {card.content}
    </div>
  );
}

// --- Modal Component (Unchanged) ---
function Modal({ isOpen, onClose, onSubmit, children, submitText }) {
  if (!isOpen) return null;
  return (
    <div onClick={onClose} className="fixed inset-0 bg-opacity-30 backdrop-blur-xs z-50 flex justify-center items-center p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg relative text-gray-800">
        <button onClick={onClose} className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-3xl font-bold">&times;</button>
        {children}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition font-semibold mr-2">Cancel</button>
          <button onClick={onSubmit} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition font-semibold">{submitText || "Save"}</button>
        </div>
      </div>
    </div>
  );
}


export default function FlashcardMatchGame() {
  // Game state
  const [allPairs, setAllPairs] = useState([]);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [pairsInPlay, setPairsInPlay] = useState(0);

  // Card arrays for different modes
  const [mixedCards, setMixedCards] = useState([]);
  const [wordCards, setWordCards] = useState([]);
  const [definitionCards, setDefinitionCards] = useState([]);

  // State for Multiple Choice mode
  const [quizDeck, setQuizDeck] = useState([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentQuizWord, setCurrentQuizWord] = useState(null);
  const [quizChoices, setQuizChoices] = useState([]);
  const [isChoiceMade, setIsChoiceMade] = useState(false);

  // Settings state
  const [gameMode, setGameMode] = useState('grid');
  const [gridCols, setGridCols] = useState(4);
  const [gridRows, setGridRows] = useState(4);

  // Modal state
  const [csvData, setCsvData] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- UTILITY & SETUP ---

  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.pairs && parsed.pairs.length > 0) {
        setAllPairs(parsed.pairs);
        const settings = {
          gameMode: parsed.gameMode || 'grid',
          gridCols: parsed.gridCols || 4,
          gridRows: parsed.gridRows || 4,
        };
        setGameMode(settings.gameMode);
        setGridCols(settings.gridCols);
        setGridRows(settings.gridRows);
        initializeGame(parsed.pairs, settings);
      }
    }
  }, []);

  function shuffleArray(array) {
    return [...array].sort(() => Math.random() - 0.5);
  }

  function setupNextQuizRound(deck, index) {
    if (index >= deck.length) {
      setEndTime(Date.now());
      return;
    }

    const correctPair = deck[index];
    setCurrentQuizWord({ ...correctPair, type: 'word' });

    const distractors = allPairs
      .filter(p => p.word !== correctPair.word)
      .slice(0, 3)
      .map(p => ({ ...p, type: 'definition' }));

    const choices = shuffleArray([
      { ...correctPair, type: 'definition' },
      ...distractors
    ]).map((choice, i) => ({
      id: i,
      content: choice.definition,
      isCorrect: choice.word === correctPair.word,
      status: null
    }));

    setQuizChoices(choices);
    setIsChoiceMade(false);
  }

  function initializeGame(pairs, settings) {
    if (!pairs || pairs.length === 0) return;

    const {
      gameMode: mode = gameMode,
      gridCols: cols = gridCols,
      gridRows: rows = gridRows
    } = settings;

    setMatchedPairs([]);
    setSelectedPair([]);
    setStartTime(Date.now());
    setEndTime(null);

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ pairs, gameMode: mode, gridCols: cols, gridRows: rows }));

    switch (mode) {
      case 'multipleChoice':
        const shuffledDeck = shuffleArray(pairs);
        setQuizDeck(shuffledDeck);
        setCurrentQuizIndex(0);
        setPairsInPlay(shuffledDeck.length);
        setupNextQuizRound(shuffledDeck, 0);
        break;
      case 'column':
        const colPairsToUse = Math.min(rows, pairs.length);
        setPairsInPlay(colPairsToUse);
        const colGamePairs = shuffleArray(pairs).slice(0, colPairsToUse);
        setWordCards(colGamePairs.map((p, i) => ({ id: i, type: 'word', content: p.word, uniqueId: `card-${i}-word` })));
        setDefinitionCards(shuffleArray(colGamePairs.map((p, i) => ({ id: i, type: 'definition', content: p.definition, uniqueId: `card-${i}-def` }))));
        break;
      case 'grid':
      default:
        const gridPairsToUse = Math.min(Math.floor((cols * rows) / 2), pairs.length);
        setPairsInPlay(gridPairsToUse);
        const gridGamePairs = shuffleArray(pairs).slice(0, gridPairsToUse);
        setMixedCards(shuffleArray(gridGamePairs.flatMap((p, i) => [{ id: i, type: "word", content: p.word, uniqueId: `card-${i}-word` }, { id: i, type: "definition", content: p.definition, uniqueId: `card-${i}-def` }])));
        break;
    }
  }

  // --- EVENT HANDLERS ---

  function handlePairMatchClick(card) {
    if (selectedPair.length >= 2 || isMatched(card.id)) return;
    if (selectedPair.some(s => s.uniqueId === card.uniqueId)) {
      setSelectedPair(selectedPair.filter(s => s.uniqueId !== card.uniqueId));
      return;
    }
    if (selectedPair.length === 1 && selectedPair[0].type === card.type) return;

    const newSelected = [...selectedPair, card];
    setSelectedPair(newSelected);

    if (newSelected.length === 2) {
      const [a, b] = newSelected;
      if (a.id === b.id) {
        setMatchedPairs((prev) => [...prev, a.id]);
        setSelectedPair([]);
      } else {
        setTimeout(() => setSelectedPair([]), 700);
      }
    }
  }

  function handleQuizChoiceClick(choice) {
    if (isChoiceMade) return;
    setIsChoiceMade(true);

    if (choice.isCorrect) {
      setMatchedPairs(prev => [...prev, currentQuizWord.word]);
    }

    setQuizChoices(choices => choices.map(c =>
      c.id === choice.id ? { ...c, status: c.isCorrect ? 'correct' : 'incorrect' } : c
    ));

    setTimeout(() => {
      const nextIndex = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIndex);
      setupNextQuizRound(quizDeck, nextIndex);
    }, 1200);
  }

  function handleModeChange(e) {
    const newMode = e.target.value;
    setGameMode(newMode);
    initializeGame(allPairs, { gameMode: newMode });
  }

  function handleGridChange(e, dimension) {
    const value = parseInt(e.target.value) || 2;
    let newSettings = { gameMode, gridCols, gridRows };

    if (dimension === 'cols') {
      if (value * gridRows % 2 !== 0) {
        alert("The total number of cards (Columns x Rows) must be an even number.");
        return;
      }
      newSettings.gridCols = value;
      setGridCols(value);
    }
    if (dimension === 'rows') {
      if (gridCols * value % 2 !== 0 && gameMode === 'grid') {
        alert("The total number of cards (Columns x Rows) must be an even number.");
        return;
      }
      newSettings.gridRows = value;
      setGridRows(value);
    }
    initializeGame(allPairs, newSettings);
  }

  // Check for win condition in pair-matching modes
  useEffect(() => {
    if (gameMode !== 'multipleChoice' && pairsInPlay > 0 && matchedPairs.length === pairsInPlay && !endTime) {
      setEndTime(Date.now());
    }
  }, [matchedPairs, pairsInPlay, endTime, gameMode]);

  const isSelected = (card) => selectedPair.some(s => s.uniqueId === card.uniqueId);
  const isMatched = (id) => matchedPairs.includes(id);

  // Other handlers (save, open modal, etc.)
  const openEditModal = () => {
    const currentCsvData = allPairs.map(pair => `${pair.word},${pair.definition}`).join('\n');
    setCsvData(currentCsvData);
    setIsEditModalOpen(true);
  };

  const handleSaveDeck = () => {
    const rows = csvData.trim().split("\n").filter(row => row.trim() !== "");
    const pairs = rows.map((line) => {
      const [word, ...definitionParts] = line.split(',');
      const definition = definitionParts.join(',').trim();
      return { word: word.trim(), definition };
    }).filter(p => p.word && p.definition);
    setAllPairs(pairs);
    initializeGame(pairs, { gameMode, gridCols, gridRows });
    setIsEditModalOpen(false);
  };

  // --- RENDER ---

  return (
    <>
      <div className="p-4 sm:p-6 min-h-screen bg-gradient-to-br from-indigo-100 to-blue-200 text-gray-800 font-sans">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-center text-gray-700 tracking-tight">Flashcard Match Game</h1>

          <div className="bg-white/60 backdrop-blur-sm p-4 rounded-lg shadow-md mb-6 flex flex-wrap items-center justify-center gap-4">
            <div className="flex flex-col">
              <label htmlFor="game-mode" className="text-sm font-medium mb-1 text-gray-600">Game Mode</label>
              <select id="game-mode" value={gameMode} onChange={handleModeChange} className="border-2 border-gray-300 rounded-md px-3 py-1.5 text-gray-800 focus:ring-2 focus:ring-indigo-500 transition">
                <option value="grid">Grid Match</option>
                <option value="column">Column Match</option>
                <option value="multipleChoice">Multiple Choice</option>
              </select>
            </div>
            {gameMode === 'grid' && (
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1 text-gray-600">Columns</label>
                <input type="number" min="2" max="10" step="2" value={gridCols} onChange={(e) => handleGridChange(e, 'cols')} className="border-2 border-gray-300 rounded-md px-3 py-1.5 text-gray-800 w-24 focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
            )}
            {['grid', 'column'].includes(gameMode) && (
              <div className="flex flex-col">
                <label className="text-sm font-medium mb-1 text-gray-600">Rows</label>
                <input type="number" min="2" max="10" value={gridRows} onChange={(e) => handleGridChange(e, 'rows')} className="border-2 border-gray-300 rounded-md px-3 py-1.5 text-gray-800 w-24 focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
            )}
            <button onClick={() => initializeGame(allPairs, { gameMode, gridCols, gridRows })} className="self-end bg-indigo-600 px-5 py-2 rounded-md text-white font-semibold hover:bg-indigo-700 transition shadow-sm">🔄 Restart</button>
            <button onClick={openEditModal} className="self-end bg-blue-500 px-5 py-2 rounded-md text-white font-semibold hover:bg-blue-600 transition shadow-sm">✏️ Edit Deck</button>
          </div>

          {endTime && (
            <div className="mb-6 text-center text-2xl font-bold text-green-600">
              🎉 Game completed! {gameMode === 'multipleChoice' && `Final Score: ${matchedPairs.length} / ${pairsInPlay}`}
              {gameMode !== 'multipleChoice' && `Time: ${((endTime - startTime) / 1000).toFixed(2)} seconds!`}
            </div>
          )}

          {/* --- Main Game Area --- */}
          {gameMode === 'grid' && (
            <div className="grid gap-3 sm:gap-4" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
              {mixedCards.map((card) => <Card key={card.uniqueId} card={card} isSelected={isSelected(card)} isMatched={isMatched(card.id)} onClick={() => handlePairMatchClick(card)} />)}
            </div>
          )}
          {gameMode === 'column' && (
            <div className="flex flex-row gap-4">
              <div className="w-1/2 flex flex-col gap-3 sm:gap-4">{wordCards.map((card) => <Card key={card.uniqueId} card={card} isSelected={isSelected(card)} isMatched={isMatched(card.id)} onClick={() => handlePairMatchClick(card)} />)}</div>
              <div className="w-1/2 flex flex-col gap-3 sm:gap-4">{definitionCards.map((card) => <Card key={card.uniqueId} card={card} isSelected={isSelected(card)} isMatched={isMatched(card.id)} onClick={() => handlePairMatchClick(card)} />)}</div>
            </div>
          )}
          {gameMode === 'multipleChoice' && currentQuizWord && !endTime && (
            <div className="space-y-8">
              {/* FIX 1: Correctly access the 'word' property for content */}
              <Card card={{ content: currentQuizWord.word }} size="large" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quizChoices.map((choice) => <Card key={choice.id} card={choice} status={choice.status} onClick={() => handleQuizChoiceClick(choice)} />)}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSubmit={handleSaveDeck} submitText="Save Deck">
        <h2 className="text-2xl font-bold mb-4">✏️ Edit Flashcard Deck</h2>
        <p className="mb-4 text-gray-600">Edit the word and definition pairs below, separated by a comma on each line.</p>
        <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} placeholder="word,definition&#10;another word,another definition" className="w-full h-40 p-3 border-2 border-gray-300 rounded text-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"></textarea>
      </Modal>
    </>
  );
}