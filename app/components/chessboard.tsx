"use client";

import html2canvas from "html2canvas";
import { forwardRef, useState, useMemo } from "react";
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

function delay(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

function ChessBoard() {
  const game = useMemo(() => new Chess(), []);
  const [gamePosition, setGamePosition] = useState(game.fen());
  const [allMovesString, setAllMovesString] = useState([]);

  async function takeSS() {
    const canvas = await html2canvas(document.getElementById("cb")!);
    const img = canvas.toDataURL("image/png");
    console.log(img);
    while (true) {
      const moves = game.moves();
      let move = "";
      const movesToStrings = moves.map((move) => describeMove(move));
      for (let retry = 0; retry < 1; retry++) {
        try {
          console.log(`Trying to get next move (try: ${retry + 1})...`);
          const nextMove = await getNextMove({
            currentStateImage: img,
            allMoves: movesToStrings,
            provider: "Google",
            model: "gemini-1.5-flash",
            color: game.turn() === "w" ? "White" : "Black",
            lastMove:
              allMovesString[allMovesString.length - 1] || "No last move yet.",
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
          });
          if (nextMove < 0 || nextMove >= moves.length) {
            throw new Error(`Invalid move: ${nextMove}`);
          }
          move = moves[nextMove];
          break;
        } catch (e) {
          console.error(`Error: ${e}. Trying again...`);
        }
      }
      const moveString = `${
        game.turn() === "w" ? "White" : "Black"
      }: ${describeMove(move)}`;
      setAllMovesString((prev) => [...prev, moveString]);
      game.move(move);
      setGamePosition(game.fen());
      // return;
      if (game.isGameOver()) {
        let reason = "";
        if (game.isCheckmate()) reason = "Checkmate";
        else if (game.isStalemate()) reason = "Stalemate";
        else if (game.isDraw()) reason = "Draw";
        const finalStringToDisplay = `Game Over: ${reason}.${
          !game.isDraw()
            ? ` Winner: ${game.turn() === "w" ? "Black" : "White"}.`
            : ""
        }`;
        setAllMovesString((prev) => [...prev, finalStringToDisplay]);
        break;
      }
      await delay(4);
    }
  }

  return (
    <div className="flex flex-row gap-10 items-start justify-start">
      <div
        id={"cb"}
        className="h-[450px] w-[450px] ml-10 sticky mt-10"
        onClick={takeSS}
      >
        <Chessboard
          id="BasicBoard"
          position={gamePosition}
          arePiecesDraggable={false}
          showBoardNotation={false}
          customSquare={CustomSquareRenderer}
        />
      </div>
      <div className="flex flex-col flex-grow gap-2 justify-start">
        {allMovesString.map((moveString, index) => (
          <div key={index}>{moveString}</div>
        ))}
      </div>
    </div>
  );
}

export default ChessBoard;
