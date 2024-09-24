"use client";

import html2canvas from "html2canvas";
import { forwardRef, useState, useMemo, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { CustomSquareProps } from "react-chessboard/dist/chessboard/types";
import { describeMove } from "../utils/moves";
import { getNextMove } from "../actions/llm";

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
  const [isGameOver, setIsGameOver] = useState(false); // Game over state
  const [gameInterval, setGameInterval] = useState<NodeJS.Timeout | null>(null); // Reference to the interval
  const intervalRef = useRef<NodeJS.Timeout>(null); // For maintaining interval across renders
  const endDivRef = useRef<HTMLDivElement>(null);
  const [thinkingMessage, setThinkingMessage] = useState("");
  const [resultMessage, setResultMessage] = useState("");

  useEffect(() => {
    if (endDivRef.current) {
      endDivRef.current.scrollIntoView();
    }
  }, [allMovesString]);

  // Handle random moves between two players
  const makeMove = async () => {
    const moves = game.moves();
    let currentTurn = "";
    let lastTurn = "";
    if (game.turn() === "w") {
      currentTurn = "White";
      lastTurn = "Black";
    } else {
      currentTurn = "Black";
      lastTurn = "White";
    }
    let move = "";
    if (moves.length === 1) move = moves[0];
    else {
      // const canvas = await html2canvas(document.getElementById("cb")!);
      // const img = canvas.toDataURL("image/png");
      // console.log(img);
      move = moves[Math.floor(Math.random() * moves.length)];
      // const movesToStrings = moves.map((move) => describeMove(move));
      // for (let retry = 0; retry < 1; retry++) {
      //   try {
      //     console.log(`Trying to get next move (try: ${retry + 1})...`);
      //     const previousMoves = game.history();
      //     console.log(previousMoves);
      //     const lastMove = previousMoves[previousMoves.length - 1] ?? "";
      //     const lastMoveString = lastMove
      //       ? `${lastTurn}: ${describeMove(lastMove)}`
      //       : "No previous moves yet.";
      //     setThinkingMessage(`${currentTurn} is thinking...`);
      //     const nextMove = await getNextMove({
      //       currentStateImage: img,
      //       allMoves: movesToStrings,
      //       provider: "Google",
      //       model: "gemini-1.5-flash",
      //       color: game.turn() === "w" ? "White" : "Black",
      //       lastMove: lastMoveString,
      //       apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
      //     });
      //     setThinkingMessage("");
      //     if (nextMove < 0 || nextMove >= moves.length) {
      //       throw new Error(`Invalid move: ${nextMove}`);
      //     }
      //     move = moves[nextMove];
      //     break;
      //   } catch (e) {
      //     console.error(`Error: ${e}. Trying again...`);
      //   }
      // }
    }
    try {
      const moveString = `${currentTurn}: ${describeMove(move)}`;
      game.move(move);
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
        setAllMovesString((prev) => [...prev, finalStringToDisplay]);
        setIsGameOver(true);
        clearInterval(intervalRef.current as NodeJS.Timeout); // Stop the game when it's over
      }
    } catch (e) {
      console.error(e);
      alert("Error occured finding next move, make sure API key is correct.");
      game.reset();
    }
  };

  // Play the game loop with an interval
  const startGameLoop = () => {
    intervalRef.current = setInterval(() => {
      makeMove();
    }, 50); // Make a move every second
    setGameInterval(intervalRef.current); // Store the interval for reference
  };

  // Handle play/pause functionality
  const togglePlayPause = () => {
    if (isPlaying) {
      clearInterval(gameInterval as NodeJS.Timeout); // Pause the game by clearing interval
    } else {
      startGameLoop(); // Start/resume the game loop
    }
    setIsPlaying(!isPlaying);
  };

  // Handle reset functionality
  const resetGame = () => {
    clearInterval(gameInterval as NodeJS.Timeout); // Clear the interval
    game.reset(); // Reset the game state
    setGamePosition(game.fen()); // Reset the game position
    setAllMovesString([]); // Reset the moves
    setIsGameOver(false); // Reset game over state
    setIsPlaying(false); // Reset play state
    setResultMessage("");
  };

  return (
    <div className="flex flex-row gap-10 items-start justify-start">
      <div className="flex flex-col gap-10 ml-10 sticky mt-10 top-10">
        <div id={"cb"} className="h-[450px] w-[450px]">
          <Chessboard
            id="BasicBoard"
            position={gamePosition}
            arePiecesDraggable={false}
            showBoardNotation={false}
            customSquare={CustomSquareRenderer}
            autoPromoteToQueen={true}
          />
        </div>
        <div className="flex justify-between items-center">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={togglePlayPause}
          >
            {isPlaying ? "Pause" : "Play"}
          </button>
          {!isPlaying && (
            <span>
              {isGameOver ? resultMessage : !isPlaying ? "Game Paused" : ""}
            </span>
          )}
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={resetGame}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="flex flex-col flex-grow gap-2 justify-start mt-10">
        {allMovesString.map((moveString, index) => (
          <div key={index}>{moveString}</div>
        ))}
        <div ref={endDivRef} className="mb-10">
          {thinkingMessage}
        </div>
      </div>
    </div>
  );
}

export default ChessBoard;
