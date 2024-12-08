import "@/styles/globals.css";
import '@coinbase/onchainkit/styles.css';
import Layout from "@/components/Layout";
import { OnchainKitWrapper } from '@/providers/OnchainKitProvider';

export default function App({ Component, pageProps }) {
  return (
    <OnchainKitWrapper>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </OnchainKitWrapper>
  );
}
