### Are multi-modal LLMs any good at playing chess?

Tried to find that out in this fun little project I made where two multi-modal LLMs play chess.

It supports most popular Multi-Modal LLMs from OpenAI, Google, Claude & Mistral.

After each move, I'm giving the image of the current board and asking it to make the next move.

Try it out: https://llms-chess.vercel.app/

Tools Used:

- [Vercel AI SDK](https://sdk.vercel.ai/) as AI Library.
- [chess.js](https://github.com/jhlywa/chess.js) for game logic.
- [react-chessboard](https://github.com/Clariity/react-chessboard) for the chessboard UI.
