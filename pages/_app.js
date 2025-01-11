import "@/styles/globals.css";
import { WagmiConfig } from "wagmi";
import { ConnectKitProvider } from "connectkit";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from "@/config";
import Head from 'next/head'

// Create a client
const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Monad Ninja</title>
      </Head>
      <WagmiConfig config={config}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider theme="minimal">
            <Component {...pageProps} />
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiConfig>
    </>
  );
}
