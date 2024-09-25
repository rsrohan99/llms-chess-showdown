"use client";

import html2canvas from "html2canvas";
import { forwardRef, useState, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { CustomSquareProps } from "react-chessboard/dist/chessboard/types";
import { describeMove } from "../utils/moves";
import { getNextMove } from "../actions/llm";
import { IPlayer } from "../utils/types";
import { llms } from "../utils/models";

const LLM_THINK_DELAY = 0.5;
const LOOP_DELAY = 0.5;

function delay(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

const CustomSquareRenderer = forwardRef<HTMLDivElement, CustomSquareProps>(
  (props, ref) => {
    const { children, square, squareColor, style } = props;
    return (
      <div
        ref={ref}
        style={{
          ...style,
          position: "relative",
        }}
      >
        {children}
        <div
          className="pb-4 pt-1 px-2"
          style={{
            zIndex: 100,
            position: "absolute",
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 18,
            width: 18,
            // borderTopLeftRadius: 6,
            // backgroundColor: squareColor === "black" ? "#064e3b" : "#312e81",
            backgroundColor: "#312e81",
            color: "#fff",
            fontSize: 14,
          }}
        >
          {square}
        </div>
      </div>
    );
  }
);

function ChessBoard() {
  const game = useMemo(() => new Chess(), []);
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [allMovesString, setAllMovesString] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false); // Play/Pause state
  const isPlayingRef = useRef(false);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(true); // Game over state
  const isGameOverRef = useRef(true);
  const endDivRef = useRef<HTMLDivElement>(null);

  const [thinkingMessage, setThinkingMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const isMoveInProgress = useRef(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const whiteModalRef = useRef<HTMLSelectElement | null>(null);
  const blackModalRef = useRef<HTMLSelectElement | null>(null);
  const whiteApiKeyRef = useRef<HTMLInputElement | null>(null);
  const blackApiKeyRef = useRef<HTMLInputElement | null>(null);

  const playersRef = useRef<Record<string, IPlayer | undefined>>({
    w: { color: "White", llm: llms[0], apiKey: "" },
    b: { color: "Black", llm: llms[0], apiKey: "" },
  });

  useEffect(() => {
    if (endDivRef.current) {
      endDivRef.current.scrollIntoView();
    }
  }, [allMovesString]);

  const handleSave = async () => {
    playersRef.current = {
      w: {
        color: "White",
        llm: llms.find((llm) => llm.model === whiteModalRef.current?.value)!,
        apiKey: whiteApiKeyRef.current?.value ?? "",
      },
      b: {
        color: "Black",
        llm: llms.find((llm) => llm.model === blackModalRef.current?.value)!,
        apiKey: blackApiKeyRef.current?.value ?? "",
      },
    };
    setSavedMessage("Settings saved successfully!");
    await delay(2);
    setSavedMessage("");
  };

  const startGameLoop = async () => {
    console.log("Starting loop...");
    setHasGameStarted(true);
    isPlayingRef.current = true;
    isGameOverRef.current = false;
    setIsGameOver(false);
    setIsPlaying(true);
    while (true) {
      // console.log(`isGameOverRef: ${isGameOverRef.current}`);
      // console.log(`isPlayingRef: ${isPlayingRef.current}`);
      if (isGameOverRef.current) {
        console.log("Game over");
        break;
      }
      if (isPlayingRef.current) {
        await makeMove();
      }
      await delay(LOOP_DELAY);
    }
    console.log("Game loop ended");
  };

  const makeMove = async () => {
    isMoveInProgress.current = true;
    console.log("Making move...");
    const moves = game.moves();
    let currentTurn = "";
    let lastTurn = "";
    let turnKey = game.turn();
    if (game.turn() === "w") {
      currentTurn = "White";
      lastTurn = "Black";
    } else {
      currentTurn = "Black";
      lastTurn = "White";
    }
    let move = "";
    // move = moves[Math.floor(Math.random() * moves.length)];
    // console.log("figuring out move at makemove");
    // await delay(5);
    if (moves.length === 1) move = moves[0];
    else {
      const canvas = await html2canvas(document.getElementById("cb")!);
      const img = canvas.toDataURL("image/png");
      // console.log(img);
      move = moves[Math.floor(Math.random() * moves.length)];
      const movesToStrings = moves.map((move) => describeMove(move));
      for (let retry = 0; retry < 1; retry++) {
        try {
          console.log(`Trying to get next move (try: ${retry + 1})...`);
          const previousMoves = game.history();
          const lastMove = previousMoves[previousMoves.length - 1] ?? "";
          const lastMoveString = lastMove
            ? `${lastTurn}: ${describeMove(lastMove)}`
            : "No previous moves yet.";
          setThinkingMessage(`${currentTurn} is thinking...`);
          const nextMove = await getNextMove({
            currentStateImage: img,
            allMoves: movesToStrings,
            provider: playersRef.current[turnKey]?.llm.provider!,
            model: playersRef.current[turnKey]?.llm.model!,
            color: game.turn() === "w" ? "White" : "Black",
            lastMove: lastMoveString,
            apiKey: playersRef.current[turnKey]?.apiKey!,
          });
          await delay(3);
          setThinkingMessage("");
          if (nextMove < 0 || nextMove >= moves.length) {
            throw new Error(`Invalid move: ${nextMove}`);
          }
          move = moves[nextMove];
          break;
        } catch (e) {
          console.error(`Error: ${e}. Trying again...`);
        } finally {
          isMoveInProgress.current = false;
          setThinkingMessage("");
        }
      }
    }
    // console.log(`Move: ${move}`);
    try {
      const moveString = `${currentTurn}: ${describeMove(move)}`;
      if (!isGameOverRef.current) {
        game.move(move);
      } else return;
      // @ts-expect-error
      setAllMovesString((prev) => [...prev, moveString]);
      setGamePosition(game.fen());
      if (game.isGameOver()) {
        let reason = "";
        if (game.isCheckmate()) reason = "Checkmate";
        else if (game.isStalemate()) reason = "Stalemate";
        else if (game.isDraw()) reason = "Draw";
        const finalStringToDisplay = `Game Over: ${reason}.${
          !game.isDraw() ? ` Winner: ${currentTurn}.` : ""
        }`;
        setResultMessage(finalStringToDisplay);
        // @ts-expect-error
        setAllMovesString((prev) => [...prev, finalStringToDisplay]);
        setIsGameOver(true);
        isGameOverRef.current = true;
      }
      isMoveInProgress.current = false;
    } catch (e) {
      console.error(e);
      isMoveInProgress.current = false;
      resetGame();
      setErrorMessage(
        "Error occured finding next move, make sure API key is correct."
      );
      await delay(LLM_THINK_DELAY);
      setErrorMessage("");
    } finally {
      isMoveInProgress.current = false;
    }
  };

  const togglePlayPause = () => {
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
    } else {
      isPlayingRef.current = true;
    }
    setIsPlaying(!isPlaying);
  };

  const resetGame = () => {
    isMoveInProgress.current = false;
    game.reset();
    setGamePosition(game.fen());
    setAllMovesString([]);
    setIsGameOver(true);
    isGameOverRef.current = true;
    setIsPlaying(false);
    isPlayingRef.current = false;
    setResultMessage("");
    setThinkingMessage("");
    setHasGameStarted(false);
    console.log("Game reset!");
  };

  return (
    <div className="flex flex-row gap-10 items-start justify-start">
      <div className="flex flex-col gap-2 ml-10 sticky mt-5 top-20 bg-gray-100 pb-3 px-3 pt-2 rounded-lg">
        <h3 className="text-xl font-semibold text-center">Chess Board</h3>
        <div id={"cb"} className="h-[450px] w-[450px]">
          <Chessboard
            id="BasicBoard"
            position={gamePosition}
            arePiecesDraggable={false}
            showBoardNotation={false}
            // @ts-expect-error
            customSquare={CustomSquareRenderer}
            autoPromoteToQueen={true}
          />
        </div>
        <div className="flex justify-between items-center">
          {hasGameStarted ? (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={togglePlayPause}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          ) : (
            <button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={startGameLoop}
            >
              Start
            </button>
          )}
          {!isPlaying && hasGameStarted && <span>Game Paused</span>}
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={resetGame}
          >
            Reset
          </button>
        </div>
        {isGameOver && <div>{resultMessage}</div>}
        {errorMessage && <div className="text-red-500">{errorMessage}</div>}
      </div>
      <div className="flex flex-col flex-grow gap-2 justify-start mt-5 bg-gray-100 rounded-lg w-full pt-3 min-h-[90vh] h-full">
        <h3 className="text-xl font-semibold text-center">Moves</h3>
        {allMovesString.map((moveString, index) => (
          <div className="mx-3" key={index}>
            {moveString}
          </div>
        ))}
        <div ref={endDivRef} className="mb-10 mx-3">
          {thinkingMessage}
        </div>
      </div>
      <div className="flex flex-col items-start p-6 bg-gray-100 rounded-lg shadow-lg top-20 mt-5 sticky mr-10 w-full">
        <div className="w-full">
          <h2 className="text-2xl font-semibold mb-4 text-center">Settings</h2>
        </div>

        <div className="w-full mb-6">
          <h3 className="text-lg font-medium mb-2">White</h3>
          <div className="flex flex-col mb-4">
            <label htmlFor="white-llm" className="mb-1">
              Select LLM:
            </label>
            <select
              id="white-llm"
              ref={whiteModalRef}
              className="border border-gray-300 rounded p-2"
            >
              {llms.map((llm) => (
                <option key={llm.model} value={llm.model}>
                  {llm.model}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="white-api-key" className="mb-1">
              API Key:
            </label>
            <input
              type="password"
              ref={whiteApiKeyRef}
              id="white-api-key"
              className="border border-gray-300 rounded p-2"
              placeholder="Enter API Key"
            />
          </div>
        </div>

        <div className="w-full">
          <h3 className="text-lg font-medium mb-2">Black</h3>
          <div className="flex flex-col mb-4">
            <label htmlFor="black-llm" className="mb-1">
              Select LLM:
            </label>
            <select
              id="black-llm"
              ref={blackModalRef}
              className="border border-gray-300 rounded p-2"
            >
              {llms.map((llm) => (
                <option key={llm.model} value={llm.model}>
                  {llm.model}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="black-api-key" className="mb-1">
              API Key:
            </label>
            <input
              type="password"
              ref={blackApiKeyRef}
              id="black-api-key"
              className="border border-gray-300 rounded p-2"
              placeholder="Enter API Key"
            />
          </div>
        </div>
        <div>
          <button
            onClick={handleSave}
            className="mt-4 bg-blue-500 text-white rounded p-2 px-4 hover:bg-blue-600"
          >
            Save
          </button>
          {savedMessage && (
            <span className="text-green-500 text-sm ml-2">{savedMessage}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChessBoard;
