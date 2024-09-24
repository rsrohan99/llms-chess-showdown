"use server";

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createMistral } from "@ai-sdk/mistral";
import { generateText } from "ai";
import { NextMoveInput } from "../utils/types";

export async function getNextMove(input: NextMoveInput) {
  console.log(`Getting next move from ${input.provider} ${input.model}...`);
  const {
    currentStateImage,
    allMoves,
    provider,
    model,
    color,
    apiKey,
    lastMove,
  } = input;
  const llmMap = {
    OpenAI: createOpenAI,
    Google: createGoogleGenerativeAI,
    Anthropic: createAnthropic,
    Mixtral: createMistral,
  };
  const createLlmProvider = llmMap[provider] ?? createOpenAI;
  const llmProvider = createLlmProvider({
    apiKey,
  });
  const llm = llmProvider.languageModel(model);
  const systemPrompt = `You are the best chess player in the world. You are  playing against another top player. You are playing as "${color}". You are given the image of the current chessboard state. You will think very carefully about all your possible moves and their consequences. You are trying to win the game. You are trying to make the best move possible that will give you the best chance of winning. After thinking very deeply about all your possible moves, you must come up with your next move.`;
  const nextMovePrompt = `The provided image is the current state of the chess game between you and another top player. You are playing as "${color}". Now it is your turn to make a move, which will give you the best chance of winning the game. The moves are in conventional chess algebric notation. The last move was "${lastMove}". The following are all the moves available for you. Each move is numbered from 1 to ${
    allMoves.length
  }.
---
${allMoves.map((move, index) => `${index + 1} - ${move}`).join("\n")}
---
Now think very deeply and carefully about all your possible moves and their consequences. After thinking very deeply, just output the number of the move that you think will give you the best chance of winning the game. The number of the best move for you is(MUST be a number from 1 to ${
    allMoves.length
  }): `;
  console.log(nextMovePrompt);
  try {
    const nextMove = await generateText({
      model: llm,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image", image: currentStateImage },
            { type: "text", text: nextMovePrompt },
          ],
        },
      ],
      maxTokens: 2,
      temperature: 0.7,
    });
    console.log(nextMove.text);
    const nextMoveNumber = parseInt(nextMove.text);
    return nextMoveNumber - 1;
  } catch (e) {
    throw new Error(`LLM Error, make sure api key is correct.`);
  }
}
