import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-white">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <Component {...pageProps} />
      </main>
      <Footer />
    </div>
  );
}
