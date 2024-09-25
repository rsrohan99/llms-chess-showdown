import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LLMs Chess Showdown",
  description: "How good are multi-modal LLMs at chess?",
  authors: { name: "RS Rohan", url: "https://x.com/clusteredbytes" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const socials = {
    X: "https://x.com/clusteredbytes",
    GitHub: "https://github.com/rsrohan99",
  };
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white`}>
        <nav className="bg-gray-800 text-white p-4 sticky top-0">
          <div className="container mx-auto w-[80vw] flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              {metadata.title as string}
              <span className="text-sm font-semibold ml-3">
                by{" "}
                <a
                  target="_blank"
                  // @ts-expect-error
                  href={metadata.authors.url}
                  className="hover:underline hover:text-blue-300"
                >
                  Rohan
                </a>
              </span>
            </h1>
            <div>
              {Object.entries(socials).map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-5 hover:underline hover:text-blue-300"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
