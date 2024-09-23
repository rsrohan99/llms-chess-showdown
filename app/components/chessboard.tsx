"use client";

import html2canvas from "html2canvas";
import { forwardRef, useState, useMemo } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { CustomSquareProps } from "react-chessboard/dist/chessboard/types";
import { describeMove } from "../utils/moves";

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
    // const canvas = await html2canvas(document.getElementById("cb")!);
    // const img = canvas.toDataURL("image/png");
    // console.log(img);
    while (true) {
      const moves = game.moves();
      const move = moves[Math.floor(Math.random() * moves.length)];
      const moveString = `${
        game.turn() === "w" ? "White" : "Black"
      }: ${describeMove(move)}`;
      setAllMovesString((prev) => [...prev, moveString]);
      game.move(move);
      setGamePosition(game.fen());
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
      await delay(2);
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
