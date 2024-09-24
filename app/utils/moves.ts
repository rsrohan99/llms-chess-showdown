export function describeMove(move: string) {
  const pieceNames = {
    K: "King",
    Q: "Queen",
    R: "Rook",
    B: "Bishop",
    N: "Knight",
    P: "Pawn",
  };

  if (move === "O-O") {
    return "King castles kingside";
  } else if (move === "O-O-O") {
    return "King castles queenside";
  }

  // Capture move
  if (move.includes("x")) {
    const [from, to] = move.split("x");
    // @ts-expect-error
    const piece = pieceNames[from[0]] || "Pawn";
    return `${piece} captures on ${to}`;
  }

  // Check move
  if (move.includes("+")) {
    // @ts-expect-error
    const piece = pieceNames[move[0]] || "Pawn";
    return `${piece} moves to ${move.slice(1, -1)} with check`;
  }

  // Checkmate move
  if (move.includes("#")) {
    // @ts-expect-error
    const piece = pieceNames[move[0]] || "Pawn";
    return `${piece} moves to ${move.slice(1, -1)} and delivers checkmate`;
  }

  // Pawn promotion
  if (move.length === 5 && move[0] === "P" && move[4].toLowerCase() === "=") {
    // @ts-expect-error
    const promotionPiece = pieceNames[move[4].toUpperCase()] || "Queen";
    return `Pawn promotes to ${promotionPiece}`;
  }

  // Normal move
  // @ts-expect-error
  const isPawn = !pieceNames[move[0]];
  // @ts-expect-error
  return `${pieceNames[move[0]] || "Pawn"} moves to ${
    isPawn ? move : move.slice(1)
  }`;
}
